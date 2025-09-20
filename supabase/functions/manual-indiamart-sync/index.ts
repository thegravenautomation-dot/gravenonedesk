import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    const { branchId } = await req.json();
    
    const apiKey = Deno.env.get('INDIAMART_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'IndiaMART API key not configured' }),
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

    console.log('Starting manual IndiaMART sync for branch:', branchId);

    // Get the last 24 hours for testing
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const endTime = new Date();

    // Format dates for IndiaMART API
    const formatDate = (date: Date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };

    const indiaMArtUrl = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${apiKey}&start_time=${encodeURIComponent(formatDate(startTime))}&end_time=${encodeURIComponent(formatDate(endTime))}`;
    
    console.log('Calling IndiaMART API...');

    const response = await fetch(indiaMArtUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();
    console.log('IndiaMART API response:', {
      status: response.status,
      code: responseData.CODE,
      message: responseData.MESSAGE,
      totalRecords: responseData.TOTAL_RECORDS
    });

    if (!response.ok) {
      throw new Error(`IndiaMART API error: ${response.status} - ${responseData.MESSAGE}`);
    }

    let processed = 0;
    let newLeads = 0;

    if (responseData.STATUS === 'SUCCESS' && responseData.RESPONSE) {
      const leads = Array.isArray(responseData.RESPONSE) ? responseData.RESPONSE : [responseData.RESPONSE];

      for (const leadData of leads) {
        processed++;

        // Check if lead already exists
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id')
          .eq('external_id', leadData.UNIQUE_QUERY_ID)
          .eq('branch_id', branchId)
          .maybeSingle();

        if (existingLead) {
          console.log(`Lead ${leadData.UNIQUE_QUERY_ID} already exists, skipping...`);
          continue;
        }

        // Process new lead using lead-capture function
        try {
          const captureResponse = await supabase.functions.invoke('lead-capture', {
            body: {
              source: 'indiamart',
              leadData: leadData,
              branchId: branchId
            }
          });

          if (captureResponse.error) {
            console.error('Error processing lead via lead-capture:', captureResponse.error);
          } else {
            newLeads++;
            console.log(`Successfully processed lead: ${leadData.UNIQUE_QUERY_ID}`);
          }
        } catch (error) {
          console.error('Error calling lead-capture function:', error);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processed,
        newLeads,
        message: `Manual sync completed. Processed: ${processed}, New: ${newLeads}`,
        apiResponse: responseData
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in manual-indiamart-sync function:', error);
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