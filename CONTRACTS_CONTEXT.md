# Contracts System - Design Context & Decisions

## Core Concepts

### What is a Contract?
A contract is an agreement between two parties - the "outer shell" that provides a summary and contains multiple boxes. Contracts have **features** that dictate how the contract behaves, how boxes within it behave, and how boxes interact with each other.

### What are Boxes?
Boxes are containers within a contract for different funding streams, service categories, or cost centers. They can behave in three ways:

1. **Fill Up** - Receives funds/allocations (e.g., NDIS allocation, insurance payments)
2. **Draw Down** - Spends/uses funds (e.g., service delivery costs)
3. **Hybrid** - Can both receive and spend (e.g., private services that generate invoices)

### Box Interactions & Rules
Boxes can interact with each other through rule-based routing:
- Rules are set at box creation or contract level
- Example: "When total service costs > allocated funding → route new costs to Private Invoice box"
- Rules enable automatic financial routing without stopping service delivery

## Real-World Use Case: NDIS Contract

### The Problem
- NDIS allocates fixed funding upfront (e.g., $50,000)
- Providers deliver services, drawing down from this allocation
- Money runs out, but providers can't abandon clients
- Providers lose money continuing care beyond allocation

### Our Solution
```
NDIS Contract
├── "NDIS Allocation" Box (Fill Up) - $50,000 at contract start
├── "Service Delivery" Box (Draw Down) - Records actual care delivered
├── "Private Billing" Box (Hybrid) - Handles overflow costs
└── Smart Rules:
    ├── At 80% spent → Alert manager
    ├── At 90% spent → Alert director
    └── At 100% spent → Auto-route new costs to Private Billing
```

### Benefits
- **Human-centered**: Care never stops
- **Business sustainable**: Provider doesn't lose money
- **Operationally efficient**: Automated financial controls
- **Compliant**: Clear audit trail

## Technical Architecture

### Data Model (High Level)
```
contracts
├── id, name, client_id, status, start_date, end_date
├── features (JSON) - Contract-level rules and behaviors
└── summary fields (total_value, remaining_balance, etc.)

contract_boxes
├── id, contract_id, name, type (fill_up|draw_down|hybrid)
├── rules (JSON) - Box-specific routing and behavior rules
├── allocated_amount, current_balance, spent_amount
└── status, created_at, updated_at

box_transactions
├── id, box_id, service_delivery_id?, amount, transaction_type
├── description, routing_reason (if auto-routed)
└── created_at, created_by
```

### Box Rule Examples
```json
{
  "routing_rules": [
    {
      "condition": "spent_percentage > 100",
      "action": "route_to_box",
      "target_box_id": "private_billing_box_id",
      "description": "Route overflow costs to private billing"
    }
  ],
  "alert_rules": [
    {
      "condition": "spent_percentage >= 80",
      "action": "send_alert",
      "recipients": ["manager@org.com"],
      "message": "NDIS funding 80% depleted"
    }
  ]
}
```

## Development Phases

### Phase 1: Basic Structure (Current)
- [ ] Create contracts and contract_boxes tables
- [ ] Basic CRUD for contracts
- [ ] Simple box creation within contracts
- [ ] Basic transaction recording

### Phase 2: Rule Engine
- [ ] Box rule definition system
- [ ] Automatic routing based on rules
- [ ] Alert system integration

### Phase 3: Advanced Features
- [ ] Complex multi-box interactions
- [ ] Contract templates
- [ ] Advanced reporting and analytics

## Design Decisions Log

### 2024-07-24: Initial Architecture
**Decision**: Separate contracts from boxes with rule-based interactions
**Reasoning**: Provides flexibility for complex funding scenarios while maintaining clear separation of concerns
**Alternative considered**: Single table approach - rejected due to lack of flexibility

### 2024-07-24: Box Types (Fill Up/Draw Down/Hybrid)
**Decision**: Three distinct box behaviors rather than boolean flags
**Reasoning**: More intuitive for users, clearer business logic, easier to extend
**Alternative considered**: Boolean flags (can_receive, can_spend) - rejected as less clear

### 2024-07-24: JSON Rules Storage
**Decision**: Store rules as JSON in database rather than separate rule tables
**Reasoning**: Faster development, easier to modify rules, sufficient for current complexity
**Alternative considered**: Normalized rule tables - may revisit if rules become very complex

## Notes
- Start simple and iterate
- Always maintain service delivery continuity (human-centered approach)
- Rules should be user-configurable but with sensible defaults
- Focus on the NDIS use case first, then generalize