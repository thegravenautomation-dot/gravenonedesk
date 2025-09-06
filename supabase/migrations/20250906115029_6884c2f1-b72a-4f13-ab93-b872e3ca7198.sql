-- Create quotation_items table for storing individual line items
CREATE TABLE IF NOT EXISTS public.quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  hsn_code TEXT, 
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'Nos',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order_items table for storing individual order line items
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  hsn_code TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'Nos',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create invoice_items table for storing individual invoice line items
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  hsn_code TEXT,
  quantity NUMERIC DEFAULT 1,
  unit TEXT DEFAULT 'Nos',
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  gst_rate NUMERIC DEFAULT 18,
  gst_amount NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to customers table for comprehensive lead profile
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS whatsapp_number TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS designation TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS billing_address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS shipping_address TEXT;

-- Add banking details to branches table
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS account_number TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS ifsc_code TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS account_holder_name TEXT;

-- Add terms and conditions to branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS terms_conditions TEXT DEFAULT 'Terms and Conditions:
1. Payment should be made within 30 days from the date of invoice.
2. Goods once sold will not be taken back or exchanged.
3. Delivery period: 15-20 working days from the date of order confirmation.
4. Any disputes will be subject to local jurisdiction only.
5. Prices are subject to change without prior notice.';

-- Enable RLS on new tables
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;  
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quotation_items
CREATE POLICY "Branch access policy for quotation_items" ON public.quotation_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.profiles p ON p.id = auth.uid() 
    WHERE q.id = quotation_items.quotation_id 
    AND p.branch_id = q.branch_id
  )
);

-- Create RLS policies for order_items
CREATE POLICY "Branch access policy for order_items" ON public.order_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE o.id = order_items.order_id 
    AND p.branch_id = o.branch_id
  )
);

-- Create RLS policies for invoice_items
CREATE POLICY "Branch access policy for invoice_items" ON public.invoice_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.invoices i
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE i.id = invoice_items.invoice_id 
    AND p.branch_id = i.branch_id
  )
);

-- Create triggers for updated_at columns
CREATE TRIGGER update_quotation_items_updated_at
  BEFORE UPDATE ON public.quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_order_items_updated_at
  BEFORE UPDATE ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoice_items_updated_at  
  BEFORE UPDATE ON public.invoice_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample banking details for existing branches
UPDATE public.branches 
SET 
  bank_name = 'HDFC Bank',
  account_number = '50100123456789',
  ifsc_code = 'HDFC0001234',
  account_holder_name = 'Main Branch Business Account'
WHERE bank_name IS NULL;