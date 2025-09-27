-- Fix ambiguous column reference in recalculate_customer_balance function
CREATE OR REPLACE FUNCTION public.recalculate_customer_balance(customer_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculated_balance NUMERIC := 0;
  ledger_record RECORD;
BEGIN
  -- Update all balances for the customer in chronological order
  FOR ledger_record IN 
    SELECT id, debit_amount, credit_amount 
    FROM customer_ledger 
    WHERE customer_id = customer_uuid 
    ORDER BY transaction_date, created_at
  LOOP
    calculated_balance := calculated_balance + COALESCE(ledger_record.debit_amount, 0) - COALESCE(ledger_record.credit_amount, 0);
    
    UPDATE customer_ledger 
    SET balance = calculated_balance,
        running_balance = calculated_balance
    WHERE id = ledger_record.id;
  END LOOP;
END;
$function$;