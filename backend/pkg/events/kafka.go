package events

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"

	"github.com/civitro/pkg/config"
	"github.com/civitro/pkg/logger"
)

// -----------------------------------------------------------------------------
// Producer
// -----------------------------------------------------------------------------

// Producer wraps a kafka-go Writer for publishing messages.
type Producer struct {
	writer *kafka.Writer
	mu     sync.Mutex
	closed bool
}

// NewProducer creates a Kafka producer using brokers from config.
func NewProducer() *Producer {
	cfg := config.Get().Events

	w := &kafka.Writer{
		Addr:         kafka.TCP(cfg.Brokers...),
		Balancer:     &kafka.LeastBytes{},
		BatchTimeout: 10 * time.Millisecond,
		RequiredAcks: kafka.RequireOne,
		Async:        false,
	}

	logger.Info().
		Strs("brokers", cfg.Brokers).
		Msg("kafka producer created")

	return &Producer{writer: w}
}

// Publish sends a message to the given topic.
func (p *Producer) Publish(ctx context.Context, topic, key string, value []byte) error {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return fmt.Errorf("kafka producer: already closed")
	}
	p.mu.Unlock()

	msg := kafka.Message{
		Topic: topic,
		Key:   []byte(key),
		Value: value,
	}

	if err := p.writer.WriteMessages(ctx, msg); err != nil {
		return fmt.Errorf("kafka producer: publish to %s: %w", topic, err)
	}

	logger.Debug().
		Str("topic", topic).
		Str("key", key).
		Int("value_len", len(value)).
		Msg("kafka message published")

	return nil
}

// Close gracefully shuts down the producer.
func (p *Producer) Close() error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if p.closed {
		return nil
	}
	p.closed = true
	logger.Info().Msg("kafka producer closed")
	return p.writer.Close()
}

// -----------------------------------------------------------------------------
// Consumer
// -----------------------------------------------------------------------------

// MessageHandler is a callback invoked for each consumed message. Return a
// non-nil error to log the failure (the message is still committed).
type MessageHandler func(ctx context.Context, msg kafka.Message) error

// Consumer wraps a kafka-go Reader for consuming messages from a topic.
type Consumer struct {
	reader  *kafka.Reader
	handler MessageHandler
	cancel  context.CancelFunc
	wg      sync.WaitGroup
}

// Subscribe creates and starts a consumer that reads from the given topic.
// It blocks internally in a goroutine; call Stop() to shut down.
func Subscribe(topic, groupID string, handler MessageHandler) *Consumer {
	cfg := config.Get().Events

	// Prefix group ID if configured.
	if cfg.ConsumerGroupPrefix != "" {
		groupID = cfg.ConsumerGroupPrefix + groupID
	}

	r := kafka.NewReader(kafka.ReaderConfig{
		Brokers:        cfg.Brokers,
		Topic:          topic,
		GroupID:        groupID,
		MinBytes:       1,              // 1 byte
		MaxBytes:       10 * 1024 * 1024, // 10 MB
		CommitInterval: time.Second,
		StartOffset:    kafka.LastOffset,
	})

	ctx, cancel := context.WithCancel(context.Background())

	c := &Consumer{
		reader:  r,
		handler: handler,
		cancel:  cancel,
	}

	c.wg.Add(1)
	go c.run(ctx)

	logger.Info().
		Str("topic", topic).
		Str("group_id", groupID).
		Msg("kafka consumer started")

	return c
}

func (c *Consumer) run(ctx context.Context) {
	defer c.wg.Done()

	for {
		msg, err := c.reader.FetchMessage(ctx)
		if err != nil {
			// Context cancelled means graceful shutdown.
			if ctx.Err() != nil {
				return
			}
			logger.Error().Err(err).Msg("kafka consumer: fetch error")
			time.Sleep(time.Second) // back off briefly on transient errors
			continue
		}

		if err := c.handler(ctx, msg); err != nil {
			logger.Error().
				Err(err).
				Str("topic", msg.Topic).
				Int("partition", msg.Partition).
				Int64("offset", msg.Offset).
				Msg("kafka consumer: handler error")
		}

		// Commit offset after processing.
		if err := c.reader.CommitMessages(ctx, msg); err != nil {
			logger.Error().Err(err).Msg("kafka consumer: commit error")
		}
	}
}

// Stop gracefully shuts down the consumer and waits for in-flight processing
// to complete.
func (c *Consumer) Stop() error {
	c.cancel()
	c.wg.Wait()
	logger.Info().
		Str("topic", c.reader.Config().Topic).
		Msg("kafka consumer stopped")
	return c.reader.Close()
}
