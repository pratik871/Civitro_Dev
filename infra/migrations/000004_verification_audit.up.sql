-- Verification audit log (TimescaleDB)
CREATE TABLE IF NOT EXISTS verification_audit_log (
    time TIMESTAMPTZ NOT NULL,
    user_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL,
    status VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    error_detail TEXT,
    metadata JSONB
);

SELECT create_hypertable('verification_audit_log', 'time', if_not_exists => TRUE);

CREATE INDEX idx_verification_audit_user ON verification_audit_log(user_id, time DESC);
CREATE INDEX idx_verification_audit_action ON verification_audit_log(action, time DESC);
