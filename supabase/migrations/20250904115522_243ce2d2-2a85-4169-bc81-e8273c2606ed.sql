-- Create initial admin and HR users for system access
-- This creates the auth users and their profiles in one migration

-- First, let's create a temporary signup for initial admin setup
-- Insert the first admin user directly (replace with your actual admin details)
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    -- Create admin auth user (you'll need to use Supabase Auth UI or API for actual password)
    -- This is just the profile setup - the auth user must be created through Supabase Auth

    -- Insert admin profile (replace these values with actual admin details)
    INSERT INTO public.profiles (
        id, 
        email, 
        full_name, 
        role, 
        branch_id, 
        phone, 
        employee_id, 
        department, 
        designation,
        is_active
    ) VALUES (
        '11111111-1111-1111-1111-111111111111'::uuid, -- Replace with actual user ID from auth.users
        'admin@gravenonedesk.com',
        'System Administrator',
        'admin'::user_role,
        '550e8400-e29b-41d4-a716-446655440001'::uuid, -- Mumbai Head Office
        '+91-9999999999',
        'ADM001',
        'Administration',
        'System Administrator',
        true
    ) ON CONFLICT (id) DO NOTHING;

    -- Insert HR profile
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        role,
        branch_id,
        phone,
        employee_id,
        department,
        designation,
        is_active
    ) VALUES (
        '22222222-2222-2222-2222-222222222222'::uuid, -- Replace with actual user ID from auth.users
        'hr@gravenonedesk.com',
        'HR Manager',
        'hr'::user_role,
        '550e8400-e29b-41d4-a716-446655440001'::uuid, -- Mumbai Head Office
        '+91-9999999998',
        'HR001',
        'Human Resources',
        'HR Manager',
        true
    ) ON CONFLICT (id) DO NOTHING;

END $$;