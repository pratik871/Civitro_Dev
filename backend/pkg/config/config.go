package config

import (
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"sync"

	"github.com/spf13/viper"
)

// -----------------------------------------------------------------------------
// Singleton
// -----------------------------------------------------------------------------

var (
	once     sync.Once
	instance *Config
)

// Get returns the singleton Config, initialising it on first call.
func Get() *Config {
	once.Do(func() {
		cfg, err := load()
		if err != nil {
			panic(fmt.Sprintf("config: failed to load configuration: %v", err))
		}
		instance = cfg
	})
	return instance
}

// Reset allows tests to force a reload on the next Get() call.
func Reset() {
	once = sync.Once{}
	instance = nil
}

// -----------------------------------------------------------------------------
// Loader
// -----------------------------------------------------------------------------

func load() (*Config, error) {
	env := os.Getenv("APP_ENV")
	if env == "" {
		env = "local"
	}

	configDir := findConfigDir()

	v := viper.New()
	v.SetConfigType("yaml")

	// 1. Load default config
	v.SetConfigName("default")
	v.AddConfigPath(configDir)
	if err := v.ReadInConfig(); err != nil {
		return nil, fmt.Errorf("reading default config: %w", err)
	}

	// 2. Overlay environment-specific config
	envViper := viper.New()
	envViper.SetConfigType("yaml")
	envViper.SetConfigName(env)
	envViper.AddConfigPath(configDir)
	if err := envViper.ReadInConfig(); err == nil {
		// Merge env-specific config on top of defaults
		if err := v.MergeConfigMap(envViper.AllSettings()); err != nil {
			return nil, fmt.Errorf("merging %s config: %w", env, err)
		}
	}
	// It is fine if the env-specific file does not exist.

	// 3. Resolve ${ENV_VAR:-default} placeholders
	settings := v.AllSettings()
	resolved := resolveEnvPlaceholders(settings)

	// Re-load resolved values into viper so Unmarshal picks them up.
	resolvedViper := viper.New()
	resolvedViper.SetConfigType("yaml")
	if err := resolvedViper.MergeConfigMap(resolved); err != nil {
		return nil, fmt.Errorf("loading resolved config: %w", err)
	}

	var cfg Config
	if err := resolvedViper.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshalling config: %w", err)
	}

	// Always keep the runtime environment value in sync.
	cfg.App.Environment = env

	return &cfg, nil
}

// findConfigDir walks up from the current working directory to locate the
// config/ directory, similar to how git searches for .git/. This allows
// services running from any subdirectory to find the project-level config.
func findConfigDir() string {
	dir, _ := os.Getwd()
	for {
		if _, err := os.Stat(filepath.Join(dir, "config")); err == nil {
			return filepath.Join(dir, "config")
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			break
		}
		dir = parent
	}
	return "config" // fallback
}

// envPattern matches ${VAR} and ${VAR:-default}.
var envPattern = regexp.MustCompile(`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-(.*?))?\}`)

func resolveEnvPlaceholders(m map[string]interface{}) map[string]interface{} {
	out := make(map[string]interface{}, len(m))
	for k, v := range m {
		out[k] = resolveValue(v)
	}
	return out
}

func resolveValue(v interface{}) interface{} {
	switch val := v.(type) {
	case string:
		return envPattern.ReplaceAllStringFunc(val, func(match string) string {
			parts := envPattern.FindStringSubmatch(match)
			if parts == nil {
				return match
			}
			envName := parts[1]
			defaultVal := parts[2]
			if envVal, ok := os.LookupEnv(envName); ok {
				return envVal
			}
			return defaultVal
		})
	case map[string]interface{}:
		return resolveEnvPlaceholders(val)
	case map[interface{}]interface{}:
		converted := make(map[string]interface{}, len(val))
		for mk, mv := range val {
			converted[fmt.Sprintf("%v", mk)] = mv
		}
		return resolveEnvPlaceholders(converted)
	case []interface{}:
		resolved := make([]interface{}, len(val))
		for i, item := range val {
			resolved[i] = resolveValue(item)
		}
		return resolved
	default:
		return v
	}
}

// -----------------------------------------------------------------------------
// Root Config
// -----------------------------------------------------------------------------

