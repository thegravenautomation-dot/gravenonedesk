-- Fix function search path security issue
CREATE OR REPLACE FUNCTION public.get_security_recommendations()
RETURNS TABLE(recommendation TEXT, action_required TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY VALUES 
    ('Enable leaked password protection', 'Configure in Supabase Dashboard > Authentication > Settings > Password strength'),
    ('Set minimum password length', 'Recommended: 8+ characters with complexity requirements'),
    ('Enable password breach detection', 'Prevents use of compromised passwords from data breaches');
END;
$$;