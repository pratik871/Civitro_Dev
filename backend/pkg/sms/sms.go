package sms

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/logger"
)

// Provider defines the interface for sending SMS messages.
type Provider interface {
	Send(ctx context.Context, phone, message string) error
	Name() string
}

// NewProvider creates an SMS provider based on configuration.
func NewProvider(cfg config.SMSConfig) Provider {
	switch cfg.Provider {
	case "http":
		return &HTTPProvider{
			endpoint: cfg.Endpoint,
			apiKey:   cfg.APIKey,
			senderID: cfg.SenderID,
			client:   &http.Client{Timeout: 10 * time.Second},
		}
	default:
		// "console" or unrecognized — log to stdout.
		return &ConsoleProvider{}
	}
}

// ConsoleProvider logs SMS messages using zerolog instead of sending them.
// Used for local development.
type ConsoleProvider struct{}

func (p *ConsoleProvider) Send(_ context.Context, phone, message string) error {
	logger.Info().
		Str("provider", "console").
		Str("phone", phone).
		Str("sms_body", message).
		Msg("SMS sent (console)")
	return nil
}

func (p *ConsoleProvider) Name() string { return "console" }

// HTTPProvider sends SMS via a bulk SMS HTTP API.
type HTTPProvider struct {
	endpoint string
	apiKey   string
	senderID string
	client   *http.Client
}

func (p *HTTPProvider) Send(ctx context.Context, phone, message string) error {
	if p.endpoint == "" {
		return fmt.Errorf("sms: HTTP endpoint not configured")
	}

	form := url.Values{
		"api_key":   {p.apiKey},
		"sender_id": {p.senderID},
		"phone":     {phone},
		"message":   {message},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.endpoint, bytes.NewBufferString(form.Encode()))
	if err != nil {
		return fmt.Errorf("sms: creating request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("sms: sending request: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("sms: API returned status %d", resp.StatusCode)
	}

	logger.Info().
		Str("provider", "http").
		Str("phone", phone).
		Int("status", resp.StatusCode).
		Msg("SMS sent")

	return nil
}

func (p *HTTPProvider) Name() string { return "http" }
