-- Create the new contracts system
-- This replaces the old bucket-based approach with a more flexible contract/box system

BEGIN;

-- Drop existing tables if they exist (we're starting fresh)
DROP TABLE IF EXISTS contract_box_transactions CASCADE;
DROP TABLE IF EXISTS contract_boxes CASCADE; 
DROP TABLE IF EXISTS contracts CASCADE;

-- Create contracts table (the outer shell)
CREATE TABLE contracts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    
    -- Basic contract info
    name VARCHAR(255) NOT NULL,
    contract_number VARCHAR(100) UNIQUE,
    description TEXT,
    
    -- Contract lifecycle
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'cancelled')),
    start_date DATE,
    end_date DATE,
    
    -- Contract-level features and rules (JSON)
    features JSONB DEFAULT '{}',
    
    -- Summary fields (calculated from boxes)
    total_value DECIMAL(12,2) DEFAULT 0,
    remaining_balance DECIMAL(12,2) DEFAULT 0,
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create contract_boxes table (the containers within contracts)
CREATE TABLE contract_boxes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    
    -- Box identification
    name VARCHAR(255) NOT NULL,
    description TEXT,
    box_type VARCHAR(20) NOT NULL CHECK (box_type IN ('fill_up', 'draw_down', 'hybrid')),
    
    -- Financial tracking
    allocated_amount DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    spent_amount DECIMAL(12,2) DEFAULT 0,
    
    -- Box-specific rules and behaviors (JSON)
    rules JSONB DEFAULT '{}',
    
    -- Box status
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'depleted')),
    
    -- Audit fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique box names within a contract
    UNIQUE(contract_id, name)
);

-- Create box_transactions table (all financial movements in/out of boxes)
CREATE TABLE box_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    box_id UUID NOT NULL REFERENCES contract_boxes(id) ON DELETE CASCADE,
    
    -- Transaction details
    amount DECIMAL(12,2) NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('allocation', 'service_delivery', 'transfer_in', 'transfer_out', 'adjustment')),
    description TEXT NOT NULL,
    
    -- Optional link to service delivery (if this transaction represents service costs)
    service_delivery_id UUID, -- Will link to future service_deliveries table
    
    -- Routing information (for auto-routed transactions)
    routing_reason TEXT, -- e.g., "Auto-routed due to fund depletion"
    source_box_id UUID REFERENCES contract_boxes(id), -- If this was a transfer from another box
    
    -- Transaction date and audit
    transaction_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- Create indexes for performance
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_client_id ON contracts(client_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);

CREATE INDEX idx_contract_boxes_contract_id ON contract_boxes(contract_id);
CREATE INDEX idx_contract_boxes_type ON contract_boxes(box_type);
CREATE INDEX idx_contract_boxes_status ON contract_boxes(status);

CREATE INDEX idx_box_transactions_box_id ON box_transactions(box_id);
CREATE INDEX idx_box_transactions_date ON box_transactions(transaction_date);
CREATE INDEX idx_box_transactions_type ON box_transactions(transaction_type);

-- Add RLS policies
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_transactions ENABLE ROW LEVEL SECURITY;

-- Contracts policies
CREATE POLICY "Users can view contracts from their organization" ON contracts
    FOR SELECT USING (organization_id = get_user_organization_id());

CREATE POLICY "Users can create contracts in their organization" ON contracts
    FOR INSERT WITH CHECK (organization_id = get_user_organization_id());

CREATE POLICY "Users can update contracts in their organization" ON contracts
    FOR UPDATE USING (organization_id = get_user_organization_id());

-- Contract boxes policies  
CREATE POLICY "Users can view boxes from their organization contracts" ON contract_boxes
    FOR SELECT USING (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create boxes in their organization contracts" ON contract_boxes
    FOR INSERT WITH CHECK (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can update boxes in their organization contracts" ON contract_boxes
    FOR UPDATE USING (
        contract_id IN (
            SELECT id FROM contracts WHERE organization_id = get_user_organization_id()
        )
    );

-- Box transactions policies
CREATE POLICY "Users can view transactions from their organization boxes" ON box_transactions
    FOR SELECT USING (
        box_id IN (
            SELECT cb.id FROM contract_boxes cb
            JOIN contracts c ON cb.contract_id = c.id
            WHERE c.organization_id = get_user_organization_id()
        )
    );

CREATE POLICY "Users can create transactions in their organization boxes" ON box_transactions
    FOR INSERT WITH CHECK (
        box_id IN (
            SELECT cb.id FROM contract_boxes cb
            JOIN contracts c ON cb.contract_id = c.id
            WHERE c.organization_id = get_user_organization_id()
        )
    );

-- Add comments for documentation
COMMENT ON TABLE contracts IS 'Main contracts table - the outer shell containing multiple boxes';
COMMENT ON TABLE contract_boxes IS 'Boxes within contracts - can fill up, draw down, or hybrid behavior';
COMMENT ON TABLE box_transactions IS 'All financial movements in/out of boxes with routing capability';

COMMENT ON COLUMN contracts.features IS 'JSON field for contract-level rules and behaviors';
COMMENT ON COLUMN contract_boxes.rules IS 'JSON field for box-specific routing and alert rules';
COMMENT ON COLUMN box_transactions.routing_reason IS 'Explanation when transaction was auto-routed by rules';

COMMIT;

-- Verify tables were created
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name IN ('contracts', 'contract_boxes', 'box_transactions')
ORDER BY table_name, ordinal_position;