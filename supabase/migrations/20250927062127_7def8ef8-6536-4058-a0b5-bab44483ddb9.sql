-- Create function to log lead assignments
CREATE OR REPLACE FUNCTION public.log_lead_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Only log if assigned_to field changed
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.lead_assignment_log (
      lead_id,
      assigned_to,
      manual_override,
      assigned_by,
      branch_id
    ) VALUES (
      NEW.id,
      NEW.assigned_to,
      true, -- Manual assignment for now
      auth.uid(),
      NEW.branch_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to log lead assignments
CREATE TRIGGER trigger_log_lead_assignment
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  EXECUTE FUNCTION public.log_lead_assignment();

-- Update the existing assign_lead_smart function to log assignments
CREATE OR REPLACE FUNCTION public.assign_lead_smart_with_log(p_lead_id uuid, p_branch_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  assigned_to_user uuid;
  rule_used_id uuid;
BEGIN
  -- Call existing smart assignment function
  assigned_to_user := assign_lead_smart(p_lead_id, p_branch_id);
  
  -- Log the assignment if successful
  IF assigned_to_user IS NOT NULL THEN
    INSERT INTO public.lead_assignment_log (
      lead_id,
      assigned_to,
      manual_override,
      assigned_by,
      branch_id
    ) VALUES (
      p_lead_id,
      assigned_to_user,
      false, -- Automatic assignment
      auth.uid(),
      p_branch_id
    );
  END IF;
  
  RETURN assigned_to_user;
END;
$$;