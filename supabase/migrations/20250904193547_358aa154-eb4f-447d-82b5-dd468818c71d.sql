-- Create leave status enum
CREATE TYPE leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create leave type enum  
CREATE TYPE leave_type AS ENUM ('sick', 'casual', 'annual', 'maternity', 'paternity', 'emergency');

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  branch_id UUID NOT NULL,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

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
CREATE TRIGGER update_leave_requests_updated_at
BEFORE UPDATE ON public.leave_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();