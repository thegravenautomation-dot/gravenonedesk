-- First, drop the problematic policy
DROP POLICY IF EXISTS "Vendors can view RFQs assigned to them" ON public.rfqs;

-- Create security definer function to check vendor access to RFQs
CREATE OR REPLACE FUNCTION public.can_vendor_access_rfq(p_rfq_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM rfq_vendors rv
    JOIN vendor_users vu ON vu.vendor_id = rv.vendor_id
    WHERE rv.rfq_id = p_rfq_id 
    AND vu.user_id = p_user_id
  );
$$;

-- Recreate the policy using the security definer function
CREATE POLICY "Vendors can view assigned RFQs"
ON public.rfqs
FOR SELECT
USING (can_vendor_access_rfq(id, auth.uid()));