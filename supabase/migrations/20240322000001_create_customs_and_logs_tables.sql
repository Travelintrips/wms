CREATE TABLE IF NOT EXISTS customs_docs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_dokumen TEXT UNIQUE NOT NULL,
  document_type TEXT NOT NULL,
  document_number TEXT NOT NULL,
  payload JSONB,
  status TEXT DEFAULT 'draft',
  ceisa_response JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_dokumen TEXT,
  action TEXT NOT NULL,
  request_payload JSONB,
  response_data JSONB,
  status TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customs_docs_id_dokumen ON customs_docs(id_dokumen);
CREATE INDEX IF NOT EXISTS idx_logs_id_dokumen ON logs(id_dokumen);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON logs(created_at DESC);

alter publication supabase_realtime add table customs_docs;
alter publication supabase_realtime add table logs;
