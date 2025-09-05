import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('TRADEINDIA_API_KEY');
    const sellerId = Deno.env.get('TRADEINDIA_SELLER_ID');
    if (!apiKey || !sellerId) {
      return new Response(JSON.stringify({
        error: 'TradeIndia not configured',
        details: 'Missing TRADEINDIA_API_KEY or TRADEINDIA_SELLER_ID secret.'
      }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

    console.log('Starting intelligent TradeIndia sync...');

    // Fetch active branches
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true);

    if (branchError) throw new Error(branchError.message);

    let processed = 0; 
    let created = 0;

    for (const branch of branches || []) {
      console.log(`Processing TradeIndia for branch: ${branch.name}`);

      try {
        // Check sync status and rate limits
        const { data: syncStatus } = await supabase
          .from('sync_status')
          .select('*')
          .eq('source_name', 'tradeindia')
          .eq('branch_id', branch.id)
          .maybeSingle();

        // Check if we're rate limited
        if (syncStatus?.rate_limit_until && new Date(syncStatus.rate_limit_until) > new Date()) {
          console.log(`Branch ${branch.name} is rate limited until ${syncStatus.rate_limit_until}`);
          continue;
        }

        // Get leads since last sync or last 24 hours
        const since = syncStatus?.last_sync_at 
          ? new Date(syncStatus.last_sync_at).toISOString()
          : new Date(Date.now() - 24*60*60*1000).toISOString();
        
        // NOTE: Replace this placeholder with actual TradeIndia API endpoint/params
        const url = `https://api.tradeindia.com/leads?api_key=${apiKey}&seller_id=${sellerId}&since=${since}`;

        console.log('Calling TradeIndia API for branch:', branch.name);

        const res = await fetch(url);
        
        if (res.status === 429) {
          console.log(`TradeIndia rate limited for branch ${branch.name}`);
          await supabase.rpc('update_sync_status', {
            p_source_name: 'tradeindia',
            p_branch_id: branch.id,
            p_success: false,
            p_error_message: 'Rate limit exceeded'
          });
          continue;
        }

        if (!res.ok) {
          console.warn(`TradeIndia API returned ${res.status} for branch ${branch.name}`);
          await supabase.rpc('update_sync_status', {
            p_source_name: 'tradeindia',
            p_branch_id: branch.id,
            p_success: false,
            p_error_message: `API error: ${res.status} ${res.statusText}`
          });
          continue;
        }

        const payload = await res.json();
        const items = Array.isArray(payload?.leads) ? payload.leads : [];
        let branchNewLeads = 0;

        for (const item of items) {
          processed++;
          const externalId = item?.inquiry_id || item?.id;
          if (!externalId) continue;

          const { data: exists } = await supabase
            .from('leads')
            .select('id')
            .eq('external_id', externalId)
            .eq('branch_id', branch.id)
            .maybeSingle();
          if (exists) continue;

          const { error: captureErr } = await supabase.functions.invoke('lead-capture', {
            body: { source: 'tradeindia', leadData: item, branchId: branch.id }
          });
          
          if (!captureErr) {
            created++;
            branchNewLeads++;
            console.log(`Successfully processed TradeIndia lead: ${externalId}`);
          } else {
            console.error('Error processing TradeIndia lead:', captureErr);
          }
        }

        // Update successful sync status
        await supabase.rpc('update_sync_status', {
          p_source_name: 'tradeindia',
          p_branch_id: branch.id,
          p_success: true,
          p_error_message: null
        });

        console.log(`Branch ${branch.name}: ${branchNewLeads} new leads from ${items.length} total`);
      } catch (error: any) {
        console.error(`Error processing TradeIndia for branch ${branch.name}:`, error);
        await supabase.rpc('update_sync_status', {
          p_source_name: 'tradeindia',
          p_branch_id: branch.id,
          p_success: false,
          p_error_message: error.message
        });
      }
    }

    console.log(`TradeIndia sync completed. Processed: ${processed}, New: ${created}`);

    return new Response(JSON.stringify({ 
      success: true, 
      processed, 
      new: created,
      message: 'TradeIndia intelligent sync completed successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (e: any) {
    console.error('tradeindia-sync error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  }
});