-- Governance chain: maps the full T1→T8 chain for every ward
CREATE TABLE IF NOT EXISTS governance_chain (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ward_id UUID NOT NULL REFERENCES boundaries(id),
  representative_id UUID REFERENCES representatives(id),
  tier SMALLINT NOT NULL,
  level VARCHAR(50) NOT NULL,
  is_department_routed BOOLEAN DEFAULT false,
  department_category VARCHAR(50),
  name VARCHAR(200) NOT NULL,
  title VARCHAR(300) NOT NULL,
  initials VARCHAR(10) NOT NULL,
  party VARCHAR(100),
  is_elected BOOLEAN DEFAULT true,
  response_time_days DECIMAL,
  rating DECIMAL,
  issues_label VARCHAR(200),
  UNIQUE(ward_id, level, department_category)
);

-- Ward mood: precomputed sentiment data per ward
CREATE TABLE IF NOT EXISTS ward_mood (
  ward_id UUID PRIMARY KEY REFERENCES boundaries(id),
  mood VARCHAR(20) NOT NULL DEFAULT 'concerned',
  score DECIMAL NOT NULL DEFAULT 0.5,
  topics JSONB NOT NULL DEFAULT '[]',
  trend_direction VARCHAR(20) NOT NULL DEFAULT 'stable',
  trend_change_percent INTEGER NOT NULL DEFAULT 0,
  trend_sparkline JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed governance chain for Ward 45
INSERT INTO governance_chain (ward_id, tier, level, name, title, initials, party, is_elected, response_time_days, rating, issues_label) VALUES
('a0000045-0000-4000-8000-000000000045', 1, 'ward_councillor', 'Priya Sharma', 'Ward Councillor · BJP · Ward 45', 'PS', 'BJP', true, 2.3, 4.2, '3 open · 12 resolved'),
('a0000045-0000-4000-8000-000000000045', 2, 'mayor', 'Kishori Pednekar', 'Mayor, BMC', 'KP', 'SS', true, 4.1, 3.8, '47 open across 236 wards'),
('a0000045-0000-4000-8000-000000000045', 2, 'district_collector', 'District Collector', 'Mumbai Suburban District · IAS (Appointed)', 'DC', NULL, false, 3.0, NULL, 'Advisory · Revenue, disaster, inter-dept'),
('a0000045-0000-4000-8000-000000000045', 3, 'mla', 'Amit Satam', 'MLA, Vile Parle Constituency · BJP', 'AS', 'BJP', true, NULL, NULL, '89 open across 14 wards'),
('a0000045-0000-4000-8000-000000000045', 4, 'state_minister', 'Gulabrao Patil', 'Min. Water Supply & Sanitation, Maharashtra', 'GP', 'SS', true, 12, NULL, '23 patterns across state'),
('a0000045-0000-4000-8000-000000000045', 5, 'chief_minister', 'Chief Minister', 'Government of Maharashtra', 'CM', NULL, true, NULL, NULL, '1,247 open across state'),
('a0000045-0000-4000-8000-000000000045', 6, 'mp_lok_sabha', 'Gopal Shetty', 'MP, Mumbai North Constituency', 'GS', 'BJP', true, 7, NULL, 'Central-scheme issues · MPLAD fund'),
('a0000045-0000-4000-8000-000000000045', 7, 'central_minister', 'Minister of Jal Shakti', 'Ministry of Jal Shakti, Govt. of India', 'JS', NULL, true, NULL, NULL, NULL),
('a0000045-0000-4000-8000-000000000045', 8, 'prime_minister', 'Prime Minister of India', 'Terminal escalation · 30-day SLA → Public record + RTI', 'PM', NULL, true, NULL, NULL, 'National overview · Last resort')
ON CONFLICT DO NOTHING;

-- Mark state_minister as department-routed
UPDATE governance_chain SET is_department_routed = true, department_category = 'water_supply' WHERE level = 'state_minister' AND ward_id = 'a0000045-0000-4000-8000-000000000045';
UPDATE governance_chain SET is_department_routed = true, department_category = 'water_supply' WHERE level = 'central_minister' AND ward_id = 'a0000045-0000-4000-8000-000000000045';

-- Seed ward mood for Ward 45
INSERT INTO ward_mood (ward_id, mood, score, topics, trend_direction, trend_change_percent, trend_sparkline, updated_at)
VALUES (
  'a0000045-0000-4000-8000-000000000045',
  'frustrated',
  0.35,
  '[{"name":"Water supply","sentiment":-0.6,"percentage":43},{"name":"Potholes","sentiment":-0.3,"percentage":22},{"name":"Streetlights fixed","sentiment":0.4,"percentage":18},{"name":"New park","sentiment":0.5,"percentage":17}]',
  'declining',
  12,
  '[0.45, 0.42, 0.38, 0.35, 0.32, 0.36, 0.33]',
  NOW()
)
ON CONFLICT (ward_id) DO UPDATE SET mood = EXCLUDED.mood, score = EXCLUDED.score, topics = EXCLUDED.topics, trend_direction = EXCLUDED.trend_direction, trend_change_percent = EXCLUDED.trend_change_percent, trend_sparkline = EXCLUDED.trend_sparkline, updated_at = NOW();
