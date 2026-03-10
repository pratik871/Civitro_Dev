-- ============================================================================
-- Civitro Platform - Initial Schema Migration (UP)
-- PostgreSQL 16+ with PostGIS
-- ============================================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- for text similarity (promise dedup)

-- ════════════════════════════════════════
-- SERVICE 1: IDENTITY & AUTH
-- ════════════════════════════════════════

-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    verification_level VARCHAR(20) NOT NULL DEFAULT 'phone' CHECK (verification_level IN ('phone', 'aadhaar', 'full')),
    aadhaar_hash VARCHAR(64),  -- SHA-256, never store plaintext
    device_fingerprint VARCHAR(255),
    avatar_url TEXT,
    language VARCHAR(5) DEFAULT 'en',
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMP,
    suspended_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_aadhaar_hash ON users(aadhaar_hash) WHERE aadhaar_hash IS NOT NULL;

-- refresh_tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    device_info TEXT,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ════════════════════════════════════════
-- SERVICE 2: GEOSPATIAL MAPPING
-- ════════════════════════════════════════

-- boundaries (India administrative hierarchy)
CREATE TABLE boundaries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('nation', 'state', 'parliamentary', 'assembly', 'municipal', 'ward')),
    parent_id UUID REFERENCES boundaries(id),
    polygon GEOMETRY(MultiPolygon, 4326),  -- PostGIS geometry
    population BIGINT,
    area_sqkm DECIMAL(12,2),
    code VARCHAR(20),  -- official govt code
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_boundaries_level ON boundaries(level);
CREATE INDEX idx_boundaries_parent ON boundaries(parent_id);
CREATE INDEX idx_boundaries_polygon ON boundaries USING GIST(polygon);

-- ════════════════════════════════════════
-- SERVICE 3: REPRESENTATIVE REGISTRY
-- ════════════════════════════════════════

CREATE TABLE representatives (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    party VARCHAR(100),
    position VARCHAR(100) NOT NULL,
    level VARCHAR(20) NOT NULL CHECK (level IN ('nation', 'state', 'parliamentary', 'assembly', 'municipal', 'ward')),
    boundary_id UUID REFERENCES boundaries(id),
    photo_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    claimed BOOLEAN DEFAULT FALSE,
    claimed_by_user_id UUID REFERENCES users(id),
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_representatives_boundary ON representatives(boundary_id);
CREATE INDEX idx_representatives_level ON representatives(level);

-- representative assignments per user (depends on both boundaries and representatives)
CREATE TABLE rep_assignments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    boundary_id UUID NOT NULL REFERENCES boundaries(id),
    representative_id UUID NOT NULL REFERENCES representatives(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, boundary_id)
);
CREATE INDEX idx_rep_assignments_user ON rep_assignments(user_id);

CREATE TABLE staff_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    representative_id UUID NOT NULL REFERENCES representatives(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(50) NOT NULL,
    permissions JSONB DEFAULT '[]',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(representative_id, user_id)
);

-- ════════════════════════════════════════
-- SERVICE 4: VOICES & CONTENT
-- ════════════════════════════════════════

CREATE TABLE voices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    text VARCHAR(500) NOT NULL,
    media_urls TEXT[] DEFAULT '{}',
    hashtags TEXT[] DEFAULT '{}',
    mentions UUID[] DEFAULT '{}',
    location GEOMETRY(Point, 4326),
    boundary_id UUID REFERENCES boundaries(id),
    language VARCHAR(5) DEFAULT 'en',
    translations JSONB DEFAULT '{}',
    likes_count INT DEFAULT 0,
    replies_count INT DEFAULT 0,
    shares_count INT DEFAULT 0,
    is_removed BOOLEAN DEFAULT FALSE,
    removed_reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_voices_user ON voices(user_id);
CREATE INDEX idx_voices_boundary ON voices(boundary_id);
CREATE INDEX idx_voices_hashtags ON voices USING GIN(hashtags);
CREATE INDEX idx_voices_created ON voices(created_at DESC);
CREATE INDEX idx_voices_text_search ON voices USING GIN(to_tsvector('english', text));

