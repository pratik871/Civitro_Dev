package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/civitro/services/rating/internal/model"
)

// RatingRepository handles persistence for ratings and satisfaction surveys.
type RatingRepository struct {
	db *pgxpool.Pool
}

// NewRatingRepository creates a new RatingRepository.
func NewRatingRepository(db *pgxpool.Pool) *RatingRepository {
	return &RatingRepository{db: db}
}

// GetCurrentRating returns the most recently computed rating for a representative.
func (r *RatingRepository) GetCurrentRating(ctx context.Context, repID string) (*model.Rating, error) {
	query := `
		SELECT id, representative_id, computed_score, responsiveness_score,
		       resolution_speed_score, citizen_satisfaction_score, sentiment_score,
		       chi_improvement_score, sample_count, window_start, window_end, computed_at
		FROM ratings
		WHERE representative_id = $1
		ORDER BY computed_at DESC
		LIMIT 1`

	var rating model.Rating
	err := r.db.QueryRow(ctx, query, repID).Scan(
		&rating.ID, &rating.RepresentativeID, &rating.ComputedScore,
		&rating.ResponsivenessScore, &rating.ResolutionSpeedScore,
		&rating.CitizenSatisfaction, &rating.SentimentScore,
		&rating.CHIImprovementScore, &rating.SampleCount,
		&rating.WindowStart, &rating.WindowEnd, &rating.ComputedAt,
	)
	if err != nil {
		return nil, err
	}
	return &rating, nil
}

// GetRatingHistory returns all historical rating snapshots for a representative,
// ordered by computation date descending.
func (r *RatingRepository) GetRatingHistory(ctx context.Context, repID string) ([]model.Rating, error) {
	query := `
		SELECT id, representative_id, computed_score, responsiveness_score,
		       resolution_speed_score, citizen_satisfaction_score, sentiment_score,
		       chi_improvement_score, sample_count, window_start, window_end, computed_at
		FROM ratings
		WHERE representative_id = $1
		ORDER BY computed_at DESC`

	rows, err := r.db.Query(ctx, query, repID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ratings []model.Rating
	for rows.Next() {
		var rating model.Rating
		if err := rows.Scan(
			&rating.ID, &rating.RepresentativeID, &rating.ComputedScore,
			&rating.ResponsivenessScore, &rating.ResolutionSpeedScore,
			&rating.CitizenSatisfaction, &rating.SentimentScore,
			&rating.CHIImprovementScore, &rating.SampleCount,
			&rating.WindowStart, &rating.WindowEnd, &rating.ComputedAt,
		); err != nil {
			return nil, err
		}
		ratings = append(ratings, rating)
	}
	return ratings, rows.Err()
}

// CreateSurvey inserts a new satisfaction survey response.
func (r *RatingRepository) CreateSurvey(ctx context.Context, survey *model.SatisfactionSurvey) error {
	// If issue_id is empty, insert NULL
	if survey.IssueID == "" {
		query := `
			INSERT INTO satisfaction_surveys (id, user_id, representative_id, issue_id, score, feedback, created_at)
			VALUES ($1, $2, $3, NULL, $4, $5, $6)`
		_, err := r.db.Exec(ctx, query,
			survey.ID, survey.UserID, survey.RepresentativeID,
			survey.Score, survey.Feedback, survey.CreatedAt,
		)
		return err
	}

	query := `
		INSERT INTO satisfaction_surveys (id, user_id, representative_id, issue_id, score, feedback, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)`
	_, err := r.db.Exec(ctx, query,
		survey.ID, survey.UserID, survey.RepresentativeID,
		survey.IssueID, survey.Score, survey.Feedback, survey.CreatedAt,
	)
	return err
}

// GetSurveysByRepID returns all surveys for a representative within the rolling window.
func (r *RatingRepository) GetSurveysByRepID(ctx context.Context, repID string) ([]model.SatisfactionSurvey, error) {
	query := `
		SELECT id, user_id, representative_id, issue_id, score, feedback, created_at
		FROM satisfaction_surveys
		WHERE representative_id = $1
		ORDER BY created_at DESC`

	rows, err := r.db.Query(ctx, query, repID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var surveys []model.SatisfactionSurvey
	for rows.Next() {
		var s model.SatisfactionSurvey
		if err := rows.Scan(
			&s.ID, &s.UserID, &s.RepresentativeID,
			&s.IssueID, &s.Score, &s.Feedback, &s.CreatedAt,
		); err != nil {
			return nil, err
		}
		surveys = append(surveys, s)
	}
	return surveys, rows.Err()
}

// GetRankingsByBoundary returns the top-rated representatives within a boundary,
// ordered by composite score descending.
func (r *RatingRepository) GetRankingsByBoundary(ctx context.Context, boundaryID string) ([]model.Rating, error) {
	query := `
		SELECT DISTINCT ON (r.representative_id)
		       r.id, r.representative_id, r.computed_score, r.responsiveness_score,
		       r.resolution_speed_score, r.citizen_satisfaction_score, r.sentiment_score,
		       r.chi_improvement_score, r.sample_count, r.window_start, r.window_end, r.computed_at
		FROM ratings r
		INNER JOIN representatives rep ON rep.id = r.representative_id
		WHERE rep.boundary_id = $1 AND r.sample_count >= $2
		ORDER BY r.representative_id, r.computed_at DESC`

	rows, err := r.db.Query(ctx, query, boundaryID, model.MinSampleCount)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ratings []model.Rating
	for rows.Next() {
		var rating model.Rating
		if err := rows.Scan(
			&rating.ID, &rating.RepresentativeID, &rating.ComputedScore,
			&rating.ResponsivenessScore, &rating.ResolutionSpeedScore,
			&rating.CitizenSatisfaction, &rating.SentimentScore,
			&rating.CHIImprovementScore, &rating.SampleCount,
			&rating.WindowStart, &rating.WindowEnd, &rating.ComputedAt,
		); err != nil {
			return nil, err
		}
		ratings = append(ratings, rating)
	}
	return ratings, rows.Err()
}
