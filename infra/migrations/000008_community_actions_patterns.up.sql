-- ============================================================================
-- Migration 000008: Community Action Engine (Service 22) & Pattern Detection Engine (Service 23)
-- Adds tables for the Power Layer: pattern detection, community actions,
-- endorsement tracking, evidence linking, stakeholder responses, escalation,
-- and resolution verification.
-- Reference: ARCHITECTURE_ADDENDUM_2026-03-20.md (Parts A.3, B.5)
-- ============================================================================

-- ════════════════════════════════════════
-- SERVICE 23: PATTERN DETECTION ENGINE
-- (Created first because community_actions references detected_patterns)
-- ════════════════════════════════════════

CREATE TABLE detected_patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID NOT NULL REFERENCES boundaries(id),
    category VARCHAR(50) NOT NULL,
    cluster_type VARCHAR(20) NOT NULL CHECK (cluster_type IN ('category', 'geographic', 'temporal', 'semantic')),
    confidence VARCHAR(20) NOT NULL CHECK (confidence IN ('emerging', 'confirmed', 'critical', 'systemic')),
    report_count INTEGER NOT NULL DEFAULT 0,
    unique_locations INTEGER DEFAULT 0,
    centroid_lat DECIMAL(10,7),
    centroid_lng DECIMAL(10,7),
    radius_meters INTEGER,
    first_report_at TIMESTAMPTZ,
    last_report_at TIMESTAMPTZ,
    days_unresolved INTEGER DEFAULT 0,
    economic_impact DECIMAL(14,2),
    evidence_package_json JSONB DEFAULT '{}',
    community_action_id UUID,  -- FK added after community_actions is created
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'action_created', 'resolved', 'expired')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_detected_patterns_ward ON detected_patterns(ward_id);
CREATE INDEX idx_detected_patterns_status ON detected_patterns(status);
CREATE INDEX idx_detected_patterns_confidence ON detected_patterns(confidence);
CREATE INDEX idx_detected_patterns_category ON detected_patterns(category);
CREATE INDEX idx_detected_patterns_created ON detected_patterns(created_at DESC);

-- Pattern-to-issue link table
CREATE TABLE pattern_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pattern_id UUID NOT NULL REFERENCES detected_patterns(id) ON DELETE CASCADE,
    issue_id VARCHAR(20) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    similarity_score DECIMAL(5,4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(pattern_id, issue_id)
);
CREATE INDEX idx_pattern_reports_pattern ON pattern_reports(pattern_id);
CREATE INDEX idx_pattern_reports_issue ON pattern_reports(issue_id);

-- ════════════════════════════════════════
-- SERVICE 22: COMMUNITY ACTION ENGINE
-- ════════════════════════════════════════

-- Core action table
CREATE TABLE community_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    creator_id UUID NOT NULL REFERENCES users(id),
    ward_id UUID NOT NULL REFERENCES boundaries(id),
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    desired_outcome TEXT,
    target_authority_id UUID REFERENCES representatives(id),
    escalation_level VARCHAR(10) NOT NULL DEFAULT 'ward' CHECK (escalation_level IN ('ward', 'mla', 'mp', 'city', 'state')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'open', 'acknowledged', 'committed', 'in_progress', 'resolved', 'verified', 'archived')),
    support_count INTEGER NOT NULL DEFAULT 0,
    support_goal INTEGER,
    evidence_package_json JSONB DEFAULT '{}',
    economic_impact_estimate DECIMAL(14,2),
    pattern_id UUID REFERENCES detected_patterns(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    acknowledged_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ
);
CREATE INDEX idx_community_actions_creator ON community_actions(creator_id);
CREATE INDEX idx_community_actions_ward ON community_actions(ward_id);
CREATE INDEX idx_community_actions_status ON community_actions(status);
CREATE INDEX idx_community_actions_target ON community_actions(target_authority_id) WHERE target_authority_id IS NOT NULL;
CREATE INDEX idx_community_actions_pattern ON community_actions(pattern_id) WHERE pattern_id IS NOT NULL;
CREATE INDEX idx_community_actions_created ON community_actions(created_at DESC);

-- Now add the deferred FK from detected_patterns -> community_actions
ALTER TABLE detected_patterns
    ADD CONSTRAINT fk_detected_patterns_community_action
    FOREIGN KEY (community_action_id) REFERENCES community_actions(id);
CREATE INDEX idx_detected_patterns_action ON detected_patterns(community_action_id) WHERE community_action_id IS NOT NULL;

-- Support/endorsement tracking
CREATE TABLE action_supporters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES community_actions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    civic_score_at_time INTEGER,
    ward_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(action_id, user_id)
);
CREATE INDEX idx_action_supporters_action ON action_supporters(action_id);
CREATE INDEX idx_action_supporters_user ON action_supporters(user_id);

-- Evidence links (issues linked to actions)
CREATE TABLE action_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES community_actions(id) ON DELETE CASCADE,
    issue_id VARCHAR(20) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    linked_by UUID NOT NULL REFERENCES users(id),
    auto_linked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(action_id, issue_id)
);
CREATE INDEX idx_action_evidence_action ON action_evidence(action_id);
CREATE INDEX idx_action_evidence_issue ON action_evidence(issue_id);

-- Stakeholder responses (immutable -- no updated_at)
CREATE TABLE action_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES community_actions(id) ON DELETE CASCADE,
    responder_id UUID NOT NULL REFERENCES users(id),
    response_type VARCHAR(20) NOT NULL CHECK (response_type IN ('acknowledge', 'respond', 'commit', 'reject', 'update', 'resolve')),
    content TEXT,
    timeline_date DATE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NO updated_at: responses are IMMUTABLE, append-only
);
CREATE INDEX idx_action_responses_action ON action_responses(action_id);
CREATE INDEX idx_action_responses_responder ON action_responses(responder_id);
CREATE INDEX idx_action_responses_type ON action_responses(response_type);

-- Escalation log (immutable -- no updated_at)
CREATE TABLE action_escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES community_actions(id) ON DELETE CASCADE,
    from_level VARCHAR(10) NOT NULL CHECK (from_level IN ('ward', 'mla', 'mp', 'city', 'state')),
    to_level VARCHAR(10) NOT NULL CHECK (to_level IN ('mla', 'mp', 'city', 'state', 'public')),
    reason VARCHAR(30) NOT NULL CHECK (reason IN ('no_response_7d', 'no_response_14d', 'rejection_appealed', 'manual')),
    notified_authority_id UUID REFERENCES representatives(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    -- NO updated_at: escalation entries are IMMUTABLE, append-only
);
CREATE INDEX idx_action_escalations_action ON action_escalations(action_id);
CREATE INDEX idx_action_escalations_authority ON action_escalations(notified_authority_id) WHERE notified_authority_id IS NOT NULL;

-- Resolution verification
CREATE TABLE action_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_id UUID NOT NULL REFERENCES community_actions(id) ON DELETE CASCADE,
    verifier_id UUID NOT NULL REFERENCES users(id),
    civic_score_at_time INTEGER,
    photo_evidence_urls TEXT[] DEFAULT '{}',
    verified BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(action_id, verifier_id)
);
CREATE INDEX idx_action_verifications_action ON action_verifications(action_id);
CREATE INDEX idx_action_verifications_verifier ON action_verifications(verifier_id);

-- ════════════════════════════════════════
-- UPDATED_AT TRIGGERS
-- ════════════════════════════════════════

-- Reuse the update_updated_at() function from 000001
CREATE TRIGGER trg_detected_patterns_updated BEFORE UPDATE ON detected_patterns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_community_actions_updated BEFORE UPDATE ON community_actions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
