-- Add currency support to purchase orders and enhance order-purchase order integration
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.0;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS source_order_ids JSONB DEFAULT '[]'::jsonb;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_contact TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS supplier_email TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS terms_conditions TEXT;

-- Add purchase order items table for better structure
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE CASCADE,
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
  source_order_item_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on purchase_order_items
ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Create policy for purchase_order_items
CREATE POLICY "Branch access policy for purchase_order_items"
ON purchase_order_items
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM purchase_orders po
    JOIN profiles p ON p.id = auth.uid()
    WHERE po.id = purchase_order_items.purchase_order_id
    AND p.branch_id = po.branch_id
  )
);

-- Add updated_at trigger for purchase_order_items
CREATE TRIGGER update_purchase_order_items_updated_at
BEFORE UPDATE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add order_source column to track where purchase orders come from
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'manual';

-- Add foreign currency fields to quotations and orders for better integration
ALTER TABLE quotations ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'INR';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_source_order_ids ON purchase_orders USING GIN (source_order_ids);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_po_id ON purchase_order_items (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_source ON purchase_order_items (source_order_item_id);