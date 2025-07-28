-- Fix contracts showing $0.00 values by recalculating from contract_boxes
-- This specifically targets contracts where total_value or remaining_balance is 0
-- but they have boxes with allocated amounts

BEGIN;

-- First, let's see which contracts have the issue
SELECT 
    c.name as contract_name,
    c.total_value as current_total,
    c.remaining_balance as current_remaining,
    COALESCE(SUM(cb.allocated_amount), 0) as calculated_total,
    COALESCE(SUM(cb.current_balance), 0) as calculated_remaining,
    COUNT(cb.id) as box_count
FROM contracts c
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
WHERE c.total_value = 0 OR c.remaining_balance = 0
GROUP BY c.id, c.name, c.total_value, c.remaining_balance
HAVING COUNT(cb.id) > 0;

-- Now fix contracts where total_value = 0 but boxes have allocated amounts
UPDATE contracts 
SET 
    total_value = COALESCE(
        (SELECT SUM(allocated_amount) 
         FROM contract_boxes 
         WHERE contract_id = contracts.id), 
        0
    ),
    remaining_balance = COALESCE(
        (SELECT SUM(current_balance) 
         FROM contract_boxes 
         WHERE contract_id = contracts.id), 
        0
    ),
    updated_at = NOW()
WHERE contracts.id IN (
    SELECT c.id 
    FROM contracts c
    JOIN contract_boxes cb ON c.id = cb.contract_id
    WHERE c.total_value = 0 OR c.remaining_balance = 0
    GROUP BY c.id
    HAVING SUM(cb.allocated_amount) > 0 OR SUM(cb.current_balance) > 0
);

-- Show the results after fixing
SELECT 
    c.name as contract_name,
    c.total_value as fixed_total,
    c.remaining_balance as fixed_remaining,
    COUNT(cb.id) as box_count
FROM contracts c
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY c.id, c.name, c.total_value, c.remaining_balance
ORDER BY c.created_at DESC;

COMMIT;