-- Create communications table to track all WhatsApp and email communications
CREATE TABLE public.communications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL,
  contact_type TEXT NOT NULL CHECK (contact_type IN ('whatsapp', 'email')),
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_contact TEXT NOT NULL,
  to_contact TEXT NOT NULL,
  subject TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed')),
  related_entity_type TEXT CHECK (related_entity_type IN ('lead', 'customer', 'employee', 'vendor', 'invoice', 'order')),
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  sent_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;

-- Create policies for communications
CREATE POLICY "Users can view communications from their branch" 
ON public.communications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = communications.branch_id
  )
);

CREATE POLICY "Users can create communications for their branch" 
ON public.communications 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = communications.branch_id
  )
);

CREATE POLICY "Users can update their own communications" 
ON public.communications 
FOR UPDATE 
USING (sent_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX idx_communications_branch_id ON public.communications(branch_id);
CREATE INDEX idx_communications_contact_type ON public.communications(contact_type);
CREATE INDEX idx_communications_related_entity ON public.communications(related_entity_type, related_entity_id);
CREATE INDEX idx_communications_created_at ON public.communications(created_at DESC);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_communications_updated_at
BEFORE UPDATE ON public.communications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create communication templates table
CREATE TABLE public.communication_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id UUID NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('whatsapp', 'email')),
  category TEXT NOT NULL CHECK (category IN ('lead_followup', 'invoice_reminder', 'order_confirmation', 'employee_notification', 'vendor_communication')),
  subject TEXT,
  template_body TEXT NOT NULL,
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for templates
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;

-- Create policies for templates
CREATE POLICY "Users can view templates from their branch" 
ON public.communication_templates 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = communication_templates.branch_id
  )
);

CREATE POLICY "Admins and HR can manage templates" 
ON public.communication_templates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = communication_templates.branch_id
    AND profiles.role IN ('admin', 'hr')
  )
);

-- Create trigger for templates
CREATE TRIGGER update_communication_templates_updated_at
BEFORE UPDATE ON public.communication_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.communication_templates (branch_id, name, type, category, subject, template_body, variables) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Lead Follow-up WhatsApp', 'whatsapp', 'lead_followup', NULL, 'Hi {{customer_name}}, Thank you for your inquiry about {{product_name}}. Our team will get back to you within 24 hours with a detailed quotation. Best regards, {{company_name}}', '["customer_name", "product_name", "company_name"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Invoice Reminder Email', 'email', 'invoice_reminder', 'Payment Reminder - Invoice {{invoice_number}}', 'Dear {{customer_name}},\n\nThis is a friendly reminder that your invoice {{invoice_number}} for amount ₹{{amount}} is due on {{due_date}}.\n\nPlease process the payment at your earliest convenience.\n\nThanks,\n{{company_name}}', '["customer_name", "invoice_number", "amount", "due_date", "company_name"]'),
('550e8400-e29b-41d4-a716-446655440001', 'Order Confirmation WhatsApp', 'whatsapp', 'order_confirmation', NULL, 'Hi {{customer_name}}, Your order {{order_number}} has been confirmed and will be dispatched within {{dispatch_days}} days. Thank you for choosing {{company_name}}!', '["customer_name", "order_number", "dispatch_days", "company_name"]');