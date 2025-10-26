DROP TABLE IF EXISTS stock_movements CASCADE;
DROP TABLE IF EXISTS inbound_receipt_items CASCADE;
DROP TABLE IF EXISTS inbound_receipts CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inbound_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_number TEXT UNIQUE NOT NULL,
  supplier_id UUID REFERENCES suppliers(id),
  receipt_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE inbound_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID REFERENCES inbound_receipts(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity INTEGER NOT NULL,
  batch_code TEXT,
  manufacture_date DATE,
  expiry_date DATE,
  lot_id UUID REFERENCES lots(id),
  put_away_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  movement_type TEXT NOT NULL,
  item_id UUID REFERENCES items(id),
  batch_id UUID REFERENCES item_batches(id),
  lot_id UUID REFERENCES lots(id),
  quantity INTEGER NOT NULL,
  reference_number TEXT,
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inbound_receipts_supplier ON inbound_receipts(supplier_id);
CREATE INDEX idx_inbound_receipts_status ON inbound_receipts(status);
CREATE INDEX idx_inbound_receipt_items_receipt ON inbound_receipt_items(receipt_id);
CREATE INDEX idx_inbound_receipt_items_item ON inbound_receipt_items(item_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_batch ON stock_movements(batch_id);

alter publication supabase_realtime add table suppliers;
alter publication supabase_realtime add table inbound_receipts;
alter publication supabase_realtime add table inbound_receipt_items;
alter publication supabase_realtime add table stock_movements;

INSERT INTO suppliers (supplier_code, name, contact, address) VALUES
  ('SUP-001', 'PT Supplier Utama', '021-12345678', 'Jakarta Pusat'),
  ('SUP-002', 'CV Mitra Jaya', '031-87654321', 'Surabaya'),
  ('SUP-003', 'UD Sumber Makmur', '024-11223344', 'Semarang');