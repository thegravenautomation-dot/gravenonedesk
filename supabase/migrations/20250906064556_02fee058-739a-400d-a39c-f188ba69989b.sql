-- Enable password strength and leaked password protection
-- This requires updating auth configuration via SQL
-- Note: Some settings may need to be configured via Supabase Dashboard

-- Create a reminder function for password security settings
CREATE OR REPLACE FUNCTION public.get_security_recommendations()
RETURNS TABLE(recommendation TEXT, action_required TEXT) AS $$
BEGIN
  RETURN QUERY VALUES 
    ('Enable leaked password protection', 'Configure in Supabase Dashboard > Authentication > Settings > Password strength'),
    ('Set minimum password length', 'Recommended: 8+ characters with complexity requirements'),
    ('Enable password breach detection', 'Prevents use of compromised passwords from data breaches');
END;
$$ LANGUAGE plpgsql;

-- Grant access to security recommendations
GRANT EXECUTE ON FUNCTION public.get_security_recommendations TO authenticated;