// Package events provides Kafka producer/consumer helpers and canonical topic
// names for cross-service communication.
//
// Usage:
//
//	producer := events.NewProducer()
//	defer producer.Close()
//	producer.Publish(ctx, events.TopicUserRegistered, userID, payload)
//
//	consumer := events.Subscribe(events.TopicUserRegistered, "my-group", handler)
//	defer consumer.Stop()
package events

// Canonical event topic names used across civitro services.
const (
	TopicUserRegistered     = "user.registered"
	TopicUserVerified       = "user.verified"
	TopicLocationResolved   = "location.resolved"
	TopicRepClaimed         = "representative.claimed"
	TopicVoiceCreated       = "voice.created"
	TopicIssueCreated       = "civitro.issue.events"
	TopicIssueStatusUpdated = "issue.status.updated"
)
