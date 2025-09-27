-- Create pipeline stages table
CREATE TABLE public.pipeline_stages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL,
  color TEXT DEFAULT '#3B82F6',
  branch_id UUID NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunities table (enhanced leads tracking)
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID,
  customer_id UUID,
  title TEXT NOT NULL,
  description TEXT,
  value NUMERIC DEFAULT 0,
  probability INTEGER DEFAULT 50,
  stage_id UUID NOT NULL,
  expected_close_date DATE,
  assigned_to UUID,
  branch_id UUID NOT NULL,
  source TEXT,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'won', 'lost', 'on_hold')),
  won_reason TEXT,
  lost_reason TEXT,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunity activities table for tracking interactions
CREATE TABLE public.opportunity_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call', 'email', 'meeting', 'note', 'task', 'stage_change')),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  branch_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_activities ENABLE ROW LEVEL SECURITY;

-- Create policies for pipeline_stages
CREATE POLICY "Branch access policy for pipeline_stages" 
ON public.pipeline_stages 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = pipeline_stages.branch_id
  )
);

-- Create policies for opportunities
CREATE POLICY "Branch access policy for opportunities" 
ON public.opportunities 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = opportunities.branch_id
  )
);

-- Create policies for opportunity_activities
CREATE POLICY "Branch access policy for opportunity_activities" 
ON public.opportunity_activities 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = opportunity_activities.branch_id
  )
);

-- Insert default pipeline stages for each branch
INSERT INTO public.pipeline_stages (name, order_index, color, branch_id)
SELECT 
  stage_name,
  stage_order,
  stage_color,
  branches.id
FROM (
  VALUES 
    ('Lead', 1, '#64748B'),
    ('Qualified', 2, '#3B82F6'),
    ('Proposal', 3, '#F59E0B'),
    ('Negotiation', 4, '#EF4444'),
    ('Closed Won', 5, '#10B981'),
    ('Closed Lost', 6, '#6B7280')
) AS stages(stage_name, stage_order, stage_color)
CROSS JOIN public.branches
WHERE NOT EXISTS (
  SELECT 1 FROM public.pipeline_stages 
  WHERE pipeline_stages.branch_id = branches.id
);

-- Create trigger for updating timestamps
CREATE TRIGGER update_pipeline_stages_updated_at
BEFORE UPDATE ON public.pipeline_stages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to track opportunity stage changes
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for stage changes
CREATE TRIGGER log_opportunity_stage_change_trigger
AFTER UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.log_opportunity_stage_change();