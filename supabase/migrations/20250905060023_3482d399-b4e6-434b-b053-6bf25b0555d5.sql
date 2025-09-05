-- Enable realtime for leads table to get instant UI updates
ALTER TABLE public.leads REPLICA IDENTITY FULL;

-- Add the leads table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;

-- Create a sync status tracking table for better coordination
CREATE TABLE IF NOT EXISTS public.sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  branch_id UUID NOT NULL,
  last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  next_sync_at TIMESTAMP WITH TIME ZONE,
  sync_interval_minutes INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  rate_limit_until TIMESTAMP WITH TIME ZONE,
  last_error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(source_name, branch_id)
);

-- Enable RLS on sync_status
ALTER TABLE public.sync_status ENABLE ROW LEVEL SECURITY;

-- Policy for sync_status access
CREATE POLICY "Branch access policy for sync_status" ON public.sync_status
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.branch_id = sync_status.branch_id
  )
);

-- Function to update sync status timestamps
CREATE OR REPLACE FUNCTION update_sync_status(
  p_source_name TEXT,
  p_branch_id UUID,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_interval_minutes INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.sync_status (
    source_name, 
    branch_id, 
    last_sync_at, 
    next_sync_at,
    sync_interval_minutes,
    last_error,
    rate_limit_until
  ) VALUES (
    p_source_name,
    p_branch_id,
    NOW(),
    CASE 
      WHEN p_success THEN NOW() + INTERVAL '1 minute' * COALESCE(p_interval_minutes, 5)
      ELSE NOW() + INTERVAL '10 minutes' -- Backoff on error
    END,
    COALESCE(p_interval_minutes, 5),
    CASE WHEN p_success THEN NULL ELSE p_error_message END,
    CASE 
      WHEN p_error_message LIKE '%429%' OR p_error_message LIKE '%rate limit%' THEN
        CASE 
          WHEN p_source_name = 'indiamart' THEN NOW() + INTERVAL '5 minutes'
          WHEN p_source_name = 'tradeindia' THEN NOW() + INTERVAL '2 minutes'
          ELSE NOW() + INTERVAL '1 minute'
        END
      ELSE NULL
    END
  )
  ON CONFLICT (source_name, branch_id) 
  DO UPDATE SET
    last_sync_at = NOW(),
    next_sync_at = CASE 
      WHEN p_success THEN NOW() + INTERVAL '1 minute' * COALESCE(p_interval_minutes, sync_status.sync_interval_minutes)
      ELSE NOW() + INTERVAL '10 minutes'
    END,
    sync_interval_minutes = COALESCE(p_interval_minutes, sync_status.sync_interval_minutes),
    last_error = CASE WHEN p_success THEN NULL ELSE p_error_message END,
    rate_limit_until = CASE 
      WHEN p_error_message LIKE '%429%' OR p_error_message LIKE '%rate limit%' THEN
        CASE 
          WHEN p_source_name = 'indiamart' THEN NOW() + INTERVAL '5 minutes'
          WHEN p_source_name = 'tradeindia' THEN NOW() + INTERVAL '2 minutes'
          ELSE NOW() + INTERVAL '1 minute'
        END
      WHEN p_success THEN NULL
      ELSE sync_status.rate_limit_until
    END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update sync_status updated_at
CREATE TRIGGER sync_status_updated_at
  BEFORE UPDATE ON public.sync_status
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Initialize sync status for existing branches
INSERT INTO public.sync_status (source_name, branch_id, sync_interval_minutes)
SELECT 'indiamart', id, 5 FROM public.branches WHERE is_active = true
ON CONFLICT (source_name, branch_id) DO NOTHING;

INSERT INTO public.sync_status (source_name, branch_id, sync_interval_minutes) 
SELECT 'tradeindia', id, 2 FROM public.branches WHERE is_active = true
ON CONFLICT (source_name, branch_id) DO NOTHING;