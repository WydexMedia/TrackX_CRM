-- Create lead lists tables
CREATE TABLE IF NOT EXISTS lead_lists (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  tenant_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lead_list_items (
  id SERIAL PRIMARY KEY,
  list_id INTEGER NOT NULL,
  lead_phone VARCHAR(32) NOT NULL,
  tenant_id INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index to prevent duplicate phone in list per tenant
CREATE UNIQUE INDEX IF NOT EXISTS lead_list_items_unique ON lead_list_items (list_id, lead_phone, tenant_id); 