-- Fix recursive profiles policies and add trigger-based profile creation

-- 1) Helper function to check admin without causing RLS recursion (skip if exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')) THEN
        CREATE FUNCTION public.is_admin(_user_id uuid)
        RETURNS boolean
        LANGUAGE sql
        STABLE
        SECURITY DEFINER
        SET search_path = public
        AS $_$
          SELECT EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = _user_id AND role = 'admin'::user_role
          );
        $_$;
    END IF;
END
$$;

-- 2) Replace recursive admin policies on profiles (drop and recreate)
DROP POLICY IF EXISTS "Admins can manage all profiles v2" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles v2" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

CREATE POLICY "Admin all access"
ON public.profiles
FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "User insert profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- 3) Create trigger to auto-insert profiles on new auth user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Insert profile from user metadata provided at sign up
  INSERT INTO public.profiles (
    id, email, full_name, role, branch_id, phone, employee_id, department, designation, joining_date
  ) VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data ->> 'full_name', ''),
    COALESCE(new.raw_user_meta_data ->> 'role', 'executive')::user_role,
    (new.raw_user_meta_data ->> 'branch_id')::uuid,
    NULLIF(new.raw_user_meta_data ->> 'phone', ''),
    NULLIF(new.raw_user_meta_data ->> 'employee_id', ''),
    NULLIF(new.raw_user_meta_data ->> 'department', ''),
    NULLIF(new.raw_user_meta_data ->> 'designation', ''),
    CASE WHEN (new.raw_user_meta_data ->> 'joining_date') IS NOT NULL THEN (new.raw_user_meta_data ->> 'joining_date')::date ELSE NULL END
  );
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Do not block signup if profile insert fails; log and continue
  RAISE NOTICE 'handle_new_user failed: %', SQLERRM;
  RETURN new;
END;
$$;

-- Drop and recreate trigger to ensure it's attached
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();