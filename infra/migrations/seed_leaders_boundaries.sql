-- ════════════════════════════════════════════════════════════════
-- SEED: Assign leaders to boundaries + add more mock leaders
-- Run on AWS: psql -h localhost -U civitro -d civitro -f seed_leaders_boundaries.sql
-- ════════════════════════════════════════════════════════════════

-- Step 1: Assign existing reps to Maharashtra boundaries
UPDATE representatives
SET boundary_id = (SELECT id FROM boundaries WHERE name = 'India' AND level = 'nation' LIMIT 1)
WHERE designation = 'mp_lok_sabha' AND boundary_id IS NULL;

UPDATE representatives
SET boundary_id = (SELECT id FROM boundaries WHERE name = 'Maharashtra' AND level = 'state' LIMIT 1)
WHERE designation = 'mla' AND boundary_id IS NULL;

UPDATE representatives
SET boundary_id = (SELECT id FROM boundaries WHERE name ILIKE '%mumbai%' AND level = 'district' LIMIT 1)
WHERE designation = 'corporator' AND boundary_id IS NULL;

-- Step 2: Add more mock leaders across India
INSERT INTO representatives (name, party, position, level, official_type, designation, verified, boundary_id, rating)
VALUES
  -- National level
  ('Vikram Singh', 'BJP', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true,
   (SELECT id FROM boundaries WHERE name = 'India' AND level = 'nation' LIMIT 1), 4.2),
  ('Meena Kumari', 'INC', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true,
   (SELECT id FROM boundaries WHERE name = 'India' AND level = 'nation' LIMIT 1), 3.8),

  -- Maharashtra
  ('Suresh Patil', 'NCP', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true,
   (SELECT id FROM boundaries WHERE name = 'Maharashtra' AND level = 'state' LIMIT 1), 3.5),
  ('Deepa Jadhav', 'SS', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true,
   (SELECT id FROM boundaries WHERE name = 'Maharashtra' AND level = 'state' LIMIT 1), 4.0),

  -- Delhi
  ('Arun Gupta', 'AAP', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true,
   (SELECT id FROM boundaries WHERE name = 'Delhi' AND level = 'state' LIMIT 1), 4.5),
  ('Neha Saxena', 'BJP', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true,
   (SELECT id FROM boundaries WHERE name = 'Delhi' AND level = 'state' LIMIT 1), 3.9),

  -- Karnataka
  ('Ramesh Gowda', 'JDS', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true,
   (SELECT id FROM boundaries WHERE name = 'Karnataka' AND level = 'state' LIMIT 1), 3.7),
  ('Lakshmi Devi', 'INC', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true,
   (SELECT id FROM boundaries WHERE name = 'Karnataka' AND level = 'state' LIMIT 1), 4.1),

  -- Tamil Nadu
  ('Karthik Rajan', 'DMK', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true,
   (SELECT id FROM boundaries WHERE name = 'Tamil Nadu' AND level = 'state' LIMIT 1), 4.3),
  ('Selvi Murugan', 'AIADMK', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true,
   (SELECT id FROM boundaries WHERE name = 'Tamil Nadu' AND level = 'state' LIMIT 1), 3.6),

  -- Uttar Pradesh
  ('Akhilesh Yadav Jr', 'SP', 'Member of Legislative Assembly', 'assembly', 'elected', 'mla', true,
   (SELECT id FROM boundaries WHERE name = 'Uttar Pradesh' AND level = 'state' LIMIT 1), 3.4),
  ('Priti Verma', 'BSP', 'Member of Parliament', 'parliamentary', 'elected', 'mp_lok_sabha', true,
   (SELECT id FROM boundaries WHERE name = 'Uttar Pradesh' AND level = 'state' LIMIT 1), 3.2)

ON CONFLICT DO NOTHING;

-- Step 3: Add promises for new leaders
INSERT INTO promises (leader_id, promise_text, category, status, source, detected_at)
SELECT r.id, p.txt, p.cat, p.st, p.src, p.dt
FROM representatives r
CROSS JOIN (VALUES
  ('Vikram Singh', 'Build 100 new community health centers', 'healthcare', 'on_track', 'manifesto', NOW() - INTERVAL '90 days'),
  ('Meena Kumari', 'Introduce women safety patrol in all districts', 'safety', 'detected', 'rally_speech', NOW() - INTERVAL '30 days'),
  ('Suresh Patil', 'Complete Pune-Mumbai hyperloop feasibility study', 'infrastructure', 'on_track', 'assembly_session', NOW() - INTERVAL '45 days'),
  ('Deepa Jadhav', 'Launch skill development centers in every taluka', 'education', 'detected', 'press_conference', NOW() - INTERVAL '20 days'),
  ('Arun Gupta', 'Make Delhi air quality index below 100 year-round', 'environment', 'on_track', 'budget_proposal', NOW() - INTERVAL '60 days'),
  ('Neha Saxena', 'Smart traffic lights at 500 intersections', 'infrastructure', 'fulfilled', 'manifesto', NOW() - INTERVAL '120 days'),
  ('Ramesh Gowda', 'Free laptops for all government college students', 'education', 'on_track', 'rally_speech', NOW() - INTERVAL '35 days'),
  ('Lakshmi Devi', 'Restore 50 lakes in Bangalore', 'environment', 'detected', 'press_conference', NOW() - INTERVAL '25 days'),
  ('Karthik Rajan', 'Tamil medium option in all central schools', 'education', 'on_track', 'assembly_session', NOW() - INTERVAL '40 days'),
  ('Selvi Murugan', 'New fishing harbor in Rameswaram', 'infrastructure', 'detected', 'ward_meeting', NOW() - INTERVAL '15 days'),
  ('Akhilesh Yadav Jr', 'Metro expansion to 10 UP cities', 'infrastructure', 'on_track', 'manifesto', NOW() - INTERVAL '80 days'),
  ('Priti Verma', 'Free ration delivery to doorstep', 'utilities', 'detected', 'rally_speech', NOW() - INTERVAL '10 days')
) AS p(rep_name, txt, cat, st, src, dt)
WHERE r.name = p.rep_name
ON CONFLICT DO NOTHING;

-- Step 4: Create rep_assignments for ALL existing users
-- This links every user to the national-level and their state-level reps
INSERT INTO rep_assignments (user_id, boundary_id, representative_id)
SELECT u.id, r.boundary_id, r.id
FROM users u
CROSS JOIN representatives r
WHERE r.boundary_id IS NOT NULL
  AND r.verified = true
ON CONFLICT DO NOTHING;

-- Verify
SELECT 'Representatives:' AS info, COUNT(*) AS count FROM representatives;
SELECT 'With boundaries:' AS info, COUNT(*) AS count FROM representatives WHERE boundary_id IS NOT NULL;
SELECT 'Assignments:' AS info, COUNT(*) AS count FROM rep_assignments;
SELECT 'Promises:' AS info, COUNT(*) AS count FROM promises;
