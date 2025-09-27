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

interface RetryConfig {
  maxRetries: number;
  initialDelay: number; // milliseconds
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  backoffMultiplier: 2
};

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const result = await operation();
      
      // Log successful attempt if it wasn't the first
      if (attempt > 0) {
        console.log(`Email operation succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`Email attempt ${attempt + 1} failed:`, error);
      
      // Don't wait after the last attempt
      if (attempt < config.maxRetries) {
        const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
        console.log(`Retrying email in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

async function logEmailError(
  supabase: any, 
  branchId: string, 
  error: Error, 
  messageData: EmailMessage,
  senderEmail: string
): Promise<void> {
  try {
    await supabase
      .from('communications')
      .insert({
        branch_id: branchId,
        contact_type: 'email',
        direction: 'outbound',
        from_contact: senderEmail,
        to_contact: messageData.to,
        subject: messageData.subject,
        message: messageData.message,
        status: 'failed',
        related_entity_type: messageData.relatedEntityType,
        related_entity_id: messageData.relatedEntityId,
        metadata: {
          error_message: error.message,
          error_timestamp: new Date().toISOString(),
          template_id: messageData.templateId,
          template_variables: messageData.templateVariables
        }
      });
  } catch (logError) {
    console.error('Failed to log email error:', logError);
  }
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
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

    const messageData: EmailMessage = await req.json();

    // Validate required fields
    if (!messageData.to || !messageData.subject || !messageData.message) {
      return Response.json({ 
        error: 'Missing required fields: to, subject, and message are required' 
      }, { status: 400, headers: corsHeaders });
    }

    // Validate email format
    if (!validateEmail(messageData.to)) {
      return Response.json({ 
        error: 'Invalid email address format' 
      }, { status: 400, headers: corsHeaders });
    }

    // Get user profile for branch_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('branch_id, full_name, email')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404, headers: corsHeaders })
    }

    let finalSubject = messageData.subject
    let finalMessage = messageData.message

    // If template ID is provided, fetch and process template
    if (messageData.templateId) {
      const { data: template } = await supabase
        .from('communication_templates')
        .select('subject, template_body, variables')
        .eq('id', messageData.templateId)
        .eq('branch_id', profile.branch_id)
        .single()

      if (template) {
        finalSubject = template.subject || messageData.subject
        finalMessage = template.template_body
        
        // Replace template variables
        if (messageData.templateVariables) {
          Object.entries(messageData.templateVariables).forEach(([key, value]) => {
            finalSubject = finalSubject.replace(new RegExp(`{{${key}}}`, 'g'), value)
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), value)
          })
        }
      }
    }

    console.log(`Sending email to ${messageData.to}: ${finalSubject}`);

    // Enhanced email sending with retry mechanism
    const emailResponse = await retryWithBackoff(async () => {
      const response = await resend.emails.send({
        from: 'Graven OneDesk <onboarding@resend.dev>',
        to: [messageData.to],
        subject: finalSubject,
        html: finalMessage.replace(/\n/g, '<br>'),
        replyTo: profile.email || 'noreply@gravenautomation.com'
      });

      if (response.error) {
        console.error('Resend API error:', response.error);
        throw new Error(`Email sending failed: ${response.error.message}`);
      }
      
      return response;
    });

    console.log('Email sent successfully:', emailResponse.data?.id);

    // Log successful communication in database
    const { error: logError } = await supabase
      .from('communications')
      .insert({
        branch_id: profile.branch_id,
        contact_type: 'email',
        direction: 'outbound',
        from_contact: profile.email || 'system@gravenautomation.com',
        to_contact: messageData.to,
        subject: finalSubject,
        message: finalMessage,
        status: 'sent',
        related_entity_type: messageData.relatedEntityType,
        related_entity_id: messageData.relatedEntityId,
        sent_by: user.id,
        metadata: {
          email_id: emailResponse.data?.id,
          template_id: messageData.templateId,
          template_variables: messageData.templateVariables,
          sent_at: new Date().toISOString()
        }
      })

    if (logError) {
      console.error('Error logging communication:', logError)
    }

    return Response.json({ 
      success: true, 
      emailId: emailResponse.data?.id,
      message: 'Email sent successfully',
      to: messageData.to,
      subject: finalSubject
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error in send-communication-email function:', error);
    
    // Try to log error to database
    try {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );
      
      const authHeader = req.headers.get('Authorization')!;
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabase.auth.getUser(token);
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('branch_id, email')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const messageData: EmailMessage = await req.json();
          await logEmailError(supabase, profile.branch_id, error, messageData, profile.email || 'system@gravenautomation.com');
        }
      }
    } catch (logError) {
      console.error('Failed to log email error to database:', logError);
    }
    
    return Response.json(
      { 
        error: error.message,
        timestamp: new Date().toISOString(),
        type: 'email_send_error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
})