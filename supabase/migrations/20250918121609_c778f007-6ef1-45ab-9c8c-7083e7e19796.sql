-- Update branch data with the correct company details
UPDATE branches 
SET 
  name = 'GRAVEN AUTOMATION PRIVATE LIMITED',
  address = '7/25, TOWER F, 2ND FLOOR KIRTI NAGAR',
  city = 'NEW DELHI',
  state = 'DELHI',
  pincode = '110015',
  phone = '+917905350134 / 9919089567',
  email = 'SALES@GRAVENAUTOMATION.COM',
  terms_conditions = 'Terms and Conditions:
1. Payment should be made within 30 days from the date of invoice.
2. Goods once sold will not be taken back or exchanged.
3. Delivery period: 15-20 working days from the date of order confirmation.
4. Any disputes will be subject to local jurisdiction only.
5. Prices are subject to change without prior notice.
6. GST: 07AACCG1025G1ZX | PAN: AACCG1025G'
WHERE code = 'MAIN' OR id IN (
  SELECT id FROM branches LIMIT 1
);