CREATE TABLE voice_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voice_id UUID NOT NULL REFERENCES voices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(10) NOT NULL CHECK (type IN ('like', 'share', 'bookmark')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(voice_id, user_id, type)
);
CREATE INDEX idx_voice_reactions_voice ON voice_reactions(voice_id);
CREATE INDEX idx_voice_reactions_user ON voice_reactions(user_id);

-- ════════════════════════════════════════
-- SERVICE 5: ISSUE REPORTING
-- ════════════════════════════════════════

CREATE TABLE issues (
    id VARCHAR(20) PRIMARY KEY,  -- CIV-2026-XXXXX format
    user_id UUID NOT NULL REFERENCES users(id),
    text TEXT,
    photo_urls TEXT[] DEFAULT '{}',
    gps_point GEOMETRY(Point, 4326),
    gps_lat DECIMAL(10,7),
    gps_lng DECIMAL(10,7),
    category VARCHAR(30) NOT NULL CHECK (category IN ('pothole', 'garbage', 'streetlight', 'water_leak', 'road_damage', 'illegal_construction', 'drainage', 'traffic', 'healthcare', 'education', 'safety', 'other')),
    severity VARCHAR(10) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'reported' CHECK (status IN ('reported', 'acknowledged', 'assigned', 'work_started', 'completed', 'citizen_verified', 'resolved')),
    assigned_to UUID REFERENCES representatives(id),
    boundary_id UUID REFERENCES boundaries(id),
    department VARCHAR(100),
    upvotes_count INT DEFAULT 0,
    ai_classification_confidence DECIMAL(5,4),
    is_duplicate BOOLEAN DEFAULT FALSE,
    duplicate_of VARCHAR(20) REFERENCES issues(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_issues_user ON issues(user_id);
CREATE INDEX idx_issues_boundary ON issues(boundary_id);
CREATE INDEX idx_issues_status ON issues(status);
CREATE INDEX idx_issues_category ON issues(category);
CREATE INDEX idx_issues_gps ON issues USING GIST(gps_point);
CREATE INDEX idx_issues_created ON issues(created_at DESC);
CREATE INDEX idx_issues_assigned ON issues(assigned_to) WHERE assigned_to IS NOT NULL;

CREATE TABLE issue_confirmations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id VARCHAR(20) NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    confirmed BOOLEAN NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(issue_id, user_id)
);

-- issue ID sequence
CREATE SEQUENCE issue_id_seq START 10001;

-- ════════════════════════════════════════
-- SERVICE 6: PUBLIC WORK LEDGER
-- ════════════════════════════════════════

CREATE TABLE ledger_entries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    issue_id VARCHAR(20) NOT NULL REFERENCES issues(id),
    status VARCHAR(20) NOT NULL,
    changed_by_user_id UUID REFERENCES users(id),
    changed_by_role VARCHAR(50),
    detail TEXT,
    evidence_urls TEXT[] DEFAULT '{}',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    -- NO updated_at: entries are IMMUTABLE, append-only
);
CREATE INDEX idx_ledger_issue ON ledger_entries(issue_id);
CREATE INDEX idx_ledger_created ON ledger_entries(created_at);

-- ════════════════════════════════════════
-- SERVICE 7: RATING & ACCOUNTABILITY
-- ════════════════════════════════════════

CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    representative_id UUID NOT NULL REFERENCES representatives(id),
    computed_score DECIMAL(3,2) NOT NULL DEFAULT 0,  -- 0.00-5.00
    responsiveness_score DECIMAL(3,2) DEFAULT 0,
    resolution_speed_score DECIMAL(3,2) DEFAULT 0,
    citizen_satisfaction_score DECIMAL(3,2) DEFAULT 0,
    sentiment_score DECIMAL(3,2) DEFAULT 0,
    chi_improvement_score DECIMAL(3,2) DEFAULT 0,
    sample_count INT DEFAULT 0,
    window_start TIMESTAMP NOT NULL,
    window_end TIMESTAMP NOT NULL,
    computed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_ratings_rep ON ratings(representative_id);
CREATE INDEX idx_ratings_computed ON ratings(computed_at DESC);

