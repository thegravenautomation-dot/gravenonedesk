import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmployeeData {
  full_name: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  joining_date?: string;
  pan?: string;
  aadhaar?: string;
  bank_account?: string;
  ifsc_code?: string;
  basic_salary?: number;
  hra?: number;
  allowances?: number;
  department?: string;
  designation?: string;
  reporting_manager?: string;
  branch_id: string;
  role: 'admin' | 'manager' | 'executive' | 'accountant' | 'hr' | 'procurement' | 'dispatch';
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { action, employeeData, employeeId, password, newPassword } = await req.json();

    console.log(`Employee management action: ${action}`);

    if (action === 'create') {
      const employee: EmployeeData = employeeData;
      
      // Generate employee ID
      const { count } = await supabase
        .from('employees')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', employee.branch_id);

      const employeeIdNumber = `EMP${String((count || 0) + 1).padStart(3, '0')}`;

      // Create user in Supabase Auth
      const { data: userData, error: userError } = await supabase.auth.admin.createUser({
        email: employee.email,
        password: password || 'TempPass123!',
        email_confirm: true,
        user_metadata: {
          full_name: employee.full_name,
          role: employee.role,
          branch_id: employee.branch_id,
          department: employee.department,
          designation: employee.designation,
          employee_id: employeeIdNumber,
          phone: employee.phone,
          joining_date: employee.joining_date
        }
      });

      if (userError) {
        console.error('Error creating user:', userError);
        return new Response(
          JSON.stringify({ error: 'Failed to create user account', details: userError.message }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('User created successfully:', userData.user.id);
      // Profile will be created automatically by handle_new_user trigger
      
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create employee record
      const { data: newEmployee, error: employeeError } = await supabase
        .from('employees')
        .insert({
          profile_id: userData.user.id,
          employee_id: employeeIdNumber,
          full_name: employee.full_name,
          email: employee.email,
          phone: employee.phone || null,
          address: employee.address || null,
          date_of_birth: employee.date_of_birth || null,
          joining_date: employee.joining_date || null,
          pan: employee.pan || null,
          aadhaar: employee.aadhaar || null,
          bank_account: employee.bank_account || null,
          ifsc_code: employee.ifsc_code || null,
          basic_salary: employee.basic_salary || 0,
          hra: employee.hra || 0,
          allowances: employee.allowances || 0,
          department: employee.department || null,
          designation: employee.designation || null,
          reporting_manager: employee.reporting_manager || null,
          branch_id: employee.branch_id,
          status: 'active'
        })
        .select()
        .single();

      if (employeeError) {
        console.error('Error creating employee:', employeeError);
        // Clean up user if employee creation fails
        await supabase.auth.admin.deleteUser(userData.user.id);
        return new Response(
          JSON.stringify({ error: 'Failed to create employee record', details: employeeError.message }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      console.log('Employee created successfully:', newEmployee);

      return new Response(
        JSON.stringify({ 
          success: true, 
          employee: newEmployee,
          message: 'Employee created successfully',
          defaultPassword: password ? null : 'TempPass123!'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } else if (action === 'provision_user') {
      // Provision only an Auth user (no employee row), and link to existing employee if found
      const user = employeeData as Partial<EmployeeData> & { employee_id?: string };

      if (!user?.email || !user?.full_name || !user?.branch_id || !user?.role) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields (full_name, email, role, branch_id)' }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      const { data: created, error: adminErr } = await supabase.auth.admin.createUser({
        email: user.email,
        password: password || 'TempPass123!',
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
          branch_id: user.branch_id,
          department: user.department || null,
          designation: user.designation || null,
          employee_id: user.employee_id || null,
          phone: user.phone || null,
          joining_date: user.joining_date || null,
        },
      });

      if (adminErr) {
        console.error('Provision user error:', adminErr);
        // Gracefully handle existing users by linking and optionally setting password
        const code = (adminErr as any)?.code || (adminErr as any)?.error_description || '';
        if (String(code).includes('email_exists')) {
          try {
            // Try to locate existing user by email via profiles first
            let userId: string | null = null;
            if (user.email) {
              const { data: prof, error: profErr } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', user.email)
                .maybeSingle();
              if (!profErr && prof?.id) userId = prof.id;

              // Fallback: scan auth users and match by email if profile not found
              if (!userId) {
                const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
                if (!listErr && list?.users?.length) {
                  const found = list.users.find((u: any) => u.email?.toLowerCase() === user.email!.toLowerCase());
                  if (found?.id) userId = found.id;
                }
              }
            }

            if (!userId) {
              return new Response(
                JSON.stringify({ error: 'User already exists but could not be located for linking. Please try reset_password instead.' }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
              );
            }

            // Optionally update password if provided
            const pwdToSet = password || newPassword;
            if (pwdToSet) {
              const { error: updErr } = await supabase.auth.admin.updateUserById(userId, { password: pwdToSet });
              if (updErr) console.warn('Could not update password for existing user:', updErr);
            }

            // Link existing employee record by email or employee_id
            try {
              let employeeQuery = supabase.from('employees').select('id').limit(1);
              if (user.email) employeeQuery = employeeQuery.eq('email', user.email);
              if ((user as any).employee_id) employeeQuery = employeeQuery.eq('employee_id', (user as any).employee_id);
              const { data: existingEmp, error: findErr } = await employeeQuery;
              if (!findErr && existingEmp && existingEmp.length > 0) {
                await supabase.from('employees').update({ profile_id: userId }).eq('id', existingEmp[0].id);
              }
            } catch (linkErr) {
              console.warn('Link existing employee failed:', linkErr);
            }

            return new Response(
              JSON.stringify({ success: true, message: 'User already existed; linked successfully' }),
              { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          } catch (linkExistingErr) {
            console.error('Error linking existing user:', linkExistingErr);
            return new Response(
              JSON.stringify({ error: 'Failed to link existing user', details: String(linkExistingErr) }),
              { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
            );
          }
        }
        return new Response(
          JSON.stringify({ error: 'Failed to provision user', details: adminErr.message }),
          { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }

      // Attempt to link employee record by email or employee_id
      try {
        const userId = created.user.id;

        // Find existing employee by email or employee_id
        let employeeQuery = supabase
          .from('employees')
          .select('id')
          .limit(1);

        if (user.email) employeeQuery = employeeQuery.eq('email', user.email);
        if (user.employee_id) employeeQuery = employeeQuery.eq('employee_id', user.employee_id);

        const { data: existingEmp, error: findErr } = await employeeQuery;

        if (!findErr && existingEmp && existingEmp.length > 0) {
          await supabase
            .from('employees')
            .update({ profile_id: userId })
            .eq('id', existingEmp[0].id);
        }
      } catch (linkErr) {
        console.warn('Could not link employee to profile:', linkErr);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'User provisioned successfully', defaultPassword: password ? null : 'TempPass123!' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );

    } else if (action === 'update') {
      const employee: Partial<EmployeeData> = employeeData;

      // Update employee record
      const { data: updatedEmployee, error: employeeError } = await supabase
        .from('employees')
        .update({
          full_name: employee.full_name,
          phone: employee.phone,
          address: employee.address,
          date_of_birth: employee.date_of_birth,
          pan: employee.pan,
          aadhaar: employee.aadhaar,
          bank_account: employee.bank_account,
          ifsc_code: employee.ifsc_code,
          basic_salary: employee.basic_salary,
          hra: employee.hra,
          allowances: employee.allowances,
          department: employee.department,
          designation: employee.designation,
          reporting_manager: employee.reporting_manager
        })
        .eq('id', employeeId)
        .select()
        .single();

      if (employeeError) {
        console.error('Error updating employee:', employeeError);
        return new Response(
          JSON.stringify({ error: 'Failed to update employee', details: employeeError.message }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      // Update profile if needed
      if (employee.full_name || employee.phone || employee.department || employee.designation) {
        await supabase
          .from('profiles')
          .update({
            full_name: employee.full_name,
            phone: employee.phone,
            department: employee.department,
            designation: employee.designation
          })
          .eq('id', updatedEmployee.profile_id);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          employee: updatedEmployee,
          message: 'Employee updated successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );

    } else if (action === 'reset_password') {
      // Reset user's password via admin API
      if (!employeeId || !newPassword) {
        return new Response(JSON.stringify({ error: 'employeeId and newPassword are required' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      // Fetch employee to get profile_id
      const { data: empRow, error: empErr } = await supabase
        .from('employees')
        .select('id, profile_id, email, full_name, branch_id, employee_id')
        .eq('id', employeeId)
        .single();
      if (empErr) {
        console.error('Error fetching employee for password reset:', empErr);
        return new Response(JSON.stringify({ error: 'Employee not found', details: empErr.message }), { status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      if (!empRow?.profile_id) {
        // Attempt to find or create auth user by email, then set password and link
        try {
          let userId: string | null = null;

          // Try profiles first
          if (empRow.email) {
            const { data: prof, error: profErr } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', empRow.email)
              .maybeSingle();
            if (!profErr && prof?.id) userId = prof.id;
          }

          // Fallback: list users to find by email
          if (!userId && empRow.email) {
            const { data: list, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
            if (!listErr && list?.users?.length) {
              const found = list.users.find((u: any) => u.email?.toLowerCase() === empRow.email.toLowerCase());
              if (found?.id) userId = found.id;
            }
          }

          // If still not found, create the user
          if (!userId && empRow.email) {
            const { data: created, error: createErr } = await supabase.auth.admin.createUser({
              email: empRow.email,
              password: newPassword,
              email_confirm: true,
              user_metadata: {
                full_name: (empRow as any).full_name || '',
                role: 'executive',
                branch_id: (empRow as any).branch_id || null,
                employee_id: (empRow as any).employee_id || null,
              },
            });
            if (createErr) {
              console.error('Create user during reset failed:', createErr);
              return new Response(
                JSON.stringify({ error: 'Failed to create account for employee', details: createErr.message }),
                { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
              );
            }
            userId = created.user.id;
          }

          if (!userId) {
            return new Response(JSON.stringify({ error: 'Could not locate or create user for this employee' }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
          }

          // Ensure password is set for located/created user
          const { error: updErr2 } = await supabase.auth.admin.updateUserById(userId, { password: newPassword });
          if (updErr2) {
            console.error('Password reset (link path) error:', updErr2);
            return new Response(JSON.stringify({ error: 'Failed to reset password', details: updErr2.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
          }

          // Link employee to profile
          await supabase.from('employees').update({ profile_id: userId }).eq('id', empRow.id);

          return new Response(JSON.stringify({ success: true, message: 'Password set and account linked' }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        } catch (linkErr) {
          console.error('Error linking user during reset_password:', linkErr);
          return new Response(JSON.stringify({ error: 'Unexpected error during password reset' }), { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
        }
      }

      // Standard path when profile_id exists
      const { error: updErr } = await supabase.auth.admin.updateUserById(empRow.profile_id, { password: newPassword });
      if (updErr) {
        console.error('Password reset error:', updErr);
        return new Response(JSON.stringify({ error: 'Failed to reset password', details: updErr.message }), { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } });
      }
      return new Response(JSON.stringify({ success: true, message: 'Password reset successfully' }), { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } });

    } else if (action === 'deactivate') {
      // Deactivate employee (don't delete, just mark as inactive)
      const { data: deactivatedEmployee, error: employeeError } = await supabase
        .from('employees')
        .update({ status: 'inactive' })
        .eq('id', employeeId)
        .select()
        .single();

      if (employeeError) {
        console.error('Error deactivating employee:', employeeError);
        return new Response(
          JSON.stringify({ error: 'Failed to deactivate employee', details: employeeError.message }),
          { 
            status: 400, 
            headers: { 'Content-Type': 'application/json', ...corsHeaders } 
          }
        );
      }

      // Update profile to inactive
      await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', deactivatedEmployee.profile_id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Employee deactivated successfully'
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error('Error in employee-management function:', error);
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