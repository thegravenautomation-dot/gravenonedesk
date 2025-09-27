-- Enhance customers table with missing fields
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS region text,
ADD COLUMN IF NOT EXISTS country text DEFAULT 'India',
ADD COLUMN IF NOT EXISTS industry text,
ADD COLUMN IF NOT EXISTS assigned_executive uuid;

-- Create index on assigned_executive for performance
CREATE INDEX IF NOT EXISTS idx_customers_assigned_executive ON public.customers(assigned_executive);
CREATE INDEX IF NOT EXISTS idx_customers_region ON public.customers(region);
CREATE INDEX IF NOT EXISTS idx_customers_industry ON public.customers(industry);