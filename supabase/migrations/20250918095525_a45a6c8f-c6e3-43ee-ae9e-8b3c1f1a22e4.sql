-- Update the admin user role to admin
UPDATE profiles 
SET role = 'admin', 
    department = 'Administration',
    designation = 'System Administrator',
    employee_id = 'ADM001'
WHERE email = 'info@gravenautomation.com';