-- Add business_type column to vendors table if it doesn't exist
ALTER TABLE public.vendors ADD COLUMN IF NOT EXISTS business_type TEXT;