-- Add funding_model column to service_agreements table
ALTER TABLE service_agreements 
ADD COLUMN IF NOT EXISTS funding_model TEXT DEFAULT 'sum_of_parts' 
CHECK (funding_model IN ('sum_of_parts', 'allocated_total'));

-- Update any existing records to have the default funding model
UPDATE service_agreements 
SET funding_model = 'sum_of_parts' 
WHERE funding_model IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN service_agreements.funding_model IS 'Funding model: sum_of_parts (total equals sum of bucket amounts) or allocated_total (fixed total amount)';
