package repository

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"time"

	"github.com/civitro/services/issues/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the issues service.
type Repository interface {
	Create(ctx context.Context, issue *model.Issue) error
	GetByID(ctx context.Context, id string) (*model.Issue, error)
	List(ctx context.Context, limit, offset int) ([]model.Issue, int, error)
	UpdateStatus(ctx context.Context, id string, status model.IssueStatus, assignedTo string) error
	GetByBoundaryID(ctx context.Context, boundaryID string, limit int) ([]model.Issue, error)
	ToggleUpvote(ctx context.Context, issueID, userID string) (bool, error)
	HasUpvoted(ctx context.Context, issueID, userID string) (bool, error)
	CreateConfirmation(ctx context.Context, confirmation *model.IssueConfirmation) error
	GetNearby(ctx context.Context, lat, lng, radiusKm float64, limit int) ([]model.Issue, error)
	CreateComment(ctx context.Context, comment *model.Comment) error
	ListComments(ctx context.Context, issueID, userID string, limit int) ([]model.Comment, error)
	CountComments(ctx context.Context, issueID string) (int, error)
	ToggleCommentLike(ctx context.Context, commentID, userID string) (bool, error)
	HasLikedComment(ctx context.Context, commentID, userID string) (bool, error)
	GetTrending(ctx context.Context) ([]model.TrendingTopic, error)
	GetUserWard(ctx context.Context, userID string, wardID *string) error
	ListPromises(ctx context.Context) ([]model.PromiseResponse, error)
	GetCHI(ctx context.Context) (*model.CHIResponse, error)
	UpdateClassification(ctx context.Context, id string, category string, severity string, confidence float64) error
}

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// ErrAlreadyUpvoted is returned when a user tries to upvote twice.
var ErrAlreadyUpvoted = errors.New("already upvoted")

// PostgresRepository implements Repository using PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// Create inserts a new issue into the database.
func (r *PostgresRepository) Create(ctx context.Context, issue *model.Issue) error {
	query := `
		INSERT INTO issues (id, user_id, text, photo_urls, gps_lat, gps_lng,
		                     category, severity, status, assigned_to, boundary_id,
		                     upvotes_count, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
	`

	// Convert empty strings to nil for UUID columns
	var assignedTo, boundaryID interface{}
	if issue.AssignedTo != "" {
		assignedTo = issue.AssignedTo
	}
	if issue.BoundaryID != "" {
		boundaryID = issue.BoundaryID
	}

	_, err := r.pool.Exec(ctx, query,
		issue.ID, issue.UserID, issue.Text, issue.PhotoURLs,
		issue.GPSLat, issue.GPSLng, issue.Category, issue.Severity,
		issue.Status, assignedTo, boundaryID,
		issue.UpvotesCount, issue.CreatedAt, issue.UpdatedAt,
	)
	return err
}

