import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { email, vendor_id, company_name } = await req.json()

    // Generate a temporary password
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8)

    // Create user in auth
    const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: {
        role: 'vendor',
        company_name
      }
    })

    if (authError) {
      throw new Error(`Failed to create user: ${authError.message}`)
    }

    // Create vendor user record
    const { error: vendorUserError } = await supabaseClient
      .from('vendor_users')
      .insert({
        user_id: authUser.user.id,
        vendor_id,
        is_primary_contact: true
      })

    if (vendorUserError) {
      throw new Error(`Failed to create vendor user record: ${vendorUserError.message}`)
    }

    // Send email with credentials (you can implement email sending here)
    console.log(`Vendor account created for ${email} with password: ${tempPassword}`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Vendor user account created successfully',
        user_id: authUser.user.id,
        temp_password: tempPassword
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})