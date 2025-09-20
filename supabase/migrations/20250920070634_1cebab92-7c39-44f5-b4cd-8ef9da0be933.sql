-- Enhance lead assignment with customer history tracking
-- Add better assignment logic based on multiple factors

-- First check if we need to add any new columns to the leads table for better assignment
-- Add region/location tracking for leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS state text;

-- Update lead_assignment_rules table to support more complex conditions
ALTER TABLE lead_assignment_rules ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE lead_assignment_rules ADD COLUMN IF NOT EXISTS rule_type text DEFAULT 'manual';

-- Add customer history tracking function for lead assignment
CREATE OR REPLACE FUNCTION public.get_previous_salesperson_for_customer(p_customer_id uuid, p_branch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  previous_salesperson uuid;
BEGIN
  -- Get the most recent salesperson who handled this customer
  SELECT assigned_to 
  INTO previous_salesperson
  FROM leads 
  WHERE customer_id = p_customer_id 
    AND branch_id = p_branch_id 
    AND assigned_to IS NOT NULL
  ORDER BY created_at DESC, updated_at DESC
  LIMIT 1;
  
  RETURN previous_salesperson;
END;
$function$;

-- Enhanced lead assignment function that considers customer history
CREATE OR REPLACE FUNCTION public.assign_lead_smart(p_lead_id uuid, p_branch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  lead_record leads%ROWTYPE;
  previous_salesperson uuid;
  assigned_to uuid;
  rule_record lead_assignment_rules%ROWTYPE;
BEGIN
  -- Get the lead details
  SELECT * INTO lead_record FROM leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  
  -- First priority: Check if customer has previous history
  IF lead_record.customer_id IS NOT NULL THEN
    previous_salesperson := get_previous_salesperson_for_customer(lead_record.customer_id, p_branch_id);
    
    IF previous_salesperson IS NOT NULL THEN
      -- Assign to previous salesperson regardless of rules
      UPDATE leads 
      SET assigned_to = previous_salesperson 
      WHERE id = p_lead_id;
      
      RETURN previous_salesperson;
    END IF;
  END IF;
  
  -- Second priority: Apply assignment rules based on multiple factors
  FOR rule_record IN 
    SELECT * FROM lead_assignment_rules 
    WHERE branch_id = p_branch_id 
      AND is_active = true 
    ORDER BY priority ASC
  LOOP
    DECLARE
      conditions jsonb := rule_record.conditions;
      should_assign boolean := true;
    BEGIN
      -- Check source condition
      IF conditions ? 'source' AND conditions->>'source' != COALESCE(lead_record.source, '') THEN
        should_assign := false;
      END IF;
      
      -- Check value range conditions
      IF conditions ? 'value_min' AND (lead_record.value IS NULL OR lead_record.value < (conditions->>'value_min')::numeric) THEN
        should_assign := false;
      END IF;
      
      IF conditions ? 'value_max' AND (lead_record.value IS NULL OR lead_record.value > (conditions->>'value_max')::numeric) THEN
        should_assign := false;
      END IF;
      
      -- Check region condition
      IF conditions ? 'region' AND conditions->>'region' != COALESCE(lead_record.region, '') THEN
        should_assign := false;
      END IF;
      
      -- Check state condition
      IF conditions ? 'state' AND conditions->>'state' != COALESCE(lead_record.state, '') THEN
        should_assign := false;
      END IF;
      
      -- Check city condition
      IF conditions ? 'city' AND conditions->>'city' != COALESCE(lead_record.city, '') THEN
        should_assign := false;
      END IF;
      
      IF should_assign THEN
        UPDATE leads 
        SET assigned_to = rule_record.assigned_to 
        WHERE id = p_lead_id;
        
        RETURN rule_record.assigned_to;
      END IF;
    END;
  END LOOP;
  
  -- No rules matched, return NULL (unassigned)
  RETURN NULL;
END;
$function$;