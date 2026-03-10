-- ============================================================================
-- Civitro Platform - TimescaleDB Schema Migration (DOWN)
-- Drops all TimescaleDB tables and objects in reverse order
-- ============================================================================

-- Remove retention policies first (ignore errors if they don't exist)
SELECT remove_retention_policy('platform_events', if_exists => true);
SELECT remove_retention_policy('issue_metrics', if_exists => true);
SELECT remove_retention_policy('sentiment_trends', if_exists => true);
SELECT remove_retention_policy('rating_history', if_exists => true);
SELECT remove_retention_policy('chi_history', if_exists => true);

-- Drop continuous aggregates
DROP MATERIALIZED VIEW IF EXISTS chi_weekly;

-- Drop hypertables (indexes are dropped automatically with the tables)
DROP TABLE IF EXISTS platform_events;
DROP TABLE IF EXISTS issue_metrics;
DROP TABLE IF EXISTS sentiment_trends;
DROP TABLE IF EXISTS rating_history;
DROP TABLE IF EXISTS chi_history;

-- Drop TimescaleDB extension
DROP EXTENSION IF EXISTS timescaledb;
