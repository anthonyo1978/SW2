-- =============================================
-- FORM CONFIGS TABLE (GLOBAL)
-- =============================================
CREATE TABLE IF NOT EXISTS form_configs (
  id SERIAL PRIMARY KEY,
  config JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Seed with initial config (from lib/client-form-config.json)
INSERT INTO form_configs (config)
VALUES (
  '[{"section": "Personal Information", "enabled": true, "fields": [{"name": "first_name", "label": "First Name", "type": "text", "required": true }, { "name": "last_name", "label": "Last Name", "type": "text", "required": false }]}, {"section": "Health & Support Information", "enabled": true, "fields": [{ "name": "allergies", "label": "Allergies", "type": "textarea" }]}, {"section": "Funding Information", "enabled": true, "fields": [{ "name": "funding_source", "label": "Funding Source", "type": "select", "options": ["NDIS", "Private"] }]}]'
); 