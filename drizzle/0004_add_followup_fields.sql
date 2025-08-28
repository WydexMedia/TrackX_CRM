-- Add followup fields to leads table
ALTER TABLE leads ADD COLUMN need_followup BOOLEAN DEFAULT FALSE;
ALTER TABLE leads ADD COLUMN followup_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE leads ADD COLUMN followup_notes TEXT; 