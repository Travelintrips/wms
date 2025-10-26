DROP TABLE IF EXISTS outbound_manifests CASCADE;
DROP TABLE IF EXISTS picking_order_items CASCADE;
DROP TABLE IF EXISTS picking_orders CASCADE;
DROP TABLE IF EXISTS customers CASCADE;

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact TEXT,
  address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE picking_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE NOT NULL,
  customer_id UUID REFERENCES customers(id),
  order_date DATE NOT NULL,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE picking_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES picking_orders(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id),
  quantity INTEGER NOT NULL,
  picked_quantity INTEGER DEFAULT 0,
  batch_id UUID REFERENCES item_batches(id),
  lot_id UUID REFERENCES lots(id),
  picking_status TEXT DEFAULT 'pending',
  picked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE outbound_manifests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manifest_number TEXT UNIQUE NOT NULL,
  order_id UUID REFERENCES picking_orders(id),
  customer_id UUID REFERENCES customers(id),
  manifest_date DATE NOT NULL,
  total_items INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_picking_orders_customer ON picking_orders(customer_id);
CREATE INDEX idx_picking_orders_status ON picking_orders(status);
CREATE INDEX idx_picking_order_items_order ON picking_order_items(order_id);
CREATE INDEX idx_picking_order_items_item ON picking_order_items(item_id);
CREATE INDEX idx_picking_order_items_status ON picking_order_items(picking_status);
CREATE INDEX idx_outbound_manifests_order ON outbound_manifests(order_id);

alter publication supabase_realtime add table customers;
alter publication supabase_realtime add table picking_orders;
alter publication supabase_realtime add table picking_order_items;
alter publication supabase_realtime add table outbound_manifests;

INSERT INTO customers (customer_code, name, contact, address) VALUES
  ('CUST-001', 'PT Mitra Sejahtera', '021-98765432', 'Jakarta Selatan'),
  ('CUST-002', 'CV Berkah Jaya', '031-11223344', 'Surabaya'),
  ('CUST-003', 'UD Cahaya Abadi', '024-55667788', 'Semarang');