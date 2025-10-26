ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tanggal_pindah DATE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS total_biaya NUMERIC DEFAULT 0;

CREATE TABLE IF NOT EXISTS storage_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_movement_id UUID REFERENCES stock_movements(id) ON DELETE CASCADE,
  hari_simpan INTEGER NOT NULL,
  tarif_per_kg NUMERIC NOT NULL,
  berat_kg NUMERIC NOT NULL,
  total_biaya NUMERIC NOT NULL,
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_storage_costs_movement ON storage_costs(stock_movement_id);

alter publication supabase_realtime add table storage_costs;
