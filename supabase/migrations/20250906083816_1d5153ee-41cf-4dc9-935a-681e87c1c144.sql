-- Create trigger to auto-insert profiles on new auth users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Safe backfill only for users that have a valid branch_id in metadata
INSERT INTO public.profiles (
  id, email, full_name, role, branch_id, phone, employee_id, department, designation, joining_date, is_active, created_at, updated_at
)
SELECT 
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data ->> 'full_name', ''),
  COALESCE(NULLIF(u.raw_user_meta_data ->> 'role', '')::user_role, 'executive'::user_role),
  b.id AS branch_id,
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
JOIN public.branches b ON b.id = (u.raw_user_meta_data ->> 'branch_id')::uuid
WHERE p.id IS NULL;