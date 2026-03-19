-- Aadhaar verifications (main PostgreSQL)
CREATE TABLE IF NOT EXISTS aadhaar_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reference_id VARCHAR(16) NOT NULL,
    uid_hash VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255),
    dob VARCHAR(10),
    gender VARCHAR(1),
    address TEXT,
    photo_key VARCHAR(255),
    signature_valid BOOLEAN NOT NULL,
    xml_timestamp TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX idx_aadhaar_verifications_uid_hash ON aadhaar_verifications(uid_hash);
CREATE INDEX idx_aadhaar_verifications_user_id ON aadhaar_verifications(user_id);
