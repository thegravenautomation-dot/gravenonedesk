-- Ensure trigger to create profiles on new auth users
DO $$
BEGIN
  -- Drop existing trigger if present to avoid duplicates
  IF EXISTS (
    SELECT 1 FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE t.tgname = 'on_auth_user_created' AND n.nspname = 'auth' AND c.relname = 'users'
  ) THEN
    EXECUTE 'DROP TRIGGER on_auth_user_created ON auth.users;';
  END IF;

  -- Create trigger to keep profiles in sync with auth.users metadata
  EXECUTE $$
    CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  $$;
END $$;

-- Backfill profiles for existing auth users missing a profile row
INSERT INTO public.profiles (
  id, email, full_name, role, branch_id, phone, employee_id, department, designation, joining_date, is_active, created_at, updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'role', '')::user_role, 'executive'::user_role),
  NULLIF(u.raw_user_meta_data ->> 'branch_id', '')::uuid,
  NULLIF(u.raw_user_meta_data ->> 'phone', ''),
  NULLIF(u.raw_user_meta_data ->> 'employee_id', ''),
  NULLIF(u.raw_user_meta_data ->> 'department', ''),
  NULLIF(u.raw_user_meta_data ->> 'designation', ''),
  CASE WHEN (u.raw_user_meta_data ->> 'joining_date') IS NOT NULL THEN (u.raw_user_meta_data ->> 'joining_date')::date ELSE NULL END,
  true,
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;