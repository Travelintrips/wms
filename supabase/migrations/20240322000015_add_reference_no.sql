ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS reference_no TEXT;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_no 
ON stock_movements(reference_no);
