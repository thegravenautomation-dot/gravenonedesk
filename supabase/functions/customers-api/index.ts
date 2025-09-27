import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    
    // Extract customer ID from path
    const customerIdIndex = pathParts.indexOf('customers') + 1
    const customerId = pathParts[customerIdIndex]
    const action = pathParts[customerIdIndex + 1]

    if (!customerId) {
      return new Response(JSON.stringify({ error: 'Customer ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route to appropriate handler
    switch (action) {
      case 'ledger':
        if (req.method === 'GET') {
          return await handleGetCustomerLedger(req, customerId)
        }
        break
    }

    return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('API Error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

async function handleGetCustomerLedger(req: Request, customerId: string) {
  try {
    const url = new URL(req.url)
    const fromDate = url.searchParams.get('from_date')
    const toDate = url.searchParams.get('to_date')
    const limit = parseInt(url.searchParams.get('limit') || '100')
    const offset = parseInt(url.searchParams.get('offset') || '0')

    // Validate limit
    if (limit > 1000) {
      return new Response(JSON.stringify({ error: 'Limit cannot exceed 1000 records' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Get customer details
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (customerError || !customer) {
      return new Response(JSON.stringify({ error: 'Customer not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build query for ledger entries
    let query = supabase
      .from('customer_ledger')
      .select(`
        *,
        orders:reference_id(order_no, total_amount),
        payments:payment_id(amount, payment_mode_extended, payment_date)
      `)
      .eq('customer_id', customerId)
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false })

    // Apply date filters if provided
    if (fromDate) {
      query = query.gte('transaction_date', fromDate)
    }
    if (toDate) {
      query = query.lte('transaction_date', toDate)
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: ledgerEntries, error: ledgerError } = await query

    if (ledgerError) throw ledgerError

    // Get account summary using RPC function
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_customer_account_summary', { p_customer_id: customerId })

    if (summaryError) throw summaryError

    const accountSummary = summaryData[0] || {
      total_orders: 0,
      total_payments: 0,
      current_balance: 0,
      total_due: 0
    }

    // Group ledger entries by order for better organization
    const orderWiseEntries: Record<string, any> = {}
    ledgerEntries.forEach((entry: any) => {
      if (entry.reference_type === 'orders' && entry.reference_id) {
        if (!orderWiseEntries[entry.reference_id]) {
          orderWiseEntries[entry.reference_id] = {
            order: entry.orders,
            entries: []
          }
        }
        orderWiseEntries[entry.reference_id].entries.push(entry)
      }
    })

    return new Response(JSON.stringify({
      customer: {
        id: customer.id,
        name: customer.name,
        company: customer.company,
        email: customer.email,
        phone: customer.phone,
        gstin: customer.gstin
      },
      account_summary: {
        total_orders: Number(accountSummary.total_orders),
        total_payments: Number(accountSummary.total_payments),
        current_balance: Number(accountSummary.current_balance),
        total_due: Number(accountSummary.total_due),
        account_status: accountSummary.current_balance >= 0 ? 'credit' : 'debit'
      },
      ledger_entries: ledgerEntries,
      order_wise_summary: orderWiseEntries,
      pagination: {
        limit: limit,
        offset: offset,
        total_entries: ledgerEntries.length,
        has_more: ledgerEntries.length === limit
      },
      filters: {
        from_date: fromDate,
        to_date: toDate
      },
      generated_at: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Get customer ledger error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}