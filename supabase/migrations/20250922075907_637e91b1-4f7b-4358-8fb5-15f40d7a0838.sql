-- Enhanced Dispatch Module with AWB Management and Tracking (Fixed)

-- Create enum for courier providers
CREATE TYPE courier_provider AS ENUM (
  'dtdc', 
  'shree_maruti', 
  'bluedart', 
  'delhivery', 
  'fedex', 
  'dhl', 
  'aramex',
  'other'
);

-- Create enum for shipment status
CREATE TYPE shipment_status AS ENUM (
  'pending',
  'booked', 
  'picked_up',
  'in_transit',
  'out_for_delivery', 
  'delivered',
  'returned',
  'cancelled'
);

-- Create shipments table
CREATE TABLE public.shipments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL,
  branch_id uuid NOT NULL,
  customer_id uuid NOT NULL,
  
  -- AWB Details
  awb_number text,
  awb_file_path text,
  courier_provider courier_provider,
  
  -- Shipment Details
  shipment_status shipment_status DEFAULT 'pending',
  booking_date date,
  expected_delivery_date date,
  actual_delivery_date date,
  
  -- Tracking Details
  tracking_url text,
  tracking_data jsonb DEFAULT '{}',
  last_tracked_at timestamp with time zone,
  
  -- Dimensions & Weight
  weight_kg numeric(8,2),
  dimensions jsonb, -- {length: x, width: y, height: z}
  
  -- Shipping Address
  shipping_address jsonb NOT NULL, -- Complete address object
  
  -- Additional Details
  special_instructions text,
  delivery_type text DEFAULT 'standard', -- standard, express, overnight
  cod_amount numeric(10,2) DEFAULT 0,
  
  -- System fields
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create courier configurations table for API settings
CREATE TABLE public.courier_configs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  branch_id uuid NOT NULL,
  courier_provider courier_provider NOT NULL,
  
  -- API Configuration
  api_endpoint text,
  api_credentials jsonb, -- encrypted credentials
  is_active boolean DEFAULT true,
  
  -- Rate Configuration
  rate_config jsonb DEFAULT '{}', -- pricing and service configuration
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  
  UNIQUE(branch_id, courier_provider)
);

-- Create shipping labels table
CREATE TABLE public.shipping_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipment_id uuid NOT NULL REFERENCES public.shipments(id) ON DELETE CASCADE,
  
  -- Label Details
  label_pdf_path text,
  barcode_data text,
  label_size text DEFAULT 'A6', -- A4, A5, A6, thermal
  
  -- Generation Details
  generated_by uuid,
  generated_at timestamp with time zone DEFAULT now(),
  
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courier_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_labels ENABLE ROW LEVEL SECURITY;

-- RLS Policies for shipments
CREATE POLICY "Branch access policy for shipments" 
ON public.shipments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = shipments.branch_id
  )
);

-- RLS Policies for courier_configs  
CREATE POLICY "Admin and managers can manage courier configs" 
ON public.courier_configs 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = courier_configs.branch_id
    AND profiles.role IN ('admin', 'manager')
  )
);

-- RLS Policies for shipping_labels
CREATE POLICY "Branch access policy for shipping labels" 
ON public.shipping_labels 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.id = shipping_labels.shipment_id 
    AND p.branch_id = s.branch_id
  )
);

-- Add shipment_id to orders table to link orders with shipments
ALTER TABLE public.orders 
ADD COLUMN shipment_id uuid REFERENCES public.shipments(id);

-- Create function to auto-update order status when shipment is created
CREATE OR REPLACE FUNCTION update_order_shipment_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When AWB is added to a shipment, mark order as shipped
  IF NEW.awb_number IS NOT NULL AND OLD.awb_number IS NULL THEN
    UPDATE public.orders 
    SET status = 'shipped'::order_status
    WHERE id = NEW.order_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for order status update
CREATE TRIGGER update_order_on_shipment_change
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION update_order_shipment_status();

-- Create function to generate tracking barcode
CREATE OR REPLACE FUNCTION generate_tracking_barcode(p_shipment_id uuid)
RETURNS text AS $$
DECLARE
  barcode_data text;
BEGIN
  -- Generate barcode with format: BRANCH-ORDER-SHIPMENT
  SELECT 
    b.code || '-' || o.order_no || '-' || EXTRACT(EPOCH FROM s.created_at)::text
  INTO barcode_data
  FROM public.shipments s
  JOIN public.orders o ON o.id = s.order_id  
  JOIN public.branches b ON b.id = s.branch_id
  WHERE s.id = p_shipment_id;
  
  RETURN barcode_data;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add updated_at trigger to shipments
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger to courier_configs
CREATE TRIGGER update_courier_configs_updated_at
  BEFORE UPDATE ON public.courier_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert storage bucket for AWB files and shipping labels
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('awb-documents', 'awb-documents', false),
  ('shipping-labels', 'shipping-labels', false);

-- Storage policies for AWB documents
CREATE POLICY "Branch users can view AWB documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'awb-documents' AND 
  EXISTS (
    SELECT 1 FROM public.shipments s
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE s.awb_file_path = name
    AND p.branch_id = s.branch_id
  )
);

CREATE POLICY "Authorized users can upload AWB documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'awb-documents' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'manager')
  )
);

-- Storage policies for shipping labels  
CREATE POLICY "Branch users can view shipping labels" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipping-labels' AND 
  EXISTS (
    SELECT 1 FROM public.shipping_labels sl
    JOIN public.shipments s ON s.id = sl.shipment_id
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE sl.label_pdf_path = name
    AND p.branch_id = s.branch_id
  )
);

CREATE POLICY "Users can generate shipping labels" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shipping-labels' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid()
  )
);