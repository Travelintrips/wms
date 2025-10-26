CREATE TABLE IF NOT EXISTS daily_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tanggal DATE NOT NULL,
  total_aktif INT DEFAULT 0,
  total_dipindah INT DEFAULT 0,
  total_diambil INT DEFAULT 0,
  total_biaya NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_tanggal 
ON daily_summary(tanggal);

ALTER TABLE daily_summary 
ADD CONSTRAINT unique_daily_summary_tanggal UNIQUE (tanggal);

alter publication supabase_realtime add table daily_summary;
