-- Create follow_ups table for tracking customer interactions
CREATE TABLE public.follow_ups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  lead_id UUID,
  follow_up_date DATE NOT NULL,
  follow_up_time TIME,
  type TEXT NOT NULL DEFAULT 'call', -- call, email, meeting, visit
  priority TEXT NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
  status TEXT NOT NULL DEFAULT 'scheduled', -- scheduled, completed, postponed, cancelled
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT, -- What customer said during follow-up
  assigned_to UUID NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  next_follow_up_date DATE,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable RLS on follow_ups
ALTER TABLE public.follow_ups ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for follow_ups
CREATE POLICY "Branch access policy for follow_ups" 
ON public.follow_ups 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = follow_ups.branch_id
));

-- Create customer_ledger table for automatic ledger maintenance
CREATE TABLE public.customer_ledger (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL,
  branch_id UUID NOT NULL,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  transaction_type TEXT NOT NULL, -- order, payment, invoice, adjustment
  reference_type TEXT, -- orders, payments, invoices, manual
  reference_id UUID,
  description TEXT NOT NULL,
  debit_amount NUMERIC DEFAULT 0,
  credit_amount NUMERIC DEFAULT 0,
  balance NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  is_editable BOOLEAN DEFAULT true
);

-- Enable RLS on customer_ledger
ALTER TABLE public.customer_ledger ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customer_ledger
CREATE POLICY "Branch access policy for customer_ledger" 
ON public.customer_ledger 
FOR ALL 
USING (EXISTS ( 
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.branch_id = customer_ledger.branch_id
));

-- Enhance payments table with more fields
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS payment_mode TEXT DEFAULT 'cash', -- cash, cheque, bank_transfer, upi, card
ADD COLUMN IF NOT EXISTS cheque_number TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS verified_by UUID,
ADD COLUMN IF NOT EXISTS verification_date TIMESTAMP WITH TIME ZONE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_follow_ups_date_assigned ON follow_ups(follow_up_date, assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer ON follow_ups(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer ON customer_ledger(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_ledger_date ON customer_ledger(transaction_date);

-- Create triggers for updated_at
CREATE TRIGGER update_follow_ups_updated_at
  BEFORE UPDATE ON public.follow_ups
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-update customer ledger when orders/payments are created
CREATE OR REPLACE FUNCTION update_customer_ledger()
RETURNS TRIGGER AS $$
BEGIN
  -- Handle order creation (debit customer)
  IF TG_TABLE_NAME = 'orders' AND TG_OP = 'INSERT' THEN
    INSERT INTO customer_ledger (
      customer_id, branch_id, transaction_type, reference_type, reference_id,
      description, debit_amount, created_by
    ) VALUES (
      NEW.customer_id, NEW.branch_id, 'order', 'orders', NEW.id,
      'Order: ' || NEW.order_no, NEW.total_amount, auth.uid()
    );
    RETURN NEW;
  END IF;

  -- Handle payment creation (credit customer)
  IF TG_TABLE_NAME = 'payments' AND TG_OP = 'INSERT' THEN
    INSERT INTO customer_ledger (
      customer_id, branch_id, transaction_type, reference_type, reference_id,
      description, credit_amount, created_by
    ) VALUES (
      NEW.customer_id, NEW.branch_id, 'payment', 'payments', NEW.id,
      'Payment: ' || COALESCE(NEW.method, 'Cash') || ' - ' || COALESCE(NEW.reference, ''), 
      NEW.amount, auth.uid()
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for automatic ledger updates
CREATE TRIGGER auto_update_ledger_orders
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_ledger();

CREATE TRIGGER auto_update_ledger_payments
  AFTER INSERT ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_customer_ledger();

-- Function to recalculate customer ledger balance
CREATE OR REPLACE FUNCTION recalculate_customer_balance(customer_uuid UUID)
RETURNS VOID AS $$
DECLARE
  running_balance NUMERIC := 0;
  ledger_record RECORD;
BEGIN
  -- Update all balances for the customer in chronological order
  FOR ledger_record IN 
    SELECT id, debit_amount, credit_amount 
    FROM customer_ledger 
    WHERE customer_id = customer_uuid 
    ORDER BY transaction_date, created_at
  LOOP
    running_balance := running_balance + COALESCE(ledger_record.debit_amount, 0) - COALESCE(ledger_record.credit_amount, 0);
    
    UPDATE customer_ledger 
    SET balance = running_balance 
    WHERE id = ledger_record.id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;