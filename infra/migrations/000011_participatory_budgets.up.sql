CREATE TABLE IF NOT EXISTS budget_proposals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_id UUID NOT NULL REFERENCES boundaries(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL, -- infrastructure, education, healthcare, sanitation, environment, safety, recreation, other
    requested_amount BIGINT NOT NULL DEFAULT 0, -- in paisa (INR * 100)
    fiscal_year VARCHAR(10) NOT NULL, -- e.g. "2026-27"
    status VARCHAR(20) NOT NULL DEFAULT 'proposed', -- proposed, voting, approved, rejected, funded
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budget_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    proposal_id UUID NOT NULL REFERENCES budget_proposals(id) ON DELETE CASCADE,
    allocation_pct SMALLINT NOT NULL CHECK (allocation_pct >= 0 AND allocation_pct <= 100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, proposal_id)
);

CREATE INDEX idx_budget_proposals_boundary ON budget_proposals(boundary_id, fiscal_year);
CREATE INDEX idx_budget_votes_user ON budget_votes(user_id);
CREATE INDEX idx_budget_votes_proposal ON budget_votes(proposal_id);
