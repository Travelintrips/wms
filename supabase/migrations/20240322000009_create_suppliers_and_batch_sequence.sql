CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE SEQUENCE IF NOT EXISTS batch_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_batch_number()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  batch_code TEXT;
BEGIN
  next_num := nextval('batch_number_seq');
  batch_code := 'BATCH' || LPAD(next_num::TEXT, 6, '0');
  RETURN batch_code;
END;
$$ LANGUAGE plpgsql;

CREATE INDEX IF NOT EXISTS idx_suppliers_status ON suppliers(status);

alter publication supabase_realtime add table suppliers;

INSERT INTO suppliers (name, contact_person, phone, email, address, status) VALUES
('PT Supplier Utama', 'John Doe', '081234567890', 'john@supplier1.com', 'Jakarta', 'active'),
('CV Mitra Sejahtera', 'Jane Smith', '081234567891', 'jane@supplier2.com', 'Bandung', 'active'),
('PT Global Trading', 'Bob Wilson', '081234567892', 'bob@supplier3.com', 'Surabaya', 'active');