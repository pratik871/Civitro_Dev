package model

import "time"

// Rating represents a computed accountability score for a representative.
// The score is a weighted composite of multiple dimensions, computed over a
// 90-day rolling window, requiring a minimum of 20 samples to be valid.
//
// Formula weights:
//   - Responsiveness:         25%
//   - Resolution Speed:       25%
//   - Citizen Satisfaction:   20%
//   - Sentiment Analysis:     15%
//   - CHI Improvement:        15%
type Rating struct {
	ID                    string    `json:"id" db:"id"`
	RepresentativeID      string    `json:"representative_id" db:"representative_id"`
	ComputedScore         float64   `json:"computed_score" db:"computed_score"` // 0-5 composite
	ResponsivenessScore   float64   `json:"responsiveness_score" db:"responsiveness_score"`
	ResolutionSpeedScore  float64   `json:"resolution_speed_score" db:"resolution_speed_score"`
	CitizenSatisfaction   float64   `json:"citizen_satisfaction_score" db:"citizen_satisfaction_score"`
	SentimentScore        float64   `json:"sentiment_score" db:"sentiment_score"`
	CHIImprovementScore   float64   `json:"chi_improvement_score" db:"chi_improvement_score"`
	SampleCount           int       `json:"sample_count" db:"sample_count"`
	WindowStart           time.Time `json:"window_start" db:"window_start"`
	WindowEnd             time.Time `json:"window_end" db:"window_end"`
	ComputedAt            time.Time `json:"computed_at" db:"computed_at"`
}

// SatisfactionSurvey is a citizen's individual rating of a representative's
// performance on a specific issue.
type SatisfactionSurvey struct {
	ID                 string    `json:"id" db:"id"`
	UserID             string    `json:"user_id" db:"user_id"`
	RepresentativeID   string    `json:"representative_id" db:"representative_id"`
	IssueID            *string   `json:"issue_id" db:"issue_id"`
	Score              int       `json:"score" db:"score"` // 1-5
	Responsiveness     int       `json:"responsiveness"`
	Transparency       int       `json:"transparency"`
	DeliveryOnPromises int       `json:"delivery_on_promises"`
	Accessibility      int       `json:"accessibility"`
	OverallImpact      int       `json:"overall_impact"`
	Feedback           string    `json:"feedback" db:"feedback"`
	CreatedAt          time.Time `json:"created_at" db:"created_at"`
}

// SubmitSurveyRequest is the payload for submitting a satisfaction survey.
type SubmitSurveyRequest struct {
	UserID             string `json:"user_id"`
	RepresentativeID   string `json:"representative_id" binding:"required"`
	IssueID            string `json:"issue_id"`
	Score              int    `json:"score" binding:"required,min=1,max=5"`
	Responsiveness     int    `json:"responsiveness"`
	Transparency       int    `json:"transparency"`
	DeliveryOnPromises int    `json:"delivery_on_promises"`
	Accessibility      int    `json:"accessibility"`
	OverallImpact      int    `json:"overall_impact"`
	Feedback           string `json:"feedback"`
}

// RatingWeights defines the formula weights for composite score calculation.
var RatingWeights = struct {
	Responsiveness float64
	Speed          float64
	Satisfaction   float64
	Sentiment      float64
	CHI            float64
}{
	Responsiveness: 0.25,
	Speed:          0.25,
	Satisfaction:   0.20,
	Sentiment:      0.15,
	CHI:            0.15,
}

// MinSampleCount is the minimum number of data points required for a valid rating.
const MinSampleCount = 20

// RollingWindowDays is the number of days for the rolling computation window.
const RollingWindowDays = 90
