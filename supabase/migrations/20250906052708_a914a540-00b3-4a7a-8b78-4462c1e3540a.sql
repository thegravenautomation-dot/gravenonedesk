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
    access_reason
  ) VALUES (
    auth.uid(),
    p_employee_id,
    p_accessed_fields,
    p_access_reason
  );
EXCEPTION WHEN OTHERS THEN
  -- Don't fail if logging fails, just continue
  NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get masked sensitive data for employees viewing their own data
CREATE OR REPLACE FUNCTION public.mask_sensitive_employee_data(
  p_data_type TEXT,
  p_value TEXT,
  p_is_owner BOOLEAN DEFAULT FALSE,
  p_is_hr_admin BOOLEAN DEFAULT FALSE
)
RETURNS TEXT AS $$
BEGIN
  -- HR/Admin see everything
  IF p_is_hr_admin THEN
    RETURN p_value;
  END IF;
  
  -- Employees see masked versions of their own data
  IF p_is_owner AND p_value IS NOT NULL THEN
    CASE p_data_type
      WHEN 'pan' THEN
        RETURN 'XXX' || RIGHT(p_value, 4);
      WHEN 'aadhaar' THEN
        RETURN 'XXXX-XXXX-' || RIGHT(p_value, 4);
      WHEN 'bank_account' THEN
        RETURN 'XXXXXX' || RIGHT(p_value, 4);
      ELSE
        RETURN p_value;
    END CASE;
  END IF;
  
  -- Others see nothing
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Strengthen existing RLS policies with additional security checks
DROP POLICY IF EXISTS "Employee view own data restricted" ON public.employees;
DROP POLICY IF EXISTS "HR Admin view branch employees restricted" ON public.employees;

-- More restrictive policies that require active users
CREATE POLICY "Employee view own data secure" ON public.employees
FOR SELECT 
USING (
  profile_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_active = true
    AND branch_id IS NOT NULL
  )
);

CREATE POLICY "HR Admin view branch employees secure" ON public.employees
FOR SELECT 
USING (
  can_access_employee_data(auth.uid(), branch_id)
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND is_active = true
    AND role IN ('hr'::user_role, 'admin'::user_role)
  )
);

-- Function for secure employee data retrieval with automatic audit logging
CREATE OR REPLACE FUNCTION public.get_employee_data_secure(
  p_employee_id UUID DEFAULT NULL,
  p_include_sensitive BOOLEAN DEFAULT FALSE
)
RETURNS TABLE(
  id UUID,
  employee_id TEXT,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  department TEXT,
  designation TEXT,
  joining_date DATE,
  date_of_birth DATE,
  address TEXT,
  status employee_status,
  branch_id UUID,
  profile_id UUID,
  reporting_manager UUID,
  basic_salary NUMERIC,
  hra NUMERIC,
  allowances NUMERIC,
  pan TEXT,
  aadhaar TEXT,
  bank_account TEXT,
  ifsc_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  current_user_role user_role;
  is_hr_admin BOOLEAN := FALSE;
  is_own_data BOOLEAN := FALSE;
  accessed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Get current user role
  SELECT role INTO current_user_role 
  FROM public.profiles 
  WHERE profiles.id = auth.uid() AND is_active = true;
  
  -- Check if user is HR or Admin
  is_hr_admin := (current_user_role IN ('hr', 'admin'));
  
  -- Determine accessed fields for audit
  IF p_include_sensitive THEN
    accessed_fields := ARRAY['pan', 'aadhaar', 'bank_account', 'salary_info'];
  ELSE 
    accessed_fields := ARRAY['basic_profile'];
  END IF;
  
  -- Return employee data with appropriate masking
  RETURN QUERY
  SELECT 
    e.id, 
    e.employee_id, 
    e.full_name, 
    e.email, 
    e.phone,
    e.department, 
    e.designation, 
    e.joining_date, 
    e.date_of_birth, 
    e.address,
    e.status, 
    e.branch_id, 
    e.profile_id, 
    e.reporting_manager,
    -- Salary info - only for HR/Admin or own data
    CASE 
      WHEN is_hr_admin OR e.profile_id = auth.uid() THEN e.basic_salary 
      ELSE NULL 
    END,
    CASE 
      WHEN is_hr_admin OR e.profile_id = auth.uid() THEN e.hra 
      ELSE NULL 
    END,
    CASE 
      WHEN is_hr_admin OR e.profile_id = auth.uid() THEN e.allowances 
      ELSE NULL 
    END,
    -- Masked sensitive PII
    mask_sensitive_employee_data('pan', e.pan, e.profile_id = auth.uid(), is_hr_admin),
    mask_sensitive_employee_data('aadhaar', e.aadhaar, e.profile_id = auth.uid(), is_hr_admin),
    mask_sensitive_employee_data('bank_account', e.bank_account, e.profile_id = auth.uid(), is_hr_admin),
    CASE 
      WHEN is_hr_admin OR e.profile_id = auth.uid() THEN e.ifsc_code 
      ELSE NULL 
    END,
    e.created_at,
    e.updated_at
  FROM public.employees e
  WHERE 
    -- Apply same RLS logic as policies
    (e.profile_id = auth.uid() OR can_access_employee_data(auth.uid(), e.branch_id))
    AND (p_employee_id IS NULL OR e.id = p_employee_id)
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE profiles.id = auth.uid() AND is_active = true
    );
    
  -- Log access to employee data
  IF p_employee_id IS NOT NULL THEN
    PERFORM log_employee_data_access(p_employee_id, accessed_fields, 'secure_api_access');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_employee_data_secure TO authenticated;
GRANT EXECUTE ON FUNCTION public.mask_sensitive_employee_data TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_employee_data_access TO authenticated;