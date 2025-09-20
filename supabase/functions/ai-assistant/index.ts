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
    const { message, context = 'general', userId, branchId } = await req.json();
    
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

      // Get recent business data for context
      if (context === 'leads' || context === 'sales') {
        const { data: recentLeads } = await supabase
          .from('leads')
          .select(`
            title, description, value, source, status,
            customers (name, company, industry)
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
          .select('name, company, industry, location')
          .eq('branch_id', branchId)
          .order('created_at', { ascending: false })
          .limit(10);

        if (recentCustomers && recentCustomers.length > 0) {
          businessContext += `\nRecent Customers:\n`;
          recentCustomers.forEach(customer => {
            businessContext += `- ${customer.name} (${customer.company}) - ${customer.industry}\n`;
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

Key Responsibilities:
- Help with customer inquiries and provide product information
- Assist with sales strategies and lead qualification
- Draft professional emails and WhatsApp messages
- Suggest appropriate products/solutions for customers
- Provide industry insights and market trends
- Help with follow-up strategies

Guidelines:
- Always be professional and courteous
- Use industry-specific terminology appropriately
- Provide actionable suggestions
- When suggesting products, base it on customer needs and industry
- For pricing queries, recommend contacting the sales team
- Keep responses concise but comprehensive
`;

    // Add context-specific instructions
    if (context === 'email') {
      systemPrompt += `\nContext: Email Communication
- Help draft professional emails to customers, suppliers, or partners
- Ensure proper business email etiquette
- Include relevant product information when needed`;
    } else if (context === 'whatsapp') {
      systemPrompt += `\nContext: WhatsApp Communication
- Keep messages concise and friendly
- Use appropriate emojis sparingly
- Maintain professional tone while being approachable`;
    } else if (context === 'leads') {
      systemPrompt += `\nContext: Lead Management
- Help qualify leads based on requirements
- Suggest follow-up strategies
- Recommend appropriate products/solutions`;
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