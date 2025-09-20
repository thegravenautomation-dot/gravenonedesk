import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context = 'general', userId, branchId, selectedCustomer, selectedLead } = await req.json();
    
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Get business context based on the user's branch and role
    let businessContext = '';
    
    try {
      // Get user profile and branch info
      const { data: profile } = await supabase
        .from('profiles')
        .select(`
          *,
          branches (name, industry, address)
        `)
        .eq('id', userId)
        .single();

      if (profile) {
        businessContext += `Company: ${profile.branches?.name}\n`;
        businessContext += `Industry: ${profile.branches?.industry || 'Manufacturing/Automation'}\n`;
        businessContext += `User Role: ${profile.role}\n`;
        businessContext += `Department: ${profile.department}\n`;
      }

      // Get specific customer context if selected
      if (selectedCustomer) {
        const { data: customerData } = await supabase
          .from('customers')
          .select(`
            *, 
            communications!inner(message, subject, created_at, contact_type, direction)
          `)
          .eq('id', selectedCustomer)
          .order('communications.created_at', { ascending: false })
          .limit(5);

        if (customerData && customerData.length > 0) {
          const customer = customerData[0];
          businessContext += `\nSelected Customer Details:\n`;
          businessContext += `- Name: ${customer.name}\n`;
          businessContext += `- Company: ${customer.company}\n`;
          businessContext += `- Industry: ${customer.industry}\n`;
          businessContext += `- Phone: ${customer.phone || 'N/A'}\n`;
          businessContext += `- Email: ${customer.email || 'N/A'}\n`;
          
          if (customer.communications && customer.communications.length > 0) {
            businessContext += `\nRecent Communications:\n`;
            customer.communications.forEach((comm: any) => {
              businessContext += `- ${comm.created_at}: ${comm.contact_type} (${comm.direction}) - ${comm.subject || comm.message.substring(0, 100)}\n`;
            });
          }
        }
      }

      // Get specific lead context if selected
      if (selectedLead) {
        const { data: leadData } = await supabase
          .from('leads')
          .select(`
            *, 
            customers (name, company, city, state),
            follow_ups (title, description, status, follow_up_date)
          `)
          .eq('id', selectedLead)
          .single();

        if (leadData) {
          businessContext += `\nSelected Lead Details:\n`;
          businessContext += `- Title: ${leadData.title}\n`;
          businessContext += `- Description: ${leadData.description}\n`;
          businessContext += `- Value: ₹${leadData.value || 'Not specified'}\n`;
          businessContext += `- Status: ${leadData.status}\n`;
          businessContext += `- Source: ${leadData.source}\n`;
          
          if (leadData.customers) {
            businessContext += `- Customer: ${leadData.customers.name} (${leadData.customers.company})\n`;
            businessContext += `- Location: ${leadData.customers.city}, ${leadData.customers.state}\n`;
            businessContext += `- Contact: ${leadData.customers.phone || 'N/A'}, ${leadData.customers.email || 'N/A'}\n`;
          }

          if (leadData.follow_ups && leadData.follow_ups.length > 0) {
            businessContext += `\nRecent Follow-ups:\n`;
            leadData.follow_ups.forEach((followUp: any) => {
              businessContext += `- ${followUp.follow_up_date}: ${followUp.title} - ${followUp.status}\n`;
            });
          }
        }
      }

      // Get recent business data for context
      if (context === 'leads' || context === 'sales') {
        const { data: recentLeads } = await supabase
          .from('leads')
          .select(`
            title, description, value, source, status,
            customers (name, company, city)
          `)
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentLeads && recentLeads.length > 0) {
          businessContext += `\nRecent Leads:\n`;
          recentLeads.forEach(lead => {
            businessContext += `- ${lead.title}: ${lead.description} (Value: ₹${lead.value}, Status: ${lead.status})\n`;
          });
        }
      }

      if (context === 'customers') {
        const { data: recentCustomers } = await supabase
          .from('customers')
          .select('name, company, city, state')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentCustomers && recentCustomers.length > 0) {
          businessContext += `\nRecent Customers:\n`;
          recentCustomers.forEach(customer => {
            businessContext += `- ${customer.name} (${customer.company}) - ${customer.city}, ${customer.state}\n`;
          });
        }
      }

    } catch (error) {
      console.error('Error fetching business context:', error);
    }

    // Create system prompt based on context
    let systemPrompt = `You are an AI assistant for Graven Automation, a manufacturing and industrial automation company. You help staff with their daily tasks including sales, customer service, lead management, and business queries.

Business Context:
${businessContext}

Product Portfolio - Always mention EXACT brand names and specific models:

AUTOMATION PRODUCTS:
- PLCs: Siemens S7-200, S7-300, S7-1200, S7-1500 series; Allen-Bradley CompactLogix, ControlLogix; Schneider Electric Modicon M221, M241, M251
- HMIs: Siemens SIMATIC HMI Basic Panels KTP400, KTP700, KTP1000; Weintek cMT3090, cMT3151; Pro-face GP4000 series
- VFDs: Siemens SINAMICS G120, G120C; ABB ACS580, ACS880; Schneider Electric Altivar ATV320, ATV630
- Servo Motors: Siemens SIMOTICS S-1FK2; Allen-Bradley Kinetix 5700; Yaskawa Sigma-7 series
- Industrial Switches: Siemens SCALANCE X200, X300; Phoenix Contact FL SWITCH series
- Safety Systems: Siemens SIMATIC Safety; Pilz PNOZ series safety relays

ELECTRICAL COMPONENTS:
- Contactors: Siemens 3RT series; ABB AF series; Schneider Electric TeSys D series
- MCCBs: Siemens 3VA series; ABB Tmax T series; Schneider Electric NSX series
- Transformers: Siemens GEAFOL; ABB dry-type transformers; Schneider Electric Trihal
- Cables: Polycab, KEI, Havells industrial cables
- Panel Components: Rittal enclosures; Weidmuller terminals; Phoenix Contact connectors

INSTRUMENTATION:
- Flow Meters: Endress+Hauser Proline Promag 400; Emerson Rosemount 8732; ABB ProcessMaster FEP311
- Pressure Transmitters: Endress+Hauser Cerabar PMC21; Honeywell STG940; Siemens SITRANS P series
- Temperature Sensors: Endress+Hauser iTHERM series; Wika RTD sensors; Siemens QAE2120 series
- Level Sensors: Endress+Hauser Levelflex FMP51; Vega VEGAPULS series; Siemens Sitrans LU series

Key Responsibilities:
- Help with customer inquiries and provide product information
- Assist with sales strategies and lead qualification
- Draft professional emails and WhatsApp messages
- Suggest appropriate products/solutions for customers with SPECIFIC MODEL NUMBERS
- Provide industry insights and market trends
- Help with follow-up strategies

Guidelines:
- Always be professional and courteous
- Use industry-specific terminology appropriately
- Provide actionable suggestions
- When suggesting products, ALWAYS mention specific brand names and exact model numbers (e.g., "Siemens S7-1200 PLC" not just "PLC")
- Base product recommendations on customer's specific industry and application requirements
- For pricing queries, recommend contacting the sales team
- Keep responses concise but comprehensive
- When drafting communications, personalize based on available customer/lead context
`;

    // Add context-specific instructions
    if (context === 'email') {
      systemPrompt += `\nContext: Email Communication
- Help draft professional emails to customers, suppliers, or partners
- Ensure proper business email etiquette
- Include relevant product information with specific model numbers
- If a customer is selected, personalize the email based on their industry, previous communications, and specific needs
- Reference past conversations and interactions when available`;
    } else if (context === 'whatsapp') {
      systemPrompt += `\nContext: WhatsApp Communication
- Keep messages concise and friendly
- Use appropriate emojis sparingly
- Maintain professional tone while being approachable
- Include specific product models when discussing technical solutions`;
    } else if (context === 'leads') {
      systemPrompt += `\nContext: Lead Management
- Help qualify leads based on requirements
- Suggest follow-up strategies with specific questions tailored to the lead's industry
- Recommend appropriate products/solutions with exact model numbers
- If a specific lead is selected, create targeted qualification questions based on their description, industry, and current status
- Focus on understanding their technical requirements, budget, timeline, and decision-making process`;
    } else if (context === 'sales') {
      systemPrompt += `\nContext: Sales Strategy
- Provide specific product recommendations with exact brand names and model numbers
- Suggest cross-selling and upselling opportunities
- Help identify customer pain points and matching solutions
- Always specify technical specifications when relevant`;
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${data.error?.message || 'Unknown error'}`);
    }

    const aiResponse = data.choices[0].message.content;

    // Log the interaction for learning purposes
    try {
      await supabase
        .from('ai_interactions')
        .insert({
          user_id: userId,
          branch_id: branchId,
          context: context,
          user_message: message,
          ai_response: aiResponse,
        });
    } catch (error) {
      console.error('Error logging AI interaction:', error);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        response: aiResponse,
        context: context
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in ai-assistant function:', error);
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message 
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);