-- Add invoice type to distinguish proforma from regular invoices
DO $$ BEGIN
  CREATE TYPE public.invoice_type AS ENUM ('regular', 'proforma');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add type column to invoices table
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS invoice_type public.invoice_type DEFAULT 'regular';

-- Update existing invoices to be regular type
UPDATE public.invoices SET invoice_type = 'regular' WHERE invoice_type IS NULL;