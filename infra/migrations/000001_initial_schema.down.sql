-- ============================================================================
-- Civitro Platform - Initial Schema Migration (DOWN)
-- Drops all tables in reverse dependency order
-- ============================================================================

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_campaigns_updated ON campaigns;
DROP TRIGGER IF EXISTS trg_organizations_updated ON organizations;
DROP TRIGGER IF EXISTS trg_promises_updated ON promises;
DROP TRIGGER IF EXISTS trg_issues_updated ON issues;
DROP TRIGGER IF EXISTS trg_representatives_updated ON representatives;
DROP TRIGGER IF EXISTS trg_users_updated ON users;

-- SERVICE 20: ADVERTISING
DROP TABLE IF EXISTS ad_impressions;
DROP TABLE IF EXISTS campaigns;

-- SERVICE 19: PARTY & ORGANIZATION
DROP TABLE IF EXISTS broadcasts;
DROP TABLE IF EXISTS org_members;
DROP TABLE IF EXISTS organizations;

-- SERVICE 18: ADMIN & MODERATION
DROP TABLE IF EXISTS appeals;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS moderation_items;

-- SERVICE 17: NOTIFICATIONS
DROP TABLE IF EXISTS notification_prefs;
DROP TABLE IF EXISTS notifications;

-- SERVICE 14: MESSAGING
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;

-- SERVICE 13: POLLS & DEMOCRACY
DROP TABLE IF EXISTS poll_votes;
DROP TABLE IF EXISTS poll_options;
DROP TABLE IF EXISTS polls;

-- SERVICE 12: CITIZEN REPUTATION
DROP TABLE IF EXISTS score_events;
DROP TABLE IF EXISTS civic_scores;

-- SERVICE 11: CHI ENGINE
DROP TABLE IF EXISTS chi_scores;

-- SERVICE 10: PROMISE TRACKER
DROP TABLE IF EXISTS promises;

-- SERVICE 7: RATING & ACCOUNTABILITY
DROP TABLE IF EXISTS satisfaction_surveys;
DROP TABLE IF EXISTS ratings;

-- SERVICE 6: PUBLIC WORK LEDGER
DROP TABLE IF EXISTS ledger_entries;

-- SERVICE 5: ISSUE REPORTING
DROP TABLE IF EXISTS issue_confirmations;
DROP TABLE IF EXISTS issues;
DROP SEQUENCE IF EXISTS issue_id_seq;

-- SERVICE 4: VOICES & CONTENT
DROP TABLE IF EXISTS voice_reactions;
DROP TABLE IF EXISTS voices;

-- SERVICE 3: REPRESENTATIVE REGISTRY (& rep_assignments from Service 2)
DROP TABLE IF EXISTS staff_accounts;
DROP TABLE IF EXISTS rep_assignments;
DROP TABLE IF EXISTS representatives;

-- SERVICE 2: GEOSPATIAL MAPPING
DROP TABLE IF EXISTS boundaries;

-- SERVICE 1: IDENTITY & AUTH
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at();

-- Drop extensions
DROP EXTENSION IF EXISTS pg_trgm;
DROP EXTENSION IF EXISTS postgis;
DROP EXTENSION IF EXISTS "uuid-ossp";
