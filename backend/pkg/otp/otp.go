package otp

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"time"

	"github.com/redis/go-redis/v9"
)

// Sentinel errors.
var (
	ErrInvalidOTP      = errors.New("invalid OTP")
	ErrOTPExpired      = errors.New("OTP expired or not found")
	ErrMaxAttempts     = errors.New("maximum verification attempts exceeded")
	ErrOTPRateLimited  = errors.New("too many OTP requests, try again later")
)

const (
	maxAttempts   = 5
	keyPrefix     = "otp:"
	attemptsKey   = "otp:attempts:"
	rateKey       = "otp:rate:"
)

// Generate creates a cryptographically random OTP of the given length.
func Generate(length int) (string, error) {
	if length <= 0 || length > 10 {
		return "", errors.New("OTP length must be between 1 and 10")
	}

	max := new(big.Int).Exp(big.NewInt(10), big.NewInt(int64(length)), nil)
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("generating random OTP: %w", err)
	}

	// Zero-pad to the requested length.
	format := fmt.Sprintf("%%0%dd", length)
	return fmt.Sprintf(format, n), nil
}

// Store saves a SHA256-hashed OTP in Redis with a TTL.
func Store(ctx context.Context, rdb *redis.Client, phone, otp string, ttl time.Duration) error {
	hash := hashOTP(otp)
	key := keyPrefix + phone

	pipe := rdb.Pipeline()
	pipe.Set(ctx, key, hash, ttl)
	// Reset attempts counter on new OTP.
	pipe.Del(ctx, attemptsKey+phone)
	_, err := pipe.Exec(ctx)
	if err != nil {
		return fmt.Errorf("storing OTP: %w", err)
	}
	return nil
}

// Validate checks the provided OTP against the stored hash. It enforces a
// maximum of 5 attempts; after that the OTP is revoked.
func Validate(ctx context.Context, rdb *redis.Client, phone, otp string) error {
	attKey := attemptsKey + phone

	// Check attempt count.
	attempts, err := rdb.Incr(ctx, attKey).Result()
	if err != nil {
		return fmt.Errorf("incrementing attempts: %w", err)
	}
	// Set TTL on first attempt.
	if attempts == 1 {
		rdb.Expire(ctx, attKey, 10*time.Minute)
	}

	if attempts > int64(maxAttempts) {
		// Revoke the OTP after too many attempts.
		Revoke(ctx, rdb, phone)
		return ErrMaxAttempts
	}

	// Retrieve stored hash.
	key := keyPrefix + phone
	stored, err := rdb.Get(ctx, key).Result()
	if err != nil {
		if errors.Is(err, redis.Nil) {
			return ErrOTPExpired
		}
		return fmt.Errorf("retrieving OTP: %w", err)
	}

	if stored != hashOTP(otp) {
		return ErrInvalidOTP
	}

	return nil
}

// CheckRateLimit enforces a maximum number of OTP sends per phone per hour.
func CheckRateLimit(ctx context.Context, rdb *redis.Client, phone string, maxPerHour int) error {
	key := rateKey + phone
	count, err := rdb.Incr(ctx, key).Result()
	if err != nil {
		return fmt.Errorf("rate limit check: %w", err)
	}

	if count == 1 {
		rdb.Expire(ctx, key, time.Hour)
	}

	if count > int64(maxPerHour) {
		return ErrOTPRateLimited
	}

	return nil
}

// Revoke deletes all OTP-related keys for a phone number.
func Revoke(ctx context.Context, rdb *redis.Client, phone string) error {
	keys := []string{
		keyPrefix + phone,
		attemptsKey + phone,
	}
	return rdb.Del(ctx, keys...).Err()
}

func hashOTP(otp string) string {
	h := sha256.Sum256([]byte(otp))
	return hex.EncodeToString(h[:])
}
