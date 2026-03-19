package aadhaar

import (
	"crypto/x509"
	"embed"
	"encoding/pem"
	"errors"
	"fmt"
	"sync"
)

//go:embed certs/*.pem
var certFS embed.FS

var (
	uidaiCertPool *x509.CertPool
	certOnce      sync.Once
	certErr       error
)

// loadCertificates loads UIDAI certificates from the embedded filesystem.
// In dev mode (offline-dev provider), certificates may be missing — that's fine.
func loadCertificates() (*x509.CertPool, error) {
	certOnce.Do(func() {
		pool := x509.NewCertPool()

		files, err := certFS.ReadDir("certs")
		if err != nil {
			certErr = fmt.Errorf("reading certs dir: %w", err)
			return
		}

		loaded := 0
		for _, f := range files {
			if f.IsDir() {
				continue
			}
			data, err := certFS.ReadFile("certs/" + f.Name())
			if err != nil {
				continue
			}
			block, _ := pem.Decode(data)
			if block == nil {
				continue
			}
			cert, err := x509.ParseCertificate(block.Bytes)
			if err != nil {
				continue
			}
			pool.AddCert(cert)
			loaded++
		}

		if loaded == 0 {
			certErr = errors.New("no valid UIDAI certificates found")
			return
		}

		uidaiCertPool = pool
	})

	return uidaiCertPool, certErr
}

// verifyCertificateChain validates a signing certificate against the UIDAI
// root CA pool. Skipped in dev mode.
func verifyCertificateChain(signingCert *x509.Certificate) error {
	pool, err := loadCertificates()
	if err != nil {
		return fmt.Errorf("loading certificate pool: %w", err)
	}

	opts := x509.VerifyOptions{
		Roots: pool,
	}

	if _, err := signingCert.Verify(opts); err != nil {
		return fmt.Errorf("certificate chain verification failed: %w", err)
	}

	return nil
}
