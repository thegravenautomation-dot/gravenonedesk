-- Add new sales roles to the existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bdo';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fbdo';

-- Create function to check sales hierarchy access
CREATE OR REPLACE FUNCTION public.can_access_sales_data(_user_id uuid, _target_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND branch_id = _target_branch_id
    AND (
      role IN ('admin'::user_role, 'sales_manager'::user_role) OR
      (role IN ('manager'::user_role) AND department = 'Sales')
    )
  );
$$;

-- Create function to check if user can manage sales team
CREATE OR REPLACE FUNCTION public.can_manage_sales_team(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND role IN ('admin'::user_role, 'sales_manager'::user_role)
  );
$$;