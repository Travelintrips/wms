DROP INDEX IF EXISTS idx_items_barcode;
DROP INDEX IF EXISTS idx_lots_barcode;
DROP INDEX IF EXISTS idx_racks_barcode;

ALTER TABLE items DROP COLUMN IF EXISTS barcode CASCADE;
ALTER TABLE lots DROP COLUMN IF EXISTS barcode CASCADE;
ALTER TABLE racks DROP COLUMN IF EXISTS barcode CASCADE;

ALTER TABLE items ADD COLUMN barcode TEXT UNIQUE;
ALTER TABLE lots ADD COLUMN barcode TEXT UNIQUE;
ALTER TABLE racks ADD COLUMN barcode TEXT UNIQUE;

CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_lots_barcode ON lots(barcode);
CREATE INDEX idx_racks_barcode ON racks(barcode);

UPDATE items SET barcode = 'ITEM-' || sku || '-' || substring(id::text, 1, 8);
UPDATE lots SET barcode = 'LOT-' || code || '-' || substring(id::text, 1, 8);
UPDATE racks SET barcode = 'RACK-' || code || '-' || substring(id::text, 1, 8);