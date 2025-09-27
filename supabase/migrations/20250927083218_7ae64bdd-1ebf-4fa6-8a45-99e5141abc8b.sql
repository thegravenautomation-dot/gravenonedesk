-- Extend orders table with attachment fields and total_value
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS purchase_order_attachment TEXT,
ADD COLUMN IF NOT EXISTS payment_receipt_attachment TEXT,
ADD COLUMN IF NOT EXISTS total_value NUMERIC DEFAULT 0;

-- Update existing orders to set total_value from total_amount if not already set
UPDATE public.orders 
SET total_value = total_amount 
WHERE total_value = 0 OR total_value IS NULL;

-- Add comment for attachment fields
COMMENT ON COLUMN public.orders.purchase_order_attachment IS 'Path to uploaded purchase order file in storage';
COMMENT ON COLUMN public.orders.payment_receipt_attachment IS 'Path to uploaded payment receipt file in storage';
COMMENT ON COLUMN public.orders.total_value IS 'Total order value, duplicates total_amount for compatibility';

-- Extend payments table to match OrderPayment model structure
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_mode_extended VARCHAR(50) DEFAULT 'cash',
ADD COLUMN IF NOT EXISTS remarks TEXT;

-- Update existing payment modes to new standardized values
UPDATE public.payments 
SET payment_mode_extended = CASE 
  WHEN payment_mode = 'cash' THEN 'Cash'
  WHEN payment_mode = 'upi' THEN 'UPI' 
  WHEN payment_mode = 'netbanking' THEN 'Net Banking'
  WHEN payment_mode = 'cheque' THEN 'Cheque'
  ELSE 'Cash'
END
WHERE payment_mode_extended = 'cash';

-- Add constraint for payment modes
ALTER TABLE public.payments 
ADD CONSTRAINT check_payment_mode_extended 
CHECK (payment_mode_extended IN ('Cash', 'UPI', 'Net Banking', 'Cheque'));

-- Extend customer_ledger table to include payment_id reference
ALTER TABLE public.customer_ledger 
ADD COLUMN IF NOT EXISTS payment_id UUID REFERENCES public.payments(id),
ADD COLUMN IF NOT EXISTS running_balance NUMERIC DEFAULT 0;

-- Update running_balance to match existing balance field
UPDATE public.customer_ledger 
SET running_balance = balance 
WHERE running_balance = 0 OR running_balance IS NULL;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_purchase_order_attachment ON public.orders(purchase_order_attachment);
CREATE INDEX IF NOT EXISTS idx_orders_payment_receipt_attachment ON public.orders(payment_receipt_attachment);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode_extended ON public.payments(payment_mode_extended);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_payment_id ON public.customer_ledger(payment_id);

-- Create storage bucket for order attachments if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('order-attachments', 'order-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for order attachments bucket
CREATE POLICY "Branch users can view order attachments" ON storage.objects
FOR SELECT USING (
  bucket_id = 'order-attachments' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Branch users can upload order attachments" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'order-attachments' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Branch users can update order attachments" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'order-attachments' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Branch users can delete order attachments" ON storage.objects
FOR DELETE USING (
  bucket_id = 'order-attachments' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id::text = (storage.foldername(name))[1]
  )
);