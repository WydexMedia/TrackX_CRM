-- Create lead_stages table
CREATE TABLE IF NOT EXISTS "lead_stages" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" varchar(64) NOT NULL,
  "color" varchar(32) DEFAULT 'slate' NOT NULL,
  "order" integer DEFAULT 0 NOT NULL,
  "is_default" boolean DEFAULT false,
  "tenant_id" integer,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

-- Create unique index for tenant and stage name
CREATE UNIQUE INDEX IF NOT EXISTS "stage_tenant_name_idx" ON "lead_stages" ("tenant_id", "name");

-- Insert default stages for all existing tenants
DO $$
DECLARE
  tenant_record RECORD;
BEGIN
  FOR tenant_record IN SELECT id FROM tenants
  LOOP
    INSERT INTO lead_stages (name, color, "order", is_default, tenant_id) VALUES
    ('Not contacted', 'gray', 1, true, tenant_record.id),
    ('Attempt to contact', 'yellow', 2, true, tenant_record.id),
    ('Did not Connect', 'red', 3, true, tenant_record.id),
    ('Qualified', 'green', 4, true, tenant_record.id),
    ('Not interested', 'red', 5, true, tenant_record.id),
    ('Interested', 'blue', 6, true, tenant_record.id),
    ('To be nurtured', 'cyan', 7, true, tenant_record.id),
    ('Junk', 'red', 8, true, tenant_record.id),
    ('Ask to call back', 'amber', 9, true, tenant_record.id),
    ('Customer', 'emerald', 10, true, tenant_record.id),
    ('Other Language', 'purple', 11, true, tenant_record.id)
    ON CONFLICT (tenant_id, name) DO NOTHING;
  END LOOP;
END $$;

