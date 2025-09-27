-- Create Items table for procurement
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(10,2) DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'auto')),
  category text,
  unit text DEFAULT 'Nos',
  hsn_code text,
  minimum_stock numeric DEFAULT 0,
  current_stock numeric DEFAULT 0,
  added_by uuid NOT NULL,
  branch_id uuid NOT NULL,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;

-- Create policies for items
CREATE POLICY "Branch users can view items" 
ON public.items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = items.branch_id
));

CREATE POLICY "Procurement users can manage items" 
ON public.items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = items.branch_id 
  AND (profiles.role IN ('admin', 'manager') OR profiles.department = 'Procurement')
));

-- Create trigger for updated_at
CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_items_name ON public.items(name);
CREATE INDEX idx_items_category ON public.items(category);
CREATE INDEX idx_items_status ON public.items(status);
CREATE INDEX idx_items_added_by ON public.items(added_by);