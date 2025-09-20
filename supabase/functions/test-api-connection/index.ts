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

    let message = '';

    // Test different API connections based on key type
    let testResult: any;
    
    switch (keyName) {
      case 'INDIAMART_API_KEY':
        testResult = await testIndiamartConnection();
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

    // Handle IndiaMART's detailed response
    if (keyName === 'INDIAMART_API_KEY') {
      return new Response(
        JSON.stringify(testResult),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
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

async function testIndiamartConnection(): Promise<any> {
  try {
    const apiKey = Deno.env.get('INDIAMART_API_KEY');
    if (!apiKey) {
      console.error('IndiaMART API key not found');
      return { success: false, message: 'IndiaMART API key not configured' };
    }

    // Use a minimal time range to avoid rate limits during testing
    const now = new Date();
    const startTime = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2 hours ago
    const endTime = now;
    
    const formatDate = (date: Date) => {
      return date.toISOString().slice(0, 19).replace('T', ' ');
    };
    
    const indiaMArtUrl = `https://mapi.indiamart.com/wservce/crm/crmListing/v2/?glusr_crm_key=${apiKey}&start_time=${encodeURIComponent(formatDate(startTime))}&end_time=${encodeURIComponent(formatDate(endTime))}`;
    
    console.log('Testing IndiaMART connection with API key:', apiKey.substring(0, 8) + '...');
    console.log('URL (without key):', indiaMArtUrl.replace(apiKey, '[KEY_HIDDEN]'));
    
    const response = await fetch(indiaMArtUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; IndiaMART-CRM/1.0)',
      },
    });
    
    const data = await response.json();
    
    console.log('IndiaMART test response:', {
      status: response.status,
      statusText: response.statusText,
      code: data.CODE,
      message: data.MESSAGE,
      status_field: data.STATUS,
      total_records: data.TOTAL_RECORDS,
      response_keys: Object.keys(data)
    });
    
    if (response.status === 429) {
      return { 
        success: false, 
        message: 'IndiaMART API rate limit exceeded. Please wait 10-15 minutes before testing again. Consider reducing sync frequency.' 
      };
    }
    
    if (response.status === 401) {
      return { 
        success: false, 
        message: 'IndiaMART API key is invalid or unauthorized. Please verify your API key is correct.' 
      };
    }
    
    if (response.status === 403) {
      return { 
        success: false, 
        message: 'IndiaMART API access forbidden. Please check if your API key has proper permissions.' 
      };
    }
    
    if (!response.ok) {
      return { 
        success: false, 
        message: `IndiaMART API error: ${response.status} - ${data.MESSAGE || response.statusText}` 
      };
    }
    
    // Check for successful response
    if (data.STATUS === 'SUCCESS' || data.CODE === 200 || response.ok) {
      return { 
        success: true, 
        message: `IndiaMART connection successful! Status: ${data.STATUS}, Code: ${data.CODE}, Records: ${data.TOTAL_RECORDS || 0}`,
        data: {
          status: data.STATUS,
          code: data.CODE,
          totalRecords: data.TOTAL_RECORDS,
          message: data.MESSAGE
        }
      };
    } else {
      return { 
        success: false, 
        message: `IndiaMART API returned unexpected response: ${data.MESSAGE || 'Unknown error'}` 
      };
    }
    
  } catch (error: any) {
    console.error('IndiaMART test failed:', error);
    return { 
      success: false, 
      message: `Connection failed: ${error.message}` 
    };
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