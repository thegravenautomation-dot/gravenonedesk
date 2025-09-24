-- Create vendor management tables

-- Vendor applications table for self-registration
CREATE TABLE public.vendor_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_name TEXT NOT NULL,
  contact_person TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  pincode TEXT,
  gstin TEXT,
  pan TEXT,
  bank_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  account_holder_name TEXT,
  business_type TEXT,
  annual_turnover NUMERIC,
  years_in_business INTEGER,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  application_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for vendor applications
ALTER TABLE public.vendor_applications ENABLE ROW LEVEL SECURITY;

-- Vendor users table (approved vendors get login access)
CREATE TABLE public.vendor_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL, -- references auth.users
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  is_primary_contact BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

-- Enable RLS for vendor users
ALTER TABLE public.vendor_users ENABLE ROW LEVEL SECURITY;

-- RFQ (Request for Quotation) table
CREATE TABLE public.rfqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_no TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID NOT NULL,
  branch_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, closed, cancelled
  due_date DATE NOT NULL,
  terms_conditions TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for RFQs
ALTER TABLE public.rfqs ENABLE ROW LEVEL SECURITY;

-- RFQ items table
CREATE TABLE public.rfq_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  sr_no INTEGER NOT NULL,
  item_name TEXT NOT NULL,
  description TEXT,
  specification TEXT,
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit TEXT DEFAULT 'Nos',
  hsn_code TEXT,
  gst_rate NUMERIC DEFAULT 18,
  required_delivery_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for RFQ items
ALTER TABLE public.rfq_items ENABLE ROW LEVEL SECURITY;

-- RFQ vendor assignments
CREATE TABLE public.rfq_vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  invited_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notified_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'invited', -- invited, responded, declined
  UNIQUE(rfq_id, vendor_id)
);

-- Enable RLS for RFQ vendors
ALTER TABLE public.rfq_vendors ENABLE ROW LEVEL SECURITY;

-- Vendor quotations table
CREATE TABLE public.vendor_quotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rfq_id UUID NOT NULL REFERENCES public.rfqs(id) ON DELETE CASCADE,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  quotation_no TEXT NOT NULL,
  submitted_by UUID NOT NULL,
  submission_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  valid_till DATE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'INR',
  payment_terms TEXT,
  delivery_terms TEXT,
  remarks TEXT,
  status TEXT NOT NULL DEFAULT 'submitted', -- submitted, under_review, selected, rejected
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(rfq_id, vendor_id)
);

-- Enable RLS for vendor quotations
ALTER TABLE public.vendor_quotations ENABLE ROW LEVEL SECURITY;

-- Vendor quotation items
CREATE TABLE public.vendor_quotation_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quotation_id UUID NOT NULL REFERENCES public.vendor_quotations(id) ON DELETE CASCADE,
  rfq_item_id UUID NOT NULL REFERENCES public.rfq_items(id) ON DELETE CASCADE,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  delivery_days INTEGER,
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for vendor quotation items
ALTER TABLE public.vendor_quotation_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendor applications
CREATE POLICY "Anyone can create vendor applications" 
ON public.vendor_applications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Admins and procurement managers can view vendor applications" 
ON public.vendor_applications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = vendor_applications.branch_id
  AND profiles.role IN ('admin', 'manager')
));

CREATE POLICY "Admins and procurement managers can update vendor applications" 
ON public.vendor_applications 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = vendor_applications.branch_id
  AND profiles.role IN ('admin', 'manager')
));

-- RLS Policies for vendor users
CREATE POLICY "Vendor users can view their own records" 
ON public.vendor_users 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage vendor users" 
ON public.vendor_users 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'admin'
));

-- RLS Policies for RFQs
CREATE POLICY "Branch users can manage RFQs" 
ON public.rfqs 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = rfqs.branch_id
));

CREATE POLICY "Vendors can view RFQs assigned to them" 
ON public.rfqs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.rfq_vendors rv
  JOIN public.vendor_users vu ON vu.vendor_id = rv.vendor_id
  WHERE rv.rfq_id = rfqs.id AND vu.user_id = auth.uid()
));

-- RLS Policies for RFQ items
CREATE POLICY "Branch users can manage RFQ items" 
ON public.rfq_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.rfqs r
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE r.id = rfq_items.rfq_id AND p.branch_id = r.branch_id
));

CREATE POLICY "Vendors can view RFQ items for assigned RFQs" 
ON public.rfq_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.rfq_vendors rv
  JOIN public.vendor_users vu ON vu.vendor_id = rv.vendor_id
  WHERE rv.rfq_id = rfq_items.rfq_id AND vu.user_id = auth.uid()
));

-- RLS Policies for RFQ vendors
CREATE POLICY "Branch users can manage RFQ vendor assignments" 
ON public.rfq_vendors 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.rfqs r
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE r.id = rfq_vendors.rfq_id AND p.branch_id = r.branch_id
));

CREATE POLICY "Vendors can view their RFQ assignments" 
ON public.rfq_vendors 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.vendor_users vu
  WHERE vu.vendor_id = rfq_vendors.vendor_id AND vu.user_id = auth.uid()
));

-- RLS Policies for vendor quotations
CREATE POLICY "Branch users can view vendor quotations" 
ON public.vendor_quotations 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.rfqs r
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE r.id = vendor_quotations.rfq_id AND p.branch_id = r.branch_id
));

CREATE POLICY "Vendors can manage their own quotations" 
ON public.vendor_quotations 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.vendor_users vu
  WHERE vu.vendor_id = vendor_quotations.vendor_id AND vu.user_id = auth.uid()
));

-- RLS Policies for vendor quotation items
CREATE POLICY "Branch users can view vendor quotation items" 
ON public.vendor_quotation_items 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.vendor_quotations vq
  JOIN public.rfqs r ON r.id = vq.rfq_id
  JOIN public.profiles p ON p.id = auth.uid()
  WHERE vq.id = vendor_quotation_items.quotation_id AND p.branch_id = r.branch_id
));

CREATE POLICY "Vendors can manage their own quotation items" 
ON public.vendor_quotation_items 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.vendor_quotations vq
  JOIN public.vendor_users vu ON vu.vendor_id = vq.vendor_id
  WHERE vq.id = vendor_quotation_items.quotation_id AND vu.user_id = auth.uid()
));

-- Triggers for updated_at columns
CREATE TRIGGER update_vendor_applications_updated_at
  BEFORE UPDATE ON public.vendor_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfqs_updated_at
  BEFORE UPDATE ON public.rfqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vendor_quotations_updated_at
  BEFORE UPDATE ON public.vendor_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();