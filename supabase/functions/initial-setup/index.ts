import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SetupRequest {
  setupToken: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const { setupToken }: SetupRequest = await req.json();
    
    // Verify setup token
    const expectedToken = Deno.env.get('SETUP_SEED_TOKEN');
    if (!expectedToken || setupToken !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'Invalid setup token' }),
        { 
          status: 401, 
          headers: { 'Content-Type': 'application/json', ...corsHeaders } 
        }
      );
    }

    // Initialize Supabase admin client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    console.log('Starting initial setup...');

    // Account configurations
    const accounts = [
      {
        email: 'info@gravenautomation.com',
        password: 'Graven@0987',
        full_name: 'Admin User',
        role: 'admin',
        department: 'Administration',
        designation: 'System Administrator'
      },
      {
        email: 'aditisingh@gravenautomation.com', 
        password: 'Hr@78900',
        full_name: 'Aditi Singh',
        role: 'hr',
        department: 'Human Resources',
        designation: 'HR Manager'
      }
    ];

    const results = [];

    for (const account of accounts) {
      console.log(`Creating account for ${account.email}...`);
      
      // Check if user already exists
      const { data: existingUser } = await supabase.auth.admin.getUserByEmail(account.email);
      
      if (existingUser.user) {
        console.log(`User ${account.email} already exists, skipping...`);
        results.push({ email: account.email, status: 'already_exists' });
        continue;
      }

      // Create the user with email confirmation bypassed
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true, // Skip email confirmation
        user_metadata: {
          full_name: account.full_name,
          role: account.role,
          department: account.department,
          designation: account.designation
        }
      });

      if (userError) {
        console.error(`Error creating user ${account.email}:`, userError);
        results.push({ 
          email: account.email, 
          status: 'error', 
          error: userError.message 
        });
        continue;
      }

      console.log(`User ${account.email} created successfully`);

      // Create profile entry
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userData.user.id,
          email: account.email,
          full_name: account.full_name,
          role: account.role,
          department: account.department,
          designation: account.designation,
          employee_id: account.role === 'admin' ? 'ADM001' : 'HR001'
        });

      if (profileError) {
        console.error(`Error creating profile for ${account.email}:`, profileError);
        results.push({ 
          email: account.email, 
          status: 'user_created_profile_error', 
          error: profileError.message 
        });
      } else {
        console.log(`Profile created for ${account.email}`);
        results.push({ email: account.email, status: 'success' });
      }
    }

    console.log('Initial setup completed');

    return new Response(
      JSON.stringify({ 
        message: 'Initial setup completed',
        results: results
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in initial-setup function:', error);
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