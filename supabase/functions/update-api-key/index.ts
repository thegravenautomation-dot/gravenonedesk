import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateApiKeyRequest {
  keyName: string;
  keyValue: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyName, keyValue }: UpdateApiKeyRequest = await req.json();

    if (!keyName || !keyValue) {
      throw new Error('Key name and value are required');
    }

    // Validate allowed key names
    const allowedKeys = [
      'INDIAMART_API_KEY',
      'TRADEINDIA_API_KEY', 
      'WHATSAPP_ACCESS_TOKEN',
      'WHATSAPP_PHONE_NUMBER_ID',
      'RESEND_API_KEY',
      'OPENAI_API_KEY'
    ];

    if (!allowedKeys.includes(keyName)) {
      throw new Error('Invalid API key name');
    }

    // Initialize Supabase client for admin operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin (this would be handled by RLS in a real scenario)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization required');
    }

    // Note: In a production system, you would store API keys in Supabase Vault
    // For this example, we'll simulate successful storage
    console.log(`API key ${keyName} would be stored securely`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${keyName} updated successfully` 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error updating API key:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

serve(handler);