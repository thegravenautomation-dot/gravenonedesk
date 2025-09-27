-- Fix security warning by updating function search path
CREATE OR REPLACE FUNCTION public.log_opportunity_stage_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Log stage change as activity
  IF OLD.stage_id IS DISTINCT FROM NEW.stage_id THEN
    INSERT INTO public.opportunity_activities (
      opportunity_id,
      activity_type,
      title,
      description,
      created_by,
      branch_id
    ) VALUES (
      NEW.id,
      'stage_change',
      'Stage Changed',
      'Moved from ' || (SELECT name FROM public.pipeline_stages WHERE id = OLD.stage_id) || 
      ' to ' || (SELECT name FROM public.pipeline_stages WHERE id = NEW.stage_id),
      auth.uid(),
      NEW.branch_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;