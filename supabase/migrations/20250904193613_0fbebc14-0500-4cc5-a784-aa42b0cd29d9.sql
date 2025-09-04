-- Create leave_requests table (enums already exist)
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  leave_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  branch_id UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Employees can view their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "Employees can create their own leave requests" ON public.leave_requests;
DROP POLICY IF EXISTS "HR and Admin can view all leave requests in their branch" ON public.leave_requests;
DROP POLICY IF EXISTS "HR and Admin can update leave requests in their branch" ON public.leave_requests;

-- RLS Policies
CREATE POLICY "Employees can view their own leave requests" 
ON public.leave_requests 
FOR SELECT 
USING (employee_id = auth.uid());

CREATE POLICY "Employees can create their own leave requests" 
ON public.leave_requests 
FOR INSERT 
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "HR and Admin can view all leave requests in their branch" 
ON public.leave_requests 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = leave_requests.branch_id
    AND profiles.role IN ('hr', 'admin')
  )
);

CREATE POLICY "HR and Admin can update leave requests in their branch" 
ON public.leave_requests 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = leave_requests.branch_id
    AND profiles.role IN ('hr', 'admin')
  )
);

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_leave_requests_updated_at ON public.leave_requests;
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();