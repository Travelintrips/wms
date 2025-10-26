CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  capacity TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID REFERENCES warehouses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS racks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zone_id UUID REFERENCES zones(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rack_id UUID REFERENCES racks(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 100,
  current_load INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT,
  unit TEXT DEFAULT 'pcs',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS item_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  lot_id UUID REFERENCES lots(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zones_warehouse ON zones(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_racks_zone ON racks(zone_id);
CREATE INDEX IF NOT EXISTS idx_lots_rack ON lots(rack_id);
CREATE INDEX IF NOT EXISTS idx_item_locations_item ON item_locations(item_id);
CREATE INDEX IF NOT EXISTS idx_item_locations_lot ON item_locations(lot_id);

alter publication supabase_realtime add table warehouses;
alter publication supabase_realtime add table zones;
alter publication supabase_realtime add table racks;
alter publication supabase_realtime add table lots;
alter publication supabase_realtime add table items;
alter publication supabase_realtime add table item_locations;

INSERT INTO warehouses (name, location, capacity) VALUES
  ('Gudang Utama', 'Jakarta', '10000 m²'),
  ('Gudang Cabang', 'Surabaya', '5000 m²');
