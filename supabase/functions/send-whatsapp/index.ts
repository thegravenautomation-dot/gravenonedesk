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
        console.log(`Operation succeeded on attempt ${attempt + 1}`);
      }
      
      return result;
    } catch (error) {
      lastError = error as Error;
      console.log(`Attempt ${attempt + 1} failed:`, error);
      
      // Don't wait after the last attempt
      if (attempt < config.maxRetries) {
        const delay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

async function logCommunicationError(
  supabase: any, 
  branchId: string, 
  error: Error, 
  messageData: WhatsAppMessage
): Promise<void> {
  try {
    await supabase
      .from('communications')
      .insert({
        branch_id: branchId,
        contact_type: 'whatsapp',
        direction: 'outbound',
        from_contact: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '',
        to_contact: messageData.to,
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
    console.error('Failed to log communication error:', logError);
  }
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

    const messageData: WhatsAppMessage = await req.json();

    // Validate required fields
    if (!messageData.to || !messageData.message) {
      return Response.json({ 
        error: 'Missing required fields: to and message are required' 
      }, { status: 400, headers: corsHeaders });
    }

    // Get user profile for branch_id
    const { data: profile } = await supabase
      .from('profiles')
      .select('branch_id, full_name')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404, headers: corsHeaders })
    }

    let finalMessage = messageData.message

    // If template ID is provided, fetch and process template
    if (messageData.templateId) {
      const { data: template } = await supabase
        .from('communication_templates')
        .select('template_body, variables')
        .eq('id', messageData.templateId)
        .eq('branch_id', profile.branch_id)
        .single()

      if (template) {
        finalMessage = template.template_body
        
        // Replace template variables
        if (messageData.templateVariables) {
          Object.entries(messageData.templateVariables).forEach(([key, value]) => {
            finalMessage = finalMessage.replace(new RegExp(`{{${key}}}`, 'g'), value)
          })
        }
      }
    }

    // Clean phone number (remove non-numeric characters)
    const cleanPhoneNumber = messageData.to.replace(/[^\d]/g, '');
    
    // Validate phone number format
    if (cleanPhoneNumber.length < 10) {
      return Response.json({ 
        error: 'Invalid phone number format' 
      }, { status: 400, headers: corsHeaders });
    }

    console.log(`Sending WhatsApp message to ${cleanPhoneNumber}: ${finalMessage.substring(0, 50)}...`);

    // Enhanced WhatsApp API call with retry mechanism
    const whatsappResult = await retryWithBackoff(async () => {
      const response = await fetch(
        `https://graph.facebook.com/v18.0/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: cleanPhoneNumber,
            type: 'text',
            text: {
              body: finalMessage
            }
          })
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        const errorMessage = result.error?.message || `HTTP ${response.status}: ${response.statusText}`;
        console.error('WhatsApp API error:', result);
        
        // Check for rate limiting
        if (response.status === 429) {
          throw new Error(`Rate limited: ${errorMessage}`);
        }
        
        // Check for authentication errors
        if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${errorMessage}`);
        }
        
        throw new Error(`WhatsApp API error: ${errorMessage}`);
      }
      
      return result;
    });

    console.log('WhatsApp message sent successfully:', whatsappResult.messages?.[0]?.id);

    // Log successful communication in database
    const { error: logError } = await supabase
      .from('communications')
      .insert({
        branch_id: profile.branch_id,
        contact_type: 'whatsapp',
        direction: 'outbound',
        from_contact: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') || '',
        to_contact: cleanPhoneNumber,
        message: finalMessage,
        status: 'sent',
        related_entity_type: messageData.relatedEntityType,
        related_entity_id: messageData.relatedEntityId,
        sent_by: user.id,
        metadata: {
          whatsapp_message_id: whatsappResult.messages?.[0]?.id,
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
      messageId: whatsappResult.messages?.[0]?.id,
      message: 'WhatsApp message sent successfully',
      to: cleanPhoneNumber
    }, { headers: corsHeaders })

  } catch (error: any) {
    console.error('Error in send-whatsapp function:', error);
    
    // Try to get profile for error logging
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
          .select('branch_id')
          .eq('id', user.id)
          .single();
        
        if (profile) {
          const messageData: WhatsAppMessage = await req.json();
          await logCommunicationError(supabase, profile.branch_id, error, messageData);
        }
      }
    } catch (logError) {
      console.error('Failed to log error to database:', logError);
    }
    
    return Response.json(
      { 
        error: error.message,
        timestamp: new Date().toISOString(),
        type: 'whatsapp_send_error'
      },
      { status: 500, headers: corsHeaders }
    )
  }
})