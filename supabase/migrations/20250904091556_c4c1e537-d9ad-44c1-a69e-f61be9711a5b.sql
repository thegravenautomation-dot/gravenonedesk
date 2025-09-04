-- Insert sample data

-- Sample branches
INSERT INTO public.branches (id, name, code, address, city, state, pincode, phone, email, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Mumbai Head Office', 'MUM01', '123 Business Park, Andheri East', 'Mumbai', 'Maharashtra', '400069', '+91-22-12345678', 'mumbai@gravenautomation.com', true),
('550e8400-e29b-41d4-a716-446655440002', 'Delhi Branch', 'DEL01', '456 Corporate Plaza, Connaught Place', 'Delhi', 'Delhi', '110001', '+91-11-87654321', 'delhi@gravenautomation.com', true),
('550e8400-e29b-41d4-a716-446655440003', 'Bangalore Branch', 'BLR01', '789 Tech Hub, Whitefield', 'Bangalore', 'Karnataka', '560066', '+91-80-11223344', 'bangalore@gravenautomation.com', true);

-- Sample customers
INSERT INTO public.customers (id, name, company, email, phone, address, city, state, pincode, gstin, branch_id) VALUES
('650e8400-e29b-41d4-a716-446655440001', 'Rajesh Kumar', 'ABC Manufacturing Ltd', 'rajesh@abcmfg.com', '+91-9876543210', '123 Industrial Area', 'Mumbai', 'Maharashtra', '400001', '27ABCTY1234D1Z5', '550e8400-e29b-41d4-a716-446655440001'),
('650e8400-e29b-41d4-a716-446655440002', 'Priya Sharma', 'XYZ Industries Pvt Ltd', 'priya@xyzind.com', '+91-9876543211', '456 Phase 2, Gurgaon', 'Gurgaon', 'Haryana', '122001', '06XYZAB5678C1Z2', '550e8400-e29b-41d4-a716-446655440002'),
('650e8400-e29b-41d4-a716-446655440003', 'Amit Patel', 'Tech Solutions Inc', 'amit@techsol.com', '+91-9876543212', '789 Electronics City', 'Bangalore', 'Karnataka', '560100', '29TECHP9012E1Z8', '550e8400-e29b-41d4-a716-446655440003');

-- Sample leads
INSERT INTO public.leads (id, lead_no, customer_id, title, description, source, status, value, probability, branch_id, expected_close_date) VALUES
('750e8400-e29b-41d4-a716-446655440001', 'LD001', '650e8400-e29b-41d4-a716-446655440001', 'Industrial Automation System', 'Complete automation solution for manufacturing plant', 'Website', 'qualified', 500000.00, 75, '550e8400-e29b-41d4-a716-446655440001', '2025-02-15'),
('750e8400-e29b-41d4-a716-446655440002', 'LD002', '650e8400-e29b-41d4-a716-446655440002', 'SCADA System Implementation', 'SCADA system for water treatment plant', 'IndiaMART', 'proposal', 750000.00, 60, '550e8400-e29b-41d4-a716-446655440002', '2025-02-28'),
('750e8400-e29b-41d4-a716-446655440003', 'LD003', '650e8400-e29b-41d4-a716-446655440003', 'PLC Programming Services', 'Programming and commissioning of PLCs', 'WhatsApp', 'negotiation', 250000.00, 85, '550e8400-e29b-41d4-a716-446655440003', '2025-01-30');

-- Sample quotations
INSERT INTO public.quotations (id, quotation_no, lead_id, customer_id, status, subtotal, tax_amount, total_amount, valid_till, terms, branch_id) VALUES
('850e8400-e29b-41d4-a716-446655440001', 'QT001', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440001', 'sent', 423728.81, 76271.19, 500000.00, '2025-02-28', 'Payment Terms: 30% advance, 70% on delivery', '550e8400-e29b-41d4-a716-446655440001'),
('850e8400-e29b-41d4-a716-446655440002', 'QT002', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'approved', 635593.22, 114406.78, 750000.00, '2025-03-15', 'Payment Terms: 40% advance, 60% on completion', '550e8400-e29b-41d4-a716-446655440002');

-- Sample orders
INSERT INTO public.orders (id, order_no, quotation_id, customer_id, status, order_date, delivery_date, subtotal, tax_amount, total_amount, branch_id) VALUES
('950e8400-e29b-41d4-a716-446655440001', 'ORD001', '850e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440002', 'confirmed', '2025-01-10', '2025-03-10', 635593.22, 114406.78, 750000.00, '550e8400-e29b-41d4-a716-446655440002');

-- Sample invoices
INSERT INTO public.invoices (id, invoice_no, order_id, customer_id, invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, payment_status, branch_id) VALUES
('a50e8400-e29b-41d4-a716-446655440001', 'INV001', '950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440002', '2025-01-10', '2025-02-09', 635593.22, 114406.78, 750000.00, 300000.00, 'partial', '550e8400-e29b-41d4-a716-446655440002');

-- Sample employees
INSERT INTO public.employees (id, employee_id, full_name, email, phone, address, date_of_birth, joining_date, pan, basic_salary, hra, allowances, department, designation, branch_id) VALUES
('b50e8400-e29b-41d4-a716-446655440001', 'EMP001', 'Arjun Singh', 'arjun@gravenautomation.com', '+91-9876543213', '321 Sector 15, Noida', '1990-05-15', '2022-01-15', 'ABCDE1234F', 50000.00, 20000.00, 10000.00, 'Sales', 'Sales Executive', '550e8400-e29b-41d4-a716-446655440001'),
('b50e8400-e29b-41d4-a716-446655440002', 'EMP002', 'Neha Gupta', 'neha@gravenautomation.com', '+91-9876543214', '654 Model Town, Delhi', '1988-08-22', '2021-03-10', 'FGHIJ5678K', 75000.00, 30000.00, 15000.00, 'Accounts', 'Senior Accountant', '550e8400-e29b-41d4-a716-446655440002'),
('b50e8400-e29b-41d4-a716-446655440003', 'EMP003', 'Kiran Kumar', 'kiran@gravenautomation.com', '+91-9876543215', '987 JP Nagar, Bangalore', '1992-12-10', '2023-06-01', 'LMNOP9012Q', 60000.00, 24000.00, 12000.00, 'HR', 'HR Executive', '550e8400-e29b-41d4-a716-446655440003');

-- Sample attendance records
INSERT INTO public.attendance (employee_id, date, status, check_in, check_out, working_hours, branch_id) VALUES
('b50e8400-e29b-41d4-a716-446655440001', '2025-01-13', 'present', '09:00:00', '18:00:00', 8.0, '550e8400-e29b-41d4-a716-446655440001'),
('b50e8400-e29b-41d4-a716-446655440002', '2025-01-13', 'present', '09:15:00', '18:30:00', 8.25, '550e8400-e29b-41d4-a716-446655440002'),
('b50e8400-e29b-41d4-a716-446655440003', '2025-01-13', 'late', '10:00:00', '18:00:00', 7.0, '550e8400-e29b-41d4-a716-446655440003');

-- Sample vendors
INSERT INTO public.vendors (id, name, contact_person, email, phone, address, city, state, gstin, payment_terms, branch_id) VALUES
('c50e8400-e29b-41d4-a716-446655440001', 'Schneider Electric India', 'Rohit Mehta', 'rohit@schneider.com', '+91-9876543216', 'Electronic City Phase 1', 'Bangalore', 'Karnataka', '29SCHN1234E1Z5', 'Net 30 days', '550e8400-e29b-41d4-a716-446655440003'),
('c50e8400-e29b-41d4-a716-446655440002', 'Siemens Ltd', 'Kavita Rao', 'kavita@siemens.com', '+91-9876543217', 'Worli Industrial Area', 'Mumbai', 'Maharashtra', '27SIEM5678F1Z8', 'Net 45 days', '550e8400-e29b-41d4-a716-446655440001');

-- Sample purchase orders
INSERT INTO public.purchase_orders (id, po_no, vendor_id, po_date, delivery_date, subtotal, tax_amount, total_amount, status, branch_id) VALUES
('d50e8400-e29b-41d4-a716-446655440001', 'PO001', 'c50e8400-e29b-41d4-a716-446655440001', '2025-01-10', '2025-02-10', 84745.76, 15254.24, 100000.00, 'pending', '550e8400-e29b-41d4-a716-446655440003'),
('d50e8400-e29b-41d4-a716-446655440002', 'PO002', 'c50e8400-e29b-41d4-a716-446655440002', '2025-01-12', '2025-02-15', 127118.64, 22881.36, 150000.00, 'approved', '550e8400-e29b-41d4-a716-446655440001');