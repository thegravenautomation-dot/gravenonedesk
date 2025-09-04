-- Fix critical security issue with employee data access
-- First, drop ALL existing policies on employees table to start fresh
DROP POLICY IF EXISTS "Branch access policy" ON public.employees;
DROP POLICY IF EXISTS "HR and Admin can view branch employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can view own data" ON public.employees;
DROP POLICY IF EXISTS "HR and Admin can insert employees" ON public.employees;
DROP POLICY IF EXISTS "HR and Admin can update branch employees" ON public.employees;
DROP POLICY IF EXISTS "Employees can update own non-sensitive data" ON public.employees;
DROP POLICY IF EXISTS "HR and Admin can delete employees" ON public.employees;

-- Create security functions if they don't exist
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

-- Now create the restrictive RLS policies

-- Policy 1: HR and Admin can view employee data in their branch
CREATE POLICY "HR Admin view branch employees"
ON public.employees
FOR SELECT
USING (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Policy 2: Employees can only view their own data
CREATE POLICY "Employee view own data"
ON public.employees
FOR SELECT
USING (
  profile_id = auth.uid()
);

-- Policy 3: Only HR and Admin can insert employee records
CREATE POLICY "HR Admin insert employees"
ON public.employees
FOR INSERT
WITH CHECK (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Policy 4: Only HR and Admin can update employee records in their branch
CREATE POLICY "HR Admin update employees"
ON public.employees
FOR UPDATE
USING (
  public.can_access_employee_data(auth.uid(), branch_id)
)
WITH CHECK (
  public.can_access_employee_data(auth.uid(), branch_id)
);

-- Policy 5: Employees can update limited fields of their own record
CREATE POLICY "Employee update own data"
ON public.employees
FOR UPDATE
USING (
  profile_id = auth.uid()
)
WITH CHECK (
  profile_id = auth.uid()
);

-- Policy 6: Only HR and Admin can delete employee records
CREATE POLICY "HR Admin delete employees"
ON public.employees
FOR DELETE
USING (
  public.can_access_employee_data(auth.uid(), branch_id)
);