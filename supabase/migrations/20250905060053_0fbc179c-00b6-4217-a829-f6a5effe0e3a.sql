-- Fix function search path security issue
DROP FUNCTION IF EXISTS update_sync_status(TEXT, UUID, BOOLEAN, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION update_sync_status(
  p_source_name TEXT,
  p_branch_id UUID,
  p_success BOOLEAN DEFAULT true,
  p_error_message TEXT DEFAULT NULL,
  p_interval_minutes INTEGER DEFAULT NULL
)
RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;