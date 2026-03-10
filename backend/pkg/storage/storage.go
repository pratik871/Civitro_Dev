// Package storage provides an S3/MinIO-compatible object storage client.
//
// See s3.go for the main implementation. The singleton is initialised from
// pkg/config on first call to storage.S3(ctx).
//
// This file retains a simple local filesystem Store for use in tests or
// environments without object storage.
package storage

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
)

// LocalStore provides file storage operations on the local filesystem. This is
// useful for tests and as a fallback when S3/MinIO is not available.
type LocalStore struct {
	basePath string
}

// NewLocalStore creates a file storage store at the given base path.
func NewLocalStore(basePath string) (*LocalStore, error) {
	if err := os.MkdirAll(basePath, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage directory: %w", err)
	}
	return &LocalStore{basePath: basePath}, nil
}

// Save persists data under the given key.
func (s *LocalStore) Save(key string, r io.Reader) (string, error) {
	path := filepath.Join(s.basePath, key)
	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", err
	}

	f, err := os.Create(path)
	if err != nil {
		return "", err
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		return "", err
	}

	return path, nil
}

// Get retrieves a reader for the stored data.
func (s *LocalStore) Get(key string) (io.ReadCloser, error) {
	path := filepath.Join(s.basePath, key)
	return os.Open(path)
}

// Delete removes stored data by key.
func (s *LocalStore) Delete(key string) error {
	path := filepath.Join(s.basePath, key)
	return os.Remove(path)
}
