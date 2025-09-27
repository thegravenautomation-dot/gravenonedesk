-- Insert a test notification to verify the system is working
INSERT INTO public.notifications (
  branch_id, 
  title, 
  message, 
  type, 
  entity_type, 
  entity_id, 
  is_read
) VALUES (
  '1d6bd331-db9d-4e0d-b5d8-401306d90d79', 
  'Test Notification', 
  'This is a test notification to verify the system is working correctly. Click on the bell icon to view notifications.', 
  'info', 
  'test', 
  gen_random_uuid(), 
  false
);