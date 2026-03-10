package logger

import (
	"io"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/rs/zerolog"

	"github.com/civitro/pkg/config"
)

// -----------------------------------------------------------------------------
// Singleton
// -----------------------------------------------------------------------------

var (
	once     sync.Once
	instance *zerolog.Logger
)

// Init explicitly initialises the logger. Safe to call multiple times; only
// the first call takes effect.
func Init() {
	once.Do(func() {
		l := newLogger()
		instance = &l
	})
}

// L returns the package-level logger. It will self-initialise if Init has not
// been called yet.
func L() *zerolog.Logger {
	Init()
	return instance
}

// -----------------------------------------------------------------------------
// Constructors
// -----------------------------------------------------------------------------

func newLogger() zerolog.Logger {
	cfg := config.Get()

	level := parseLevel(cfg.Monitoring.Logging.Level)
	zerolog.SetGlobalLevel(level)

	var w io.Writer

	format := strings.ToLower(cfg.Monitoring.Logging.Format)
	if format == "pretty" || format == "text" || cfg.IsLocal() {
		// Human-readable coloured output for local development.
		w = zerolog.ConsoleWriter{
			Out:        os.Stdout,
			TimeFormat: time.RFC3339,
		}
	} else {
		// Structured JSON for production / staging.
		w = os.Stdout
	}

	return zerolog.New(w).
		With().
		Timestamp().
		Str("service", cfg.App.Name).
		Logger()
}

func parseLevel(s string) zerolog.Level {
	switch strings.ToLower(s) {
	case "trace":
		return zerolog.TraceLevel
	case "debug":
		return zerolog.DebugLevel
	case "info", "":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	case "panic":
		return zerolog.PanicLevel
	default:
		return zerolog.InfoLevel
	}
}

// -----------------------------------------------------------------------------
// Convenience short-hands
// -----------------------------------------------------------------------------

// Info starts a new info-level log event.
func Info() *zerolog.Event {
	return L().Info()
}

// Error starts a new error-level log event.
func Error() *zerolog.Event {
	return L().Error()
}

// Debug starts a new debug-level log event.
func Debug() *zerolog.Event {
	return L().Debug()
}

// Warn starts a new warn-level log event.
func Warn() *zerolog.Event {
	return L().Warn()
}

// Fatal starts a new fatal-level log event. The process will exit after the
// message is written.
func Fatal() *zerolog.Event {
	return L().Fatal()
}

// -----------------------------------------------------------------------------
// Context helpers
// -----------------------------------------------------------------------------

// WithRequestID returns a child logger that includes the given request ID.
func WithRequestID(requestID string) zerolog.Logger {
	l := L().With().Str("request_id", requestID).Logger()
	return l
}

// WithService returns a child logger that overrides the service name.
func WithService(name string) zerolog.Logger {
	l := L().With().Str("service", name).Logger()
	return l
}

// WithFields returns a child logger that includes the given key-value pairs.
func WithFields(fields map[string]interface{}) zerolog.Logger {
	ctx := L().With()
	for k, v := range fields {
		ctx = ctx.Interface(k, v)
	}
	l := ctx.Logger()
	return l
}
