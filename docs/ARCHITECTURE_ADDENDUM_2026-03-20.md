# Civitro Architecture Addendum — 2026-03-20

### Addendum to: `civitro-architecture-plan.md` (Parts 1–14B, 20 Services)
### Created: 2026-03-20
### Scope: New services, features, and design systems added during the dashboard redesign and Community Action architecture session

---

## CHANGE LOG

| Item | Type | Status | Reference |
|------|------|--------|-----------|
| Service 22: Community Action Engine | New microservice | Fully architected | This document, Part A |
| Service 23: Pattern Detection Engine | New microservice | Fully architected | This document, Part B |
| Ward Mood (Sentiment Dashboard) | New citizen-facing feature | Designed + built | This document, Part C |
| Dashboard Redesign | Complete UI overhaul | Built as interactive HTML | `dashboard-preview.html` |
| Dashboard Redesign Plan | Design specification | Complete | `DASHBOARD_REDESIGN_PLAN.md` |
| Community Action Architecture | Full architecture doc | Complete | `COMMUNITY_ACTION_ARCHITECTURE.md` |
| Website Enhancements (6 sections) | Marketing website updates | Built | `civitro-website_Global_Enhanced.html` |
| Tagline | Brand identity | Adopted | "Democracy. You Shape." |

---

## PART A — Service 22: Community Action Engine

**Addendum to:** Part 3 (Microservice Breakdown) — adds Service 22 to the existing 20 services (note: Service 21 is the CIV Token Engine from the original architecture).

### A.1 Service Identity

**Service Name:** Community Action Engine
**Responsibility:** Manages the full lifecycle of evidence-backed community actions — the "Power Layer" that transforms clustered incident reports into collective civic pressure with structured stakeholder engagement, auto-escalation, and verified resolution tracking.

**Architectural Position:** Sits between the Signal Layer (Issue Reporting, Service 5) and the Accountability Layer (Rating & Accountability, Service 7; CHI Engine, Service 11). Consumes pattern detection signals, produces stakeholder notifications, and feeds resolution outcomes into CHI computation.

### A.2 Design Philosophy — Two-Layer Architecture

The platform now operates on two distinct but connected layers:

| Layer | Purpose | Prompt | Entry |
|-------|---------|--------|-------|
| **Signal Layer** (existing) | Capture specific events | "What happened?" | FAB -> Report |
| **Power Layer** (new) | Drive systemic change | "What should change?" | Pattern prompt / "Start Community Action" |

**Anti-overlap design:** Language guardrails, smart nudges, and controlled entry points prevent citizens from using one layer when they intend the other. See Section A.5.

### A.3 Owned Tables

```sql
-- Core action table
community_actions
  id UUID PK
  creator_id UUID FK -> users
  ward_id UUID FK -> boundaries
  title VARCHAR(200)
  description TEXT
  desired_outcome TEXT
  target_authority_id UUID FK -> representatives
  escalation_level ENUM('ward', 'mla', 'mp', 'city', 'state')
  status ENUM('draft', 'open', 'acknowledged', 'committed', 'in_progress', 'resolved', 'verified', 'archived')
  support_count INTEGER DEFAULT 0
  support_goal INTEGER
  evidence_package_json JSONB
  economic_impact_estimate DECIMAL
  pattern_id UUID FK -> detected_patterns (nullable)
  created_at TIMESTAMPTZ
  acknowledged_at TIMESTAMPTZ
  resolved_at TIMESTAMPTZ
  verified_at TIMESTAMPTZ

-- Support/endorsement tracking
action_supporters
  id UUID PK
  action_id UUID FK -> community_actions
  user_id UUID FK -> users
  civic_score_at_time INTEGER
  ward_verified BOOLEAN
  created_at TIMESTAMPTZ
  UNIQUE(action_id, user_id)

-- Evidence links
action_evidence
  id UUID PK
  action_id UUID FK -> community_actions
  issue_id UUID FK -> issues
  linked_by UUID FK -> users
  auto_linked BOOLEAN DEFAULT false
  created_at TIMESTAMPTZ

-- Stakeholder responses
action_responses
  id UUID PK
  action_id UUID FK -> community_actions
  responder_id UUID FK -> users
  response_type ENUM('acknowledge', 'respond', 'commit', 'reject', 'update', 'resolve')
  content TEXT
  timeline_date DATE
  created_at TIMESTAMPTZ

-- Escalation log
action_escalations
  id UUID PK
  action_id UUID FK -> community_actions
  from_level ENUM('ward', 'mla', 'mp', 'city', 'state')
  to_level ENUM('mla', 'mp', 'city', 'state', 'public')
  reason ENUM('no_response_7d', 'no_response_14d', 'rejection_appealed', 'manual')
  notified_authority_id UUID FK -> representatives
  created_at TIMESTAMPTZ

-- Resolution verification
action_verifications
  id UUID PK
  action_id UUID FK -> community_actions
  verifier_id UUID FK -> users
  civic_score_at_time INTEGER
  photo_evidence_urls TEXT[]
  verified BOOLEAN
  created_at TIMESTAMPTZ
```

