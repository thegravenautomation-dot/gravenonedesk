-- Add missing foreign key relationships for follow_ups to enable nested selects
-- and make Follow Up module tabs work correctly across stages.

-- 1) follow_ups.customer_id -> customers.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follow_ups_customer_id_fkey'
  ) THEN
    ALTER TABLE public.follow_ups
      ADD CONSTRAINT follow_ups_customer_id_fkey
      FOREIGN KEY (customer_id)
      REFERENCES public.customers(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 2) follow_ups.lead_id -> leads.id (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follow_ups_lead_id_fkey'
  ) THEN
    ALTER TABLE public.follow_ups
      ADD CONSTRAINT follow_ups_lead_id_fkey
      FOREIGN KEY (lead_id)
      REFERENCES public.leads(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- 3) follow_ups.assigned_to -> profiles.id
-- Name must match code usage: profiles!follow_ups_assigned_to_fkey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follow_ups_assigned_to_fkey'
  ) THEN
    ALTER TABLE public.follow_ups
      ADD CONSTRAINT follow_ups_assigned_to_fkey
      FOREIGN KEY (assigned_to)
      REFERENCES public.profiles(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 4) follow_ups.branch_id -> branches.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follow_ups_branch_id_fkey'
  ) THEN
    ALTER TABLE public.follow_ups
      ADD CONSTRAINT follow_ups_branch_id_fkey
      FOREIGN KEY (branch_id)
      REFERENCES public.branches(id)
      ON DELETE RESTRICT;
  END IF;
END $$;

-- 5) follow_ups.created_by -> profiles.id (optional but useful for joins/audits)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'follow_ups_created_by_fkey'
  ) THEN
    ALTER TABLE public.follow_ups
      ADD CONSTRAINT follow_ups_created_by_fkey
      FOREIGN KEY (created_by)
      REFERENCES public.profiles(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Helpful indexes for filtering and ordering
CREATE INDEX IF NOT EXISTS idx_follow_ups_follow_up_date ON public.follow_ups (follow_up_date);
CREATE INDEX IF NOT EXISTS idx_follow_ups_status ON public.follow_ups (status);
CREATE INDEX IF NOT EXISTS idx_follow_ups_assigned_to ON public.follow_ups (assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_ups_customer_id ON public.follow_ups (customer_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_lead_id ON public.follow_ups (lead_id);
CREATE INDEX IF NOT EXISTS idx_follow_ups_branch_id ON public.follow_ups (branch_id);
