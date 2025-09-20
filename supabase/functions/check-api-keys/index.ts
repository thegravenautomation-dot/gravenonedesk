import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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
    const configuredKeys: string[] = [];

    // Check which API keys are configured
    const keyNames = [
      'INDIAMART_API_KEY',
      'TRADEINDIA_API_KEY', 
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'RESEND_API_KEY',
      'OPENAI_API_KEY'
    ];

    for (const keyName of keyNames) {
      const keyValue = Deno.env.get(keyName);
      if (keyValue && keyValue.trim() !== '') {
        configuredKeys.push(keyName);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        keys: configuredKeys 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error checking API keys:', error);
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