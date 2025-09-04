import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      return new Response(
        JSON.stringify({ error: 'WhatsApp credentials not configured' }),
        { 
          status: 500, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    if (req.method === 'GET') {
      // Webhook verification for WhatsApp
      const url = new URL(req.url);
      const mode = url.searchParams.get('hub.mode');
      const token = url.searchParams.get('hub.verify_token');
      const challenge = url.searchParams.get('hub.challenge');

      const verifyToken = 'graven_whatsapp_verify_token'; // Set this as your verify token

      if (mode === 'subscribe' && token === verifyToken) {
        console.log('WhatsApp webhook verified successfully');
        return new Response(challenge, { 
          status: 200,
          headers: { 'Content-Type': 'text/plain', ...corsHeaders }
        });
      } else {
        return new Response('Forbidden', { 
          status: 403,
          headers: corsHeaders
        });
      }
    }

    if (req.method === 'POST') {
      const body = await req.json();
      console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));

      // Process incoming messages
      if (body.entry && body.entry[0] && body.entry[0].changes && body.entry[0].changes[0]) {
        const change = body.entry[0].changes[0];
        
        if (change.field === 'messages' && change.value.messages) {
          const message = change.value.messages[0];
          const contact = change.value.contacts ? change.value.contacts[0] : null;
          
          console.log('Processing WhatsApp message:', message);

          // Extract message details
          const waId = message.from;
          const messageText = message.text ? message.text.body : 'Media message';
          const contactName = contact ? contact.profile.name : 'Unknown';

          // Get default branch (for now - you might want to implement routing logic)
          const { data: defaultBranch } = await supabase
            .from('branches')
            .select('id')
            .eq('is_active', true)
            .limit(1)
            .single();

          if (defaultBranch) {
            // Create lead from WhatsApp message
            const leadData = {
              wa_id: waId,
              message: messageText,
              contact_name: contactName,
              timestamp: new Date(parseInt(message.timestamp) * 1000).toISOString()
            };

            try {
              const captureResponse = await supabase.functions.invoke('lead-capture', {
                body: {
                  source: 'whatsapp',
                  leadData: leadData,
                  branchId: defaultBranch.id
                }
              });

              if (captureResponse.error) {
                console.error('Error processing WhatsApp lead:', captureResponse.error);
              } else {
                console.log('WhatsApp lead processed successfully');

                // Send acknowledgment message
                const replyMessage = {
                  messaging_product: 'whatsapp',
                  to: waId,
                  text: {
                    body: 'Thank you for your inquiry! We have received your message and will get back to you soon. 🙏'
                  }
                };

                const whatsappApiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
                
                await fetch(whatsappApiUrl, {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(replyMessage)
                });

                console.log('Acknowledgment message sent to WhatsApp');
              }
            } catch (error) {
              console.error('Error calling lead-capture function:', error);
            }
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders
    });

  } catch (error: any) {
    console.error('Error in whatsapp-webhook function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);