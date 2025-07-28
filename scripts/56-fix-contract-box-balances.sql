-- Fix current_balance for contract boxes and update contract remaining_balance
-- For boxes with no transactions, current_balance should equal allocated_amount

BEGIN;

-- Update current_balance for boxes that have 0 current_balance but allocated_amount > 0
-- This assumes these boxes haven't had any transactions yet
UPDATE contract_boxes 
SET current_balance = allocated_amount
WHERE current_balance = 0 
  AND allocated_amount > 0
  AND spent_amount = 0;  -- Only update if no spending has occurred

-- Now update the contract remaining_balance based on the corrected box balances
UPDATE contracts 
SET remaining_balance = COALESCE(
    (SELECT SUM(current_balance) 
     FROM contract_boxes 
     WHERE contract_id = contracts.id), 
    0
);

-- Update timestamps
UPDATE contracts SET updated_at = NOW();
UPDATE contract_boxes SET updated_at = NOW() 
WHERE current_balance = allocated_amount AND spent_amount = 0;

COMMIT;

-- Show the results after the fix
SELECT 
    c.name as contract_name,
    COUNT(cb.id) as box_count,
    SUM(cb.allocated_amount) as total_allocated,
    SUM(cb.current_balance) as total_current_balance,
    SUM(cb.spent_amount) as total_spent,
    c.remaining_balance as contract_remaining_balance
FROM contracts c
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY c.id, c.name, c.remaining_balance
ORDER BY c.name;