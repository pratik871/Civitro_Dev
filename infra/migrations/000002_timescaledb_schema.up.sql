-- ============================================================================
-- Civitro Platform - TimescaleDB Schema Migration (UP)
-- Time-series data for CHI scores, ratings, sentiment, issues, and analytics
-- ============================================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- CHI Score History (daily snapshots per constituency)
CREATE TABLE chi_history (
    time TIMESTAMPTZ NOT NULL,
    boundary_id VARCHAR(50) NOT NULL,
    boundary_type VARCHAR(20) NOT NULL, -- ward, assembly, district, state
    overall_score DECIMAL(5,2) NOT NULL,
    infrastructure DECIMAL(5,2),
    sanitation DECIMAL(5,2),
    healthcare DECIMAL(5,2),
    education DECIMAL(5,2),
    public_safety DECIMAL(5,2),
    water_supply DECIMAL(5,2),
    transport DECIMAL(5,2),
    environment DECIMAL(5,2)
);
SELECT create_hypertable('chi_history', 'time');
CREATE INDEX idx_chi_boundary ON chi_history (boundary_id, time DESC);

-- Leader Rating History
CREATE TABLE rating_history (
    time TIMESTAMPTZ NOT NULL,
    leader_id UUID NOT NULL,
    overall_rating DECIMAL(3,2) NOT NULL,
    responsiveness DECIMAL(3,2),
    effectiveness DECIMAL(3,2),
    transparency DECIMAL(3,2),
    accessibility DECIMAL(3,2),
    integrity DECIMAL(3,2),
    total_ratings INTEGER DEFAULT 0
);
SELECT create_hypertable('rating_history', 'time');
CREATE INDEX idx_rating_leader ON rating_history (leader_id, time DESC);

-- Sentiment Trends (aggregated per topic/region)
CREATE TABLE sentiment_trends (
    time TIMESTAMPTZ NOT NULL,
    topic VARCHAR(100) NOT NULL,
    region_id VARCHAR(50),
    positive_count INTEGER DEFAULT 0,
    negative_count INTEGER DEFAULT 0,
    neutral_count INTEGER DEFAULT 0,
    avg_intensity DECIMAL(3,2),
    sample_size INTEGER DEFAULT 0
);
SELECT create_hypertable('sentiment_trends', 'time');
CREATE INDEX idx_sentiment_topic ON sentiment_trends (topic, time DESC);
CREATE INDEX idx_sentiment_region ON sentiment_trends (region_id, time DESC);

-- Issue Analytics (resolution metrics over time)
CREATE TABLE issue_metrics (
    time TIMESTAMPTZ NOT NULL,
    boundary_id VARCHAR(50) NOT NULL,
    category VARCHAR(30) NOT NULL,
    reported_count INTEGER DEFAULT 0,
    resolved_count INTEGER DEFAULT 0,
    avg_resolution_hours DECIMAL(10,2),
    citizen_satisfaction DECIMAL(3,2)
);
SELECT create_hypertable('issue_metrics', 'time');
CREATE INDEX idx_issue_metrics_boundary ON issue_metrics (boundary_id, time DESC);

-- Platform Analytics Events
CREATE TABLE platform_events (
    time TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(50) NOT NULL,
    user_count INTEGER DEFAULT 0,
    event_count INTEGER DEFAULT 0,
    region_id VARCHAR(50),
    metadata JSONB
);
SELECT create_hypertable('platform_events', 'time');
CREATE INDEX idx_platform_events_type ON platform_events (event_type, time DESC);

-- Continuous aggregates for CHI (daily to weekly rollup)
CREATE MATERIALIZED VIEW chi_weekly
WITH (timescaledb.continuous) AS
SELECT time_bucket('7 days', time) AS week,
       boundary_id,
       boundary_type,
       AVG(overall_score) as avg_score,
       MIN(overall_score) as min_score,
       MAX(overall_score) as max_score
FROM chi_history
GROUP BY week, boundary_id, boundary_type;

-- Retention policy: keep raw data for 1 year, aggregates forever
SELECT add_retention_policy('chi_history', INTERVAL '1 year');
SELECT add_retention_policy('rating_history', INTERVAL '1 year');
SELECT add_retention_policy('sentiment_trends', INTERVAL '6 months');
SELECT add_retention_policy('issue_metrics', INTERVAL '1 year');
SELECT add_retention_policy('platform_events', INTERVAL '3 months');
