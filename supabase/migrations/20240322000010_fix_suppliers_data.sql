-- Update existing suppliers to have active status
UPDATE suppliers SET status = 'active' WHERE status IS NULL OR status = '';

-- Insert sample suppliers if table is empty (with supplier_code)
INSERT INTO suppliers (supplier_code, supplier_name, contact_person, phone_number, email, address, status)
SELECT 'SUP001', 'PT Supplier Utama', 'John Doe', '081234567890', 'john@supplier1.com', 'Jakarta', 'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE supplier_name = 'PT Supplier Utama');

INSERT INTO suppliers (supplier_code, supplier_name, contact_person, phone_number, email, address, status)
SELECT 'SUP002', 'CV Mitra Sejahtera', 'Jane Smith', '081234567891', 'jane@supplier2.com', 'Bandung', 'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE supplier_name = 'CV Mitra Sejahtera');

INSERT INTO suppliers (supplier_code, supplier_name, contact_person, phone_number, email, address, status)
SELECT 'SUP003', 'PT Global Trading', 'Bob Wilson', '081234567892', 'bob@supplier3.com', 'Surabaya', 'active'
WHERE NOT EXISTS (SELECT 1 FROM suppliers WHERE supplier_name = 'PT Global Trading');