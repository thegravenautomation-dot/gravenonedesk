-- Add new sales roles to the existing user_role enum
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'sales_manager';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'bdo'; 
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'fbdo';