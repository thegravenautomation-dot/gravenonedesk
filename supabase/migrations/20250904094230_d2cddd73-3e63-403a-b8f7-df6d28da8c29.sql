-- Fix recursive profiles policies and add trigger-based profile creation

-- 1) Helper function to check admin without causing RLS recursion
create or replace function public.is_admin(_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = _user_id and role = 'admin'::user_role
  );
$$;

-- 2) Replace recursive admin policies on profiles
drop policy if exists "Admins can manage all profiles" on public.profiles;
drop policy if exists "Admins can view all profiles" on public.profiles;

create policy "Admins can manage all profiles v2"
on public.profiles
for all
to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));

create policy "Admins can view all profiles v2"
on public.profiles
for select
to authenticated
using (public.is_admin(auth.uid()));

-- Keep existing user self-access policies (update/select) as-is.
-- Add explicit insert policy for authenticated users on their own row (optional with trigger, but safe)
create policy if not exists "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

-- 3) Create trigger to auto-insert profiles on new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Insert profile from user metadata provided at sign up
  insert into public.profiles (
    id, email, full_name, role, branch_id, phone, employee_id, department, designation, joining_date
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'executive')::user_role,
    (new.raw_user_meta_data ->> 'branch_id')::uuid,
    nullif(new.raw_user_meta_data ->> 'phone', ''),
    nullif(new.raw_user_meta_data ->> 'employee_id', ''),
    nullif(new.raw_user_meta_data ->> 'department', ''),
    nullif(new.raw_user_meta_data ->> 'designation', ''),
    case when (new.raw_user_meta_data ->> 'joining_date') is not null then (new.raw_user_meta_data ->> 'joining_date')::date else null end
  );
  return new;
exception when others then
  -- Do not block signup if profile insert fails; log and continue
  raise notice 'handle_new_user failed: %', SQLERRM;
  return new;
end;
$$;

-- Drop and recreate trigger to ensure it's attached
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();