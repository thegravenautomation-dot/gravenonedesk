import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/');
    const action = pathSegments[pathSegments.length - 2]; // 'ledger' or 'summary'
    const customerId = pathSegments[pathSegments.length - 1];

    console.log(`Customer Ledger API: ${action} for customer ${customerId}`);

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: 'Customer ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/accounts/ledger/:customer_id
    if (action === 'ledger' && req.method === 'GET') {
      const { data: ledgerEntries, error } = await supabase
        .from('customer_ledger')
        .select(`
          id,
          customer_id,
          transaction_date,
          transaction_type,
          reference_type,
          reference_id,
          description,
          debit_amount,
          credit_amount,
          balance,
          payment_mode,
          created_at
        `)
        .eq('customer_id', customerId)
        .order('transaction_date', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching ledger entries:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch ledger entries' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: ledgerEntries,
          total_entries: ledgerEntries?.length || 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /api/accounts/summary/:customer_id
    if (action === 'summary' && req.method === 'GET') {
      const { data: summary, error } = await supabase
        .rpc('get_customer_account_summary', { p_customer_id: customerId });

      if (error) {
        console.error('Error fetching account summary:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch account summary' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const summaryData = summary && summary.length > 0 ? summary[0] : {
        total_orders: 0,
        total_payments: 0,
        current_balance: 0,
        total_due: 0
      };

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            customer_id: customerId,
            total_orders: parseFloat(summaryData.total_orders || 0),
            total_payments: parseFloat(summaryData.total_payments || 0),
            current_balance: parseFloat(summaryData.current_balance || 0),
            total_due: parseFloat(summaryData.total_due || 0),
            payment_status: summaryData.total_due > 0 ? 'pending' : 'paid'
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid endpoint or method' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Customer Ledger API Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});