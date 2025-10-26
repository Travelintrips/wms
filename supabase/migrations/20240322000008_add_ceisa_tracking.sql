ALTER TABLE inbound_receipts ADD COLUMN IF NOT EXISTS ceisa_status TEXT DEFAULT 'pending';
ALTER TABLE inbound_receipts ADD COLUMN IF NOT EXISTS ceisa_doc_id UUID REFERENCES customs_docs(id);

ALTER TABLE picking_orders ADD COLUMN IF NOT EXISTS ceisa_status TEXT DEFAULT 'pending';
ALTER TABLE picking_orders ADD COLUMN IF NOT EXISTS ceisa_doc_id UUID REFERENCES customs_docs(id);

ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS ceisa_status TEXT DEFAULT 'pending';
ALTER TABLE stock_movements ADD COLUMN IF NOT EXISTS ceisa_doc_id UUID REFERENCES customs_docs(id);

CREATE INDEX IF NOT EXISTS idx_inbound_receipts_ceisa_status ON inbound_receipts(ceisa_status);
CREATE INDEX IF NOT EXISTS idx_picking_orders_ceisa_status ON picking_orders(ceisa_status);
CREATE INDEX IF NOT EXISTS idx_stock_movements_ceisa_status ON stock_movements(ceisa_status);