CREATE TABLE satisfaction_surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id),
    representative_id UUID NOT NULL REFERENCES representatives(id),
    issue_id VARCHAR(20) REFERENCES issues(id),
    score SMALLINT NOT NULL CHECK (score BETWEEN 1 AND 5),
    feedback TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_surveys_rep ON satisfaction_surveys(representative_id);

-- ════════════════════════════════════════
-- SERVICE 10: PROMISE TRACKER
-- ════════════════════════════════════════

CREATE TABLE promises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leader_id UUID NOT NULL REFERENCES representatives(id),
    promise_text TEXT NOT NULL,
    category VARCHAR(50),
    location VARCHAR(255),
    timeline VARCHAR(100),
    status VARCHAR(20) NOT NULL DEFAULT 'detected' CHECK (status IN ('detected', 'on_track', 'delayed', 'fulfilled', 'broken')),
    progress_pct SMALLINT DEFAULT 0 CHECK (progress_pct BETWEEN 0 AND 100),
    source VARCHAR(50),  -- speech, interview, manifesto, social_media, news
    source_url TEXT,
    detected_at TIMESTAMP NOT NULL DEFAULT NOW(),
    verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verified_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_promises_leader ON promises(leader_id);
CREATE INDEX idx_promises_status ON promises(status);
CREATE INDEX idx_promises_text_trgm ON promises USING GIN(promise_text gin_trgm_ops);

-- ════════════════════════════════════════
-- SERVICE 11: CHI ENGINE
-- ════════════════════════════════════════

CREATE TABLE chi_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    boundary_id UUID NOT NULL REFERENCES boundaries(id),
    overall_score SMALLINT NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
    rank INT,
    rank_total INT,
    dimensions JSONB NOT NULL,  -- [{label, score, weight, signals_count, trend}]
    computed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chi_boundary ON chi_scores(boundary_id);
CREATE INDEX idx_chi_computed ON chi_scores(computed_at DESC);
-- Keep only latest per boundary for quick lookup
CREATE UNIQUE INDEX idx_chi_latest ON chi_scores(boundary_id, computed_at DESC);

-- ════════════════════════════════════════
-- SERVICE 12: CITIZEN REPUTATION
-- ════════════════════════════════════════

CREATE TABLE civic_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    credibility_score INT NOT NULL DEFAULT 100 CHECK (credibility_score BETWEEN 0 AND 1000),
    influence_score INT NOT NULL DEFAULT 0 CHECK (influence_score BETWEEN 0 AND 100),
    tier VARCHAR(20) NOT NULL DEFAULT 'new_citizen' CHECK (tier IN ('new_citizen', 'verified_reporter', 'community_validator', 'thought_leader', 'peoples_champion')),
    reports_filed INT DEFAULT 0,
    reports_resolved INT DEFAULT 0,
    accuracy_rate DECIMAL(5,4) DEFAULT 0,
    followers_count INT DEFAULT 0,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE score_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    points INT NOT NULL,
    reason TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_score_events_user ON score_events(user_id);
CREATE INDEX idx_score_events_created ON score_events(created_at DESC);

-- ════════════════════════════════════════
-- SERVICE 13: POLLS & DEMOCRACY
-- ════════════════════════════════════════

CREATE TABLE polls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES users(id),
    boundary_id UUID REFERENCES boundaries(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('constituency', 'budget', 'satisfaction', 'exit', 'custom')),
    question TEXT NOT NULL,
    total_votes INT DEFAULT 0,
    starts_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ends_at TIMESTAMP NOT NULL,
    active BOOLEAN DEFAULT TRUE,
    visibility VARCHAR(20) DEFAULT 'public',
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_polls_boundary ON polls(boundary_id);
CREATE INDEX idx_polls_active ON polls(active) WHERE active = TRUE;

CREATE TABLE poll_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    votes_count INT DEFAULT 0,
    sort_order SMALLINT DEFAULT 0
);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE poll_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    poll_id UUID NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    option_id UUID NOT NULL REFERENCES poll_options(id),
    voted_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(poll_id, user_id)  -- one person one vote
);

-- ════════════════════════════════════════
-- SERVICE 14: MESSAGING
-- ════════════════════════════════════════

CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(10) NOT NULL CHECK (type IN ('dm', 'group', 'broadcast')),
    name VARCHAR(255),  -- for groups
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_read_at TIMESTAMP,
    PRIMARY KEY(conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_user ON conversation_participants(user_id);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    text TEXT,
    media_url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_messages_conv ON messages(conversation_id, created_at DESC);

-- ════════════════════════════════════════
-- SERVICE 17: NOTIFICATIONS
-- ════════════════════════════════════════

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(30) NOT NULL CHECK (type IN ('issue_update', 'resolution', 'rating_prompt', 'trending', 'promise_update', 'achievement', 'system')),
    title VARCHAR(255) NOT NULL,
    body TEXT,
    data JSONB DEFAULT '{}',
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id) WHERE read = FALSE;

CREATE TABLE notification_prefs (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    push_enabled BOOLEAN DEFAULT TRUE,
    email_enabled BOOLEAN DEFAULT FALSE,
    sms_enabled BOOLEAN DEFAULT FALSE,
    quiet_hours_start TIME,
    quiet_hours_end TIME,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════
-- SERVICE 18: ADMIN & MODERATION
-- ════════════════════════════════════════

CREATE TABLE moderation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    content_type VARCHAR(20) NOT NULL CHECK (content_type IN ('voice', 'issue', 'message')),
    content_id UUID NOT NULL,
    ai_score DECIMAL(5,4),
    ai_reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'removed', 'appealed')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_moderation_status ON moderation_items(status) WHERE status = 'pending';
CREATE INDEX idx_moderation_content ON moderation_items(content_type, content_id);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    details JSONB,
    ip_address INET,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
    -- IMMUTABLE: no updated_at, no deletes
);
CREATE INDEX idx_audit_admin ON audit_logs(admin_user_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX idx_audit_action ON audit_logs(action);

CREATE TABLE appeals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    moderation_item_id UUID NOT NULL REFERENCES moderation_items(id),
    user_id UUID NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_appeals_status ON appeals(status) WHERE status = 'pending';

-- ════════════════════════════════════════
-- SERVICE 19: PARTY & ORGANIZATION
-- ════════════════════════════════════════

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('political_party', 'ngo', 'rwa', 'club')),
    logo_url TEXT,
    description TEXT,
    hierarchy_levels JSONB DEFAULT '[]',
    subscription_tier VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE org_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'functionary', 'member')),
    level VARCHAR(50),
    permissions JSONB DEFAULT '[]',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(org_id, user_id)
);
CREATE INDEX idx_org_members_org ON org_members(org_id);
CREATE INDEX idx_org_members_user ON org_members(user_id);

CREATE TABLE broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    text TEXT NOT NULL,
    media_url TEXT,
    target_level VARCHAR(50),
    read_count INT DEFAULT 0,
    total_count INT DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_broadcasts_org ON broadcasts(org_id, created_at DESC);

-- ════════════════════════════════════════
-- SERVICE 20: ADVERTISING
-- ════════════════════════════════════════

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    advertiser_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL CHECK (type IN ('political', 'civic', 'commercial')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'completed')),
    budget DECIMAL(12,2) NOT NULL DEFAULT 0,
    spent DECIMAL(12,2) NOT NULL DEFAULT 0,
    targeting JSONB DEFAULT '{}',  -- {boundaries:[], demographics:{}, interests:[]}
    creatives JSONB DEFAULT '[]',  -- [{media_url, text, cta}]
    is_political BOOLEAN DEFAULT FALSE,
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_campaigns_advertiser ON campaigns(advertiser_id);
CREATE INDEX idx_campaigns_status ON campaigns(status) WHERE status = 'active';

CREATE TABLE ad_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id),
    user_id UUID NOT NULL REFERENCES users(id),
    clicked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_impressions_campaign ON ad_impressions(campaign_id);
CREATE INDEX idx_impressions_created ON ad_impressions(created_at);

-- ════════════════════════════════════════
-- UPDATED_AT TRIGGER
-- ════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at
CREATE TRIGGER trg_users_updated BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_representatives_updated BEFORE UPDATE ON representatives FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_issues_updated BEFORE UPDATE ON issues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_promises_updated BEFORE UPDATE ON promises FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_organizations_updated BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON campaigns FOR EACH ROW EXECUTE FUNCTION update_updated_at();
