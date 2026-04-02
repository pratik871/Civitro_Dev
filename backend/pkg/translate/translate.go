package translate

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/civitro/pkg/logger"
)

// Client calls the Bhashini NMT translation service.
type Client struct {
	baseURL    string
	httpClient *http.Client
}

// translateRequest is the JSON body sent to the translation service.
type translateRequest struct {
	Text           string `json:"text"`
	SourceLanguage string `json:"source_language"`
	TargetLanguage string `json:"target_language"`
}

// translateResponse is the JSON body returned by the translation service.
type translateResponse struct {
	TranslatedText string  `json:"translated_text"`
	SourceLanguage string  `json:"source_language"`
	TargetLanguage string  `json:"target_language"`
	Confidence     float64 `json:"confidence"`
}

// detectRequest is the JSON body sent to the detect endpoint.
type detectRequest struct {
	Text string `json:"text"`
}

// detectResponse is the JSON body returned by the detect endpoint.
type detectResponse struct {
	Language   string  `json:"language"`
	Confidence float64 `json:"confidence"`
}

// New creates a new translation Client.
// translationHost is the Docker hostname (e.g. "translation") and port is the
// HTTP port (e.g. 8021). The base URL is built as http://<host>:<port>.
func New(translationHost string, port int) *Client {
	return &Client{
		baseURL: fmt.Sprintf("http://%s:%d", translationHost, port),
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
		},
	}
}

// NewFromConfig creates a translation Client using the services.endpoints config.
// Falls back to "translation:8021" if the endpoint is not configured.
func NewFromConfig(host string, httpPort int) *Client {
	if host == "" {
		host = "translation"
	}
	if httpPort == 0 {
		httpPort = 8021
	}
	return New(host, httpPort)
}

// Translate translates text from sourceLang to targetLang.
// Use "auto" as sourceLang for automatic language detection.
// Returns the translated text. On error, returns the original text so callers
// can degrade gracefully.
func (c *Client) Translate(ctx context.Context, text, sourceLang, targetLang string) (string, error) {
	if text == "" {
		return "", nil
	}

	reqBody := translateRequest{
		Text:           text,
		SourceLanguage: sourceLang,
		TargetLanguage: targetLang,
	}

	payload, err := json.Marshal(reqBody)
	if err != nil {
		return text, fmt.Errorf("translate: marshal request: %w", err)
	}

	url := c.baseURL + "/api/v1/translate"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return text, fmt.Errorf("translate: create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return text, fmt.Errorf("translate: http call: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return text, fmt.Errorf("translate: service returned status %d", resp.StatusCode)
	}

	var result translateResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return text, fmt.Errorf("translate: decode response: %w", err)
	}

	return result.TranslatedText, nil
}

// TranslateIfNeeded translates text to targetLang only when sourceLang differs
// from targetLang. If they match, the original text is returned immediately.
func (c *Client) TranslateIfNeeded(ctx context.Context, text, sourceLang, targetLang string) (string, error) {
	if sourceLang == targetLang {
		return text, nil
	}
	return c.Translate(ctx, text, sourceLang, targetLang)
}

// DetectLanguage detects the language of the given text by calling the
// translation service's /detect endpoint. Returns the BCP-47 language code.
func (c *Client) DetectLanguage(ctx context.Context, text string) (string, error) {
	if text == "" {
		return "en", nil
	}

	reqBody := detectRequest{Text: text}
	payload, err := json.Marshal(reqBody)
	if err != nil {
		return "en", fmt.Errorf("detect: marshal request: %w", err)
	}

	url := c.baseURL + "/api/v1/translate/detect"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return "en", fmt.Errorf("detect: create request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "en", fmt.Errorf("detect: http call: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "en", fmt.Errorf("detect: service returned status %d", resp.StatusCode)
	}

	var result detectResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "en", fmt.Errorf("detect: decode response: %w", err)
	}

	return result.Language, nil
}

// TranslateAsync fires a goroutine that translates text and calls onComplete
// with the result. Errors are logged but not propagated — the caller should
// treat translation as best-effort.
func (c *Client) TranslateAsync(text, sourceLang, targetLang string, onComplete func(translated, detectedLang string)) {
	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()

		translated, err := c.Translate(ctx, text, sourceLang, targetLang)
		if err != nil {
			logger.Warn().Err(err).Msg("async translation failed, using original text")
			translated = text
		}

		// Detect source language if it was "auto"
		detectedLang := sourceLang
		if sourceLang == "auto" {
			if detected, err := c.DetectLanguage(ctx, text); err == nil {
				detectedLang = detected
			}
		}

		if onComplete != nil {
			onComplete(translated, detectedLang)
		}
	}()
}
