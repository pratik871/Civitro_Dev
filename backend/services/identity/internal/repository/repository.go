package repository

import (
	"context"
	"errors"

	"github.com/civitro/services/identity/internal/model"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Repository defines the data access interface for the identity service.
type Repository interface {
	CreateUser(ctx context.Context, user *model.User) error
	GetUserByPhone(ctx context.Context, phone string) (*model.User, error)
	GetUserByID(ctx context.Context, id string) (*model.User, error)
	UpdateVerificationLevel(ctx context.Context, userID string, level model.VerificationLevel, aadhaarHash string) error
}

// ErrNotFound is returned when a record is not found.
var ErrNotFound = errors.New("record not found")

// PostgresRepository implements Repository using PostgreSQL.
type PostgresRepository struct {
	pool *pgxpool.Pool
}

// NewPostgresRepository creates a new PostgresRepository.
func NewPostgresRepository(pool *pgxpool.Pool) *PostgresRepository {
	return &PostgresRepository{pool: pool}
}

// CreateUser inserts a new user into the database.
func (r *PostgresRepository) CreateUser(ctx context.Context, user *model.User) error {
	query := `
		INSERT INTO users (id, phone, name, email, verification_level, aadhaar_hash, device_fingerprint, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`
	_, err := r.pool.Exec(ctx, query,
		user.ID, user.Phone, user.Name, user.Email,
		user.VerificationLevel, user.AadhaarHash, user.DeviceFingerprint,
		user.CreatedAt, user.UpdatedAt,
	)
	return err
}

// GetUserByPhone retrieves a user by their phone number.
func (r *PostgresRepository) GetUserByPhone(ctx context.Context, phone string) (*model.User, error) {
	query := `
		SELECT id, phone, name, email, verification_level, aadhaar_hash, device_fingerprint, created_at, updated_at
		FROM users WHERE phone = $1
	`
	user := &model.User{}
	err := r.pool.QueryRow(ctx, query, phone).Scan(
		&user.ID, &user.Phone, &user.Name, &user.Email,
		&user.VerificationLevel, &user.AadhaarHash, &user.DeviceFingerprint,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return user, nil
}

// GetUserByID retrieves a user by their ID.
func (r *PostgresRepository) GetUserByID(ctx context.Context, id string) (*model.User, error) {
	query := `
		SELECT id, phone, name, email, verification_level, aadhaar_hash, device_fingerprint, created_at, updated_at
		FROM users WHERE id = $1
	`
	user := &model.User{}
	err := r.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Phone, &user.Name, &user.Email,
		&user.VerificationLevel, &user.AadhaarHash, &user.DeviceFingerprint,
		&user.CreatedAt, &user.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return user, nil
}

// UpdateVerificationLevel updates a user's verification level and aadhaar hash.
func (r *PostgresRepository) UpdateVerificationLevel(ctx context.Context, userID string, level model.VerificationLevel, aadhaarHash string) error {
	query := `
		UPDATE users SET verification_level = $1, aadhaar_hash = $2, updated_at = NOW()
		WHERE id = $3
	`
	tag, err := r.pool.Exec(ctx, query, level, aadhaarHash, userID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}
