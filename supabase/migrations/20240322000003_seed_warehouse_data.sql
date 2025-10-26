INSERT INTO zones (warehouse_id, name, description)
SELECT id, 'Zona A', 'Zona penyimpanan utama'
FROM warehouses
WHERE name = 'Gudang Utama'
LIMIT 1;

INSERT INTO zones (warehouse_id, name, description)
SELECT id, 'Zona B', 'Zona penyimpanan sekunder'
FROM warehouses
WHERE name = 'Gudang Utama'
LIMIT 1;

INSERT INTO zones (warehouse_id, name, description)
SELECT id, 'Zona A', 'Zona penyimpanan cabang'
FROM warehouses
WHERE name = 'Gudang Cabang'
LIMIT 1;

INSERT INTO racks (zone_id, code, description)
SELECT id, 'R01', 'Rak baris pertama'
FROM zones
WHERE name = 'Zona A'
LIMIT 1;

INSERT INTO racks (zone_id, code, description)
SELECT id, 'R02', 'Rak baris kedua'
FROM zones
WHERE name = 'Zona A'
LIMIT 1;

INSERT INTO racks (zone_id, code, description)
SELECT id, 'R03', 'Rak baris ketiga'
FROM zones
WHERE name = 'Zona B'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L01', 100, 45
FROM racks
WHERE code = 'R01'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L02', 100, 75
FROM racks
WHERE code = 'R01'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L03', 100, 20
FROM racks
WHERE code = 'R01'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L04', 100, 90
FROM racks
WHERE code = 'R01'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L01', 100, 60
FROM racks
WHERE code = 'R02'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L02', 100, 30
FROM racks
WHERE code = 'R02'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L03', 100, 85
FROM racks
WHERE code = 'R02'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L01', 100, 10
FROM racks
WHERE code = 'R03'
LIMIT 1;

INSERT INTO lots (rack_id, code, capacity, current_load)
SELECT id, 'L02', 100, 50
FROM racks
WHERE code = 'R03'
LIMIT 1;

INSERT INTO items (sku, name, category, unit) VALUES
  ('SKU-001', 'Produk Elektronik A', 'Elektronik', 'pcs'),
  ('SKU-002', 'Produk Furniture B', 'Furniture', 'pcs'),
  ('SKU-003', 'Produk Tekstil C', 'Tekstil', 'pcs');

INSERT INTO item_locations (item_id, lot_id, quantity)
SELECT 
  (SELECT id FROM items WHERE sku = 'SKU-001' LIMIT 1),
  (SELECT l.id FROM lots l JOIN racks r ON l.rack_id = r.id WHERE r.code = 'R01' AND l.code = 'L01' LIMIT 1),
  45;

INSERT INTO item_locations (item_id, lot_id, quantity)
SELECT 
  (SELECT id FROM items WHERE sku = 'SKU-002' LIMIT 1),
  (SELECT l.id FROM lots l JOIN racks r ON l.rack_id = r.id WHERE r.code = 'R01' AND l.code = 'L02' LIMIT 1),
  75;

INSERT INTO item_locations (item_id, lot_id, quantity)
SELECT 
  (SELECT id FROM items WHERE sku = 'SKU-003' LIMIT 1),
  (SELECT l.id FROM lots l JOIN racks r ON l.rack_id = r.id WHERE r.code = 'R02' AND l.code = 'L01' LIMIT 1),
  60;
