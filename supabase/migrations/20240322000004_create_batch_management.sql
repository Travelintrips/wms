CREATE TABLE IF NOT EXISTS item_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_code TEXT UNIQUE NOT NULL,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE SET NULL,
  expiry_date DATE,
  manufacture_date DATE,
  quantity INTEGER NOT NULL DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS batch_relocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID REFERENCES item_batches(id) ON DELETE CASCADE,
  from_lot_id UUID REFERENCES lots(id),
  to_lot_id UUID REFERENCES lots(id),
  quantity INTEGER NOT NULL,
  reason TEXT,
  relocated_by TEXT,
  relocated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_item_batches_item ON item_batches(item_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_lot ON item_batches(lot_id);
CREATE INDEX IF NOT EXISTS idx_item_batches_status ON item_batches(status);
CREATE INDEX IF NOT EXISTS idx_batch_relocations_batch ON batch_relocations(batch_id);

alter publication supabase_realtime add table item_batches;
alter publication supabase_realtime add table batch_relocations;

INSERT INTO item_batches (batch_code, item_id, lot_id, expiry_date, manufacture_date, quantity, status)
SELECT 
  'BATCH-001',
  (SELECT id FROM items WHERE sku = 'SKU-001' LIMIT 1),
  (SELECT l.id FROM lots l JOIN racks r ON l.rack_id = r.id WHERE r.code = 'R01' AND l.code = 'L01' LIMIT 1),
  '2025-12-31',
  '2024-01-15',
  45,
  'active';

INSERT INTO item_batches (batch_code, item_id, lot_id, expiry_date, manufacture_date, quantity, status)
SELECT 
  'BATCH-002',
  (SELECT id FROM items WHERE sku = 'SKU-002' LIMIT 1),
  (SELECT l.id FROM lots l JOIN racks r ON l.rack_id = r.id WHERE r.code = 'R01' AND l.code = 'L02' LIMIT 1),
  '2026-06-30',
  '2024-02-01',
  75,
  'active';

INSERT INTO item_batches (batch_code, item_id, lot_id, expiry_date, manufacture_date, quantity, status)
SELECT 
  'BATCH-003',
  (SELECT id FROM items WHERE sku = 'SKU-003' LIMIT 1),
  (SELECT l.id FROM lots l JOIN racks r ON l.rack_id = r.id WHERE r.code = 'R02' AND l.code = 'L01' LIMIT 1),
  '2025-09-15',
  '2024-01-20',
  60,
  'active';