### A.4 Published Events

```
action.created          -> Notification, Search, Analytics, Feed
action.supported        -> Notification (creator), Analytics, Reputation
action.milestone_hit    -> Notification (all supporters), Analytics
action.stakeholder_notified -> Notification (stakeholder), Analytics, CHI
action.acknowledged     -> Notification (all supporters), Rating
action.committed        -> Notification (all supporters), Promise Tracker
action.resolved         -> Notification, CHI, Rating, Reputation, Analytics
action.verified         -> CHI, Rating, Reputation, CIV Token
action.escalated        -> Notification (next authority), Analytics
action.archived         -> Search, Analytics
```

### A.5 Consumed Events

```
pattern.detected        -> Auto-generate action draft, prompt creator
issue.reported          -> Check for pattern match, update evidence counts
issue.citizen_verified  -> Update linked action evidence
chi.recomputed          -> Update ward context in active actions
reputation.updated      -> Recalculate credibility-weighted support counts
```

### A.6 Key Endpoints

```
POST   /actions                     -- Create new community action
GET    /actions/:id                 -- Get action with evidence package
GET    /actions/ward/:ward_id       -- List actions in a ward
POST   /actions/:id/support         -- Endorse an action (ward-verified)
DELETE /actions/:id/support         -- Withdraw endorsement
POST   /actions/:id/evidence        -- Link an incident to an action
POST   /actions/:id/respond         -- Stakeholder response (auth: representative)
GET    /actions/:id/timeline        -- Full timeline (citizen + stakeholder sides)
POST   /actions/:id/verify          -- Community verification of resolution
GET    /actions/:id/evidence-package -- Generated PDF/JSON evidence summary
GET    /actions/trending            -- Trending actions across wards
```

### A.7 Anti-Overlap Guardrails

**Report Flow (Signal Layer):**
- Fact-based prompts: "What did you observe?"
- AI scans for broad language ("always," "demand," "government should")
- If detected -> nudge: "This sounds like broader change. Start a Community Action?"
- Avoids vocabulary: "support," "petition," "demand," "change," "rally"

**Community Action Flow (Power Layer):**
- Outcome-based prompts: "What change do you want to see?"
- AI scans for single-event language ("today," "just saw," "one pothole")
- If detected -> nudge: "This sounds like a specific incident. Report it instead?"
- **Minimum evidence:** 3+ linked incidents OR 1 system-detected pattern
- **Minimum civic score:** >= 5 to create (prevents spam from day-1 accounts)
- **Cooling period:** Max 2 new actions per user per month

### A.8 9-Stage Lifecycle

