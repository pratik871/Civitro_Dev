-- ════════════════════════════════════════════════════════════════
-- SEED: Dashboard Demo Data — Ward 45, Andheri East, Mumbai
-- Populates realistic data for all dashboard features.
-- Idempotent: uses ON CONFLICT DO NOTHING throughout.
-- Run AFTER: seed_test_data.sql + seed_leaders_boundaries.sql
-- ════════════════════════════════════════════════════════════════

-- ════════════════════════════════════════
-- 0. ENSURE WARD 45 BOUNDARY EXISTS
-- ════════════════════════════════════════

INSERT INTO boundaries (id, name, level, track, urban_rural, parent_id, population, area_sqkm, code)
VALUES (
    'a0000045-0000-0000-0000-ward00000045',
    'Ward 45 - Andheri East',
    'urban_ward',
    'urban',
    'urban',
    (SELECT id FROM boundaries WHERE name ILIKE '%mumbai%' AND level IN ('municipal_corporation', 'district') LIMIT 1),
    185000,
    4.20,
    'MH-MUM-W45'
) ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 1. TEST CITIZEN USERS
-- ════════════════════════════════════════

INSERT INTO users (id, phone, name, email, verification_level, language, role, location, primary_boundary_id, created_at) VALUES
  ('c1000000-0001-4000-8000-000000000001', '+919820100001', 'Arjun Mehta',   'arjun.mehta@email.com',   'aadhaar', 'en', 'citizen', ST_MakePoint(72.8550, 19.1200), 'a0000045-0000-0000-0000-ward00000045', NOW() - INTERVAL '45 days'),
  ('c1000000-0002-4000-8000-000000000002', '+919820100002', 'Priya Patel',   'priya.patel@email.com',   'full',    'hi', 'citizen', ST_MakePoint(72.8620, 19.1150), 'a0000045-0000-0000-0000-ward00000045', NOW() - INTERVAL '40 days'),
  ('c1000000-0003-4000-8000-000000000003', '+919820100003', 'Rahul Sharma',  'rahul.sharma@email.com',  'aadhaar', 'en', 'citizen', ST_MakePoint(72.8480, 19.1280), 'a0000045-0000-0000-0000-ward00000045', NOW() - INTERVAL '38 days'),
  ('c1000000-0004-4000-8000-000000000004', '+919820100004', 'Sneha Desai',   'sneha.desai@email.com',   'phone',   'mr', 'citizen', ST_MakePoint(72.8700, 19.1320), 'a0000045-0000-0000-0000-ward00000045', NOW() - INTERVAL '35 days'),
  ('c1000000-0005-4000-8000-000000000005', '+919820100005', 'Vikram Joshi',  'vikram.joshi@email.com',  'aadhaar', 'en', 'citizen', ST_MakePoint(72.8530, 19.1180), 'a0000045-0000-0000-0000-ward00000045', NOW() - INTERVAL '30 days'),
  ('c1000000-0006-4000-8000-000000000006', '+919820100006', 'Anita Reddy',   'anita.reddy@email.com',   'full',    'en', 'citizen', ST_MakePoint(72.8600, 19.1250), 'a0000045-0000-0000-0000-ward00000045', NOW() - INTERVAL '28 days')
ON CONFLICT (phone) DO NOTHING;

-- Ward corporator for Andheri East
INSERT INTO representatives (id, name, party, position, level, official_type, designation, verified, boundary_id, rating, contact_phone)
VALUES (
    'r0000045-0000-0000-0000-rep000000001',
    'Suresh Patkar',
    'SS',
    'Corporator',
    'urban_ward',
    'elected',
    'corporator',
    true,
    'a0000045-0000-0000-0000-ward00000045',
    3.70,
    '+919821000045'
) ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 2. ISSUES (25 realistic Andheri East issues)
-- ════════════════════════════════════════

-- Helper: admin user ID
-- We reference the admin user created in seed_test_data.sql and the new citizen users.

INSERT INTO issues (id, user_id, text, category, severity, status, gps_lat, gps_lng, gps_point, boundary_id, department, upvotes_count, ai_classification_confidence, created_at, updated_at) VALUES
-- Potholes (5)
('CIV-2026-20001', 'c1000000-0001-4000-8000-000000000001',
 'Large pothole near Andheri Station East exit — bikes and autos swerving dangerously to avoid it',
 'pothole', 'critical', 'acknowledged', 19.1197, 72.8464, ST_MakePoint(72.8464, 19.1197),
 'a0000045-0000-0000-0000-ward00000045', 'Roads & Bridges', 47, 0.9820,
 NOW() - INTERVAL '28 days', NOW() - INTERVAL '25 days'),

('CIV-2026-20002', 'c1000000-0003-4000-8000-000000000003',
 'Series of potholes on Marol Maroshi Road near Sagar City complex — entire stretch is broken',
 'pothole', 'high', 'work_started', 19.1245, 72.8790, ST_MakePoint(72.8790, 19.1245),
 'a0000045-0000-0000-0000-ward00000045', 'Roads & Bridges', 34, 0.9650,
 NOW() - INTERVAL '22 days', NOW() - INTERVAL '12 days'),

