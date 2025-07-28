-- Create triggers to automatically calculate contract totals when boxes are created/updated
-- This ensures contract totals always stay in sync without manual intervention

BEGIN;

-- First, create a function to recalculate contract totals
CREATE OR REPLACE FUNCTION recalculate_contract_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Update the contract totals based on its boxes
    UPDATE contracts 
    SET 
        total_value = COALESCE(
            (SELECT SUM(allocated_amount) 
             FROM contract_boxes 
             WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)), 
            0
        ),
        remaining_balance = COALESCE(
            (SELECT SUM(current_balance) 
             FROM contract_boxes 
             WHERE contract_id = COALESCE(NEW.contract_id, OLD.contract_id)), 
            0
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.contract_id, OLD.contract_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for when contract boxes are inserted
DROP TRIGGER IF EXISTS trigger_recalc_on_box_insert ON contract_boxes;
CREATE TRIGGER trigger_recalc_on_box_insert
    AFTER INSERT ON contract_boxes
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_contract_totals();

-- Create trigger for when contract boxes are updated
DROP TRIGGER IF EXISTS trigger_recalc_on_box_update ON contract_boxes;
CREATE TRIGGER trigger_recalc_on_box_update
    AFTER UPDATE ON contract_boxes
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_contract_totals();

-- Create trigger for when contract boxes are deleted
DROP TRIGGER IF EXISTS trigger_recalc_on_box_delete ON contract_boxes;
CREATE TRIGGER trigger_recalc_on_box_delete
    AFTER DELETE ON contract_boxes
    FOR EACH ROW
    EXECUTE FUNCTION recalculate_contract_totals();

-- Also create a function to initialize contract totals when contracts are created
CREATE OR REPLACE FUNCTION initialize_contract_totals()
RETURNS TRIGGER AS $$
BEGIN
    -- Set initial values to 0 if not provided
    NEW.total_value = COALESCE(NEW.total_value, 0);
    NEW.remaining_balance = COALESCE(NEW.remaining_balance, 0);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for contract creation
DROP TRIGGER IF EXISTS trigger_initialize_contract_totals ON contracts;
CREATE TRIGGER trigger_initialize_contract_totals
    BEFORE INSERT ON contracts
    FOR EACH ROW
    EXECUTE FUNCTION initialize_contract_totals();

COMMIT;

-- Test the triggers by showing current state
SELECT 
    c.name as contract_name,
    c.total_value,
    c.remaining_balance,
    COUNT(cb.id) as box_count,
    COALESCE(SUM(cb.allocated_amount), 0) as calculated_total,
    COALESCE(SUM(cb.current_balance), 0) as calculated_remaining
FROM contracts c
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY c.id, c.name, c.total_value, c.remaining_balance
ORDER BY c.created_at DESC
LIMIT 10;