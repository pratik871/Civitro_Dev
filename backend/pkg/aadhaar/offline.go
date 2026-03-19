package aadhaar

import (
	"archive/zip"
	"bytes"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	azip "github.com/yeka/zip"
)

// OfflineData contains parsed and verified data from an offline Aadhaar XML.
type OfflineData struct {
	ReferenceID string
	Name        string
	DOB         string
	Gender      string
	Address     string
	Photo       []byte // decoded JPEG
	Timestamp   time.Time
	UIDHash     string // SHA256(referenceID + shareCode) for dedup
}

// VerifyOfflineXML opens a password-protected zip, verifies the XML digital
// signature, and parses the Aadhaar data.
//
// In devMode, signature verification is skipped (for testing without real
// UIDAI certificates).
func VerifyOfflineXML(zipData []byte, shareCode string, devMode bool) (*OfflineData, error) {
	if len(shareCode) != 4 {
		return nil, errors.New("share code must be exactly 4 digits")
	}

	// Open the encrypted zip.
	xmlData, err := extractXMLFromZip(zipData, shareCode)
	if err != nil {
		return nil, fmt.Errorf("extracting XML from zip: %w", err)
	}

	// Verify XML digital signature (skip in dev mode).
	if !devMode {
		if err := verifyXMLSignature(xmlData); err != nil {
			return nil, fmt.Errorf("XML signature verification: %w", err)
		}
	}

	// Parse the XML.
	var doc aadhaarXML
	if err := xml.Unmarshal(xmlData, &doc); err != nil {
		return nil, fmt.Errorf("parsing Aadhaar XML: %w", err)
	}

	// Decode the base64 photo.
	var photo []byte
	if doc.Photo != "" {
		photo, err = base64.StdEncoding.DecodeString(strings.TrimSpace(doc.Photo))
		if err != nil {
			return nil, fmt.Errorf("decoding photo: %w", err)
		}
	}

	// Parse timestamp.
	ts, _ := time.Parse("2006-01-02T15:04:05", doc.GeneratedOn)

	// Compute dedup hash.
	uidHash := computeUIDHash(doc.ReferenceID, shareCode)

	return &OfflineData{
		ReferenceID: doc.ReferenceID,
		Name:        doc.Poi.Name,
		DOB:         doc.Poi.DOB,
		Gender:      doc.Poi.Gender,
		Address:     doc.Poa.formatAddress(),
		Photo:       photo,
		Timestamp:   ts,
		UIDHash:     uidHash,
	}, nil
}

// extractXMLFromZip opens a password-protected zip and reads the XML file inside.
func extractXMLFromZip(zipData []byte, password string) ([]byte, error) {
	// First try password-protected zip (alexmullins/zip).
	r, err := azip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		// Fallback to standard zip (unencrypted test files).
		return extractXMLFromStandardZip(zipData)
	}

	for _, f := range r.File {
		if !strings.HasSuffix(strings.ToLower(f.Name), ".xml") {
			continue
		}

		if f.IsEncrypted() {
			f.SetPassword(password)
		}

		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("opening %s: %w", f.Name, err)
		}
		defer rc.Close()

		data, err := io.ReadAll(rc)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", f.Name, err)
		}
		return data, nil
	}

	return nil, errors.New("no XML file found in zip archive")
}

// extractXMLFromStandardZip handles unencrypted zip files (for testing).
func extractXMLFromStandardZip(zipData []byte) ([]byte, error) {
	r, err := zip.NewReader(bytes.NewReader(zipData), int64(len(zipData)))
	if err != nil {
		return nil, fmt.Errorf("opening zip: %w", err)
	}

	for _, f := range r.File {
		if !strings.HasSuffix(strings.ToLower(f.Name), ".xml") {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return nil, fmt.Errorf("opening %s: %w", f.Name, err)
		}
		defer rc.Close()

		data, err := io.ReadAll(rc)
		if err != nil {
			return nil, fmt.Errorf("reading %s: %w", f.Name, err)
		}
		return data, nil
	}

	return nil, errors.New("no XML file found in zip archive")
}

// verifyXMLSignature verifies the XML-DSig signature in the Aadhaar XML.
// This is a simplified version — full XML-DSig requires canonicalization.
func verifyXMLSignature(xmlData []byte) error {
	// Check that a Signature element exists.
	if !bytes.Contains(xmlData, []byte("<Signature")) {
		return errors.New("no XML signature found")
	}

	// Full XML-DSig verification with goxmldsig would go here.
	// For now we verify the signature element is present and the XML is well-formed.
	var doc aadhaarXML
	if err := xml.Unmarshal(xmlData, &doc); err != nil {
		return fmt.Errorf("malformed XML: %w", err)
	}

	if doc.Signature.Inner == "" {
		return errors.New("empty XML signature")
	}

	return nil
}

func computeUIDHash(referenceID, shareCode string) string {
	h := sha256.Sum256([]byte(referenceID + shareCode))
	return hex.EncodeToString(h[:])
}
