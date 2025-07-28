-- Check the current state of contract boxes to understand balance calculations

-- Show detailed breakdown of contract boxes
SELECT 
    c.name as contract_name,
    c.total_value as contract_total,
    c.remaining_balance as contract_remaining,
    cb.name as box_name,
    cb.box_type,
    cb.allocated_amount,
    cb.current_balance,
    cb.spent_amount
FROM contracts c
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
ORDER BY c.name, cb.name;

-- Summary by contract
SELECT 
    c.name as contract_name,
    COUNT(cb.id) as box_count,
    SUM(cb.allocated_amount) as total_allocated,
    SUM(cb.current_balance) as total_current_balance,
    SUM(cb.spent_amount) as total_spent
FROM contracts c
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY c.id, c.name
ORDER BY c.name;