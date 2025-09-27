-- Add payment_mode field to customer_ledger for better tracking
ALTER TABLE public.customer_ledger 
ADD COLUMN IF NOT EXISTS payment_mode TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_customer_ledger_customer_date 
ON public.customer_ledger(customer_id, transaction_date DESC);

-- Create a function to get customer account summary
CREATE OR REPLACE FUNCTION public.get_customer_account_summary(p_customer_id UUID)
RETURNS TABLE(
  total_orders NUMERIC,
  total_payments NUMERIC,
  current_balance NUMERIC,
  total_due NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN transaction_type = 'order' THEN debit_amount ELSE 0 END), 0) as total_orders,
    COALESCE(SUM(CASE WHEN transaction_type = 'payment' THEN credit_amount ELSE 0 END), 0) as total_payments,
    COALESCE(MAX(balance), 0) as current_balance,
    CASE 
      WHEN COALESCE(MAX(balance), 0) > 0 THEN 0 
      ELSE ABS(COALESCE(MAX(balance), 0)) 
    END as total_due
  FROM public.customer_ledger 
  WHERE customer_id = p_customer_id;
END;
$$;

-- Create function to check if order is fully paid
CREATE OR REPLACE FUNCTION public.is_order_fully_paid(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  order_total NUMERIC;
  total_payments NUMERIC;
BEGIN
  -- Get order total
  SELECT total_amount INTO order_total
  FROM public.orders 
  WHERE id = p_order_id;
  
  -- Get total payments for this order
  SELECT COALESCE(SUM(amount), 0) INTO total_payments
  FROM public.payments 
  WHERE order_id = p_order_id;
  
  -- Return true if fully paid
  RETURN (total_payments >= order_total);
END;
$$;

-- Update the customer ledger trigger to include payment mode
CREATE OR REPLACE FUNCTION public.update_customer_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      description, credit_amount, payment_mode, created_by
    ) VALUES (
      NEW.customer_id, NEW.branch_id, 'payment', 'payments', NEW.id,
      'Payment: ' || COALESCE(NEW.method, 'Cash') || ' - ' || COALESCE(NEW.reference, ''), 
      NEW.amount, NEW.payment_mode, auth.uid()
    );
    
    -- Check if order is fully paid and notify dispatch
    IF public.is_order_fully_paid(NEW.order_id) THEN
      -- Update order status to ready for dispatch
      UPDATE public.orders 
      SET status = 'paid', updated_at = NOW()
      WHERE id = NEW.order_id;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;