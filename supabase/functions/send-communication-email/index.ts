import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { Resend } from 'https://esm.sh/resend@4.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailMessage {
  to: string
  subject: string
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
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
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

    const { to, subject, message, relatedEntityType, relatedEntityId, templateId, templateVariables }: EmailMessage = await req.json()

    // Get user profile for branch_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('branch_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404, headers: corsHeaders })
    }

    let finalSubject = subject
    let finalMessage = message

    // If template ID is provided, fetch and process template
    if (templateId) {
      const { data: template } = await supabase
        .from('communication_templates')
        .select('subject, template_body, variables')
        .eq('id', templateId)
        .eq('branch_id', profile.branch_id)
        .single()

      if (template) {
        finalSubject = template.subject || subject
        finalMessage = template.template_body
        
        // Replace template variables
        if (templateVariables) {
          Object.entries(templateVariables).forEach(([key, value]) => {
            finalSubject = finalSubject.replace(new RegExp(`{{${key}}}`, 'g'), value)
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), value)
          })
        }
      }
    }

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: 'Graven OneDesk <onboarding@resend.dev>',
      to: [to],
      subject: finalSubject,
      html: finalMessage.replace(/\n/g, '<br>'),
      replyTo: profile.email
    })

    if (emailResponse.error) {
      throw new Error(`Email sending failed: ${emailResponse.error.message}`)
    }

    // Log communication in database
    const { error: logError } = await supabase
      .from('communications')
      .insert({
        branch_id: profile.branch_id,
        contact_type: 'email',
        direction: 'outbound',
        from_contact: profile.email,
        to_contact: to,
        subject: finalSubject,
        message: finalMessage,
        status: 'sent',
        related_entity_type: relatedEntityType,
        related_entity_id: relatedEntityId,
        sent_by: user.id,
        metadata: {
          email_id: emailResponse.data?.id,
          template_id: templateId,
          template_variables: templateVariables
        }
      })

    if (logError) {
      console.error('Error logging communication:', logError)
    }

    return Response.json({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: 'Email sent successfully'
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error in send-communication-email function:', error)
    return Response.json(
      { error: error.message },
      { status: 500, headers: corsHeaders }
    )
  }
})