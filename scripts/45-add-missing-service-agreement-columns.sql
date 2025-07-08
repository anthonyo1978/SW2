-- Add the missing columns to service_agreements table
-- First check if they already exist to avoid errors

-- Add allocation_type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_agreements' 
        AND column_name = 'allocation_type'
    ) THEN
        ALTER TABLE service_agreements 
        ADD COLUMN allocation_type TEXT DEFAULT 'sum_of_buckets' 
        CHECK (allocation_type IN ('sum_of_buckets', 'fixed_allocation'));
        
        RAISE NOTICE 'Added allocation_type column to service_agreements';
    ELSE
        RAISE NOTICE 'allocation_type column already exists in service_agreements';
    END IF;
END $$;

-- Add allocated_amount column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_agreements' 
        AND column_name = 'allocated_amount'
    ) THEN
        ALTER TABLE service_agreements 
        ADD COLUMN allocated_amount DECIMAL(12,2);
        
        RAISE NOTICE 'Added allocated_amount column to service_agreements';
    ELSE
        RAISE NOTICE 'allocated_amount column already exists in service_agreements';
    END IF;
END $$;

-- Add funding_model column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_agreements' 
        AND column_name = 'funding_model'
    ) THEN
        ALTER TABLE service_agreements 
        ADD COLUMN funding_model TEXT DEFAULT 'single_bucket' 
        CHECK (funding_model IN ('single_bucket', 'multi_bucket'));
        
        RAISE NOTICE 'Added funding_model column to service_agreements';
    ELSE
        RAISE NOTICE 'funding_model column already exists in service_agreements';
    END IF;
END $$;

-- Add primary_contact column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_agreements' 
        AND column_name = 'primary_contact'
    ) THEN
        ALTER TABLE service_agreements 
        ADD COLUMN primary_contact TEXT;
        
        RAISE NOTICE 'Added primary_contact column to service_agreements';
    ELSE
        RAISE NOTICE 'primary_contact column already exists in service_agreements';
    END IF;
END $$;

-- Add notes column if it doesn't exist (separate from description)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'service_agreements' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE service_agreements 
        ADD COLUMN notes TEXT;
        
        RAISE NOTICE 'Added notes column to service_agreements';
    ELSE
        RAISE NOTICE 'notes column already exists in service_agreements';
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'service_agreements' 
ORDER BY ordinal_position;

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
    IF agreement_record.allocation_type = 'sum_of_buckets' OR agreement_record.allocation_type IS NULL THEN
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

-- Add comments to explain the new columns
COMMENT ON COLUMN service_agreements.allocation_type IS 'Determines if total_value is sum of buckets or a fixed allocation';
COMMENT ON COLUMN service_agreements.allocated_amount IS 'Fixed allocation amount when allocation_type is fixed_allocation';
COMMENT ON COLUMN service_agreements.funding_model IS 'Whether the agreement uses single or multiple funding buckets';
COMMENT ON COLUMN service_agreements.primary_contact IS 'Primary contact person for this service agreement';
COMMENT ON COLUMN service_agreements.notes IS 'Additional notes for the service agreement';
