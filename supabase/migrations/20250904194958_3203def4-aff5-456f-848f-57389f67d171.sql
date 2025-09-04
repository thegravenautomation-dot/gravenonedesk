-- Create employee queries/tickets system
CREATE TABLE IF NOT EXISTS public.employee_queries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to UUID,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- Create lead assignment rules table
CREATE TABLE IF NOT EXISTS public.lead_assignment_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  branch_id UUID NOT NULL,
  conditions JSONB NOT NULL DEFAULT '{}',
  assigned_to UUID NOT NULL,
  priority INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead sources tracking
CREATE TABLE IF NOT EXISTS public.lead_sources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL, -- 'indiamart', 'tradeindia', 'whatsapp', 'website', 'manual'
  api_config JSONB,
  is_active BOOLEAN NOT NULL DEFAULT true,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add lead source tracking to existing leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS lead_source_id UUID REFERENCES public.lead_sources(id),
ADD COLUMN IF NOT EXISTS external_id TEXT, -- For tracking external platform IDs
ADD COLUMN IF NOT EXISTS raw_data JSONB; -- Store original data from APIs

-- Enable RLS for new tables
ALTER TABLE public.employee_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignment_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_sources ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_queries
CREATE POLICY "Employees can view their own queries" 
ON public.employee_queries 
FOR SELECT 
USING (employee_id = auth.uid());

CREATE POLICY "Employees can create their own queries" 
ON public.employee_queries 
FOR INSERT 
WITH CHECK (employee_id = auth.uid());

CREATE POLICY "HR and Admin can view all queries in their branch" 
ON public.employee_queries 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = employee_queries.branch_id
    AND profiles.role IN ('hr', 'admin')
  )
);

-- RLS Policies for lead_assignment_rules
CREATE POLICY "Branch users can view assignment rules" 
ON public.lead_assignment_rules 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = lead_assignment_rules.branch_id
  )
);

CREATE POLICY "Admin and managers can manage assignment rules" 
ON public.lead_assignment_rules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = lead_assignment_rules.branch_id
    AND profiles.role IN ('admin', 'manager')
  )
);

-- RLS Policies for lead_sources
CREATE POLICY "Branch users can view lead sources" 
ON public.lead_sources 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = lead_sources.branch_id
  )
);

CREATE POLICY "Admin and managers can manage lead sources" 
ON public.lead_sources 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = lead_sources.branch_id
    AND profiles.role IN ('admin', 'manager')
  )
);

-- Create triggers for timestamp updates
CREATE TRIGGER update_employee_queries_updated_at
BEFORE UPDATE ON public.employee_queries
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_assignment_rules_updated_at
BEFORE UPDATE ON public.lead_assignment_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_sources_updated_at
BEFORE UPDATE ON public.lead_sources
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default lead sources
INSERT INTO public.lead_sources (name, source_type, branch_id) 
SELECT 'IndiaMART', 'indiamart', id FROM public.branches 
ON CONFLICT DO NOTHING;

INSERT INTO public.lead_sources (name, source_type, branch_id) 
SELECT 'TradeIndia', 'tradeindia', id FROM public.branches 
ON CONFLICT DO NOTHING;

INSERT INTO public.lead_sources (name, source_type, branch_id) 
SELECT 'WhatsApp Business', 'whatsapp', id FROM public.branches 
ON CONFLICT DO NOTHING;

INSERT INTO public.lead_sources (name, source_type, branch_id) 
SELECT 'Website', 'website', id FROM public.branches 
ON CONFLICT DO NOTHING;