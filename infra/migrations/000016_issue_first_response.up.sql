-- Add first_response_at to issues table (needed by CHI service for response-time scoring)

ALTER TABLE issues ADD COLUMN IF NOT EXISTS first_response_at TIMESTAMP;

-- Backfill from ledger_entries: the earliest "acknowledged" entry is the first response
UPDATE issues i
SET first_response_at = le.first_ack
FROM (
    SELECT issue_id, MIN(created_at) AS first_ack
    FROM ledger_entries
    WHERE status = 'acknowledged'
    GROUP BY issue_id
) le
WHERE i.id = le.issue_id
  AND i.first_response_at IS NULL;
