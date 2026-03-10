package storage

import (
	"context"
	"fmt"
	"io"
	"net/url"
	"sync"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/logger"
)

// -----------------------------------------------------------------------------
// S3/MinIO client (singleton)
// -----------------------------------------------------------------------------

var (
	s3Once   sync.Once
	s3Client *S3Client
)

// S3Client wraps the MinIO SDK client and provides high-level helpers.
type S3Client struct {
	client *minio.Client
	bucket string
}

// S3 returns the shared S3Client, creating it on first call.
func S3(ctx context.Context) (*S3Client, error) {
	var initErr error
	s3Once.Do(func() {
		c, err := newS3Client(ctx)
		if err != nil {
			initErr = err
			return
		}
		s3Client = c
	})
	if initErr != nil {
		s3Once = sync.Once{}
		return nil, initErr
	}
	return s3Client, nil
}

func newS3Client(ctx context.Context) (*S3Client, error) {
	cfg := config.Get().Storage

	if cfg.Endpoint == "" {
		return nil, fmt.Errorf("storage: endpoint is not configured")
	}

	// Parse endpoint to determine if TLS should be used.
	parsedURL, err := url.Parse(cfg.Endpoint)
	if err != nil {
		return nil, fmt.Errorf("storage: invalid endpoint URL: %w", err)
	}
	useSSL := parsedURL.Scheme == "https"
	host := parsedURL.Host
	if host == "" {
		// Endpoint was given without scheme.
		host = cfg.Endpoint
	}

	client, err := minio.New(host, &minio.Options{
		Creds:  credentials.NewStaticV4(cfg.AccessKey, cfg.SecretKey, ""),
		Secure: useSSL,
		Region: cfg.Region,
	})
	if err != nil {
		return nil, fmt.Errorf("storage: create minio client: %w", err)
	}

	// Auto-create bucket if it does not exist.
	bucket := cfg.Bucket
	if bucket == "" {
		bucket = "civitro"
	}

	exists, err := client.BucketExists(ctx, bucket)
	if err != nil {
		return nil, fmt.Errorf("storage: check bucket existence: %w", err)
	}
	if !exists {
		if err := client.MakeBucket(ctx, bucket, minio.MakeBucketOptions{
			Region: cfg.Region,
		}); err != nil {
			return nil, fmt.Errorf("storage: create bucket %q: %w", bucket, err)
		}
		logger.Info().Str("bucket", bucket).Msg("storage bucket created")
	}

	logger.Info().
		Str("endpoint", cfg.Endpoint).
		Str("bucket", bucket).
		Msg("storage client initialised")

	return &S3Client{client: client, bucket: bucket}, nil
}

// -----------------------------------------------------------------------------
// Operations
// -----------------------------------------------------------------------------

// Upload stores an object under the given key. contentType should be a MIME
// type such as "image/jpeg". objectSize of -1 means unknown (stream will be
// read until EOF).
func (s *S3Client) Upload(ctx context.Context, key string, reader io.Reader, objectSize int64, contentType string) (minio.UploadInfo, error) {
	info, err := s.client.PutObject(ctx, s.bucket, key, reader, objectSize, minio.PutObjectOptions{
		ContentType: contentType,
	})
	if err != nil {
		return minio.UploadInfo{}, fmt.Errorf("storage: upload %q: %w", key, err)
	}

	logger.Debug().
		Str("key", key).
		Int64("size", info.Size).
		Msg("object uploaded")

	return info, nil
}

// Download retrieves an object by key. The caller MUST close the returned
// *minio.Object when done.
func (s *S3Client) Download(ctx context.Context, key string) (*minio.Object, error) {
	obj, err := s.client.GetObject(ctx, s.bucket, key, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("storage: download %q: %w", key, err)
	}
	return obj, nil
}

// GetPresignedURL returns a pre-signed URL valid for the given duration. This
// URL can be shared with clients to allow temporary direct access.
func (s *S3Client) GetPresignedURL(ctx context.Context, key string, expiry time.Duration) (string, error) {
	reqParams := make(url.Values)

	presignedURL, err := s.client.PresignedGetObject(ctx, s.bucket, key, expiry, reqParams)
	if err != nil {
		return "", fmt.Errorf("storage: presign %q: %w", key, err)
	}
	return presignedURL.String(), nil
}

// Delete removes an object by key.
func (s *S3Client) Delete(ctx context.Context, key string) error {
	if err := s.client.RemoveObject(ctx, s.bucket, key, minio.RemoveObjectOptions{}); err != nil {
		return fmt.Errorf("storage: delete %q: %w", key, err)
	}
	logger.Debug().Str("key", key).Msg("object deleted")
	return nil
}

// Exists checks whether an object exists without downloading it.
func (s *S3Client) Exists(ctx context.Context, key string) (bool, error) {
	_, err := s.client.StatObject(ctx, s.bucket, key, minio.StatObjectOptions{})
	if err != nil {
		// MinIO returns an ErrorResponse with Code "NoSuchKey" when the object
		// does not exist.
		errResp := minio.ToErrorResponse(err)
		if errResp.Code == "NoSuchKey" {
			return false, nil
		}
		return false, fmt.Errorf("storage: stat %q: %w", key, err)
	}
	return true, nil
}

// Bucket returns the bucket name this client operates on.
func (s *S3Client) Bucket() string {
	return s.bucket
}

// Client returns the underlying minio.Client for advanced operations.
func (s *S3Client) Client() *minio.Client {
	return s.client
}
