-- Debug contract calculation differences between clients
-- This will help identify why some clients show $0.00 and others show correct values

-- First, let's see the contract data for clients with issues
SELECT 
    cl.first_name,
    cl.last_name,
    c.name as contract_name,
    c.contract_number,
    c.total_value,
    c.remaining_balance,
    c.created_at,
    COUNT(cb.id) as box_count
FROM clients cl
JOIN contracts c ON cl.id = c.client_id
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
WHERE cl.first_name ILIKE '%anthony%' OR cl.first_name ILIKE '%dave%'
GROUP BY cl.id, cl.first_name, cl.last_name, c.id, c.name, c.contract_number, c.total_value, c.remaining_balance, c.created_at
ORDER BY cl.first_name, c.created_at;

-- Now let's see the detailed box data
SELECT 
    cl.first_name,
    cl.last_name,
    c.name as contract_name,
    cb.name as box_name,
    cb.box_type,
    cb.allocated_amount,
    cb.current_balance,
    cb.spent_amount
FROM clients cl
JOIN contracts c ON cl.id = c.client_id
JOIN contract_boxes cb ON c.id = cb.contract_id
WHERE cl.first_name ILIKE '%anthony%' OR cl.first_name ILIKE '%dave%'
ORDER BY cl.first_name, c.name, cb.box_type;

-- Let's also check if there are any contracts without boxes
SELECT 
    cl.first_name,
    cl.last_name,
    c.name as contract_name,
    c.total_value,
    c.remaining_balance,
    COUNT(cb.id) as box_count
FROM clients cl
JOIN contracts c ON cl.id = c.client_id
LEFT JOIN contract_boxes cb ON c.id = cb.contract_id
GROUP BY cl.id, cl.first_name, cl.last_name, c.id, c.name, c.total_value, c.remaining_balance
HAVING COUNT(cb.id) = 0 OR c.total_value = 0 OR c.remaining_balance = 0
ORDER BY cl.first_name;