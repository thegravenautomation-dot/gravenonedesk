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

    // Fetch active branches
    const { data: branches, error: branchError } = await supabase
      .from('branches')
      .select('id, name')
      .eq('is_active', true);

    if (branchError) throw new Error(branchError.message);

    let processed = 0; let created = 0;

    for (const branch of branches || []) {
      // NOTE: Replace this placeholder with actual TradeIndia API endpoint/params
      const since = new Date(Date.now() - 24*60*60*1000).toISOString();
      const url = `https://api.tradeindia.com/leads?api_key=${apiKey}&seller_id=${sellerId}&since=${since}`;

      const res = await fetch(url);
      if (!res.ok) {
        console.warn(`TradeIndia API returned ${res.status} for branch ${branch.name}`);
        continue;
      }
      const payload = await res.json();
      const items = Array.isArray(payload?.leads) ? payload.leads : [];

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
        if (!captureErr) created++;
      }
    }

    return new Response(JSON.stringify({ success: true, processed, new: created }), {
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