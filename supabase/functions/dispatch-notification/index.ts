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

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { order_id } = await req.json();

    console.log(`Dispatch Notification: Checking order ${order_id}`);

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        order_no,
        customer_id,
        total_amount,
        status,
        branch_id,
        customers (name, company, phone, email)
      `)
      .eq('id', order_id)
      .single();

    if (orderError || !order) {
      console.error('Error fetching order:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if order is fully paid
    const { data: isFullyPaid, error: checkError } = await supabase
      .rpc('is_order_fully_paid', { p_order_id: order_id });

    if (checkError) {
      console.error('Error checking payment status:', checkError);
      return new Response(
        JSON.stringify({ error: 'Failed to check payment status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!isFullyPaid) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Order is not fully paid yet',
          order_status: order.status 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create dispatch notification record
    const { data: notification, error: notificationError } = await supabase
      .from('communications')
      .insert({
        branch_id: order.branch_id,
        contact_type: 'internal',
        direction: 'outbound',
        from_contact: 'accounts@system',
        to_contact: 'dispatch@system',
        subject: `Order Ready for Shipping - ${order.order_no}`,
        message: `Order ${order.order_no} for customer ${order.customers.name} has been fully paid and is ready for dispatch. Total Amount: ₹${order.total_amount}`,
        status: 'sent',
        related_entity_type: 'orders',
        related_entity_id: order_id,
        metadata: {
          notification_type: 'dispatch_ready',
          order_id,
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          customer_name: order.customers.name,
          customer_phone: order.customers.phone,
          priority: 'high'
        }
      })
      .select()
      .single();

    if (notificationError) {
      console.error('Error creating dispatch notification:', notificationError);
      return new Response(
        JSON.stringify({ error: 'Failed to create dispatch notification' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Dispatch notification created for order ${order.order_no}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Dispatch notification sent successfully',
        data: {
          order_no: order.order_no,
          customer_name: order.customers.name,
          notification_id: notification.id,
          status: 'ready_for_dispatch'
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Dispatch Notification Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});