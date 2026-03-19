-- ════════════════════════════════════════════════════════════════
-- SEED DATA — Test data for 1000 testers
-- ════════════════════════════════════════════════════════════════

-- Ensure role column exists on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) DEFAULT 'citizen';

-- Create a system user for seeded content
INSERT INTO users (id, phone, name, verification_level)
VALUES ('00000000-0000-0000-0000-000000000001', '+910000000001', 'Civitro Admin', 'full')
ON CONFLICT (phone) DO NOTHING;

-- Make admin
UPDATE users SET role = 'admin' WHERE phone = '+910000000001';

-- Get admin user id for FK references
DO $$
DECLARE admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM users WHERE phone = '+910000000001';

  -- Test representatives (3)
  INSERT INTO representatives (name, party, position, level, official_type, designation, verified)
  VALUES
    ('Priya Sharma', 'INC', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true),
    ('Rajesh Kumar', 'BJP', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true),
    ('Anita Deshmukh', 'IND', 'Corporator', 'urban_ward', 'elected', 'corporator', true)
  ON CONFLICT DO NOTHING;

  -- Test polls (3)
  INSERT INTO polls (created_by, type, question, ends_at)
  VALUES
    (admin_id, 'constituency', 'Should ward roads be repaved this quarter?', NOW() + INTERVAL '30 days'),
    (admin_id, 'budget', 'Best use of community hall funds (₹5 lakhs)?', NOW() + INTERVAL '30 days'),
    (admin_id, 'satisfaction', 'Rate the new garbage collection schedule', NOW() + INTERVAL '30 days')
  ON CONFLICT DO NOTHING;

  -- Test voices (3)
  INSERT INTO voices (user_id, text, likes_count, shares_count, location, created_at)
  VALUES
    (admin_id, 'The new footpath near station road is excellent! Finally safe for pedestrians. #infrastructure #safety', 0, 0, ST_MakePoint(72.8777, 19.0760), NOW()),
    (admin_id, 'Water supply has been irregular for the past week in Sector 5. Can someone escalate this? #water #utilities', 0, 0, ST_MakePoint(72.8800, 19.0800), NOW() - INTERVAL '1 day'),
    (admin_id, 'Attended the gram sabha meeting today. Great discussions on drainage. More citizens should participate! #democracy', 0, 0, ST_MakePoint(72.8750, 19.0700), NOW() - INTERVAL '2 days')
  ON CONFLICT DO NOTHING;

END $$;

-- Poll options
INSERT INTO poll_options (poll_id, label, votes_count)
SELECT p.id, o.lbl, 0
FROM polls p
CROSS JOIN (VALUES
  ('Should ward roads be repaved this quarter?', 'Yes, top priority'),
  ('Should ward roads be repaved this quarter?', 'Yes, but not urgent'),
  ('Should ward roads be repaved this quarter?', 'No, other issues first'),
  ('Best use of community hall funds (₹5 lakhs)?', 'Full renovation'),
  ('Best use of community hall funds (₹5 lakhs)?', 'AC + lighting only'),
  ('Best use of community hall funds (₹5 lakhs)?', 'Stage + sound system'),
  ('Best use of community hall funds (₹5 lakhs)?', 'Split equally'),
  ('Rate the new garbage collection schedule', 'Works well'),
  ('Rate the new garbage collection schedule', 'Acceptable'),
  ('Rate the new garbage collection schedule', 'Need daily pickup back')
) AS o(q, lbl)
WHERE p.question = o.q
ON CONFLICT DO NOTHING;

-- Promises (6, linked to representatives)
INSERT INTO promises (leader_id, promise_text, category, status, source, detected_at)
SELECT r.id, p.txt, p.cat, p.st, p.src, p.dt
FROM representatives r
CROSS JOIN (VALUES
  ('mp_lok_sabha', 'New metro line extension to eastern suburbs by 2027', 'infrastructure', 'on_track', 'rally_speech', NOW() - INTERVAL '60 days'),
  ('mp_lok_sabha', '24/7 water supply to all wards in the constituency', 'utilities', 'detected', 'manifesto', NOW() - INTERVAL '120 days'),
  ('mla', '50 government schools to be renovated with modern facilities', 'education', 'on_track', 'assembly_session', NOW() - INTERVAL '30 days'),
  ('mla', 'Free WiFi hotspots in all parks and bus stops', 'technology', 'detected', 'press_conference', NOW() - INTERVAL '15 days'),
  ('corporator', 'Fix all reported potholes within 30 days', 'infrastructure', 'fulfilled', 'ward_meeting', NOW() - INTERVAL '45 days'),
  ('corporator', 'Install 50 CCTV cameras at key intersections', 'safety', 'on_track', 'budget_proposal', NOW() - INTERVAL '25 days')
) AS p(desig, txt, cat, st, src, dt)
WHERE r.designation = p.desig
ON CONFLICT DO NOTHING;
