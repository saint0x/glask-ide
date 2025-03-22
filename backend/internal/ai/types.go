package ai

import "time"

// Config holds the configuration for an AI model
type Config struct {
	Model        string
	APIToken     string
	SystemPrompt string
	Temperature  float64
	MaxTokens    int
}

// Response represents a response from the AI model
type Response struct {
	ID      string
	Status  string // "starting", "processing", "succeeded", "failed"
	Output  string
	Error   string
	Metrics Metrics
}

// Metrics holds performance metrics for an AI response
type Metrics struct {
	TotalTokens      int
	PromptTokens     int
	CompletionTokens int
	TotalTime        time.Duration
}

// StreamChunk represents a chunk of streaming response
type StreamChunk struct {
	Type      string // "text", "error", "done"
	Content   string
	Timestamp time.Time
}

// Options represents optional parameters for AI requests
type Options struct {
	Stream        bool
	Temperature   float64
	MaxTokens     int
	StopSequences []string
	TopP          float64
	TopK          int
}
