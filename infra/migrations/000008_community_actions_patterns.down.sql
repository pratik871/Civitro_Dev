-- Rollback migration 000008: Community Action Engine & Pattern Detection Engine

-- Drop triggers first
DROP TRIGGER IF EXISTS trg_community_actions_updated ON community_actions;
DROP TRIGGER IF EXISTS trg_detected_patterns_updated ON detected_patterns;

-- Drop Community Action Engine tables (reverse dependency order)
DROP TABLE IF EXISTS action_verifications;
DROP TABLE IF EXISTS action_escalations;
DROP TABLE IF EXISTS action_responses;
DROP TABLE IF EXISTS action_evidence;
DROP TABLE IF EXISTS action_supporters;

-- Drop the deferred FK before dropping community_actions
ALTER TABLE detected_patterns DROP CONSTRAINT IF EXISTS fk_detected_patterns_community_action;

DROP TABLE IF EXISTS community_actions;

-- Drop Pattern Detection Engine tables
DROP TABLE IF EXISTS pattern_reports;
DROP TABLE IF EXISTS detected_patterns;
