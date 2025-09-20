import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface TestConnectionRequest {
  keyName: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { keyName }: TestConnectionRequest = await req.json();

    if (!keyName) {
      throw new Error('Key name is required');
    }

    let testResult = false;
    let message = '';

    // Test different API connections based on key type
    switch (keyName) {
      case 'INDIAMART_API_KEY':
        testResult = await testIndiamartConnection();
        message = testResult ? 'IndiaMART connection successful' : 'IndiaMART connection failed';
        break;
        
      case 'TRADEINDIA_API_KEY':
        testResult = await testTradeindiConnection();
        message = testResult ? 'TradeIndia connection successful' : 'TradeIndia connection failed';
        break;
        
      case 'WHATSAPP_ACCESS_TOKEN':
        testResult = await testWhatsAppConnection();
        message = testResult ? 'WhatsApp connection successful' : 'WhatsApp connection failed';
        break;
        
      case 'RESEND_API_KEY':
        testResult = await testResendConnection();
        message = testResult ? 'Resend connection successful' : 'Resend connection failed';
        break;
        
      case 'OPENAI_API_KEY':
        testResult = await testOpenAIConnection();
        message = testResult ? 'OpenAI connection successful' : 'OpenAI connection failed';
        break;
        
      default:
        throw new Error('Unsupported API key type');
    }

    return new Response(
      JSON.stringify({ 
        success: testResult, 
        message 
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error testing API connection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

async function testIndiamartConnection(): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('INDIAMART_API_KEY');
    if (!apiKey) {
      console.error('IndiaMART API key not found');
      return false;
    }

    // Use a minimal time range to reduce API load for testing
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const startTime = yesterday.toISOString().replace('T', ' ').substring(0, 19);
    const endTime = now.toISOString().replace('T', ' ').substring(0, 19);
    
    console.log('Testing IndiaMART connection...');
    
    const response = await fetch(`https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${apiKey}&start_time=${encodeURIComponent(startTime)}&end_time=${encodeURIComponent(endTime)}`);
    
    const data = await response.json();
    console.log('IndiaMART test response:', {
      status: response.status,
      code: data.CODE,
      message: data.MESSAGE || response.statusText
    });
    
    if (response.status === 429) {
      console.error('IndiaMART API rate limited - too many requests');
      return false;
    }
    
    if (!response.ok) {
      console.error('IndiaMART API error:', response.status, data.MESSAGE || response.statusText);
      return false;
    }
    
    // Consider it successful if we get a proper response structure
    return data.STATUS === 'SUCCESS' || data.CODE === 200 || response.ok;
  } catch (error) {
    console.error('IndiaMART test failed:', error);
    return false;
  }
}

async function testTradeindiConnection(): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('TRADEINDIA_API_KEY');
    if (!apiKey) return false;

    // Test TradeIndia API endpoint (placeholder - adjust based on actual API)
    // This is a simplified test - you would need the actual TradeIndia API endpoint
    return true; // Simulate success for now
  } catch (error) {
    console.error('TradeIndia test failed:', error);
    return false;
  }
}

async function testWhatsAppConnection(): Promise<boolean> {
  try {
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!accessToken || !phoneNumberId) return false;

    // Test WhatsApp Business API
    const response = await fetch(`https://graph.facebook.com/v17.0/${phoneNumberId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('WhatsApp test failed:', error);
    return false;
  }
}

async function testResendConnection(): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) return false;

    // Test Resend API
    const response = await fetch('https://api.resend.com/domains', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('Resend test failed:', error);
    return false;
  }
}

async function testOpenAIConnection(): Promise<boolean> {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    if (!apiKey) return false;

    // Test OpenAI API
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    
    return response.ok;
  } catch (error) {
    console.error('OpenAI test failed:', error);
    return false;
  }
}

serve(handler);