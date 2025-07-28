-- Fix existing contracts (like Steve Meretonie's) and test the trigger system

BEGIN;

-- First, fix all existing contracts that have $0 totals but should have values
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
    LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
    WHERE c.total_value = 0 OR c.remaining_balance = 0
    GROUP BY c.id
    HAVING COUNT(cb.id) > 0
);

COMMIT;

-- Show the results, focusing on recent contracts (like Steve's)
SELECT 
    cl.first_name,
    cl.last_name,
    c.name as contract_name,
    c.total_value,
    c.remaining_balance,
    COUNT(cb.id) as box_count,
    c.created_at
FROM contracts c
JOIN clients cl ON c.client_id = cl.id
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY c.id, cl.first_name, cl.last_name, c.name, c.total_value, c.remaining_balance, c.created_at
ORDER BY c.created_at DESC
LIMIT 10;

-- Test: Show any contracts that still have issues
SELECT 
    'PROBLEM CONTRACTS' as issue_type,
    cl.first_name || ' ' || cl.last_name as client_name,
    c.name as contract_name,
    c.total_value,
    c.remaining_balance,
    COUNT(cb.id) as box_count,
    COALESCE(SUM(cb.allocated_amount), 0) as should_be_total,
    COALESCE(SUM(cb.current_balance), 0) as should_be_remaining
FROM contracts c
JOIN clients cl ON c.client_id = cl.id
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY c.id, cl.first_name, cl.last_name, c.name, c.total_value, c.remaining_balance
HAVING 
    (COUNT(cb.id) > 0 AND c.total_value = 0) OR
    (COUNT(cb.id) > 0 AND c.remaining_balance = 0) OR
    (c.total_value != COALESCE(SUM(cb.allocated_amount), 0)) OR
    (c.remaining_balance != COALESCE(SUM(cb.current_balance), 0));