```
1. INITIATION      -> User creates or responds to pattern prompt
2. EVIDENCE        -> System auto-aggregates linked incidents + economic data
3. PUBLICATION     -> Visible to ward residents, enters feed
4. SUPPORT (Tier 1)-> Endorse, share, comment, link more incidents
5. MOMENTUM (Tier 2)-> Dynamic goals (50->100->250->500), milestone notifications
6. STAKEHOLDER     -> Auto-notification at threshold (100 or 10% of ward)
7. RESPONSE (Tier 3)-> Acknowledge / Respond / Commit / Reject (public, timestamped)
8. PROGRESS        -> Status tracked: Open -> Acknowledged -> Committed -> In Progress -> Resolved
9. OUTCOME         -> Verified by 3+ community members, before/after evidence, CHI impact
```

### A.9 Escalation Ladder

| Trigger | Action |
|---------|--------|
| 7 days, no stakeholder response | Notify next-level authority (MLA/MP) |
| 14 days, no response from anyone | Flag in CHI score + public "No Response" badge on leader profile |
| 30 days, pattern persists | Escalate to city-level dashboard + media alert template provided |
| Stakeholder rejects without reason | Rejection appeal mechanism -> independent review |

### A.10 Anti-Gaming Measures

- One endorsement per resident per action (de-duplicated by phone + Aadhaar)
- Ward residency verification required to endorse
- No promoted actions -- visibility by evidence weight only
- Credibility weighting: higher civic-score endorsements carry more weight
- Abuse detection: rapid-fire endorsements from same IP/device flagged
- Evidence decay: no new incidents linked for 30 days -> deprioritized
- Max 5 active actions per ward (prevents petition fatigue)
- Actions with <10 supporters in 14 days -> auto-archived

### A.11 Economic Impact Integration

Each Community Action auto-calculates using civic-economic-impact-models:

```
Cost of inaction:    Rs 45.9L (47 potholes x 3,000 commuters x 6min delay x 90 days)
Cost of resolution:  Rs 4.2L (pipe replacement estimate)
ROI ratio:           10.9:1 ("Every Rs 1 spent saves Rs 10.9")
Comparative:         "Ward 44 fixed this for Rs 3.8L in 12 days"
```

This data is included in every stakeholder notification. Emotional appeals become fiscal arguments.

### A.12 Scaling Strategy

- Partitioned by ward_id (same as Issue Reporting)
- Support counts cached in Redis sorted sets (real-time leaderboard)
- Evidence packages pre-computed on support milestone hits
- Stakeholder notification queue via Kafka with retry policy
- Historical actions in TimescaleDB for trend analysis

---

## PART B — Service 23: Pattern Detection Engine

**Addendum to:** Part 8 (AI/ML Pipeline Architecture) — adds Pipeline 07 to the existing 6 pipelines.

### B.1 Service Identity

**Service Name:** Pattern Detection Engine (Pipeline 07)
**Responsibility:** Continuously analyzes the stream of incident reports to detect geographic, temporal, categorical, and semantic clusters. When pattern confidence reaches threshold, generates evidence packages and prompts Community Action creation.

### B.2 Four Clustering Algorithms

```
1. CATEGORY CLUSTERING
   Input:  issue.reported events
   Logic:  5+ reports of same AI-classified category in same ward within 7 days
   Output: pattern.emerging -> pattern.confirmed at 10+

2. GEOGRAPHIC CLUSTERING
   Input:  issue.reported events with GPS coordinates
   Logic:  3+ reports within 500m radius within 14 days (PostGIS ST_DWithin)
   Output: pattern.geographic_cluster with centroid and radius

3. TEMPORAL SPIKE DETECTION
   Input:  issue.reported event rate per category per ward
   Logic:  3x normal rate (baseline: 30-day rolling average) triggers alert
   Output: pattern.spike with category, magnitude, duration

4. SEMANTIC CLUSTERING (NLP)
   Input:  issue descriptions (multilingual, via Pipeline 02 Sentiment Engine)
   Logic:  Sentence embeddings -> cosine similarity > 0.75 across reports
   Output: pattern.semantic_cluster with representative description
```

### B.3 Confidence Levels

| Level | Threshold | System Action |
|-------|-----------|---------------|
| **Emerging** | 3-4 similar reports, 7 days | Subtle indicator on issue cards: "2 similar reports nearby" |
| **Confirmed** | 5-9 reports, 14 days | Dashboard prompt: "Pattern detected -- Start Community Action?" |
| **Critical** | 10+ reports OR 3x spike | Auto-draft Community Action + push to ward residents |
| **Systemic** | Pattern persists 30+ days, 0 resolution | City-level escalation + media template + CHI alert |

