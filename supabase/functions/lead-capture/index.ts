import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LeadCaptureRequest {
  source: 'indiamart' | 'tradeindia' | 'whatsapp' | 'website' | 'manual';
  leadData: any;
  branchId: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { source, leadData, branchId }: LeadCaptureRequest = await req.json();
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log(`Processing lead from ${source}:`, leadData);

    // Get lead source ID
    const { data: leadSource, error: sourceError } = await supabase
      .from('lead_sources')
      .select('id')
      .eq('source_type', source)
      .eq('branch_id', branchId)
      .single();

    if (sourceError) {
      console.error('Error finding lead source:', sourceError);
      return new Response(
        JSON.stringify({ error: 'Lead source not found' }),
        { 
          status: 400, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Process lead data based on source
    let processedLead: any = {};
    
    switch (source) {
      case 'indiamart':
        processedLead = {
          title: leadData.SUBJECT || 'IndiaMART Inquiry',
          description: leadData.QUERY_MESSAGE || leadData.PRODUCT_NAME || '',
          source: 'IndiaMART',
          external_id: leadData.UNIQUE_QUERY_ID,
          raw_data: leadData,
          branch_id: branchId,
           lead_source_id: leadSource.id,
          status: 'new'
        };
        
        // Check if customer exists or create new one
        const { data: existingCustomer, error: customerError } = await supabase
          .from('customers')
          .select('id')
          .eq('email', leadData.SENDER_EMAIL)
          .eq('branch_id', branchId)
          .maybeSingle();

        if (!existingCustomer && !customerError) {
          const { data: newCustomer, error: newCustomerError } = await supabase
            .from('customers')
            .insert({
              name: leadData.SENDER_NAME,
              company: leadData.SENDER_COMPANY,
              email: leadData.SENDER_EMAIL,
              phone: leadData.SENDER_MOBILE,
              address: leadData.SENDER_ADDRESS,
              city: leadData.SENDER_CITY,
              state: leadData.SENDER_STATE,
              branch_id: branchId
            })
            .select('id')
            .single();

          if (newCustomerError) {
            console.error('Error creating customer:', newCustomerError);
          } else {
            processedLead.customer_id = newCustomer.id;
          }
        } else if (existingCustomer) {
          processedLead.customer_id = existingCustomer.id;
        }
        break;

      case 'tradeindia':
        processedLead = {
          title: leadData.product_name || 'TradeIndia Inquiry',
          description: leadData.message || leadData.requirements || '',
          source: 'TradeIndia',
          external_id: leadData.inquiry_id,
          raw_data: leadData,
          branch_id: branchId,
           lead_source_id: leadSource.id,
          status: 'new'
        };
        break;

      case 'whatsapp':
        processedLead = {
          title: 'WhatsApp Inquiry',
          description: leadData.message || 'WhatsApp inquiry',
          source: 'WhatsApp',
          external_id: leadData.wa_id,
          raw_data: leadData,
          branch_id: branchId,
           lead_source_id: leadSource.id,
          status: 'new'
        };
        break;

      default:
        processedLead = {
          title: leadData.title || 'New Lead',
          description: leadData.description || '',
          source: source,
          raw_data: leadData,
          branch_id: branchId,
           lead_source_id: leadSource.id,
          status: 'new'
        };
    }

    // Generate a collision-resistant lead number (timestamp + random)
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    const rand = Math.floor(100 + Math.random() * 900); // 3 digits
    const leadNumber = `LD-${y}${m}${d}${hh}${mm}${ss}-${rand}`;
    processedLead.lead_no = leadNumber;

    // Insert the lead
    const { data: newLead, error: leadError } = await supabase
      .from('leads')
      .insert(processedLead)
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
      return new Response(
        JSON.stringify({ error: 'Failed to create lead', details: leadError.message }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    console.log('Lead created successfully:', newLead);

    // Apply enhanced lead assignment using dedicated function
    try {
      const assignmentResult = await supabase.functions.invoke('lead-assignment', {
        body: { 
          leadId: newLead.id, 
          branchId: branchId,
          forceReassign: false
        }
      });

      if (assignmentResult.error) {
        console.error('Lead assignment error:', assignmentResult.error);
      } else {
        console.log('Lead assignment result:', assignmentResult.data);
      }
    } catch (assignmentError) {
      console.error('Failed to invoke lead assignment:', assignmentError);
      // Continue without failing the entire lead capture process
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        leadId: newLead.id,
        leadNumber: leadNumber,
        message: 'Lead captured and processed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in lead-capture function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);