// Config is the top-level configuration object.
type Config struct {
	App           AppConfig           `yaml:"app"            json:"app"            mapstructure:"app"`
	Databases     DatabasesConfig     `yaml:"databases"      json:"databases"      mapstructure:"databases"`
	Storage       StorageConfig       `yaml:"storage"        json:"storage"        mapstructure:"storage"`
	Events        EventsConfig        `yaml:"events"         json:"events"         mapstructure:"events"`
	AI            AIConfig            `yaml:"ai"             json:"ai"             mapstructure:"ai"`
	Bhashini      BhashiniConfig      `yaml:"bhashini"       json:"bhashini"       mapstructure:"bhashini"`
	Auth          AuthConfig          `yaml:"auth"           json:"auth"           mapstructure:"auth"`
	Notifications NotificationsConfig `yaml:"notifications"  json:"notifications"  mapstructure:"notifications"`
	Payments      PaymentsConfig      `yaml:"payments"       json:"payments"       mapstructure:"payments"`
	Geo           GeoConfig           `yaml:"geo"            json:"geo"            mapstructure:"geo"`
	Monitoring    MonitoringConfig    `yaml:"monitoring"     json:"monitoring"     mapstructure:"monitoring"`
	Services      ServicesConfig      `yaml:"services"       json:"services"       mapstructure:"services"`
}

// -----------------------------------------------------------------------------
// App
// -----------------------------------------------------------------------------

type AppConfig struct {
	Name        string `yaml:"name"        json:"name"        mapstructure:"name"`
	Environment string `yaml:"environment" json:"environment" mapstructure:"environment"`
	Debug       bool   `yaml:"debug"       json:"debug"       mapstructure:"debug"`
	Version     string `yaml:"version"     json:"version"     mapstructure:"version"`
}

// -----------------------------------------------------------------------------
// Databases
// -----------------------------------------------------------------------------

type DatabasesConfig struct {
	Postgres   PostgresConfig   `yaml:"postgres"    json:"postgres"    mapstructure:"postgres"`
	Mongo      MongoConfig      `yaml:"mongodb"     json:"mongodb"     mapstructure:"mongodb"`
	Redis      RedisConfig      `yaml:"redis"       json:"redis"       mapstructure:"redis"`
	OpenSearch OpenSearchConfig `yaml:"opensearch"  json:"opensearch"  mapstructure:"opensearch"`
	Timescale  TimescaleConfig  `yaml:"timescaledb" json:"timescaledb" mapstructure:"timescaledb"`
}

type PostgresConfig struct {
	Host     string `yaml:"host"      json:"host"      mapstructure:"host"`
	Port     int    `yaml:"port"      json:"port"      mapstructure:"port"`
	User     string `yaml:"user"      json:"user"      mapstructure:"user"`
	Password string `yaml:"password"  json:"password"  mapstructure:"password"`
	Database string `yaml:"name"      json:"database"  mapstructure:"name"`
	SSLMode  string `yaml:"sslmode"   json:"sslmode"   mapstructure:"sslmode"`
	SSL      bool   `yaml:"ssl"       json:"ssl"       mapstructure:"ssl"`
	MaxConns int    `yaml:"max_conns" json:"max_conns" mapstructure:"max_conns"`
	MinConns int    `yaml:"min_conns" json:"min_conns" mapstructure:"min_conns"`
}

// DSN returns a PostgreSQL connection string.
func (p PostgresConfig) DSN() string {
	sslmode := p.SSLMode
	if sslmode == "" {
		if p.SSL {
			sslmode = "require"
		} else {
			sslmode = "disable"
		}
	}
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		p.User, p.Password, p.Host, p.Port, p.Database, sslmode,
	)
}

type MongoConfig struct {
	URI      string `yaml:"uri"      json:"uri"      mapstructure:"uri"`
	Database string `yaml:"database" json:"database" mapstructure:"database"`
}

type RedisConfig struct {
	Host     string `yaml:"host"      json:"host"      mapstructure:"host"`
	Port     int    `yaml:"port"      json:"port"      mapstructure:"port"`
	Password string `yaml:"password"  json:"password"  mapstructure:"password"`
	DB       int    `yaml:"db"        json:"db"        mapstructure:"db"`
	PoolSize int    `yaml:"pool_size" json:"pool_size" mapstructure:"pool_size"`
}

// Addr returns host:port for redis.
func (r RedisConfig) Addr() string {
	return fmt.Sprintf("%s:%d", r.Host, r.Port)
}

type OpenSearchConfig struct {
	Host     string `yaml:"host"     json:"host"     mapstructure:"host"`
	Port     int    `yaml:"port"     json:"port"     mapstructure:"port"`
	Scheme   string `yaml:"scheme"   json:"scheme"   mapstructure:"scheme"`
	Username string `yaml:"username" json:"username" mapstructure:"username"`
	Password string `yaml:"password" json:"password" mapstructure:"password"`
}

