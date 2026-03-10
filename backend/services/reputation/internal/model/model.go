package model

import "time"

// CivicTier represents a citizen's reputation tier based on their credibility score.
type CivicTier string

const (
	TierNewCitizen         CivicTier = "new_citizen"
	TierVerifiedReporter   CivicTier = "verified_reporter"
	TierCommunityValidator CivicTier = "community_validator"
	TierThoughtLeader      CivicTier = "thought_leader"
	TierPeoplesChampion    CivicTier = "peoples_champion"
)

// Tier thresholds (credibility score ranges):
//   new_citizen:          0 - 199
//   verified_reporter:  200 - 499
//   community_validator:500 - 749
//   thought_leader:     750 - 899
//   peoples_champion:   900+

// TierFromScore determines the civic tier based on a credibility score.
func TierFromScore(score int) CivicTier {
	switch {
	case score >= 900:
		return TierPeoplesChampion
	case score >= 750:
		return TierThoughtLeader
	case score >= 500:
		return TierCommunityValidator
	case score >= 200:
		return TierVerifiedReporter
	default:
		return TierNewCitizen
	}
}

// CivicScore represents a citizen's overall reputation on the platform.
type CivicScore struct {
	UserID          string    `json:"user_id" db:"user_id"`
	CredibilityScore int     `json:"credibility_score" db:"credibility_score"` // 0-1000
	InfluenceScore  int       `json:"influence_score" db:"influence_score"`     // 0-100
	Tier            CivicTier `json:"tier" db:"tier"`
	ReportsFiled    int       `json:"reports_filed" db:"reports_filed"`
	ReportsResolved int       `json:"reports_resolved" db:"reports_resolved"`
	AccuracyRate    float64   `json:"accuracy_rate" db:"accuracy_rate"`
	FollowersCount  int       `json:"followers_count" db:"followers_count"`
	UpdatedAt       time.Time `json:"updated_at" db:"updated_at"`
}

// ScoreEvent records a point-earning (or losing) action that affects a citizen's reputation.
type ScoreEvent struct {
	ID        string    `json:"id" db:"id"`
	UserID    string    `json:"user_id" db:"user_id"`
	EventType string    `json:"event_type" db:"event_type"`
	Points    int       `json:"points" db:"points"`
	Reason    string    `json:"reason" db:"reason"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// Common event types for score changes.
const (
	EventReportFiled     = "report_filed"
	EventReportResolved  = "report_resolved"
	EventReportAccurate  = "report_accurate"
	EventReportFalse     = "report_false"
	EventSurveyCompleted = "survey_completed"
	EventFollowerGained  = "follower_gained"
	EventVoiceUpvoted    = "voice_upvoted"
)
