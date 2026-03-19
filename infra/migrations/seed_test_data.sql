-- ════════════════════════════════════════════════════════════════
-- SEED DATA — Test data for 1000 testers
-- Run after migrations: docker exec -i civitro-postgres psql -U civitro -d civitro < seed_test_data.sql
-- ════════════════════════════════════════════════════════════════

-- Test representatives (3 — same as local dev)
INSERT INTO representatives (name, party, position, level, official_type, designation, verified)
VALUES
  ('Priya Sharma', 'INC', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true),
  ('Rajesh Kumar', 'BJP', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true),
  ('Anita Deshmukh', 'IND', 'Corporator', 'urban_ward', 'elected', 'corporator', true)
ON CONFLICT DO NOTHING;

-- Test polls (3)
INSERT INTO polls (title, description, status, poll_type, total_votes, created_at)
VALUES
  ('Should ward roads be repaved this quarter?', 'Our ward roads have deteriorated significantly. Should the municipality prioritize road repair in the next budget cycle?', 'active', 'public', 0, NOW()),
  ('Best use of community hall funds?', 'The community hall renovation budget of ₹5 lakhs has been approved. How should it be allocated?', 'active', 'public', 0, NOW()),
  ('Rate the new garbage collection schedule', 'The municipality changed garbage pickup from daily to alternate days. Is this working for you?', 'active', 'public', 0, NOW())
ON CONFLICT DO NOTHING;

-- Poll options
INSERT INTO poll_options (poll_id, text, votes)
SELECT p.id, opt.text, 0
FROM polls p
CROSS JOIN (VALUES
  ('Should ward roads be repaved this quarter?', 'Yes, top priority'),
  ('Should ward roads be repaved this quarter?', 'Yes, but not urgent'),
  ('Should ward roads be repaved this quarter?', 'No, other issues first'),
  ('Best use of community hall funds?', 'Full renovation'),
  ('Best use of community hall funds?', 'AC + lighting only'),
  ('Best use of community hall funds?', 'Stage + sound system'),
  ('Best use of community hall funds?', 'Split equally'),
  ('Rate the new garbage collection schedule', 'Works well'),
  ('Rate the new garbage collection schedule', 'Acceptable'),
  ('Rate the new garbage collection schedule', 'Need daily pickup back')
) AS opt(poll_title, text)
WHERE p.title = opt.poll_title
ON CONFLICT DO NOTHING;

-- Test voices (3)
INSERT INTO voices (user_id, text, likes_count, shares_count, comments_count, location, created_at)
SELECT u.id, v.text, 0, 0, 0, ST_MakePoint(72.8777, 19.0760), NOW()
FROM users u
CROSS JOIN (VALUES
  ('The new footpath near station road is excellent! Finally safe for pedestrians. Kudos to the ward team. #infrastructure #safety'),
  ('Water supply has been irregular for the past week in Sector 5. Can someone escalate this? #water #utilities'),
  ('Attended the gram sabha meeting today. Productive discussions on drainage issues. More citizens should participate! #democracy #gramasabha')
) AS v(text)
LIMIT 3;

-- Test promises (linked to representatives)
INSERT INTO promises (leader_id, title, description, status, source, made_date)
SELECT r.id, p.title, p.description, p.status, p.source, p.made_date
FROM representatives r
CROSS JOIN (VALUES
  ('mp_lok_sabha', 'New metro line extension', 'Promised metro extension to eastern suburbs by 2027', 'in_progress', 'Rally speech, Jan 2026', '2026-01-15'),
  ('mp_lok_sabha', '24/7 water supply', 'Committed to ensuring round-the-clock water supply to all wards', 'not_started', 'Election manifesto', '2025-11-01'),
  ('mla', 'School renovation program', '50 government schools to be renovated with modern facilities', 'in_progress', 'Assembly session', '2026-02-10'),
  ('mla', 'Free WiFi in public spaces', 'WiFi hotspots in all parks and bus stops', 'not_started', 'Press conference', '2026-03-01'),
  ('corporator', 'Fix all potholes in ward', 'All reported potholes to be fixed within 30 days', 'completed', 'Ward meeting', '2026-01-20'),
  ('corporator', 'Install CCTV cameras', '50 CCTV cameras at key intersections in the ward', 'in_progress', 'Ward budget proposal', '2026-02-15')
) AS p(designation, title, description, status, source, made_date)
WHERE r.designation = p.designation
ON CONFLICT DO NOTHING;
