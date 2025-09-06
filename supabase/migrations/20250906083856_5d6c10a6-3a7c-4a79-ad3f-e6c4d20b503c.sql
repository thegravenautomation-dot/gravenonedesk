-- Create a default branch for users that don't have one
INSERT INTO public.branches (name, code, is_active, created_at, updated_at)
VALUES ('Main Branch', 'MAIN', true, now(), now())
ON CONFLICT (code) DO NOTHING;

-- Now add profiles for users that don't have a valid branch_id by assigning them to the main branch
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
CROSS JOIN public.branches b
WHERE p.id IS NULL 
AND b.code = 'MAIN';