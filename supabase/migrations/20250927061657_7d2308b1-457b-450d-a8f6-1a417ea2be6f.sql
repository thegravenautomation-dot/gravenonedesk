-- Create Lead Assignment Log table
CREATE TABLE public.lead_assignment_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id uuid NOT NULL,
  assigned_to uuid NOT NULL,
  rule_used uuid,
  manual_override boolean NOT NULL DEFAULT false,
  assigned_by uuid,
  branch_id uuid NOT NULL,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lead_assignment_log ENABLE ROW LEVEL SECURITY;

-- Create policies for lead assignment log
CREATE POLICY "Branch users can view assignment log" 
ON public.lead_assignment_log 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = lead_assignment_log.branch_id
));

CREATE POLICY "System can insert assignment log" 
ON public.lead_assignment_log 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = lead_assignment_log.branch_id
));

-- Create indexes for performance
CREATE INDEX idx_lead_assignment_log_lead_id ON public.lead_assignment_log(lead_id);
CREATE INDEX idx_lead_assignment_log_assigned_to ON public.lead_assignment_log(assigned_to);
CREATE INDEX idx_lead_assignment_log_timestamp ON public.lead_assignment_log(timestamp);