// URL returns the full OpenSearch URL.
func (o OpenSearchConfig) URL() string {
	return fmt.Sprintf("%s://%s:%d", o.Scheme, o.Host, o.Port)
}

type TimescaleConfig struct {
	Host     string `yaml:"host"     json:"host"     mapstructure:"host"`
	Port     int    `yaml:"port"     json:"port"     mapstructure:"port"`
	User     string `yaml:"user"     json:"user"     mapstructure:"user"`
	Password string `yaml:"password" json:"password" mapstructure:"password"`
	Database string `yaml:"name"     json:"database" mapstructure:"name"`
	SSLMode  string `yaml:"sslmode"  json:"sslmode"  mapstructure:"sslmode"`
}

// DSN returns a TimescaleDB connection string.
func (t TimescaleConfig) DSN() string {
	return fmt.Sprintf(
		"postgres://%s:%s@%s:%d/%s?sslmode=%s",
		t.User, t.Password, t.Host, t.Port, t.Database, t.SSLMode,
	)
}

// -----------------------------------------------------------------------------
// Storage
// -----------------------------------------------------------------------------

type StorageConfig struct {
	Provider  string `yaml:"provider"   json:"provider"   mapstructure:"provider"`
	Endpoint  string `yaml:"endpoint"   json:"endpoint"   mapstructure:"endpoint"`
	Region    string `yaml:"region"     json:"region"     mapstructure:"region"`
	Bucket    string `yaml:"bucket"     json:"bucket"     mapstructure:"bucket"`
	AccessKey string `yaml:"access_key" json:"access_key" mapstructure:"access_key"`
	SecretKey string `yaml:"secret_key" json:"secret_key" mapstructure:"secret_key"`
	CDNUrl    string `yaml:"cdn_url"    json:"cdn_url"    mapstructure:"cdn_url"`
}

// -----------------------------------------------------------------------------
// Events
// -----------------------------------------------------------------------------

type EventsConfig struct {
	Provider            string            `yaml:"provider"              json:"provider"              mapstructure:"provider"`
	Brokers             []string          `yaml:"brokers"               json:"brokers"               mapstructure:"brokers"`
	SchemaRegistry      string            `yaml:"schema_registry"       json:"schema_registry"       mapstructure:"schema_registry"`
	ConsumerGroupPrefix string            `yaml:"consumer_group_prefix" json:"consumer_group_prefix" mapstructure:"consumer_group_prefix"`
	Topics              map[string]string `yaml:"topics"                json:"topics"                mapstructure:"topics"`
}

// -----------------------------------------------------------------------------
// AI
// -----------------------------------------------------------------------------

type AIConfig struct {
	LLM               LLMConfig               `yaml:"llm"                json:"llm"                mapstructure:"llm"`
	Vision            VisionConfig             `yaml:"vision"             json:"vision"             mapstructure:"vision"`
	Sentiment         SentimentConfig          `yaml:"sentiment"          json:"sentiment"          mapstructure:"sentiment"`
	Moderation        ModerationConfig         `yaml:"moderation"         json:"moderation"         mapstructure:"moderation"`
	LanguageDetection LanguageDetectionConfig  `yaml:"language_detection" json:"language_detection" mapstructure:"language_detection"`
}

type LLMConfig struct {
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	Model    string `yaml:"model"    json:"model"    mapstructure:"model"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
}

type VisionConfig struct {
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	Model    string `yaml:"model"    json:"model"    mapstructure:"model"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
}

type SentimentConfig struct {
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	Model    string `yaml:"model"    json:"model"    mapstructure:"model"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
}

type ModerationConfig struct {
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	Model    string `yaml:"model"    json:"model"    mapstructure:"model"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
}

