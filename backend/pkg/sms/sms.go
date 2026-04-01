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
	case "msg91":
		return &MSG91Provider{
			authKey:    cfg.APIKey,
			templateID: cfg.TemplateID,
			senderID:   cfg.SenderID,
			client:     &http.Client{Timeout: 10 * time.Second},
		}
	case "twilio":
		return &TwilioProvider{
			accountSID: cfg.AccountSID,
			authToken:  cfg.APIKey,
			fromNumber: cfg.SenderID,
			client:     &http.Client{Timeout: 10 * time.Second},
		}
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

// MSG91Provider sends OTP via MSG91's Send OTP API (India-focused).
type MSG91Provider struct {
	authKey    string
	templateID string
	senderID   string
	client     *http.Client
}

func (p *MSG91Provider) Send(ctx context.Context, phone, message string) error {
	if p.authKey == "" {
		return fmt.Errorf("sms: MSG91 auth key not configured")
	}

	payload := fmt.Sprintf(`{"template_id":"%s","mobile":"%s","otp_length":"6","otp_expiry":"5"}`,
		p.templateID, phone)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost,
		"https://control.msg91.com/api/v5/otp", bytes.NewBufferString(payload))
	if err != nil {
		return fmt.Errorf("sms: creating MSG91 request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("authkey", p.authKey)

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("sms: MSG91 request failed: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("sms: MSG91 returned status %d", resp.StatusCode)
	}

	logger.Info().
		Str("provider", "msg91").
		Str("phone", phone).
		Int("status", resp.StatusCode).
		Msg("SMS sent via MSG91")

	return nil
}

func (p *MSG91Provider) Name() string { return "msg91" }

// TwilioProvider sends SMS via Twilio's REST API.
type TwilioProvider struct {
	accountSID string
	authToken  string
	fromNumber string
	client     *http.Client
}

func (p *TwilioProvider) Send(ctx context.Context, phone, message string) error {
	if p.accountSID == "" || p.authToken == "" {
		return fmt.Errorf("sms: Twilio credentials not configured")
	}

	endpoint := fmt.Sprintf("https://api.twilio.com/2010-04-01/Accounts/%s/Messages.json", p.accountSID)

	form := url.Values{
		"To":   {phone},
		"From": {p.fromNumber},
		"Body": {message},
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewBufferString(form.Encode()))
	if err != nil {
		return fmt.Errorf("sms: creating Twilio request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.SetBasicAuth(p.accountSID, p.authToken)

	resp, err := p.client.Do(req)
	if err != nil {
		return fmt.Errorf("sms: Twilio request failed: %w", err)
	}
	defer resp.Body.Close()
	io.Copy(io.Discard, resp.Body)

	if resp.StatusCode >= 400 {
		return fmt.Errorf("sms: Twilio returned status %d", resp.StatusCode)
	}

	logger.Info().
		Str("provider", "twilio").
		Str("phone", phone).
		Int("status", resp.StatusCode).
		Msg("SMS sent via Twilio")

	return nil
}

func (p *TwilioProvider) Name() string { return "twilio" }
