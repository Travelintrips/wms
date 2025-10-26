ALTER TABLE stock_movements 
ADD COLUMN IF NOT EXISTS reference_no TEXT,
ADD COLUMN IF NOT EXISTS tanggal_pindah DATE;

ALTER TABLE storage_costs 
ADD COLUMN IF NOT EXISTS periode_akhir TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_stock_movements_reference_no 
ON stock_movements(reference_no);

CREATE INDEX IF NOT EXISTS idx_storage_costs_periode_akhir 
ON storage_costs(periode_akhir);