type LanguageDetectionConfig struct {
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	Model    string `yaml:"model"    json:"model"    mapstructure:"model"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
}

// -----------------------------------------------------------------------------
// Bhashini
// -----------------------------------------------------------------------------

type BhashiniConfig struct {
	Mode    string        `yaml:"mode"    json:"mode"    mapstructure:"mode"`
	Offline OfflineConfig `yaml:"offline" json:"offline" mapstructure:"offline"`
	API     APIConfig     `yaml:"api"     json:"api"     mapstructure:"api"`
	Hybrid  HybridConfig  `yaml:"hybrid"  json:"hybrid"  mapstructure:"hybrid"`
}

type OfflineConfig struct {
	ModelsPath string   `yaml:"models_path" json:"models_path" mapstructure:"models_path"`
	Languages  []string `yaml:"languages"   json:"languages"   mapstructure:"languages"`
}

type APIConfig struct {
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	UserID   string `yaml:"user_id"  json:"user_id"  mapstructure:"user_id"`
}

type HybridConfig struct {
	PreferOffline     bool     `yaml:"prefer_offline"     json:"prefer_offline"     mapstructure:"prefer_offline"`
	FallbackLanguages []string `yaml:"fallback_languages" json:"fallback_languages" mapstructure:"fallback_languages"`
}

// -----------------------------------------------------------------------------
// Auth
// -----------------------------------------------------------------------------

type AuthConfig struct {
	JWT     JWTConfig     `yaml:"jwt"     json:"jwt"     mapstructure:"jwt"`
	OTP     OTPConfig     `yaml:"otp"     json:"otp"     mapstructure:"otp"`
	Aadhaar AadhaarConfig `yaml:"aadhaar" json:"aadhaar" mapstructure:"aadhaar"`
}

type JWTConfig struct {
	Secret             string `yaml:"secret"              json:"secret"              mapstructure:"secret"`
	AccessTokenExpiry  string `yaml:"access_token_expiry"  json:"access_token_expiry"  mapstructure:"access_token_expiry"`
	RefreshTokenExpiry string `yaml:"refresh_token_expiry" json:"refresh_token_expiry" mapstructure:"refresh_token_expiry"`
	Issuer             string `yaml:"issuer"              json:"issuer"              mapstructure:"issuer"`
}

type OTPConfig struct {
	Length   int    `yaml:"length"   json:"length"   mapstructure:"length"`
	Expiry   string `yaml:"expiry"   json:"expiry"   mapstructure:"expiry"`
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
}

type AadhaarConfig struct {
	Provider    string `yaml:"provider"      json:"provider"      mapstructure:"provider"`
	APIKey      string `yaml:"api_key"       json:"api_key"       mapstructure:"api_key"`
	SecretKey   string `yaml:"secret_key"    json:"secret_key"    mapstructure:"secret_key"`
	Endpoint    string `yaml:"endpoint"      json:"endpoint"      mapstructure:"endpoint"`
	CertDir     string `yaml:"cert_dir"      json:"cert_dir"      mapstructure:"cert_dir"`
	MaxFileSize int    `yaml:"max_file_size" json:"max_file_size" mapstructure:"max_file_size"`
}

// -----------------------------------------------------------------------------
// Notifications
// -----------------------------------------------------------------------------

type NotificationsConfig struct {
	Push  PushConfig  `yaml:"push"  json:"push"  mapstructure:"push"`
	Email EmailConfig `yaml:"email" json:"email" mapstructure:"email"`
	SMS   SMSConfig   `yaml:"sms"   json:"sms"   mapstructure:"sms"`
}

type PushConfig struct {
	Provider        string `yaml:"provider"         json:"provider"         mapstructure:"provider"`
	CredentialsFile string `yaml:"credentials_file" json:"credentials_file" mapstructure:"credentials_file"`
}

type EmailConfig struct {
	Provider string `yaml:"provider"  json:"provider"  mapstructure:"provider"`
	From     string `yaml:"from"      json:"from"      mapstructure:"from"`
	SMTPHost string `yaml:"smtp_host" json:"smtp_host" mapstructure:"smtp_host"`
	SMTPPort int    `yaml:"smtp_port" json:"smtp_port" mapstructure:"smtp_port"`
	Username string `yaml:"username"  json:"username"  mapstructure:"username"`
	Password string `yaml:"password"  json:"password"  mapstructure:"password"`
	APIKey   string `yaml:"api_key"   json:"api_key"   mapstructure:"api_key"`
}

type SMSConfig struct {
	Provider string `yaml:"provider"  json:"provider"  mapstructure:"provider"`
	APIKey   string `yaml:"api_key"   json:"api_key"   mapstructure:"api_key"`
	SenderID string `yaml:"sender_id" json:"sender_id" mapstructure:"sender_id"`
	Endpoint string `yaml:"endpoint"  json:"endpoint"  mapstructure:"endpoint"`
}

// -----------------------------------------------------------------------------
// Payments
// -----------------------------------------------------------------------------

type PaymentsConfig struct {
	Provider string         `yaml:"provider" json:"provider" mapstructure:"provider"`
	Razorpay RazorpayConfig `yaml:"razorpay" json:"razorpay" mapstructure:"razorpay"`
	Stripe   StripeConfig   `yaml:"stripe"   json:"stripe"   mapstructure:"stripe"`
}

type RazorpayConfig struct {
	KeyID         string `yaml:"key_id"         json:"key_id"         mapstructure:"key_id"`
	KeySecret     string `yaml:"key_secret"     json:"key_secret"     mapstructure:"key_secret"`
	WebhookSecret string `yaml:"webhook_secret" json:"webhook_secret" mapstructure:"webhook_secret"`
}

type StripeConfig struct {
	SecretKey      string `yaml:"secret_key"      json:"secret_key"      mapstructure:"secret_key"`
	PublishableKey string `yaml:"publishable_key" json:"publishable_key" mapstructure:"publishable_key"`
	WebhookSecret  string `yaml:"webhook_secret"  json:"webhook_secret"  mapstructure:"webhook_secret"`
}

// -----------------------------------------------------------------------------
// Geo
// -----------------------------------------------------------------------------

type GeoConfig struct {
	Geocoding  GeocodingConfig  `yaml:"geocoding"  json:"geocoding"  mapstructure:"geocoding"`
	Boundaries BoundariesConfig `yaml:"boundaries" json:"boundaries" mapstructure:"boundaries"`
}

type GeocodingConfig struct {
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	APIKey   string `yaml:"api_key"  json:"api_key"  mapstructure:"api_key"`
	Endpoint string `yaml:"endpoint" json:"endpoint" mapstructure:"endpoint"`
}

type BoundariesConfig struct {
	Provider string `yaml:"provider"  json:"provider"  mapstructure:"provider"`
	DataPath string `yaml:"data_path" json:"data_path" mapstructure:"data_path"`
	CacheTTL string `yaml:"cache_ttl" json:"cache_ttl" mapstructure:"cache_ttl"`
}

// -----------------------------------------------------------------------------
// Monitoring
// -----------------------------------------------------------------------------

type MonitoringConfig struct {
	Metrics MetricsConfig `yaml:"metrics" json:"metrics" mapstructure:"metrics"`
	Tracing TracingConfig `yaml:"tracing" json:"tracing" mapstructure:"tracing"`
	Logging LoggingConfig `yaml:"logging" json:"logging" mapstructure:"logging"`
}

type MetricsConfig struct {
	Enabled  bool   `yaml:"enabled"  json:"enabled"  mapstructure:"enabled"`
	Provider string `yaml:"provider" json:"provider" mapstructure:"provider"`
	Port     int    `yaml:"port"     json:"port"     mapstructure:"port"`
	Path     string `yaml:"path"     json:"path"     mapstructure:"path"`
}

type TracingConfig struct {
	Enabled    bool    `yaml:"enabled"     json:"enabled"     mapstructure:"enabled"`
	Provider   string  `yaml:"provider"    json:"provider"    mapstructure:"provider"`
	Endpoint   string  `yaml:"endpoint"    json:"endpoint"    mapstructure:"endpoint"`
	SampleRate float64 `yaml:"sample_rate" json:"sample_rate" mapstructure:"sample_rate"`
}

type LoggingConfig struct {
	Level  string `yaml:"level"  json:"level"  mapstructure:"level"`
	Format string `yaml:"format" json:"format" mapstructure:"format"`
}

// -----------------------------------------------------------------------------
// Services
// -----------------------------------------------------------------------------

type ServiceEndpoint struct {
	Host     string `yaml:"host"      json:"host"      mapstructure:"host"`
	GRPCPort int    `yaml:"grpc_port" json:"grpc_port" mapstructure:"grpc_port"`
	HTTPPort int    `yaml:"http_port" json:"http_port" mapstructure:"http_port"`
}

type ServicesConfig struct {
	Protocol  string                     `yaml:"protocol"  json:"protocol"  mapstructure:"protocol"`
	Discovery string                     `yaml:"discovery"  json:"discovery"  mapstructure:"discovery"`
	Endpoints map[string]ServiceEndpoint `yaml:"endpoints" json:"endpoints" mapstructure:"endpoints"`
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

// IsLocal returns true when running in the local/development environment.
func (c *Config) IsLocal() bool {
	return c.App.Environment == "local" || c.App.Environment == "development"
}

// IsProduction returns true when running in the production environment.
func (c *Config) IsProduction() bool {
	return c.App.Environment == "production"
}

// BrokersCSV returns the Kafka brokers as a comma-separated string.
func (c *Config) BrokersCSV() string {
	return strings.Join(c.Events.Brokers, ",")
}