('CIV-2026-20003', 'c1000000-0005-4000-8000-000000000005',
 'Deep pothole on Sakinaka Junction Road causing vehicle damage daily — needs urgent filling',
 'pothole', 'critical', 'reported', 19.1108, 72.8648, ST_MakePoint(72.8648, 19.1108),
 'a0000045-0000-0000-0000-ward00000045', 'Roads & Bridges', 63, 0.9900,
 NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days'),

('CIV-2026-20004', 'c1000000-0002-4000-8000-000000000002',
 'Pothole near Chakala Metro station pedestrian crossing — senior citizens struggling',
 'pothole', 'high', 'acknowledged', 19.1150, 72.8570, ST_MakePoint(72.8570, 19.1150),
 'a0000045-0000-0000-0000-ward00000045', 'Roads & Bridges', 28, 0.9510,
 NOW() - INTERVAL '18 days', NOW() - INTERVAL '15 days'),

('CIV-2026-20005', 'c1000000-0004-4000-8000-000000000004',
 'Multiple potholes on MIDC Road near Andheri East industrial area',
 'pothole', 'medium', 'reported', 19.1290, 72.8720, ST_MakePoint(72.8720, 19.1290),
 'a0000045-0000-0000-0000-ward00000045', 'Roads & Bridges', 15, 0.9380,
 NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),

-- Water supply (5)
('CIV-2026-20006', 'c1000000-0002-4000-8000-000000000002',
 'No water supply for 3 consecutive days in Marol Naka Sector 5 — tanker not arriving either',
 'water_supply', 'critical', 'acknowledged', 19.1230, 72.8800, ST_MakePoint(72.8800, 19.1230),
 'a0000045-0000-0000-0000-ward00000045', 'Water Supply', 89, 0.9750,
 NOW() - INTERVAL '26 days', NOW() - INTERVAL '22 days'),

('CIV-2026-20007', 'c1000000-0006-4000-8000-000000000006',
 'Low water pressure in Mogra Village area — water barely reaches 2nd floor',
 'water_supply', 'high', 'work_started', 19.1310, 72.8530, ST_MakePoint(72.8530, 19.1310),
 'a0000045-0000-0000-0000-ward00000045', 'Water Supply', 52, 0.9410,
 NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days'),

('CIV-2026-20008', 'c1000000-0001-4000-8000-000000000001',
 'Water pipeline burst on J.B. Nagar Link Road — clean water wasting for hours',
 'water_leak', 'critical', 'completed', 19.1175, 72.8610, ST_MakePoint(72.8610, 19.1175),
 'a0000045-0000-0000-0000-ward00000045', 'Water Supply', 41, 0.9630,
 NOW() - INTERVAL '24 days', NOW() - INTERVAL '10 days'),

('CIV-2026-20009', 'c1000000-0003-4000-8000-000000000003',
 'Contaminated water supply in Mahakali Caves Road — yellowish colour and foul smell',
 'water_supply', 'critical', 'acknowledged', 19.1280, 72.8670, ST_MakePoint(72.8670, 19.1280),
 'a0000045-0000-0000-0000-ward00000045', 'Water Supply', 73, 0.9560,
 NOW() - INTERVAL '15 days', NOW() - INTERVAL '12 days'),

('CIV-2026-20010', 'c1000000-0005-4000-8000-000000000005',
 'Irregular water supply schedule in Andheri East Sector 11 — timing never matches notice',
 'water_supply', 'medium', 'reported', 19.1200, 72.8540, ST_MakePoint(72.8540, 19.1200),
 'a0000045-0000-0000-0000-ward00000045', 'Water Supply', 38, 0.9270,
 NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'),

-- Garbage / sanitation (4)
('CIV-2026-20011', 'c1000000-0004-4000-8000-000000000004',
 'Garbage overflow at D.N. Nagar dumping spot — waste spilling onto main road, stench unbearable',
 'garbage', 'high', 'acknowledged', 19.1140, 72.8490, ST_MakePoint(72.8490, 19.1140),
 'a0000045-0000-0000-0000-ward00000045', 'Solid Waste Management', 56, 0.9700,
 NOW() - INTERVAL '19 days', NOW() - INTERVAL '16 days'),

('CIV-2026-20012', 'c1000000-0006-4000-8000-000000000006',
 'No garbage collection for 4 days in Sakinaka area — BMC trucks skipping our lane',
 'garbage', 'high', 'work_started', 19.1120, 72.8660, ST_MakePoint(72.8660, 19.1120),
 'a0000045-0000-0000-0000-ward00000045', 'Solid Waste Management', 44, 0.9580,
 NOW() - INTERVAL '14 days', NOW() - INTERVAL '9 days'),

('CIV-2026-20013', 'c1000000-0001-4000-8000-000000000001',
 'Open waste dumping behind Andheri East market — attracting rats and stray dogs',
 'garbage', 'medium', 'reported', 19.1210, 72.8510, ST_MakePoint(72.8510, 19.1210),
 'a0000045-0000-0000-0000-ward00000045', 'Solid Waste Management', 31, 0.9450,
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'),

('CIV-2026-20014', 'c1000000-0002-4000-8000-000000000002',
 'Construction debris dumped illegally near Chakala flyover — blocking footpath',
 'garbage', 'medium', 'reported', 19.1165, 72.8575, ST_MakePoint(72.8575, 19.1165),
 'a0000045-0000-0000-0000-ward00000045', 'Solid Waste Management', 22, 0.9120,
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

-- Street lights (3)
('CIV-2026-20015', 'c1000000-0003-4000-8000-000000000003',
 'Street light broken on Link Road near Marol Naka — entire stretch pitch dark after 7 PM',
 'streetlight', 'high', 'acknowledged', 19.1250, 72.8760, ST_MakePoint(72.8760, 19.1250),
 'a0000045-0000-0000-0000-ward00000045', 'Electrical', 37, 0.9680,
 NOW() - INTERVAL '21 days', NOW() - INTERVAL '18 days'),

('CIV-2026-20016', 'c1000000-0005-4000-8000-000000000005',
 'Three consecutive street lights not working on Sakinaka Road — women feel unsafe at night',
 'streetlight', 'high', 'work_started', 19.1130, 72.8640, ST_MakePoint(72.8640, 19.1130),
 'a0000045-0000-0000-0000-ward00000045', 'Electrical', 49, 0.9550,
 NOW() - INTERVAL '16 days', NOW() - INTERVAL '11 days'),

('CIV-2026-20017', 'c1000000-0004-4000-8000-000000000004',
 'Flickering street light pole near Andheri East station — sparking intermittently, electrocution risk',
 'streetlight', 'critical', 'assigned', 19.1195, 72.8470, ST_MakePoint(72.8470, 19.1195),
 'a0000045-0000-0000-0000-ward00000045', 'Electrical', 58, 0.9810,
 NOW() - INTERVAL '10 days', NOW() - INTERVAL '8 days'),

-- Drainage (3)
('CIV-2026-20018', 'c1000000-0006-4000-8000-000000000006',
 'Blocked drain on Marol Maroshi Road causing waterlogging even in light rain',
 'drainage', 'high', 'acknowledged', 19.1260, 72.8810, ST_MakePoint(72.8810, 19.1260),
 'a0000045-0000-0000-0000-ward00000045', 'Storm Water Drains', 42, 0.9490,
 NOW() - INTERVAL '25 days', NOW() - INTERVAL '20 days'),

('CIV-2026-20019', 'c1000000-0001-4000-8000-000000000001',
 'Open drain overflowing near J.B. Nagar school — children have to walk through sewage',
 'drainage', 'critical', 'work_started', 19.1180, 72.8600, ST_MakePoint(72.8600, 19.1180),
 'a0000045-0000-0000-0000-ward00000045', 'Storm Water Drains', 71, 0.9720,
 NOW() - INTERVAL '17 days', NOW() - INTERVAL '13 days'),

('CIV-2026-20020', 'c1000000-0003-4000-8000-000000000003',
 'Drain cover missing on MIDC internal road — accident waiting to happen',
 'drainage', 'critical', 'assigned', 19.1300, 72.8730, ST_MakePoint(72.8730, 19.1300),
 'a0000045-0000-0000-0000-ward00000045', 'Storm Water Drains', 55, 0.9640,
 NOW() - INTERVAL '9 days', NOW() - INTERVAL '7 days'),

-- Traffic (2)
('CIV-2026-20021', 'c1000000-0002-4000-8000-000000000002',
 'Traffic signal not working at Sakinaka Junction — traffic police absent, chaos during peak hours',
 'traffic', 'high', 'acknowledged', 19.1105, 72.8645, ST_MakePoint(72.8645, 19.1105),
 'a0000045-0000-0000-0000-ward00000045', 'Traffic Engineering', 66, 0.9530,
 NOW() - INTERVAL '13 days', NOW() - INTERVAL '11 days'),

('CIV-2026-20022', 'c1000000-0005-4000-8000-000000000005',
 'Illegal hawker encroachment on Marol Maroshi Road footpath — pedestrians forced onto road',
 'traffic', 'medium', 'reported', 19.1240, 72.8780, ST_MakePoint(72.8780, 19.1240),
 'a0000045-0000-0000-0000-ward00000045', 'Encroachment Removal', 29, 0.8970,
 NOW() - INTERVAL '6 days', NOW() - INTERVAL '6 days'),

-- Safety / other (3)
('CIV-2026-20023', 'c1000000-0004-4000-8000-000000000004',
 'Abandoned vehicle parked for weeks near Chakala bus stop — could be safety hazard',
 'safety', 'medium', 'reported', 19.1160, 72.8560, ST_MakePoint(72.8560, 19.1160),
 'a0000045-0000-0000-0000-ward00000045', 'Traffic Police', 18, 0.8820,
 NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'),

('CIV-2026-20024', 'c1000000-0006-4000-8000-000000000006',
 'Illegal construction on public land near Mogra Village — 3-story structure going up overnight',
 'illegal_construction', 'high', 'acknowledged', 19.1320, 72.8520, ST_MakePoint(72.8520, 19.1320),
 'a0000045-0000-0000-0000-ward00000045', 'Building & Factories', 39, 0.9350,
 NOW() - INTERVAL '12 days', NOW() - INTERVAL '10 days'),

('CIV-2026-20025', 'c1000000-0001-4000-8000-000000000001',
 'Road completely damaged after recent MIDC pipeline work — contractor did not restore surface',
 'road_damage', 'high', 'citizen_verified', 19.1285, 72.8710, ST_MakePoint(72.8710, 19.1285),
 'a0000045-0000-0000-0000-ward00000045', 'Roads & Bridges', 45, 0.9590,
 NOW() - INTERVAL '30 days', NOW() - INTERVAL '2 days')

ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 2b. ISSUE UPVOTES
-- ════════════════════════════════════════

INSERT INTO issue_upvotes (issue_id, user_id, created_at) VALUES
-- High-upvote issues get upvotes from multiple users
('CIV-2026-20003', 'c1000000-0001-4000-8000-000000000001', NOW() - INTERVAL '4 days'),
('CIV-2026-20003', 'c1000000-0002-4000-8000-000000000002', NOW() - INTERVAL '4 days'),
('CIV-2026-20003', 'c1000000-0003-4000-8000-000000000003', NOW() - INTERVAL '3 days'),
('CIV-2026-20003', 'c1000000-0004-4000-8000-000000000004', NOW() - INTERVAL '3 days'),
('CIV-2026-20003', 'c1000000-0005-4000-8000-000000000005', NOW() - INTERVAL '2 days'),
('CIV-2026-20003', 'c1000000-0006-4000-8000-000000000006', NOW() - INTERVAL '2 days'),
('CIV-2026-20006', 'c1000000-0001-4000-8000-000000000001', NOW() - INTERVAL '25 days'),
('CIV-2026-20006', 'c1000000-0003-4000-8000-000000000003', NOW() - INTERVAL '24 days'),
('CIV-2026-20006', 'c1000000-0004-4000-8000-000000000004', NOW() - INTERVAL '24 days'),
('CIV-2026-20006', 'c1000000-0005-4000-8000-000000000005', NOW() - INTERVAL '23 days'),
('CIV-2026-20006', 'c1000000-0006-4000-8000-000000000006', NOW() - INTERVAL '22 days'),
('CIV-2026-20019', 'c1000000-0002-4000-8000-000000000002', NOW() - INTERVAL '16 days'),
('CIV-2026-20019', 'c1000000-0003-4000-8000-000000000003', NOW() - INTERVAL '15 days'),
('CIV-2026-20019', 'c1000000-0004-4000-8000-000000000004', NOW() - INTERVAL '14 days'),
('CIV-2026-20019', 'c1000000-0005-4000-8000-000000000005', NOW() - INTERVAL '13 days'),
('CIV-2026-20001', 'c1000000-0002-4000-8000-000000000002', NOW() - INTERVAL '27 days'),
('CIV-2026-20001', 'c1000000-0005-4000-8000-000000000005', NOW() - INTERVAL '26 days'),
('CIV-2026-20001', 'c1000000-0006-4000-8000-000000000006', NOW() - INTERVAL '25 days'),
('CIV-2026-20017', 'c1000000-0001-4000-8000-000000000001', NOW() - INTERVAL '9 days'),
('CIV-2026-20017', 'c1000000-0002-4000-8000-000000000002', NOW() - INTERVAL '9 days'),
('CIV-2026-20017', 'c1000000-0006-4000-8000-000000000006', NOW() - INTERVAL '8 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 2c. ISSUE COMMENTS
-- ════════════════════════════════════════

INSERT INTO issue_comments (id, issue_id, user_id, content, likes_count, created_at) VALUES
-- Comments on the water crisis
('d0000000-0001-4000-8000-comment00001', 'CIV-2026-20006', 'c1000000-0001-4000-8000-000000000001',
 'Same problem in my building (Sector 5, B-wing). We have been calling BMC water helpline but no response. Third day without any supply.', 8, NOW() - INTERVAL '25 days'),
('d0000000-0002-4000-8000-comment00002', 'CIV-2026-20006', 'c1000000-0004-4000-8000-000000000004',
 'I spoke to the ward officer yesterday — they said the main pipeline from Powai has a leak. Repair estimated 2 more days.', 12, NOW() - INTERVAL '24 days'),
('d0000000-0003-4000-8000-comment00003', 'CIV-2026-20006', 'c1000000-0006-4000-8000-000000000006',
 'Update: tanker arrived this morning but only 1 tanker for 4 buildings. Barely enough for one day. We need a permanent fix.', 6, NOW() - INTERVAL '23 days'),

-- Comments on dangerous pothole
('d0000000-0004-4000-8000-comment00004', 'CIV-2026-20003', 'c1000000-0002-4000-8000-000000000002',
 'My neighbour''s scooter tyre burst because of this pothole. It is at least 8 inches deep. Very dangerous.', 15, NOW() - INTERVAL '4 days'),
('d0000000-0005-4000-8000-comment00005', 'CIV-2026-20003', 'c1000000-0003-4000-8000-000000000003',
 'I measured it — roughly 2 feet wide and 10 inches deep. Cars are scraping their underside. Photo attached in the report.', 9, NOW() - INTERVAL '3 days'),

-- Comments on drain overflow near school
('d0000000-0006-4000-8000-comment00006', 'CIV-2026-20019', 'c1000000-0005-4000-8000-000000000005',
 'This is a health hazard for schoolchildren. My daughter came home with her shoes soaked in dirty water. Unacceptable.', 11, NOW() - INTERVAL '16 days'),
('d0000000-0007-4000-8000-comment00007', 'CIV-2026-20019', 'c1000000-0006-4000-8000-000000000006',
 'School PTA has written to BMC. If not fixed this week we will organize a protest at the ward office.', 14, NOW() - INTERVAL '14 days'),
('d0000000-0008-4000-8000-comment00008', 'CIV-2026-20019', 'c1000000-0003-4000-8000-000000000003',
 'Good news — drain cleaning crew came today. Partial clearing done. Still needs more work but flow has improved.', 7, NOW() - INTERVAL '13 days'),

-- Comments on street light / safety
('d0000000-0009-4000-8000-comment00009', 'CIV-2026-20017', 'c1000000-0001-4000-8000-000000000001',
 'Saw actual sparks coming from this pole at 10 PM yesterday. Kids play in this area during evening. Someone please attend urgently.', 16, NOW() - INTERVAL '9 days'),
('d0000000-0010-4000-8000-comment00010', 'CIV-2026-20017', 'c1000000-0006-4000-8000-000000000006',
 'I have reported this to BEST helpline also (complaint #45982). They said they will send electrician "soon". Typical.', 10, NOW() - INTERVAL '8 days'),

-- Comments on garbage overflow
('d0000000-0011-4000-8000-comment00011', 'CIV-2026-20011', 'c1000000-0003-4000-8000-000000000003',
 'This dumping spot has been overflowing every week for the past 3 months. BMC needs to either increase pickup frequency or close this spot.', 9, NOW() - INTERVAL '17 days'),
('d0000000-0012-4000-8000-comment00012', 'CIV-2026-20011', 'c1000000-0005-4000-8000-000000000005',
 'The stench is so bad we cannot open windows. Several neighbours have developed respiratory issues. Attaching doctor letter as evidence.', 13, NOW() - INTERVAL '16 days')

ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 2d. LEDGER ENTRIES (status history for key issues)
-- ════════════════════════════════════════

INSERT INTO ledger_entries (issue_id, status, changed_by_user_id, changed_by_role, detail, created_at) VALUES
('CIV-2026-20001', 'reported',     'c1000000-0001-4000-8000-000000000001', 'citizen', 'Issue reported with photo evidence', NOW() - INTERVAL '28 days'),
('CIV-2026-20001', 'acknowledged', NULL, 'system', 'Acknowledged by Ward 45 office', NOW() - INTERVAL '25 days'),

('CIV-2026-20002', 'reported',     'c1000000-0003-4000-8000-000000000003', 'citizen', 'Issue reported', NOW() - INTERVAL '22 days'),
('CIV-2026-20002', 'acknowledged', NULL, 'system', 'Acknowledged', NOW() - INTERVAL '19 days'),
('CIV-2026-20002', 'work_started', NULL, 'staff', 'Road repair crew dispatched to Marol Maroshi Road', NOW() - INTERVAL '12 days'),

('CIV-2026-20008', 'reported',     'c1000000-0001-4000-8000-000000000001', 'citizen', 'Water pipeline burst reported', NOW() - INTERVAL '24 days'),
('CIV-2026-20008', 'acknowledged', NULL, 'system', 'Acknowledged by Water Supply dept', NOW() - INTERVAL '22 days'),
('CIV-2026-20008', 'work_started', NULL, 'staff', 'Repair team deployed', NOW() - INTERVAL '18 days'),
('CIV-2026-20008', 'completed',    NULL, 'staff', 'Pipeline repaired and pressure restored', NOW() - INTERVAL '10 days'),

('CIV-2026-20025', 'reported',     'c1000000-0001-4000-8000-000000000001', 'citizen', 'Road damage after pipeline work', NOW() - INTERVAL '30 days'),
('CIV-2026-20025', 'acknowledged', NULL, 'system', 'Acknowledged', NOW() - INTERVAL '27 days'),
('CIV-2026-20025', 'assigned',     NULL, 'staff', 'Assigned to MIDC contractor for restoration', NOW() - INTERVAL '20 days'),
('CIV-2026-20025', 'work_started', NULL, 'staff', 'Contractor started road surface repair', NOW() - INTERVAL '12 days'),
('CIV-2026-20025', 'completed',    NULL, 'staff', 'Road resurfacing completed', NOW() - INTERVAL '5 days'),
('CIV-2026-20025', 'citizen_verified', 'c1000000-0001-4000-8000-000000000001', 'citizen', 'Verified — road is properly repaired and smooth now', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 3. DETECTED PATTERNS
-- ════════════════════════════════════════

INSERT INTO detected_patterns (id, ward_id, category, cluster_type, confidence, report_count, unique_locations, centroid_lat, centroid_lng, radius_meters, first_report_at, last_report_at, days_unresolved, economic_impact, evidence_package_json, status, created_at) VALUES

('p0000000-0001-4000-8000-pattern00001',
 'a0000045-0000-0000-0000-ward00000045',
 'water_supply', 'category', 'critical', 12, 8,
 19.1240, 72.8640, 1200,
 NOW() - INTERVAL '26 days', NOW() - INTERVAL '3 days', 23,
 4500000.00,
 '{
   "summary": "Chronic water supply failures concentrated in Sectors 5-11 of Andheri East. 12 independent reports from 8 unique locations over 23 days indicate systemic pipeline infrastructure deterioration.",
   "affected_population_estimate": 15000,
   "top_reports": ["CIV-2026-20006", "CIV-2026-20007", "CIV-2026-20008", "CIV-2026-20009", "CIV-2026-20010"],
   "recurring": true,
   "avg_resolution_days": 14.2,
   "citizen_impact_score": 9.2,
   "dept_responsible": "Water Supply",
   "ward_budget_line": "Water Infrastructure Maintenance"
 }'::jsonb,
 'active', NOW() - INTERVAL '10 days'),

('p0000000-0002-4000-8000-pattern00002',
 'a0000045-0000-0000-0000-ward00000045',
 'pothole', 'geographic', 'confirmed', 8, 5,
 19.1210, 72.8620, 900,
 NOW() - INTERVAL '28 days', NOW() - INTERVAL '3 days', 25,
 2200000.00,
 '{
   "summary": "Cluster of pothole and road damage reports across major roads in Andheri East. Geographic clustering suggests systemic road quality issues rather than isolated incidents.",
   "affected_population_estimate": 45000,
   "top_reports": ["CIV-2026-20001", "CIV-2026-20002", "CIV-2026-20003", "CIV-2026-20004", "CIV-2026-20005"],
   "recurring": true,
   "avg_resolution_days": 18.5,
   "citizen_impact_score": 7.8,
   "vehicle_damage_claims": 23,
   "dept_responsible": "Roads & Bridges"
 }'::jsonb,
 'action_created', NOW() - INTERVAL '8 days'),

('p0000000-0003-4000-8000-pattern00003',
 'a0000045-0000-0000-0000-ward00000045',
 'garbage', 'category', 'confirmed', 6, 4,
 19.1155, 72.8555, 700,
 NOW() - INTERVAL '19 days', NOW() - INTERVAL '4 days', 15,
 800000.00,
 '{
   "summary": "Recurring garbage collection failures in the D.N. Nagar to Sakinaka belt. Multiple reports of overflowing bins, missed pickups, and illegal dumping within a 700m radius.",
   "affected_population_estimate": 8000,
   "top_reports": ["CIV-2026-20011", "CIV-2026-20012", "CIV-2026-20013", "CIV-2026-20014"],
   "recurring": true,
   "health_risk": "high",
   "avg_resolution_days": 7.3,
   "citizen_impact_score": 6.5,
   "dept_responsible": "Solid Waste Management"
 }'::jsonb,
 'active', NOW() - INTERVAL '6 days'),

('p0000000-0004-4000-8000-pattern00004',
 'a0000045-0000-0000-0000-ward00000045',
 'drainage', 'geographic', 'critical', 5, 3,
 19.1245, 72.8715, 600,
 NOW() - INTERVAL '25 days', NOW() - INTERVAL '7 days', 18,
 3200000.00,
 '{
   "summary": "Drainage blockage and overflow pattern near Marol-MIDC area. With monsoon approaching, unresolved drainage issues pose severe flooding risk to low-lying industrial and residential zones.",
   "affected_population_estimate": 12000,
   "top_reports": ["CIV-2026-20018", "CIV-2026-20019", "CIV-2026-20020"],
   "recurring": true,
   "monsoon_risk_multiplier": 4.5,
   "flood_risk_zones": ["J.B. Nagar low-lying area", "MIDC Road dip", "Marol Maroshi underpass"],
   "dept_responsible": "Storm Water Drains"
 }'::jsonb,
 'active', NOW() - INTERVAL '5 days')

ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 3b. PATTERN REPORTS (link patterns to issues)
-- ════════════════════════════════════════

INSERT INTO pattern_reports (pattern_id, issue_id, similarity_score, created_at) VALUES
-- Water supply pattern
('p0000000-0001-4000-8000-pattern00001', 'CIV-2026-20006', 0.9800, NOW() - INTERVAL '10 days'),
('p0000000-0001-4000-8000-pattern00001', 'CIV-2026-20007', 0.9200, NOW() - INTERVAL '10 days'),
('p0000000-0001-4000-8000-pattern00001', 'CIV-2026-20008', 0.8900, NOW() - INTERVAL '10 days'),
('p0000000-0001-4000-8000-pattern00001', 'CIV-2026-20009', 0.9500, NOW() - INTERVAL '10 days'),
('p0000000-0001-4000-8000-pattern00001', 'CIV-2026-20010', 0.8700, NOW() - INTERVAL '10 days'),
-- Pothole pattern
('p0000000-0002-4000-8000-pattern00002', 'CIV-2026-20001', 0.9600, NOW() - INTERVAL '8 days'),
('p0000000-0002-4000-8000-pattern00002', 'CIV-2026-20002', 0.9300, NOW() - INTERVAL '8 days'),
('p0000000-0002-4000-8000-pattern00002', 'CIV-2026-20003', 0.9700, NOW() - INTERVAL '8 days'),
('p0000000-0002-4000-8000-pattern00002', 'CIV-2026-20004', 0.9100, NOW() - INTERVAL '8 days'),
('p0000000-0002-4000-8000-pattern00002', 'CIV-2026-20005', 0.8800, NOW() - INTERVAL '8 days'),
('p0000000-0002-4000-8000-pattern00002', 'CIV-2026-20025', 0.8500, NOW() - INTERVAL '8 days'),
-- Garbage pattern
('p0000000-0003-4000-8000-pattern00003', 'CIV-2026-20011', 0.9500, NOW() - INTERVAL '6 days'),
('p0000000-0003-4000-8000-pattern00003', 'CIV-2026-20012', 0.9200, NOW() - INTERVAL '6 days'),
('p0000000-0003-4000-8000-pattern00003', 'CIV-2026-20013', 0.8900, NOW() - INTERVAL '6 days'),
('p0000000-0003-4000-8000-pattern00003', 'CIV-2026-20014', 0.8400, NOW() - INTERVAL '6 days'),
-- Drainage pattern
('p0000000-0004-4000-8000-pattern00004', 'CIV-2026-20018', 0.9400, NOW() - INTERVAL '5 days'),
('p0000000-0004-4000-8000-pattern00004', 'CIV-2026-20019', 0.9600, NOW() - INTERVAL '5 days'),
('p0000000-0004-4000-8000-pattern00004', 'CIV-2026-20020', 0.9100, NOW() - INTERVAL '5 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 4. COMMUNITY ACTIONS
-- ════════════════════════════════════════

INSERT INTO community_actions (id, creator_id, ward_id, title, description, desired_outcome, target_authority_id, escalation_level, status, support_count, support_goal, evidence_package_json, economic_impact_estimate, pattern_id, created_at, acknowledged_at) VALUES

('ca000000-0001-4000-8000-action000001',
 'c1000000-0002-4000-8000-000000000002',
 'a0000045-0000-0000-0000-ward00000045',
 'Fix chronic water supply failure in Sectors 5-11',
 'For the past month, residents in Sectors 5 through 11 of Andheri East have experienced repeated water supply disruptions — from complete shutoffs lasting 3+ days to contaminated supply and low pressure. Over 15,000 residents are affected. BMC tankers are insufficient and irregular. We demand a permanent infrastructure fix, not temporary tanker solutions.',
 'Complete pipeline audit and repair of the Sector 5-11 water distribution network within 45 days, with interim daily tanker supply guarantee.',
 'r0000045-0000-0000-0000-rep000000001',
 'ward', 'acknowledged', 187, 250,
 '{"linked_issues": 5, "unique_reporters": 12, "photo_evidence_count": 18, "days_unresolved": 23, "petition_signatures": 187}'::jsonb,
 4500000.00,
 'p0000000-0001-4000-8000-pattern00001',
 NOW() - INTERVAL '9 days', NOW() - INTERVAL '6 days'),

('ca000000-0002-4000-8000-action000002',
 'c1000000-0001-4000-8000-000000000001',
 'a0000045-0000-0000-0000-ward00000045',
 'Demand pothole-free roads on Link Road and Sakinaka stretch',
 'The Link Road to Sakinaka stretch has become a vehicle graveyard. 8 pothole reports in the past month, multiple vehicle damage incidents, and at least 2 reported injuries. The road was last properly surfaced in 2023. We demand complete resurfacing — not patch jobs that last one monsoon.',
 'Full resurfacing of the Link Road-Sakinaka stretch (approx 3.2 km) within 60 days using hot-mix technology.',
 'r0000045-0000-0000-0000-rep000000001',
 'ward', 'committed', 234, 300,
 '{"linked_issues": 6, "unique_reporters": 8, "vehicle_damage_reports": 23, "injury_reports": 2, "estimated_daily_commuters_affected": 45000}'::jsonb,
 2200000.00,
 'p0000000-0002-4000-8000-pattern00002',
 NOW() - INTERVAL '7 days', NOW() - INTERVAL '5 days'),

('ca000000-0003-4000-8000-action000003',
 'c1000000-0006-4000-8000-000000000006',
 'a0000045-0000-0000-0000-ward00000045',
 'Clean up D.N. Nagar to Sakinaka garbage belt',
 'Persistent garbage collection failures have turned the D.N. Nagar to Sakinaka belt into an open dumping ground. Overflowing bins, illegal construction debris, and 4-day collection gaps are the norm. Residents are suffering from respiratory issues and the area has become a breeding ground for mosquitoes and rodents.',
 'Daily garbage collection with zero overflow tolerance; removal of all illegal dumping within 15 days; installation of CCTV at dumping hotspots.',
 'r0000045-0000-0000-0000-rep000000001',
 'ward', 'open', 98, 200,
 '{"linked_issues": 4, "unique_reporters": 6, "health_complaints": 12, "mosquito_breeding_sites": 3}'::jsonb,
 800000.00,
 'p0000000-0003-4000-8000-pattern00003',
 NOW() - INTERVAL '5 days', NULL),

('ca000000-0004-4000-8000-action000004',
 'c1000000-0003-4000-8000-000000000003',
 'a0000045-0000-0000-0000-ward00000045',
 'Emergency drain clearance before monsoon season',
 'Monsoon is less than 10 weeks away and multiple drains in the Marol-MIDC area are already overflowing in light rain. The J.B. Nagar low-lying area flooded thrice last monsoon. Without immediate pre-monsoon drain clearing, we are looking at severe waterlogging, property damage, and potential loss of life in the upcoming monsoon.',
 'Complete pre-monsoon drain clearance of all stormwater drains in Ward 45; structural repair of collapsed drain sections near J.B. Nagar school; installation of flood sensors at 3 critical points.',
 'r0000045-0000-0000-0000-rep000000001',
 'mla', 'in_progress', 312, 350,
 '{"linked_issues": 3, "last_monsoon_flood_incidents": 3, "estimated_property_damage_risk": 32000000, "days_to_monsoon": 70}'::jsonb,
 3200000.00,
 'p0000000-0004-4000-8000-pattern00004',
 NOW() - INTERVAL '4 days', NOW() - INTERVAL '3 days'),

('ca000000-0005-4000-8000-action000005',
 'c1000000-0005-4000-8000-000000000005',
 'a0000045-0000-0000-0000-ward00000045',
 'Street light repair and safety improvement on Sakinaka-Link Road stretch',
 'Multiple street lights are non-functional on the Sakinaka to Link Road stretch, creating dangerous conditions for commuters, especially women and children, after dark. One pole is actively sparking and poses an electrocution risk. We demand immediate repair of all non-functional lights and safety audit of electrical infrastructure.',
 'Repair or replace all 3 reported non-functional street lights within 7 days; safety audit of all 45 street light poles in the ward; monthly maintenance schedule commitment.',
 'r0000045-0000-0000-0000-rep000000001',
 'ward', 'open', 145, 200,
 '{"linked_issues": 3, "electrocution_risk_poles": 1, "dark_zones_identified": 2, "women_safety_complaints": 8}'::jsonb,
 350000.00,
 NULL,
 NOW() - INTERVAL '3 days', NULL)

ON CONFLICT DO NOTHING;

-- Link patterns back to actions (update the circular FK)
UPDATE detected_patterns SET community_action_id = 'ca000000-0001-4000-8000-action000001' WHERE id = 'p0000000-0001-4000-8000-pattern00001' AND community_action_id IS NULL;
UPDATE detected_patterns SET community_action_id = 'ca000000-0002-4000-8000-action000002' WHERE id = 'p0000000-0002-4000-8000-pattern00002' AND community_action_id IS NULL;
UPDATE detected_patterns SET community_action_id = 'ca000000-0003-4000-8000-action000003' WHERE id = 'p0000000-0003-4000-8000-pattern00003' AND community_action_id IS NULL;
UPDATE detected_patterns SET community_action_id = 'ca000000-0004-4000-8000-action000004' WHERE id = 'p0000000-0004-4000-8000-pattern00004' AND community_action_id IS NULL;

-- ════════════════════════════════════════
-- 4b. ACTION SUPPORTERS
-- ════════════════════════════════════════

-- All 6 test users support each action (+ the admin user for variety)
INSERT INTO action_supporters (action_id, user_id, civic_score_at_time, ward_verified, created_at) VALUES
-- Water supply action (187 supporters — we insert our 7 known users)
('ca000000-0001-4000-8000-action000001', 'c1000000-0001-4000-8000-000000000001', 120, true, NOW() - INTERVAL '9 days'),
('ca000000-0001-4000-8000-action000001', 'c1000000-0002-4000-8000-000000000002', 145, true, NOW() - INTERVAL '9 days'),
('ca000000-0001-4000-8000-action000001', 'c1000000-0003-4000-8000-000000000003', 98,  true, NOW() - INTERVAL '8 days'),
('ca000000-0001-4000-8000-action000001', 'c1000000-0004-4000-8000-000000000004', 75,  true, NOW() - INTERVAL '8 days'),
('ca000000-0001-4000-8000-action000001', 'c1000000-0005-4000-8000-000000000005', 110, true, NOW() - INTERVAL '7 days'),
('ca000000-0001-4000-8000-action000001', 'c1000000-0006-4000-8000-000000000006', 135, true, NOW() - INTERVAL '7 days'),
('ca000000-0001-4000-8000-action000001', '00000000-0000-0000-0000-000000000001', 100, false, NOW() - INTERVAL '6 days'),
-- Pothole action (234 supporters)
('ca000000-0002-4000-8000-action000002', 'c1000000-0001-4000-8000-000000000001', 120, true, NOW() - INTERVAL '7 days'),
('ca000000-0002-4000-8000-action000002', 'c1000000-0002-4000-8000-000000000002', 145, true, NOW() - INTERVAL '7 days'),
('ca000000-0002-4000-8000-action000002', 'c1000000-0003-4000-8000-000000000003', 98,  true, NOW() - INTERVAL '6 days'),
('ca000000-0002-4000-8000-action000002', 'c1000000-0004-4000-8000-000000000004', 75,  true, NOW() - INTERVAL '6 days'),
('ca000000-0002-4000-8000-action000002', 'c1000000-0005-4000-8000-000000000005', 110, true, NOW() - INTERVAL '5 days'),
('ca000000-0002-4000-8000-action000002', 'c1000000-0006-4000-8000-000000000006', 135, true, NOW() - INTERVAL '5 days'),
-- Garbage action (98 supporters)
('ca000000-0003-4000-8000-action000003', 'c1000000-0001-4000-8000-000000000001', 120, true, NOW() - INTERVAL '5 days'),
('ca000000-0003-4000-8000-action000003', 'c1000000-0004-4000-8000-000000000004', 75,  true, NOW() - INTERVAL '4 days'),
('ca000000-0003-4000-8000-action000003', 'c1000000-0005-4000-8000-000000000005', 110, true, NOW() - INTERVAL '4 days'),
('ca000000-0003-4000-8000-action000003', 'c1000000-0006-4000-8000-000000000006', 135, true, NOW() - INTERVAL '3 days'),
-- Drainage action (312 supporters)
('ca000000-0004-4000-8000-action000004', 'c1000000-0001-4000-8000-000000000001', 120, true, NOW() - INTERVAL '4 days'),
('ca000000-0004-4000-8000-action000004', 'c1000000-0002-4000-8000-000000000002', 145, true, NOW() - INTERVAL '4 days'),
('ca000000-0004-4000-8000-action000004', 'c1000000-0003-4000-8000-000000000003', 98,  true, NOW() - INTERVAL '3 days'),
('ca000000-0004-4000-8000-action000004', 'c1000000-0004-4000-8000-000000000004', 75,  true, NOW() - INTERVAL '3 days'),
('ca000000-0004-4000-8000-action000004', 'c1000000-0005-4000-8000-000000000005', 110, true, NOW() - INTERVAL '2 days'),
('ca000000-0004-4000-8000-action000004', 'c1000000-0006-4000-8000-000000000006', 135, true, NOW() - INTERVAL '2 days'),
('ca000000-0004-4000-8000-action000004', '00000000-0000-0000-0000-000000000001', 100, false, NOW() - INTERVAL '2 days'),
-- Street light action (145 supporters)
('ca000000-0005-4000-8000-action000005', 'c1000000-0001-4000-8000-000000000001', 120, true, NOW() - INTERVAL '3 days'),
('ca000000-0005-4000-8000-action000005', 'c1000000-0002-4000-8000-000000000002', 145, true, NOW() - INTERVAL '3 days'),
('ca000000-0005-4000-8000-action000005', 'c1000000-0004-4000-8000-000000000004', 75,  true, NOW() - INTERVAL '2 days'),
('ca000000-0005-4000-8000-action000005', 'c1000000-0005-4000-8000-000000000005', 110, true, NOW() - INTERVAL '2 days'),
('ca000000-0005-4000-8000-action000005', 'c1000000-0006-4000-8000-000000000006', 135, true, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 4c. ACTION EVIDENCE (link issues to actions)
-- ════════════════════════════════════════

INSERT INTO action_evidence (action_id, issue_id, linked_by, auto_linked, created_at) VALUES
-- Water supply action
('ca000000-0001-4000-8000-action000001', 'CIV-2026-20006', 'c1000000-0002-4000-8000-000000000002', false, NOW() - INTERVAL '9 days'),
('ca000000-0001-4000-8000-action000001', 'CIV-2026-20007', 'c1000000-0002-4000-8000-000000000002', true,  NOW() - INTERVAL '9 days'),
('ca000000-0001-4000-8000-action000001', 'CIV-2026-20008', 'c1000000-0002-4000-8000-000000000002', true,  NOW() - INTERVAL '9 days'),
('ca000000-0001-4000-8000-action000001', 'CIV-2026-20009', 'c1000000-0003-4000-8000-000000000003', false, NOW() - INTERVAL '8 days'),
('ca000000-0001-4000-8000-action000001', 'CIV-2026-20010', 'c1000000-0005-4000-8000-000000000005', false, NOW() - INTERVAL '7 days'),
-- Pothole action
('ca000000-0002-4000-8000-action000002', 'CIV-2026-20001', 'c1000000-0001-4000-8000-000000000001', false, NOW() - INTERVAL '7 days'),
('ca000000-0002-4000-8000-action000002', 'CIV-2026-20002', 'c1000000-0001-4000-8000-000000000001', true,  NOW() - INTERVAL '7 days'),
('ca000000-0002-4000-8000-action000002', 'CIV-2026-20003', 'c1000000-0001-4000-8000-000000000001', true,  NOW() - INTERVAL '7 days'),
('ca000000-0002-4000-8000-action000002', 'CIV-2026-20004', 'c1000000-0002-4000-8000-000000000002', false, NOW() - INTERVAL '6 days'),
('ca000000-0002-4000-8000-action000002', 'CIV-2026-20005', 'c1000000-0004-4000-8000-000000000004', false, NOW() - INTERVAL '5 days'),
('ca000000-0002-4000-8000-action000002', 'CIV-2026-20025', 'c1000000-0001-4000-8000-000000000001', true,  NOW() - INTERVAL '7 days'),
-- Garbage action
('ca000000-0003-4000-8000-action000003', 'CIV-2026-20011', 'c1000000-0006-4000-8000-000000000006', false, NOW() - INTERVAL '5 days'),
('ca000000-0003-4000-8000-action000003', 'CIV-2026-20012', 'c1000000-0006-4000-8000-000000000006', true,  NOW() - INTERVAL '5 days'),
('ca000000-0003-4000-8000-action000003', 'CIV-2026-20013', 'c1000000-0006-4000-8000-000000000006', true,  NOW() - INTERVAL '5 days'),
('ca000000-0003-4000-8000-action000003', 'CIV-2026-20014', 'c1000000-0002-4000-8000-000000000002', false, NOW() - INTERVAL '4 days'),
-- Drainage action
('ca000000-0004-4000-8000-action000004', 'CIV-2026-20018', 'c1000000-0003-4000-8000-000000000003', false, NOW() - INTERVAL '4 days'),
('ca000000-0004-4000-8000-action000004', 'CIV-2026-20019', 'c1000000-0003-4000-8000-000000000003', true,  NOW() - INTERVAL '4 days'),
('ca000000-0004-4000-8000-action000004', 'CIV-2026-20020', 'c1000000-0003-4000-8000-000000000003', true,  NOW() - INTERVAL '4 days'),
-- Street light action
('ca000000-0005-4000-8000-action000005', 'CIV-2026-20015', 'c1000000-0005-4000-8000-000000000005', false, NOW() - INTERVAL '3 days'),
('ca000000-0005-4000-8000-action000005', 'CIV-2026-20016', 'c1000000-0005-4000-8000-000000000005', true,  NOW() - INTERVAL '3 days'),
('ca000000-0005-4000-8000-action000005', 'CIV-2026-20017', 'c1000000-0005-4000-8000-000000000005', true,  NOW() - INTERVAL '3 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 4d. ACTION RESPONSES (from representative / stakeholders)
-- ════════════════════════════════════════

-- Use the admin user as a proxy for the representative responding (since responder_id refs users)
-- In a real system, the rep would have a linked user account

INSERT INTO action_responses (action_id, responder_id, response_type, content, timeline_date, created_at) VALUES
-- Water supply — acknowledged
('ca000000-0001-4000-8000-action000001', '00000000-0000-0000-0000-000000000001', 'acknowledge',
 'Ward 45 office has received this community action. Water supply infrastructure in Sectors 5-11 has been escalated to the Assistant Commissioner. An inspection team will visit within 48 hours.',
 NULL, NOW() - INTERVAL '6 days'),

-- Pothole — acknowledged then committed
('ca000000-0002-4000-8000-action000002', '00000000-0000-0000-0000-000000000001', 'acknowledge',
 'We acknowledge the community''s concern regarding road conditions on the Link Road-Sakinaka stretch. Road inspection report has been requested from the engineering department.',
 NULL, NOW() - INTERVAL '5 days'),
('ca000000-0002-4000-8000-action000002', '00000000-0000-0000-0000-000000000001', 'commit',
 'The Roads department has committed to complete resurfacing of the 3.2 km stretch. Work order issued to M/s Patel Road Contractors. Target completion: 60 days from today. Budget: Rs. 22 lakh from ward development fund.',
 (CURRENT_DATE + INTERVAL '53 days')::date, NOW() - INTERVAL '4 days'),

-- Drainage — acknowledged, committed, and update in progress
('ca000000-0004-4000-8000-action000004', '00000000-0000-0000-0000-000000000001', 'acknowledge',
 'Pre-monsoon drain clearing is our highest priority. The Storm Water Drains department has been mobilized for Ward 45.',
 NULL, NOW() - INTERVAL '3 days'),
('ca000000-0004-4000-8000-action000004', '00000000-0000-0000-0000-000000000001', 'commit',
 'Full pre-monsoon clearance of all 12 km of storm drains in Ward 45 committed. Work to begin within 5 days. Budget: Rs. 32 lakh. Will include structural repair of 3 collapsed sections.',
 (CURRENT_DATE + INTERVAL '45 days')::date, NOW() - INTERVAL '2 days'),
('ca000000-0004-4000-8000-action000004', '00000000-0000-0000-0000-000000000001', 'update',
 'Update: Drain clearing commenced on the Marol Maroshi stretch. 2 of 12 km cleared so far. JCB machines deployed at J.B. Nagar section starting tomorrow.',
 NULL, NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 4e. ACTION ESCALATION (drainage action escalated from ward to MLA)
-- ════════════════════════════════════════

INSERT INTO action_escalations (action_id, from_level, to_level, reason, created_at) VALUES
('ca000000-0004-4000-8000-action000004', 'ward', 'mla', 'manual', NOW() - INTERVAL '2 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 5. CIVIC SCORES
-- ════════════════════════════════════════

INSERT INTO civic_scores (user_id, credibility_score, influence_score, tier, reports_filed, reports_resolved, accuracy_rate, followers_count, updated_at) VALUES
('c1000000-0001-4000-8000-000000000001', 145, 32, 'community_validator', 8, 3, 0.8750, 45, NOW() - INTERVAL '1 day'),
('c1000000-0002-4000-8000-000000000002', 168, 41, 'community_validator', 6, 4, 0.9200, 62, NOW() - INTERVAL '1 day'),
('c1000000-0003-4000-8000-000000000003', 112, 22, 'verified_reporter',   7, 2, 0.8100, 28, NOW() - INTERVAL '2 days'),
('c1000000-0004-4000-8000-000000000004', 87,  15, 'verified_reporter',   5, 1, 0.7600, 15, NOW() - INTERVAL '2 days'),
('c1000000-0005-4000-8000-000000000005', 134, 28, 'community_validator', 6, 3, 0.8500, 38, NOW() - INTERVAL '1 day'),
('c1000000-0006-4000-8000-000000000006', 156, 37, 'thought_leader',     5, 4, 0.9400, 55, NOW() - INTERVAL '1 day')
ON CONFLICT (user_id) DO NOTHING;

-- Score events for the most active users
INSERT INTO score_events (user_id, event_type, points, reason, created_at) VALUES
('c1000000-0001-4000-8000-000000000001', 'issue_reported',    10, 'Filed pothole report CIV-2026-20001', NOW() - INTERVAL '28 days'),
('c1000000-0001-4000-8000-000000000001', 'issue_resolved',    25, 'Issue CIV-2026-20008 resolved',       NOW() - INTERVAL '10 days'),
('c1000000-0001-4000-8000-000000000001', 'issue_verified',    15, 'Verified resolution CIV-2026-20025',  NOW() - INTERVAL '2 days'),
('c1000000-0002-4000-8000-000000000002', 'action_created',    20, 'Created community action for water supply', NOW() - INTERVAL '9 days'),
('c1000000-0002-4000-8000-000000000002', 'issue_reported',    10, 'Filed water supply report',            NOW() - INTERVAL '26 days'),
('c1000000-0002-4000-8000-000000000002', 'upvote_received',   2,  'Upvote on issue',                      NOW() - INTERVAL '24 days'),
('c1000000-0003-4000-8000-000000000003', 'issue_reported',    10, 'Filed pothole report',                 NOW() - INTERVAL '22 days'),
('c1000000-0003-4000-8000-000000000003', 'action_created',    20, 'Created drainage community action',    NOW() - INTERVAL '4 days'),
('c1000000-0005-4000-8000-000000000005', 'action_created',    20, 'Created street light action',          NOW() - INTERVAL '3 days'),
('c1000000-0005-4000-8000-000000000005', 'issue_reported',    10, 'Filed pothole report',                 NOW() - INTERVAL '5 days'),
('c1000000-0006-4000-8000-000000000006', 'action_created',    20, 'Created garbage cleanup action',       NOW() - INTERVAL '5 days'),
('c1000000-0006-4000-8000-000000000006', 'comment_helpful',   5,  'Comment liked by 10+ users',           NOW() - INTERVAL '13 days'),
('c1000000-0006-4000-8000-000000000006', 'issue_reported',    10, 'Filed illegal construction report',    NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 6. ADDITIONAL POLLS
-- ════════════════════════════════════════

DO $$
DECLARE
    admin_id UUID;
    poll_infra_id UUID;
    poll_waste_id UUID;
    opt1 UUID; opt2 UUID; opt3 UUID; opt4 UUID;
BEGIN
    SELECT id INTO admin_id FROM users WHERE phone = '+910000000001';

    -- Poll 1: Infrastructure priority
    INSERT INTO polls (id, created_by, boundary_id, type, question, total_votes, starts_at, ends_at, active, created_at)
    VALUES (
        gen_random_uuid(),
        admin_id,
        'a0000045-0000-0000-0000-ward00000045',
        'constituency',
        'Should Ward 45 prioritize water infrastructure or road repair this quarter?',
        0,
        NOW() - INTERVAL '5 days',
        NOW() + INTERVAL '25 days',
        true,
        NOW() - INTERVAL '5 days'
    ) RETURNING id INTO poll_infra_id;

    INSERT INTO poll_options (id, poll_id, label, votes_count, sort_order) VALUES
        (gen_random_uuid(), poll_infra_id, 'Water infrastructure — pipelines and supply network', 87, 1),
        (gen_random_uuid(), poll_infra_id, 'Road repair — potholes and resurfacing', 63, 2),
        (gen_random_uuid(), poll_infra_id, 'Both equally — split the budget', 42, 3),
        (gen_random_uuid(), poll_infra_id, 'Neither — focus on drainage before monsoon', 31, 4);

    UPDATE polls SET total_votes = 223 WHERE id = poll_infra_id;

    -- Poll 2: Waste segregation rating
    INSERT INTO polls (id, created_by, boundary_id, type, question, total_votes, starts_at, ends_at, active, created_at)
    VALUES (
        gen_random_uuid(),
        admin_id,
        'a0000045-0000-0000-0000-ward00000045',
        'satisfaction',
        'Rate the new waste segregation program in Ward 45',
        0,
        NOW() - INTERVAL '3 days',
        NOW() + INTERVAL '27 days',
        true,
        NOW() - INTERVAL '3 days'
    ) RETURNING id INTO poll_waste_id;

    INSERT INTO poll_options (id, poll_id, label, votes_count, sort_order) VALUES
        (gen_random_uuid(), poll_waste_id, 'Excellent — clear improvement in cleanliness', 18, 1),
        (gen_random_uuid(), poll_waste_id, 'Good — working well but needs more bins', 34, 2),
        (gen_random_uuid(), poll_waste_id, 'Average — inconsistent collection schedule', 29, 3),
        (gen_random_uuid(), poll_waste_id, 'Poor — no change from before, same problems', 15, 4);

    UPDATE polls SET total_votes = 96 WHERE id = poll_waste_id;
END $$;

-- ════════════════════════════════════════
-- 7. ADDITIONAL VOICES
-- ════════════════════════════════════════

INSERT INTO voices (user_id, text, likes_count, replies_count, shares_count, hashtags, location, boundary_id, language, created_at) VALUES

('c1000000-0001-4000-8000-000000000001',
 'Just saw the community action for pothole-free roads cross 200 supporters. This is how democracy should work — citizens coming together with evidence, not just complaints. Keep signing! #AndheriEast #PotholeFreeMumbai #CivicAction',
 23, 4, 7, ARRAY['AndheriEast', 'PotholeFreeMumbai', 'CivicAction'],
 ST_MakePoint(72.8550, 19.1200), 'a0000045-0000-0000-0000-ward00000045', 'en', NOW() - INTERVAL '4 days'),

('c1000000-0002-4000-8000-000000000002',
 'Day 3 without water in Sector 5. BMC tanker came once at 6 AM when everyone was sleeping. Is this what they call "water supply"? The corporator needs to answer. #WaterCrisis #Ward45 #BMC',
 45, 8, 12, ARRAY['WaterCrisis', 'Ward45', 'BMC'],
 ST_MakePoint(72.8620, 19.1150), 'a0000045-0000-0000-0000-ward00000045', 'en', NOW() - INTERVAL '23 days'),

('c1000000-0003-4000-8000-000000000003',
 'Good news from Ward 45! The pipeline burst on J.B. Nagar Link Road has been fixed and water pressure is back to normal. It took 14 days but at least it got done. Verified personally. #IssueResolved #Accountability',
 31, 3, 5, ARRAY['IssueResolved', 'Accountability'],
 ST_MakePoint(72.8480, 19.1280), 'a0000045-0000-0000-0000-ward00000045', 'en', NOW() - INTERVAL '10 days'),

('c1000000-0006-4000-8000-000000000006',
 'Monsoon is 10 weeks away and the drains near J.B. Nagar school are still overflowing. Last year my shop was flooded. If the BMC does not act now, we will lose crores again. Please support the drain clearance action. #PreMonsoon #AndheriEast',
 38, 6, 9, ARRAY['PreMonsoon', 'AndheriEast'],
 ST_MakePoint(72.8600, 19.1250), 'a0000045-0000-0000-0000-ward00000045', 'en', NOW() - INTERVAL '3 days'),

('c1000000-0004-4000-8000-000000000004',
 'The sparking street light pole near Andheri station is still not fixed after 10 days. I have filed a report on Civitro and called BEST. Children play in this area every evening. How many complaints does it take? #SafetyFirst #StreetLights #Ward45',
 52, 7, 11, ARRAY['SafetyFirst', 'StreetLights', 'Ward45'],
 ST_MakePoint(72.8700, 19.1320), 'a0000045-0000-0000-0000-ward00000045', 'en', NOW() - INTERVAL '1 day'),

('c1000000-0005-4000-8000-000000000005',
 'Attended the ward committee meeting today. Corporator Suresh Patkar acknowledged the pothole and drainage issues. He committed to resurfacing Link Road within 60 days. Let us hold him to it. Civitro community actions are working! #WardMeeting #Transparency',
 29, 5, 4, ARRAY['WardMeeting', 'Transparency'],
 ST_MakePoint(72.8530, 19.1180), 'a0000045-0000-0000-0000-ward00000045', 'en', NOW() - INTERVAL '2 days')

ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 8. CHI SCORE FOR WARD 45
-- ════════════════════════════════════════

INSERT INTO chi_scores (boundary_id, overall_score, rank, rank_total, dimensions, computed_at) VALUES
('a0000045-0000-0000-0000-ward00000045', 52, 31, 75,
 '[
   {"label": "Infrastructure", "score": 38, "weight": 0.25, "signals_count": 13, "trend": "declining"},
   {"label": "Water & Sanitation", "score": 42, "weight": 0.20, "signals_count": 12, "trend": "declining"},
   {"label": "Civic Engagement", "score": 78, "weight": 0.15, "signals_count": 45, "trend": "improving"},
   {"label": "Safety", "score": 55, "weight": 0.15, "signals_count": 8, "trend": "stable"},
   {"label": "Governance Responsiveness", "score": 61, "weight": 0.15, "signals_count": 6, "trend": "improving"},
   {"label": "Environmental Quality", "score": 45, "weight": 0.10, "signals_count": 6, "trend": "declining"}
 ]'::jsonb,
 NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 9. SATISFACTION SURVEYS (for the ward corporator)
-- ════════════════════════════════════════

INSERT INTO satisfaction_surveys (user_id, representative_id, issue_id, score, feedback, created_at) VALUES
('c1000000-0001-4000-8000-000000000001', 'r0000045-0000-0000-0000-rep000000001', 'CIV-2026-20008', 4, 'Water pipeline issue was eventually resolved but took too long. 14 days for a burst pipe is not acceptable.', NOW() - INTERVAL '9 days'),
('c1000000-0002-4000-8000-000000000002', 'r0000045-0000-0000-0000-rep000000001', 'CIV-2026-20006', 2, 'Water supply issue still not fully resolved. Tanker supply is irregular. Very disappointed.', NOW() - INTERVAL '18 days'),
('c1000000-0003-4000-8000-000000000003', 'r0000045-0000-0000-0000-rep000000001', 'CIV-2026-20002', 3, 'Pothole repair started but road quality is still poor. Hopeful the resurfacing commitment will be kept.', NOW() - INTERVAL '10 days'),
('c1000000-0005-4000-8000-000000000005', 'r0000045-0000-0000-0000-rep000000001', NULL, 4, 'The corporator is responsive on Civitro and attended the ward meeting. Waiting for follow-through on promises.', NOW() - INTERVAL '2 days'),
('c1000000-0006-4000-8000-000000000006', 'r0000045-0000-0000-0000-rep000000001', 'CIV-2026-20011', 2, 'Garbage situation has not improved despite multiple complaints. Need action, not acknowledgments.', NOW() - INTERVAL '12 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 10. RATINGS FOR THE WARD CORPORATOR
-- ════════════════════════════════════════

INSERT INTO ratings (representative_id, computed_score, responsiveness_score, resolution_speed_score, citizen_satisfaction_score, sentiment_score, chi_improvement_score, sample_count, window_start, window_end, computed_at) VALUES
('r0000045-0000-0000-0000-rep000000001', 3.20, 3.80, 2.50, 3.00, 3.40, 3.30, 25, NOW() - INTERVAL '30 days', NOW(), NOW() - INTERVAL '1 day')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 11. NOTIFICATIONS FOR TEST USERS
-- ════════════════════════════════════════

INSERT INTO notifications (user_id, type, title, body, data, read, created_at) VALUES
('c1000000-0001-4000-8000-000000000001', 'issue_update', 'Your issue has been acknowledged',
 'Issue CIV-2026-20001 (pothole near Andheri Station) has been acknowledged by the Ward 45 office.',
 '{"issue_id": "CIV-2026-20001"}'::jsonb, true, NOW() - INTERVAL '25 days'),

('c1000000-0001-4000-8000-000000000001', 'resolution', 'Issue resolved!',
 'Issue CIV-2026-20025 (road damage after MIDC pipeline work) has been marked as resolved and citizen verified.',
 '{"issue_id": "CIV-2026-20025"}'::jsonb, true, NOW() - INTERVAL '2 days'),

('c1000000-0002-4000-8000-000000000002', 'trending', 'Your community action is trending',
 'Your community action "Fix chronic water supply failure in Sectors 5-11" has crossed 150 supporters!',
 '{"action_id": "ca000000-0001-4000-8000-action000001"}'::jsonb, true, NOW() - INTERVAL '5 days'),

('c1000000-0003-4000-8000-000000000003', 'issue_update', 'Drain clearing work started',
 'Issue CIV-2026-20019 (open drain near J.B. Nagar school) — work has started on drain clearing.',
 '{"issue_id": "CIV-2026-20019"}'::jsonb, false, NOW() - INTERVAL '13 days'),

('c1000000-0005-4000-8000-000000000005', 'achievement', 'Community Validator unlocked!',
 'Congratulations! You''ve reached the Community Validator tier. Your civic score is now 134.',
 '{"tier": "community_validator", "score": 134}'::jsonb, false, NOW() - INTERVAL '3 days'),

('c1000000-0004-4000-8000-000000000004', 'issue_update', 'Sparking street light assigned for repair',
 'Issue CIV-2026-20017 has been assigned to the Electrical department for urgent repair.',
 '{"issue_id": "CIV-2026-20017"}'::jsonb, false, NOW() - INTERVAL '8 days'),

('c1000000-0006-4000-8000-000000000006', 'promise_update', 'New commitment from your corporator',
 'Corporator Suresh Patkar committed to complete road resurfacing of Link Road-Sakinaka stretch in 60 days.',
 '{"action_id": "ca000000-0002-4000-8000-action000002"}'::jsonb, false, NOW() - INTERVAL '4 days')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- 12. REP ASSIGNMENTS (link test users to the ward corporator)
-- ════════════════════════════════════════

INSERT INTO rep_assignments (user_id, boundary_id, representative_id) VALUES
('c1000000-0001-4000-8000-000000000001', 'a0000045-0000-0000-0000-ward00000045', 'r0000045-0000-0000-0000-rep000000001'),
('c1000000-0002-4000-8000-000000000002', 'a0000045-0000-0000-0000-ward00000045', 'r0000045-0000-0000-0000-rep000000001'),
('c1000000-0003-4000-8000-000000000003', 'a0000045-0000-0000-0000-ward00000045', 'r0000045-0000-0000-0000-rep000000001'),
('c1000000-0004-4000-8000-000000000004', 'a0000045-0000-0000-0000-ward00000045', 'r0000045-0000-0000-0000-rep000000001'),
('c1000000-0005-4000-8000-000000000005', 'a0000045-0000-0000-0000-ward00000045', 'r0000045-0000-0000-0000-rep000000001'),
('c1000000-0006-4000-8000-000000000006', 'a0000045-0000-0000-0000-ward00000045', 'r0000045-0000-0000-0000-rep000000001')
ON CONFLICT DO NOTHING;

-- ════════════════════════════════════════
-- VERIFICATION SUMMARY
-- ════════════════════════════════════════

SELECT 'Dashboard seed complete' AS status;
SELECT 'Users (Ward 45 citizens):' AS entity, COUNT(*) AS count FROM users WHERE primary_boundary_id = 'a0000045-0000-0000-0000-ward00000045';
SELECT 'Issues (Ward 45):' AS entity, COUNT(*) AS count FROM issues WHERE boundary_id = 'a0000045-0000-0000-0000-ward00000045';
SELECT 'Issue comments:' AS entity, COUNT(*) AS count FROM issue_comments WHERE issue_id LIKE 'CIV-2026-2%';
SELECT 'Community actions:' AS entity, COUNT(*) AS count FROM community_actions WHERE ward_id = 'a0000045-0000-0000-0000-ward00000045';
SELECT 'Action supporters:' AS entity, COUNT(*) AS count FROM action_supporters WHERE action_id IN (SELECT id FROM community_actions WHERE ward_id = 'a0000045-0000-0000-0000-ward00000045');
SELECT 'Detected patterns:' AS entity, COUNT(*) AS count FROM detected_patterns WHERE ward_id = 'a0000045-0000-0000-0000-ward00000045';
SELECT 'Pattern reports:' AS entity, COUNT(*) AS count FROM pattern_reports WHERE pattern_id IN (SELECT id FROM detected_patterns WHERE ward_id = 'a0000045-0000-0000-0000-ward00000045');
SELECT 'Voices:' AS entity, COUNT(*) AS count FROM voices WHERE boundary_id = 'a0000045-0000-0000-0000-ward00000045';
SELECT 'Polls (active):' AS entity, COUNT(*) AS count FROM polls WHERE active = true;
SELECT 'Civic scores:' AS entity, COUNT(*) AS count FROM civic_scores;
SELECT 'Notifications:' AS entity, COUNT(*) AS count FROM notifications WHERE user_id IN ('c1000000-0001-4000-8000-000000000001','c1000000-0002-4000-8000-000000000002','c1000000-0003-4000-8000-000000000003','c1000000-0004-4000-8000-000000000004','c1000000-0005-4000-8000-000000000005','c1000000-0006-4000-8000-000000000006');
