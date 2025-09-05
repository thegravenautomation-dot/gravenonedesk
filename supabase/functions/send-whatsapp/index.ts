import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WhatsAppMessage {
  to: string
  message: string
  relatedEntityType?: string
  relatedEntityId?: string
  templateId?: string
  templateVariables?: Record<string, string>
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) {
      return new Response('Unauthorized', { status: 401, headers: corsHeaders })
    }

    const { to, message, relatedEntityType, relatedEntityId, templateId, templateVariables }: WhatsAppMessage = await req.json()

    // Get user profile for branch_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('branch_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404, headers: corsHeaders })
    }

    let finalMessage = message

    // If template ID is provided, fetch and process template
    if (templateId) {
      const { data: template } = await supabase
        .from('communication_templates')
        .select('template_body, variables')
        .eq('id', templateId)
        .eq('branch_id', profile.branch_id)
        .single()

      if (template) {
        finalMessage = template.template_body
        
        // Replace template variables
        if (templateVariables) {
          Object.entries(templateVariables).forEach(([key, value]) => {
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), value)
          })
        }
      }
    }

    // Send WhatsApp message via WhatsApp Business API
    const whatsappResponse = await fetch(
      `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^\d]/g, ''), // Remove non-numeric characters
          type: 'text',
          text: {
            body: finalMessage
          }
        })
      }
    )

    const whatsappResult = await whatsappResponse.json()
    
    if (!whatsappResponse.ok) {
      console.error('WhatsApp API error:', whatsappResult)
      throw new Error(`WhatsApp API error: ${whatsappResult.error?.message || 'Unknown error'}`)
    }

    // Log communication in database
    const { error: logError } = await supabase
      .from('communications')
      .insert({
        branch_id: profile.branch_id,
        contact_type: 'whatsapp',
        direction: 'outbound',
        from_contact: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '',
        to_contact: to,
        message: finalMessage,
        status: 'sent',
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        sent_by: user.id,
        metadata: {
          whatsapp_message_id: whatsappResult.messages?.[0]?.id,
          template_id: templateId,
          template_variables: templateVariables
        }
      })

    if (logError) {
      console.error('Error logging communication:', logError)
    }

    return Response.json({ 
      success: true, 
      messageId: whatsappResult.messages?.[0]?.id,
      message: 'WhatsApp message sent successfully'
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error in send-whatsapp function:', error)
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
})