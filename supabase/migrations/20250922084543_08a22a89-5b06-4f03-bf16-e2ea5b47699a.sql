-- Create audit_logs table for tracking edit/delete operations

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create', 'edit', 'delete', 'view')),
  entity_type text NOT NULL CHECK (entity_type IN ('quotation', 'customer', 'invoice', 'proforma_invoice', 'purchase_order')),
  entity_id uuid NOT NULL,
  changes jsonb,
  metadata jsonb,
  ip_address inet,
  user_agent text,
  timestamp timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Admin and managers can view audit logs" 
ON public.audit_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = audit_logs.branch_id
    AND profiles.role IN ('admin', 'manager')
  )
);

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid()
    AND profiles.branch_id = audit_logs.branch_id
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_audit_logs_updated_at
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();