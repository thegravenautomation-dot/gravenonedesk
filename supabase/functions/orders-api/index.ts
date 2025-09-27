import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Input validation schemas
const uploadFileSchema = {
  validate: (data: any) => {
    if (!data.file || !data.fileName) {
      throw new Error('File and fileName are required')
    }
    if (data.fileName.length > 255) {
      throw new Error('File name must be less than 255 characters')
    }
    // Validate file type
    const allowedTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
    const fileExt = data.fileName.split('.').pop()?.toLowerCase()
    if (!fileExt || !allowedTypes.includes(fileExt)) {
      throw new Error('Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX')
    }
    return true
  }
}

const paymentSchema = {
  validate: (data: any) => {
    if (!data.amount || !data.payment_date || !data.payment_mode) {
      throw new Error('Amount, payment_date, and payment_mode are required')
    }
    if (isNaN(data.amount) || data.amount <= 0) {
      throw new Error('Amount must be a positive number')
    }
    if (data.amount > 10000000) {
      throw new Error('Amount cannot exceed 10,000,000')
    }
    const validModes = ['Cash', 'UPI', 'Net Banking', 'Cheque']
    if (!validModes.includes(data.payment_mode)) {
      throw new Error('Invalid payment mode. Must be: Cash, UPI, Net Banking, or Cheque')
    }
    if (data.remarks && data.remarks.length > 1000) {
      throw new Error('Remarks must be less than 1000 characters')
    }
    return true
  }
}

serve(async (req): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    
    // Extract order ID from path
    const orderIdIndex = pathParts.indexOf('orders') + 1
    const orderId = pathParts[orderIdIndex]
    const action = pathParts[orderIdIndex + 1]

    if (!orderId) {
      return new Response(JSON.stringify({ error: 'Order ID is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Verify order exists and get user permissions
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*, customers(name)')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return new Response(JSON.stringify({ error: 'Order not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Route to appropriate handler
    switch (action) {
      case 'upload-purchase-order':
        return await handleUploadPurchaseOrder(req, orderId, order)
      
      case 'upload-payment-receipt':
        return await handleUploadPaymentReceipt(req, orderId, order)
      
      case 'record-payment':
        return await handleRecordPayment(req, orderId, order)
      
      case 'payments':
        if (req.method === 'GET') {
          return await handleGetPayments(orderId)
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

async function handleUploadPurchaseOrder(req: Request, orderId: string, order: any) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string || file.name

    uploadFileSchema.validate({ file, fileName })

    // Create unique file path
    const timestamp = Date.now()
    const fileExt = fileName.split('.').pop()
    const filePath = `${order.branch_id}/purchase-orders/${orderId}-${timestamp}.${fileExt}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    // Update order record
    const { error: updateError } = await supabase
      .from('orders')
      .update({ purchase_order_attachment: filePath })
      .eq('id', orderId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({
      success: true,
      message: 'Purchase order uploaded successfully',
      filePath: filePath
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleUploadPaymentReceipt(req: Request, orderId: string, order: any) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileName = formData.get('fileName') as string || file.name

    uploadFileSchema.validate({ file, fileName })

    // Create unique file path
    const timestamp = Date.now()
    const fileExt = fileName.split('.').pop()
    const filePath = `${order.branch_id}/payment-receipts/${orderId}-${timestamp}.${fileExt}`

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('order-attachments')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      })

    if (uploadError) throw uploadError

    // Update order record
    const { error: updateError } = await supabase
      .from('orders')
      .update({ payment_receipt_attachment: filePath })
      .eq('id', orderId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment receipt uploaded successfully',
      filePath: filePath
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Upload error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleRecordPayment(req: Request, orderId: string, order: any) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  try {
    const body = await req.json()
    paymentSchema.validate(body)

    // Business Rule: Check if payment exceeds total order value
    const { data: existingPayments } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', orderId)

    const totalPaid = existingPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
    const newTotal = totalPaid + Number(body.amount)

    if (newTotal > Number(order.total_amount)) {
      return new Response(JSON.stringify({
        error: `Payment amount exceeds order balance. Order total: ₹${order.total_amount}, Already paid: ₹${totalPaid}, Available balance: ₹${order.total_amount - totalPaid}`
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Record payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        customer_id: order.customer_id,
        branch_id: order.branch_id,
        amount: body.amount,
        payment_date: body.payment_date,
        method: body.payment_mode,
        payment_mode: body.payment_mode.toLowerCase(),
        payment_mode_extended: body.payment_mode,
        reference: body.reference || null,
        note: body.remarks || null,
        created_by: body.created_by || null
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // Auto-update customer ledger (handled by trigger)
    // Auto-update order status if fully paid (handled by trigger)

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment recorded successfully',
      payment: payment,
      remaining_balance: order.total_amount - newTotal
    }), {
      status: 201,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Payment recording error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Payment recording failed'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}

async function handleGetPayments(orderId: string) {
  try {
    // Get order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('total_amount, customers(name)')
      .eq('id', orderId)
      .single()

    if (orderError) throw orderError

    // Get all payments for this order
    const { data: payments, error: paymentsError } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', orderId)
      .order('payment_date', { ascending: false })

    if (paymentsError) throw paymentsError

    const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0)
    const balanceDue = Number(order.total_amount) - totalPaid

    return new Response(JSON.stringify({
      order_id: orderId,
      customer_name: (order.customers as any)?.name,
      total_amount: order.total_amount,
      total_paid: totalPaid,
      balance_due: balanceDue,
      payment_status: balanceDue <= 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'pending',
      payments: payments
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('Get payments error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch payments'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
}