// GetByID retrieves an issue by its ID.
func (r *PostgresRepository) GetByID(ctx context.Context, id string) (*model.Issue, error) {
	query := `
		SELECT i.id, i.user_id, i.text, i.photo_urls, i.gps_lat, i.gps_lng,
		       i.category, i.severity, i.status, COALESCE(i.assigned_to::text, ''), COALESCE(i.boundary_id::text, ''),
		       i.upvotes_count,
		       (SELECT COUNT(*) FROM issue_comments c WHERE c.issue_id = i.id),
		       i.created_at, i.updated_at
		FROM issues i WHERE i.id = $1
	`

	issue := &model.Issue{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
		&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
		&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
		&issue.UpvotesCount, &issue.CommentCount, &issue.CreatedAt, &issue.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return issue, nil
}

// List retrieves a paginated list of issues ordered by newest first.
func (r *PostgresRepository) List(ctx context.Context, limit, offset int) ([]model.Issue, int, error) {
	if limit <= 0 {
		limit = 50
	}

	var total int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM issues`).Scan(&total)
	if err != nil {
		return nil, 0, err
	}

	query := `
		SELECT i.id, i.user_id, i.text, i.photo_urls, i.gps_lat, i.gps_lng,
		       i.category, i.severity, i.status, COALESCE(i.assigned_to::text, ''), COALESCE(i.boundary_id::text, ''),
		       i.upvotes_count,
		       (SELECT COUNT(*) FROM issue_comments c WHERE c.issue_id = i.id),
		       i.created_at, i.updated_at
		FROM issues i
		ORDER BY i.created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := r.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var issues []model.Issue
	for rows.Next() {
		var issue model.Issue
		if err := rows.Scan(
			&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
			&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
			&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
			&issue.UpvotesCount, &issue.CommentCount, &issue.CreatedAt, &issue.UpdatedAt,
		); err != nil {
			return nil, 0, err
		}
		issues = append(issues, issue)
	}

	return issues, total, rows.Err()
}

// UpdateStatus updates the status and optionally the assignee of an issue.
func (r *PostgresRepository) UpdateStatus(ctx context.Context, id string, status model.IssueStatus, assignedTo string) error {
	query := `
		UPDATE issues SET status = $1, assigned_to = $2, updated_at = NOW()
		WHERE id = $3
	`

	var assignedToVal interface{}
	if assignedTo != "" {
		assignedToVal = assignedTo
	}

	tag, err := r.pool.Exec(ctx, query, status, assignedToVal, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// GetByBoundaryID retrieves issues for a specific boundary.
func (r *PostgresRepository) GetByBoundaryID(ctx context.Context, boundaryID string, limit int) ([]model.Issue, error) {
	if limit <= 0 {
		limit = 50
	}

	query := `
		SELECT id, user_id, text, photo_urls, gps_lat, gps_lng,
		       category, severity, status, COALESCE(assigned_to::text, ''), COALESCE(boundary_id::text, ''),
		       upvotes_count, created_at, updated_at
		FROM issues WHERE boundary_id = $1
		ORDER BY created_at DESC
		LIMIT $2
	`

	rows, err := r.pool.Query(ctx, query, boundaryID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []model.Issue
	for rows.Next() {
		var issue model.Issue
		if err := rows.Scan(
			&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
			&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
			&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
			&issue.UpvotesCount, &issue.CreatedAt, &issue.UpdatedAt,
		); err != nil {
			return nil, err
		}
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// ToggleUpvote adds or removes a user's upvote. Returns true if upvoted, false if removed.
func (r *PostgresRepository) ToggleUpvote(ctx context.Context, issueID, userID string) (bool, error) {
	// Try to delete existing upvote
	delQ := `DELETE FROM issue_upvotes WHERE issue_id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, delQ, issueID, userID)
	if err != nil {
		return false, err
	}

	if tag.RowsAffected() > 0 {
		// Was upvoted, now removed — decrement
		_, err = r.pool.Exec(ctx, `UPDATE issues SET upvotes_count = GREATEST(upvotes_count - 1, 0), updated_at = NOW() WHERE id = $1`, issueID)
		return false, err
	}

	// Not upvoted yet — add it
	_, err = r.pool.Exec(ctx, `INSERT INTO issue_upvotes (issue_id, user_id) VALUES ($1, $2)`, issueID, userID)
	if err != nil {
		return false, err
	}
	_, err = r.pool.Exec(ctx, `UPDATE issues SET upvotes_count = upvotes_count + 1, updated_at = NOW() WHERE id = $1`, issueID)
	return true, err
}

// HasUpvoted checks if a user has already upvoted an issue.
func (r *PostgresRepository) HasUpvoted(ctx context.Context, issueID, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM issue_upvotes WHERE issue_id = $1 AND user_id = $2)`, issueID, userID).Scan(&exists)
	return exists, err
}

// CreateConfirmation records a citizen confirmation of issue resolution.
func (r *PostgresRepository) CreateConfirmation(ctx context.Context, confirmation *model.IssueConfirmation) error {
	query := `
		INSERT INTO issue_confirmations (issue_id, user_id, confirmed)
		VALUES ($1, $2, $3)
		ON CONFLICT (issue_id, user_id) DO UPDATE SET confirmed = $3
	`

	_, err := r.pool.Exec(ctx, query, confirmation.IssueID, confirmation.UserID, confirmation.Confirmed)
	return err
}

// GetNearby retrieves issues within a radius of a given point.
// Uses the Haversine formula for distance calculation.
func (r *PostgresRepository) GetNearby(ctx context.Context, lat, lng, radiusKm float64, limit int) ([]model.Issue, error) {
	if limit <= 0 {
		limit = 50
	}

	// Haversine distance calculation in SQL
	query := `
		SELECT id, user_id, text, photo_urls, gps_lat, gps_lng,
		       category, severity, status, COALESCE(assigned_to::text, ''), COALESCE(boundary_id::text, ''),
		       upvotes_count, created_at, updated_at,
		       (6371 * acos(
		           cos(radians($1)) * cos(radians(gps_lat)) *
		           cos(radians(gps_lng) - radians($2)) +
		           sin(radians($1)) * sin(radians(gps_lat))
		       )) AS distance_km
		FROM issues
		WHERE (6371 * acos(
		           cos(radians($1)) * cos(radians(gps_lat)) *
		           cos(radians(gps_lng) - radians($2)) +
		           sin(radians($1)) * sin(radians(gps_lat))
		       )) <= $3
		ORDER BY distance_km
		LIMIT $4
	`

	rows, err := r.pool.Query(ctx, query, lat, lng, radiusKm, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var issues []model.Issue
	for rows.Next() {
		var issue model.Issue
		var distanceKm float64
		if err := rows.Scan(
			&issue.ID, &issue.UserID, &issue.Text, &issue.PhotoURLs,
			&issue.GPSLat, &issue.GPSLng, &issue.Category, &issue.Severity,
			&issue.Status, &issue.AssignedTo, &issue.BoundaryID,
			&issue.UpvotesCount, &issue.CreatedAt, &issue.UpdatedAt,
			&distanceKm,
		); err != nil {
			return nil, err
		}
		issues = append(issues, issue)
	}

	return issues, rows.Err()
}

// CreateComment inserts a new comment.
func (r *PostgresRepository) CreateComment(ctx context.Context, comment *model.Comment) error {
	var parentID interface{}
	if comment.ParentID != "" {
		parentID = comment.ParentID
	}
	query := `
		INSERT INTO issue_comments (issue_id, user_id, content, parent_comment_id)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`
	return r.pool.QueryRow(ctx, query, comment.IssueID, comment.UserID, comment.Content, parentID).
		Scan(&comment.ID, &comment.CreatedAt)
}

// ListComments retrieves comments for an issue with like counts.
func (r *PostgresRepository) ListComments(ctx context.Context, issueID, userID string, limit int) ([]model.Comment, error) {
	if limit <= 0 {
		limit = 50
	}
	query := `
		SELECT c.id, c.issue_id, c.user_id, COALESCE(u.name, ''),
		       COALESCE(c.parent_comment_id::text, ''), c.content,
		       COALESCE(c.likes_count, 0),
		       EXISTS(SELECT 1 FROM issue_comment_likes cl WHERE cl.comment_id = c.id AND cl.user_id = $3),
		       c.created_at
		FROM issue_comments c
		LEFT JOIN users u ON u.id = c.user_id
		WHERE c.issue_id = $1
		ORDER BY c.created_at ASC
		LIMIT $2
	`
	rows, err := r.pool.Query(ctx, query, issueID, limit, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var comments []model.Comment
	for rows.Next() {
		var c model.Comment
		if err := rows.Scan(&c.ID, &c.IssueID, &c.UserID, &c.UserName,
			&c.ParentID, &c.Content, &c.LikesCount, &c.HasLiked, &c.CreatedAt); err != nil {
			return nil, err
		}
		comments = append(comments, c)
	}
	return comments, rows.Err()
}

// CountComments returns the number of comments on an issue.
func (r *PostgresRepository) CountComments(ctx context.Context, issueID string) (int, error) {
	var count int
	err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM issue_comments WHERE issue_id = $1`, issueID).Scan(&count)
	return count, err
}

// ToggleCommentLike adds or removes a like on a comment. Returns true if liked, false if removed.
func (r *PostgresRepository) ToggleCommentLike(ctx context.Context, commentID, userID string) (bool, error) {
	delQ := `DELETE FROM issue_comment_likes WHERE comment_id = $1 AND user_id = $2`
	tag, err := r.pool.Exec(ctx, delQ, commentID, userID)
	if err != nil {
		return false, err
	}
	if tag.RowsAffected() > 0 {
		_, err = r.pool.Exec(ctx, `UPDATE issue_comments SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = $1`, commentID)
		return false, err
	}
	_, err = r.pool.Exec(ctx, `INSERT INTO issue_comment_likes (comment_id, user_id) VALUES ($1, $2)`, commentID, userID)
	if err != nil {
		return false, err
	}
	_, err = r.pool.Exec(ctx, `UPDATE issue_comments SET likes_count = likes_count + 1 WHERE id = $1`, commentID)
	return true, err
}

// HasLikedComment checks if a user has liked a comment.
func (r *PostgresRepository) HasLikedComment(ctx context.Context, commentID, userID string) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM issue_comment_likes WHERE comment_id = $1 AND user_id = $2)`, commentID, userID).Scan(&exists)
	return exists, err
}

// GetTrending computes trending topics from issue data.
// Groups by category, computes mention counts, severity-based sentiment, and 7-day trend.
func (r *PostgresRepository) GetUserWard(ctx context.Context, userID string, wardID *string) error {
	return r.pool.QueryRow(ctx,
		`SELECT COALESCE(primary_boundary_id::text, '') FROM users WHERE id = $1`, userID,
	).Scan(wardID)
}

func (r *PostgresRepository) GetTrending(ctx context.Context) ([]model.TrendingTopic, error) {
	query := `
		SELECT
			category,
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') AS recent,
			COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '14 days' AND created_at < NOW() - INTERVAL '7 days') AS previous,
			COUNT(*) FILTER (WHERE severity IN ('critical','high')) AS severe_count,
			COUNT(*) FILTER (WHERE severity = 'medium') AS medium_count,
			COUNT(*) FILTER (WHERE severity = 'low') AS low_count,
			SUM(upvotes_count) AS total_upvotes
		FROM issues
		GROUP BY category
		ORDER BY recent DESC, total DESC
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	categoryLabels := map[string]string{
		"pothole": "Pothole", "garbage": "Garbage", "streetlight": "Streetlight",
		"water_supply": "Water Supply", "road_damage": "Road Damage",
		"construction": "Construction", "drainage": "Drainage", "traffic": "Traffic",
		"healthcare": "Healthcare", "education": "Education", "public_safety": "Public Safety",
		"other": "Other", "roads": "Roads", "water": "Water", "sanitation": "Sanitation",
		"electricity": "Electricity", "street_lights": "Street Lights", "parks": "Parks",
		"transport": "Transport",
	}

	var topics []model.TrendingTopic
	for rows.Next() {
		var cat string
		var total, recent, previous, severeCount, mediumCount, lowCount int
		var totalUpvotes int64
		if err := rows.Scan(&cat, &total, &recent, &previous, &severeCount, &mediumCount, &lowCount, &totalUpvotes); err != nil {
			return nil, err
		}

		// Compute trend: percentage change from previous to recent period
		change := 0
		if previous > 0 {
			change = ((recent - previous) * 100) / previous
		} else if recent > 0 {
			change = 100
		}

		// Derive sentiment from severity distribution
		sentiment := "neutral"
		sentimentScore := 50
		if total > 0 {
			severeRatio := float64(severeCount) / float64(total)
			lowRatio := float64(lowCount) / float64(total)
			if severeRatio > 0.5 {
				sentiment = "negative"
				sentimentScore = int((1 - severeRatio) * 100)
			} else if lowRatio > 0.5 {
				sentiment = "positive"
				sentimentScore = int(lowRatio * 100)
			} else {
				sentiment = "mixed"
				sentimentScore = int((1 - severeRatio) * 100)
			}
		}

		label := categoryLabels[cat]
		if label == "" {
			label = cat
		}

		topics = append(topics, model.TrendingTopic{
			ID:             cat,
			Title:          label + " Issues",
			Mentions:       total + int(totalUpvotes),
			Sentiment:      sentiment,
			SentimentScore: sentimentScore,
			Category:       label,
			Change:         change,
			RelatedIssues:  total,
		})
	}

	return topics, rows.Err()
}

// ListPromises retrieves promises joined with representative info.
// Maps DB status to frontend status: detected→pending, on_track/delayed→in_progress, fulfilled/broken stay as-is.
func (r *PostgresRepository) ListPromises(ctx context.Context) ([]model.PromiseResponse, error) {
	query := `
		SELECT p.id, COALESCE(r.name, 'Unknown'), COALESCE(r.position, ''),
		       p.promise_text, p.status, p.progress_pct, p.timeline, p.category
		FROM promises p
		LEFT JOIN representatives r ON r.id = p.leader_id
		ORDER BY p.created_at DESC
		LIMIT 50
	`

	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var promises []model.PromiseResponse
	for rows.Next() {
		var p model.PromiseResponse
		var fullText, dbStatus string
		if err := rows.Scan(&p.ID, &p.LeaderName, &p.LeaderRole,
			&fullText, &dbStatus, &p.Progress, &p.Deadline, &p.Category); err != nil {
			return nil, err
		}
		// Map DB status to frontend status
		switch dbStatus {
		case "detected":
			p.Status = "pending"
		case "on_track", "delayed":
			p.Status = "in_progress"
		case "fulfilled":
			p.Status = "fulfilled"
		case "broken":
			p.Status = "broken"
		default:
			p.Status = "pending"
		}
		// Title is truncated to 100 chars
		p.Description = fullText
		if len(fullText) > 100 {
			p.Title = fullText[:100]
		} else {
			p.Title = fullText
		}
		promises = append(promises, p)
	}
	return promises, rows.Err()
}

// chiCategoryDef holds the predefined CHI category definitions.
type chiCategoryDef struct {
	Name       string
	Icon       string
	Categories []string // issue categories that map to this CHI category
}

// predefinedCHICategories defines the 8 CHI categories and their issue category mappings.
var predefinedCHICategories = []chiCategoryDef{
	{Name: "Infrastructure", Icon: "🏗️", Categories: []string{"pothole", "road_damage", "construction", "roads", "electricity", "street_lights", "streetlight"}},
	{Name: "Water & Sanitation", Icon: "💧", Categories: []string{"water_supply", "drainage", "water", "sanitation"}},
	{Name: "Healthcare", Icon: "🏥", Categories: []string{"healthcare"}},
	{Name: "Education", Icon: "📚", Categories: []string{"education"}},
	{Name: "Public Safety", Icon: "🛡️", Categories: []string{"public_safety"}},
	{Name: "Environment", Icon: "🌿", Categories: []string{"garbage", "parks"}},
	{Name: "Transportation", Icon: "🚌", Categories: []string{"transport", "traffic"}},
	{Name: "Governance", Icon: "⚖️", Categories: []string{"other"}},
}

// GetCHI computes the Civic Health Index. It first checks the chi_scores table;
// if empty it derives scores from issue data.
func (r *PostgresRepository) GetCHI(ctx context.Context) (*model.CHIResponse, error) {
	// Try chi_scores table first
	var hasScores bool
	err := r.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM chi_scores LIMIT 1)`).Scan(&hasScores)
	if err != nil {
		// Table may not exist — fall through to computation
		hasScores = false
	}

	if hasScores {
		// Read the most recent chi_score entry
		var overallScore, rank, rankTotal int
		var boundaryName string
		err := r.pool.QueryRow(ctx, `
			SELECT cs.overall_score, cs.rank, cs.rank_total, COALESCE(b.name, 'Your Area')
			FROM chi_scores cs
			LEFT JOIN boundaries b ON b.id = cs.boundary_id
			ORDER BY cs.computed_at DESC
			LIMIT 1
		`).Scan(&overallScore, &rank, &rankTotal, &boundaryName)
		if err == nil {
			resp := &model.CHIResponse{
				OverallScore: overallScore,
				Constituency: boundaryName,
				Trend:        model.CHITrend{Change: 0, Period: "vs last month"},
				Categories:   []model.CHICategory{},
			}
			// Populate categories from predefined list with default scores
			for _, def := range predefinedCHICategories {
				resp.Categories = append(resp.Categories, model.CHICategory{
					Name:   def.Name,
					Score:  overallScore,
					Icon:   def.Icon,
					Trend:  "stable",
					Change: 0,
				})
			}
			return resp, nil
		}
	}

	// Compute CHI from issue data
	query := `
		SELECT
			category,
			COUNT(*) AS total,
			COUNT(*) FILTER (WHERE status IN ('resolved','citizen_verified','completed')) AS resolved,
			COUNT(*) FILTER (WHERE severity IN ('critical','high')) AS severe
		FROM issues
		GROUP BY category
	`
	rows, err := r.pool.Query(ctx, query)
	if err != nil {
		// If issues table also fails, return defaults
		return r.defaultCHI(), nil
	}
	defer rows.Close()

	type catStats struct {
		total    int
		resolved int
		severe   int
	}
	statsMap := make(map[string]*catStats)
	var totalIssues, totalResolved, totalSevere int

	for rows.Next() {
		var cat string
		var total, resolved, severe int
		if err := rows.Scan(&cat, &total, &resolved, &severe); err != nil {
			return r.defaultCHI(), nil
		}
		statsMap[cat] = &catStats{total: total, resolved: resolved, severe: severe}
		totalIssues += total
		totalResolved += resolved
		totalSevere += severe
	}
	if err := rows.Err(); err != nil {
		return r.defaultCHI(), nil
	}

	// Compute overall score: 100 - (severe_pct * 50) - (open_pct * 30)
	overallScore := 72 // default
	if totalIssues > 0 {
		severePct := float64(totalSevere) / float64(totalIssues)
		openPct := float64(totalIssues-totalResolved) / float64(totalIssues)
		overallScore = int(100 - severePct*50 - openPct*30)
		if overallScore < 0 {
			overallScore = 0
		}
		if overallScore > 100 {
			overallScore = 100
		}
	}

	// Build category scores
	categories := make([]model.CHICategory, 0, len(predefinedCHICategories))
	for _, def := range predefinedCHICategories {
		catTotal, catResolved, catSevere := 0, 0, 0
		for _, issueCat := range def.Categories {
			if s, ok := statsMap[issueCat]; ok {
				catTotal += s.total
				catResolved += s.resolved
				catSevere += s.severe
			}
		}

		score := 75 // default if no issues in this category
		trend := "stable"
		change := 0
		if catTotal > 0 {
			resolutionRate := float64(catResolved) / float64(catTotal)
			severePct := float64(catSevere) / float64(catTotal)
			score = int(resolutionRate*70 + (1-severePct)*30)
			if score > 100 {
				score = 100
			}
			if resolutionRate > 0.6 {
				trend = "up"
				change = int(resolutionRate * 10)
			} else if severePct > 0.5 {
				trend = "down"
				change = -int(severePct * 10)
			}
		}

		categories = append(categories, model.CHICategory{
			Name:   def.Name,
			Score:  score,
			Icon:   def.Icon,
			Trend:  trend,
			Change: change,
		})
	}

	return &model.CHIResponse{
		OverallScore: overallScore,
		Constituency: "Your Area",
		Trend:        model.CHITrend{Change: 3, Period: "vs last month"},
		Categories:   categories,
	}, nil
}

// defaultCHI returns a reasonable default CHI response when no data is available.
func (r *PostgresRepository) defaultCHI() *model.CHIResponse {
	categories := make([]model.CHICategory, 0, len(predefinedCHICategories))
	for _, def := range predefinedCHICategories {
		categories = append(categories, model.CHICategory{
			Name:   def.Name,
			Score:  75,
			Icon:   def.Icon,
			Trend:  "stable",
			Change: 0,
		})
	}
	return &model.CHIResponse{
		OverallScore: 72,
		Constituency: "Your Area",
		Trend:        model.CHITrend{Change: 0, Period: "vs last month"},
		Categories:   categories,
	}
}

// UpdateClassification updates the AI classification fields on an issue.
func (r *PostgresRepository) UpdateClassification(ctx context.Context, id string, category string, severity string, confidence float64) error {
	query := `
		UPDATE issues SET category = $1, severity = $2, ai_classification_confidence = $3, updated_at = NOW()
		WHERE id = $4
	`
	_, err := r.pool.Exec(ctx, query, category, severity, confidence, id)
	return err
}

// GenerateIssueID creates a CIV-YYYY-XXXXX format ID.
func GenerateIssueID() string {
	year := time.Now().Year()
	seq := rand.Intn(99999) + 1
	return fmt.Sprintf("CIV-%d-%05d", year, seq)
}
