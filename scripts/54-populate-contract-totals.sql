-- Populate contract total_value and remaining_balance from contract_boxes
-- This script calculates and updates the summary fields based on box data

BEGIN;

-- Update total_value for each contract (sum of all box allocated_amounts)
UPDATE contracts 
SET total_value = COALESCE(
    (SELECT SUM(allocated_amount) 
     FROM contract_boxes 
     WHERE contract_id = contracts.id), 
    0
);

-- Update remaining_balance for each contract (sum of all box current_balances)
UPDATE contracts 
SET remaining_balance = COALESCE(
    (SELECT SUM(current_balance) 
     FROM contract_boxes 
     WHERE contract_id = contracts.id), 
    0
);

-- Set updated_at timestamp
UPDATE contracts SET updated_at = NOW();

COMMIT;

-- Show the results
SELECT 
    c.name as contract_name,
    c.total_value,
    c.remaining_balance,
    (SELECT COUNT(*) FROM contract_boxes WHERE contract_id = c.id) as box_count,
    (SELECT SUM(allocated_amount) FROM contract_boxes WHERE contract_id = c.id) as calculated_total,
    (SELECT SUM(current_balance) FROM contract_boxes WHERE contract_id = c.id) as calculated_remaining
FROM contracts c
ORDER BY c.created_at DESC;