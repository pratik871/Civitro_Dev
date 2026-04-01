CREATE TABLE IF NOT EXISTS fraud_signals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type VARCHAR(20) NOT NULL, -- user, issue, voice, upvote
    entity_id UUID NOT NULL,
    signal_type VARCHAR(50) NOT NULL, -- duplicate_content, velocity_spike, device_cluster, brigading, bot_behavior
    severity VARCHAR(10) NOT NULL DEFAULT 'low', -- low, medium, high, critical
    confidence REAL NOT NULL DEFAULT 0.0,
    details JSONB,
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fraud_signals_entity ON fraud_signals(entity_type, entity_id);
CREATE INDEX idx_fraud_signals_unresolved ON fraud_signals(resolved, severity) WHERE NOT resolved;
CREATE INDEX idx_fraud_signals_type ON fraud_signals(signal_type, created_at DESC);
