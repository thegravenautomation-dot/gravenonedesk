-- Create audit log table for tracking access to sensitive employee data
CREATE TABLE public.employee_data_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  accessed_by UUID NOT NULL REFERENCES auth.users(id),
  employee_id UUID NOT NULL,
  accessed_fields TEXT[] NOT NULL,
  access_reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.employee_data_audit ENABLE ROW LEVEL SECURITY;

-- Only admin and hr can view audit logs
CREATE POLICY "HR Admin view audit logs" ON public.employee_data_audit
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('hr'::user_role, 'admin'::user_role)
  )
);

-- Function to log sensitive data access
CREATE OR REPLACE FUNCTION public.log_employee_data_access(
  p_employee_id UUID,
  p_accessed_fields TEXT[],
  p_access_reason TEXT DEFAULT 'data_view'
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.employee_data_audit (
    accessed_by, 
    employee_id, 
    accessed_fields, 
    access_reason,
    ip_address,
    user_agent
  ) VALUES (
    auth.uid(),
    p_employee_id,
    p_accessed_fields,
    p_access_reason,
    inet_client_addr(),
    current_setting('request.headers', true)::json->>'user-agent'
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail if logging fails, just continue
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create secure view for employee data with field-level security
CREATE VIEW public.employees_secure AS
SELECT 
  e.id,
  e.employee_id,
  e.full_name,
  e.email,
  e.phone,
  e.department,
  e.designation,
  e.joining_date,
  e.status,
  e.branch_id,
  e.created_at,
  e.updated_at,
  e.profile_id,
  e.reporting_manager,
  e.date_of_birth,
  e.address,
  -- Salary information - masked for non-HR/Admin
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) OR e.profile_id = auth.uid() 
    THEN e.basic_salary 
    ELSE NULL 
  END AS basic_salary,
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) OR e.profile_id = auth.uid() 
    THEN e.hra 
    ELSE NULL 
  END AS hra,
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) OR e.profile_id = auth.uid() 
    THEN e.allowances 
    ELSE NULL 
  END AS allowances,
  -- Highly sensitive PII - only for HR/Admin, masked for employees
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) 
    THEN e.pan 
    WHEN e.profile_id = auth.uid() AND e.pan IS NOT NULL
    THEN 'XXX' || RIGHT(e.pan, 4)
    ELSE NULL 
  END AS pan,
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) 
    THEN e.aadhaar 
    WHEN e.profile_id = auth.uid() AND e.aadhaar IS NOT NULL
    THEN 'XXXX-XXXX-' || RIGHT(e.aadhaar, 4)
    ELSE NULL 
  END AS aadhaar,
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) 
    THEN e.bank_account 
    WHEN e.profile_id = auth.uid() AND e.bank_account IS NOT NULL
    THEN 'XXXXXX' || RIGHT(e.bank_account, 4)
    ELSE NULL 
  END AS bank_account,
  CASE 
    WHEN can_access_employee_data(auth.uid(), e.branch_id) OR e.profile_id = auth.uid() 
    THEN e.ifsc_code 
    ELSE NULL 
  END AS ifsc_code
FROM public.employees e;

-- Enable RLS on the secure view
ALTER VIEW public.employees_secure SET (security_invoker = true);

-- RLS policies for the secure view (same as original table but more restrictive)
CREATE POLICY "Employee view own secure data" ON public.employees_secure
FOR SELECT 
USING (profile_id = auth.uid());

CREATE POLICY "HR Admin view branch employees secure" ON public.employees_secure
FOR SELECT 
USING (can_access_employee_data(auth.uid(), branch_id));

-- Enhanced RLS policies for the original employees table with stricter controls
DROP POLICY IF EXISTS "Employee view own data" ON public.employees;
DROP POLICY IF EXISTS "HR Admin view branch employees" ON public.employees;

-- New stricter policies for direct table access
CREATE POLICY "Employee view own data restricted" ON public.employees
FOR SELECT 
USING (
  profile_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "HR Admin view branch employees restricted" ON public.employees
FOR SELECT 
USING (
  can_access_employee_data(auth.uid(), branch_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_active = true
  )
);

-- Function to get employee data with audit logging
CREATE OR REPLACE FUNCTION public.get_employee_secure_data(p_employee_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  employee_id TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  designation TEXT,
  joining_date DATE,
  status employee_status,
  branch_id UUID,
  basic_salary NUMERIC,
  hra NUMERIC,
  allowances NUMERIC,
  pan TEXT,
  aadhaar TEXT,
  bank_account TEXT,
  ifsc_code TEXT
) AS $$
BEGIN
  -- Log the data access
  IF p_employee_id IS NOT NULL THEN
    PERFORM log_employee_data_access(
      p_employee_id,
      ARRAY['full_profile_view'],
      'secure_data_access'
    );
  END IF;

  -- Return data from secure view
  RETURN QUERY
  SELECT 
    es.id, es.employee_id, es.full_name, es.email, es.phone,
    es.department, es.designation, es.joining_date, es.status, es.branch_id,
    es.basic_salary, es.hra, es.allowances, es.pan, es.aadhaar, es.bank_account, es.ifsc_code
  FROM public.employees_secure es
  WHERE (p_employee_id IS NULL OR es.id = p_employee_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Additional security: Prevent direct access to sensitive columns via column-level policies
REVOKE SELECT ON public.employees FROM authenticated;
REVOKE SELECT ON public.employees FROM anon;

-- Grant access to the secure view instead
GRANT SELECT ON public.employees_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_employee_secure_data TO authenticated;