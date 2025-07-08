-- Add allocation_type column to service_agreements table
-- This determines whether the agreement total is sum of buckets or a fixed allocation

ALTER TABLE service_agreements 
ADD COLUMN IF NOT EXISTS allocation_type TEXT DEFAULT 'sum_of_buckets' 
CHECK (allocation_type IN ('sum_of_buckets', 'fixed_allocation'));

-- Add allocated_amount column for fixed allocations
ALTER TABLE service_agreements 
ADD COLUMN IF NOT EXISTS allocated_amount DECIMAL(12,2);

-- Update the trigger function to handle both allocation types
CREATE OR REPLACE FUNCTION update_agreement_total_value()
RETURNS TRIGGER AS $$
DECLARE
    agreement_record service_agreements%ROWTYPE;
BEGIN
    -- Get the agreement record
    SELECT * INTO agreement_record 
    FROM service_agreements 
    WHERE id = COALESCE(NEW.agreement_id, OLD.agreement_id);
    
    -- Only update total_value if allocation_type is 'sum_of_buckets'
    IF agreement_record.allocation_type = 'sum_of_buckets' THEN
        UPDATE service_agreements 
        SET 
            total_value = (
                SELECT COALESCE(SUM(custom_amount), 0)
                FROM agreement_buckets 
                WHERE agreement_id = COALESCE(NEW.agreement_id, OLD.agreement_id)
            ),
            updated_at = NOW()
        WHERE id = COALESCE(NEW.agreement_id, OLD.agreement_id);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Add comment to explain the new columns
COMMENT ON COLUMN service_agreements.allocation_type IS 'Determines if total_value is sum of buckets or a fixed allocation';
COMMENT ON COLUMN service_agreements.allocated_amount IS 'Fixed allocation amount when allocation_type is fixed_allocation';
