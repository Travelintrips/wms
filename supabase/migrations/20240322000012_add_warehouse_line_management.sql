ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS lokasi TEXT;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tanggal_masuk DATE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS tanggal_keluar DATE;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Aktif';
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS berat_kg NUMERIC;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS volume_m3 NUMERIC;
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS hari_simpan INTEGER;

ALTER TABLE items ADD COLUMN IF NOT EXISTS length_cm NUMERIC;
ALTER TABLE items ADD COLUMN IF NOT EXISTS width_cm NUMERIC;
ALTER TABLE items ADD COLUMN IF NOT EXISTS height_cm NUMERIC;
ALTER TABLE items ADD COLUMN IF NOT EXISTS actual_weight_kg NUMERIC;
ALTER TABLE items ADD COLUMN IF NOT EXISTS volume_m3 NUMERIC;

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table TEXT NOT NULL,
  record_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_entity_record ON activity_logs(entity_table, record_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created ON activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_lokasi ON stock_movements(lokasi);
CREATE INDEX IF NOT EXISTS idx_stock_movements_status ON stock_movements(status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_tanggal_masuk ON stock_movements(tanggal_masuk);

alter publication supabase_realtime add table activity_logs;