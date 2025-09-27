-- Insert common lead sources for all branches if they don't exist
INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'IndiaMART', 'indiamart', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'indiamart'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'TradeIndia', 'tradeindia', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'tradeindia'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'Website', 'website', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'website'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'WhatsApp Business', 'whatsapp', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'whatsapp'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'Referral', 'referral', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'referral'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'Email Campaign', 'email', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'email'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'Phone Inquiry', 'phone', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'phone'
);

INSERT INTO public.lead_sources (name, source_type, branch_id, is_active)
SELECT 'Manual Entry', 'manual', b.id, true
FROM branches b
WHERE NOT EXISTS (
  SELECT 1 FROM lead_sources ls 
  WHERE ls.branch_id = b.id AND ls.source_type = 'manual'
);