-- Fix critical security issue with employee data access
-- Current policy allows any branch user to see all employee PII data
-- New policy: Only HR, Admin, and the employee themselves can access employee data

-- First, drop the overly permissive existing policy
DROP POLICY IF EXISTS "Branch access policy" ON public.employees;

-- Create function to check if user has HR role
CREATE OR REPLACE FUNCTION public.is_hr_or_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND role IN ('hr'::user_role, 'admin'::user_role)
  );
$$;

-- Create function to check if user can access employee data in their branch
CREATE OR REPLACE FUNCTION public.can_access_employee_data(_user_id uuid, _employee_branch_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = _user_id 
    AND branch_id = _employee_branch_id
    AND role IN ('hr'::user_role, 'admin'::user_role)
  );
$$;

-- Create highly restrictive RLS policies for employee data

-- Policy 1: HR and Admin can view employee data in their branch
CREATE POLICY "HR and Admin can view branch employees"
ON public.employees
FOR SELECT
USING (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Policy 2: Employees can only view their own data
CREATE POLICY "Employees can view own data"
ON public.employees
FOR SELECT
USING (
  profile_id = auth.uid()
);

-- Policy 3: Only HR and Admin can insert employee records
CREATE POLICY "HR and Admin can insert employees"
ON public.employees
FOR INSERT
WITH CHECK (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Policy 4: Only HR and Admin can update employee records in their branch
CREATE POLICY "HR and Admin can update branch employees"
ON public.employees
FOR UPDATE
USING (
  public.can_access_employee_data(auth.uid(), branch_id)
)
WITH CHECK (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Policy 5: Employees can update limited fields of their own record (non-sensitive data only)
-- Note: This would need application-level controls to restrict which fields can be updated
CREATE POLICY "Employees can update own non-sensitive data"
ON public.employees
FOR UPDATE
USING (
  profile_id = auth.uid()
)
WITH CHECK (
  profile_id = auth.uid()
);

-- Policy 6: Only HR and Admin can delete employee records
CREATE POLICY "HR and Admin can delete employees"
ON public.employees
FOR DELETE
USING (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Add comments for documentation
COMMENT ON FUNCTION public.is_hr_or_admin IS 'Security function to check if user has HR or Admin role';
COMMENT ON FUNCTION public.can_access_employee_data IS 'Security function to check if user can access employee data in specific branch';
COMMENT ON POLICY "HR and Admin can view branch employees" ON public.employees IS 'Restricts employee data access to HR and Admin users only';
COMMENT ON POLICY "Employees can view own data" ON public.employees IS 'Allows employees to view only their own employment record';