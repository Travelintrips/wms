-- Delete all existing suppliers first
DELETE FROM suppliers;

-- Insert exactly 3 suppliers with active status
INSERT INTO suppliers (supplier_code, supplier_name, contact_person, phone_number, email, address, status)
VALUES 
  ('SUP001', 'CV Mitra Sejahtera', 'Jane Smith', '081234567891', 'jane@supplier2.com', 'Bandung', 'active'),
  ('SUP002', 'PT Global Trading', 'Bob Wilson', '081234567892', 'bob@supplier3.com', 'Surabaya', 'active'),
  ('SUP003', 'PT Supplier Utama', 'John Doe', '081234567890', 'john@supplier1.com', 'Jakarta', 'active');