### B.4 Auto-Generated Evidence Package

When confidence >= Confirmed, system generates:

```json
{
  "pattern_id": "uuid",
  "category": "water_supply",
  "ward": "Ward 45 -- Andheri East",
  "report_count": 12,
  "unique_locations": 8,
  "date_range": "2026-02-25 -> 2026-03-20",
  "days_unresolved": 23,
  "resolution_count": 0,
  "heat_map_geojson": {},
  "timeline_data": [],
  "representative_photos": ["s3://..."],
  "economic_impact": {
    "total_estimate": 1820000,
    "currency": "INR",
    "methodology": "civic-economic-impact-models/water_leak",
    "per_day_loss": 20222
  },
  "comparison": {
    "neighbor_ward": "Ward 44 -- Jogeshwari",
    "their_resolution_time_days": 12,
    "their_cost": 380000
  },
  "ai_summary": "12 water supply failures reported across 8 locations in Ward 45 over the past 23 days. Zero have been resolved. Estimated economic damage: Rs 18.2 lakh. Neighboring Ward 44 resolved a similar pattern in 12 days for Rs 3.8 lakh."
}
```

### B.5 Owned Tables

```sql
detected_patterns
  id UUID PK
  ward_id UUID FK -> boundaries
  category VARCHAR(50)
  cluster_type ENUM('category', 'geographic', 'temporal', 'semantic')
  confidence ENUM('emerging', 'confirmed', 'critical', 'systemic')
  report_count INTEGER
  unique_locations INTEGER
  centroid_lat DECIMAL
  centroid_lng DECIMAL
  radius_meters INTEGER
  first_report_at TIMESTAMPTZ
  last_report_at TIMESTAMPTZ
  days_unresolved INTEGER
  economic_impact DECIMAL
  evidence_package_json JSONB
  community_action_id UUID FK -> community_actions (nullable)
  status ENUM('active', 'action_created', 'resolved', 'expired')
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ

pattern_reports
  id UUID PK
  pattern_id UUID FK -> detected_patterns
  issue_id UUID FK -> issues
  similarity_score DECIMAL
  created_at TIMESTAMPTZ
```

### B.6 Published Events

```
pattern.emerging        -> Dashboard (subtle indicator on issue cards)
pattern.confirmed       -> Dashboard (prompt card), Notification
pattern.critical        -> Dashboard (auto-draft action), Notification (push to ward)
pattern.systemic        -> CHI Engine, Admin Dashboard, Analytics
pattern.resolved        -> CHI Engine, Analytics
```

### B.7 Computation Schedule

- **Real-time:** Category and geographic clustering run on every issue.reported event (Kafka consumer)
- **Batch (hourly):** Temporal spike detection (compares current rate to 30-day baseline)
- **Batch (daily):** Semantic clustering (NLP embedding computation, cosine similarity matrix)
- **Continuous:** Evidence package regeneration when new reports join an active pattern

---

## PART C — Ward Mood: Citizen-Facing Sentiment Dashboard

**Addendum to:** Part 11 (Real-Time Dashboards & Analytics) and Service 9 (AI Sentiment & Trends).

### C.1 What Changed

Service 9 (Sentiment Engine) existed in the original architecture as a backend AI pipeline. This addendum promotes sentiment analysis to a **first-class citizen-facing feature** -- the "Ward Mood" gauge visible on every citizen's dashboard.

### C.2 Ward Mood Feature Specification

**Components:**

1. **Sentiment Arc Gauge** -- SVG semicircular arc, gradient red->amber->green, needle indicates current sentiment
2. **Topic Breakdown** -- Top 4 topics by sentiment volume, color-coded bars
3. **7-Day Trend Sparkline** -- Mini line chart with percentage change badge

**Data Sources:** Citizen report descriptions, comments, voice posts, poll responses

