ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS lokasi_asal TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS hari_di_lini1 INTEGER;