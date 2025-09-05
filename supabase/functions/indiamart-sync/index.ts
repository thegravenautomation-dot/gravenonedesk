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
    const apiKey = Deno.env.get('INDIAMART_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'IndiaMART API key not configured' }),
        { 
          status: 500, 
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

    console.log('Starting intelligent IndiaMART sync...');

    // Get all branches to sync leads for each
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true);

    if (branchError) {
      throw new Error(`Failed to fetch branches: ${branchError.message}`);
    }

    let totalProcessed = 0;
    let totalNew = 0;

    for (const branch of branches || []) {
      console.log(`Processing IndiaMART for branch: ${branch.name}`);

      try {
        // Check sync status and rate limits
        const { data: syncStatus } = await supabase
          .from('sync_status')
          .select('*')
          .eq('source_name', 'indiamart')
          .eq('branch_id', branch.id)
          .maybeSingle();

        // Check if we're rate limited
        if (syncStatus?.rate_limit_until && new Date(syncStatus.rate_limit_until) > new Date()) {
          console.log(`Branch ${branch.name} is rate limited until ${syncStatus.rate_limit_until}`);
          continue;
        }

        // Get the last sync timestamp for this branch
        const startTime = syncStatus?.last_sync_at 
          ? new Date(syncStatus.last_sync_at) 
          : new Date(Date.now() - 24 * 60 * 60 * 1000); // Last 24 hours
        const endTime = new Date();

        // IndiaMART API call to get leads
        const indiaMArtUrl = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${apiKey}&start_time=${startTime.toISOString()}&end_time=${endTime.toISOString()}`;
        
        console.log('Calling IndiaMART API for branch:', branch.name);

        const response = await fetch(indiaMArtUrl, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const responseData = await response.json();
        console.log(`IndiaMART API response for ${branch.name}:`, {
          status: response.status,
          code: responseData.CODE,
          message: responseData.MESSAGE,
          totalRecords: responseData.TOTAL_RECORDS
        });

        // Update sync status based on response
        if (response.status === 429 || responseData.CODE === 429) {
          await supabase.rpc('update_sync_status', {
            p_source_name: 'indiamart',
            p_branch_id: branch.id,
            p_success: false,
            p_error_message: responseData.MESSAGE || 'Rate limit exceeded'
          });
          console.log(`Rate limited for branch ${branch.name}`);
          continue;
        }

        if (!response.ok) {
          console.error(`IndiaMART API error for ${branch.name}: ${response.status} ${response.statusText}`);
          await supabase.rpc('update_sync_status', {
            p_source_name: 'indiamart',
            p_branch_id: branch.id,
            p_success: false,
            p_error_message: `API error: ${response.status} ${response.statusText}`
          });
          continue;
        }

        if (responseData.STATUS === 'SUCCESS' && responseData.RESPONSE) {
          const leads = Array.isArray(responseData.RESPONSE) ? responseData.RESPONSE : [responseData.RESPONSE];
          let branchNewLeads = 0;

          for (const leadData of leads) {
            totalProcessed++;

            // Check if lead already exists
            const { data: existingLead } = await supabase
              .from('leads')
              .select('id')
              .eq('external_id', leadData.UNIQUE_QUERY_ID)
              .eq('branch_id', branch.id)
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
                  branchId: branch.id
                }
              });

              if (captureResponse.error) {
                console.error('Error processing lead via lead-capture:', captureResponse.error);
              } else {
                totalNew++;
                branchNewLeads++;
                console.log(`Successfully processed lead: ${leadData.UNIQUE_QUERY_ID}`);
              }
            } catch (error) {
              console.error('Error calling lead-capture function:', error);
            }
          }

          // Update successful sync status
          await supabase.rpc('update_sync_status', {
            p_source_name: 'indiamart',
            p_branch_id: branch.id,
            p_success: true,
            p_error_message: null
          });

          console.log(`Branch ${branch.name}: ${branchNewLeads} new leads from ${leads.length} total`);
        } else {
          console.log('No new leads from IndiaMART for branch:', branch.name);
          // Update sync status even if no leads (successful sync)
          await supabase.rpc('update_sync_status', {
            p_source_name: 'indiamart',
            p_branch_id: branch.id,
            p_success: true,
            p_error_message: null
          });
        }
      } catch (error: any) {
        console.error(`Error processing branch ${branch.name}:`, error);
        await supabase.rpc('update_sync_status', {
          p_source_name: 'indiamart',
          p_branch_id: branch.id,
          p_success: false,
          p_error_message: error.message
        });
      }
    }

    console.log(`IndiaMART sync completed. Processed: ${totalProcessed}, New: ${totalNew}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        processed: totalProcessed,
        new: totalNew,
        message: 'IndiaMART intelligent sync completed successfully'
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in indiamart-sync function:', error);
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