### C.3 Computation

```
ward_mood_score = weighted_average(
  report_sentiment_scores,
  comment_sentiment_scores,
  voice_sentiment_scores,
  resolution_satisfaction_scores
)
```

**Refresh rate:** Every 6 hours. Real-time updates on spike detection.
**Caching:** Redis with 5-minute TTL.

---

## PART D — Dashboard Redesign Specification

### D.1 Complete Dashboard Section Order (Top to Bottom)

```
 1. Status Bar (system)
 2. Header -- Civic Shield + Greeting + Streak + Search + Notifications
 3. Tagline -- "Democracy. You Shape." (animated reveal)
 4. Weather-Aware Contextual Tip (conditional)
 5. Connectivity Banner (conditional -- offline only)
 6. Civic Score Ring -- Animated SVG arc + 5 breakdown chips
 7. Ward Officer Card -- Photo + name + designation + response rate + Message/Rate
 8. Ward Dashboard -- Animated donut chart + stat list + sparkline
 9. Ward Mood -- Sentiment arc gauge + topic breakdown + trend
10. Community Pulse Bar -- Avatar stack + active citizen count
11. Pattern Detection Banner (conditional)
12. Ward Comparison Nudge
13. Quick Actions Carousel
14. Community Actions Scroll
15. Resolution Celebration Banner (conditional)
16. Live Issue Feed
17. FAB (floating) -- 5 radial options
18. Bottom Navigation -- Home, Report, Leaders, Map, Trending
```

### D.2 Custom SVG Icon System -- "Civitro Icons"

28+ custom SVGs: Stroke 2px round cap, 24x24px grid, single-tone with optional accent fill.

### D.3 Animation System

- 6 entry animations (header fade-down, score ring draw-on, donut grow, card slide-up)
- 6 interaction animations (card press scale, tab morph, FAB radial expand, ripple)
- 4 ambient animations (notification breathe, FAB breathe, ward pulse sonar, shimmer)
- `prefers-reduced-motion` kills all ambient animations

### D.4 Design Tokens

- 24 color tokens, Inter + JetBrains Mono typography
- Spacing: 20px horizontal, 12px card gap, 24px section gap
- Radius: 10px/16px/24px/50%, Shadows: sm/md/lg/fab
- Full dark mode via CSS variable override

---

## PART E — Brand Identity

**Official Tagline:** Democracy. You Shape.

**Rendering:** "Democracy" + oversized saffron dot + "You Shape" + superscript TM

**Placement:** Dashboard (animated reveal), website title/OG meta/footer, app mockup

---

## PART F — Updated Service Dependency Map

```
Service 5 (Issue Reporting)
    | issue.reported
Service 23 (Pattern Detection) <- Service 9 (Sentiment) <- Service 8 (AI Classification)
    | pattern.confirmed
Service 22 (Community Action)
    | action.stakeholder_notified        | action.resolved
Service 17 (Notification)          Service 11 (CHI Engine)
    |                                    |
Service 7 (Rating)              Service 12 (Reputation)
    |
Service 21 (CIV Token)
```

**Complete event flow:**
```
Citizen reports issue -> AI classifies -> Pattern Detection clusters ->
Threshold hit -> Dashboard prompt -> Community Action created ->
Evidence auto-linked + economic impact calculated ->
Community endorses (ward-verified) -> Stakeholder notified ->
If no response 7d -> escalate to MLA/MP ->
If no response 14d -> CHI penalty + public badge ->
Stakeholder responds (immutable, timestamped) ->
Resolution verified (stakeholder + 3 community members) ->
CHI updated -> Leader rating updated ->
CIV tokens distributed -> Civic scores updated ->
Celebration banner displayed -> Ward Mood improves -> Streak incremented
```

---

*This addendum extends the Civitro architecture from 20 services to 23, adds Pipeline 07 (Pattern Detection), introduces the Power Layer (Community Action), promotes Sentiment Analysis to a citizen-facing feature (Ward Mood), and documents the complete dashboard redesign.*

*Democracy. You Shape.*
