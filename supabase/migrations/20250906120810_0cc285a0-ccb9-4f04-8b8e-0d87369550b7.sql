-- Payments table for recording order payments
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  branch_id UUID NOT NULL,
  amount NUMERIC NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  method TEXT,
  reference TEXT,
  receipt_path TEXT,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and branch-based access via orders
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch access policy for payments" ON public.payments
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.orders o
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE o.id = payments.order_id AND p.branch_id = o.branch_id
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add fields to orders for customer PO and attachment
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_po_no TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS po_pdf_path TEXT;

-- Quotation revisions for edit history
CREATE TABLE IF NOT EXISTS public.quotation_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
  revision_no INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  note TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quotation_revisions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Branch access policy for quotation_revisions" ON public.quotation_revisions
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.quotations q
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE q.id = quotation_revisions.quotation_id AND p.branch_id = q.branch_id
  )
);

-- Ensure unique revision numbers per quotation
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_quotation_revision ON public.quotation_revisions(quotation_id, revision_no);

-- Create a secure storage bucket for documents (order PDFs, receipts)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'documents') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
  END IF;
END $$;

-- Storage policies for the documents bucket
CREATE POLICY IF NOT EXISTS "Allow read own docs" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Allow upload own docs" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Allow update own docs" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY IF NOT EXISTS "Allow delete own docs" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);