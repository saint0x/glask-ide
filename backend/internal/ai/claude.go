package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

const claudeAPIURL = "https://api.anthropic.com/v1/messages"

type claudeRequest struct {
	Model       string    `json:"model"`
	Messages    []message `json:"messages"`
	MaxTokens   int       `json:"max_tokens,omitempty"`
	Temperature float64   `json:"temperature,omitempty"`
	Stream      bool      `json:"stream,omitempty"`
	Stop        []string  `json:"stop,omitempty"`
}

type message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

func buildClaudeRequest(ctx context.Context, prompt string, config Config, opts Options) (*http.Request, error) {
	reqBody := claudeRequest{
		Model: config.Model,
		Messages: []message{
			{Role: "system", Content: config.SystemPrompt},
			{Role: "user", Content: prompt},
		},
		MaxTokens:   opts.MaxTokens,
		Temperature: opts.Temperature,
		Stream:      opts.Stream,
		Stop:        opts.StopSequences,
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, "POST", claudeAPIURL, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", config.APIToken))
	req.Header.Set("Anthropic-Version", "2023-06-01")

	return req, nil
}

type claudeResponse struct {
	ID         string `json:"id"`
	Type       string `json:"type"`
	Role       string `json:"role"`
	Content    string `json:"content"`
	StopReason string `json:"stop_reason,omitempty"`
	Model      string `json:"model"`
	Usage      struct {
		InputTokens  int `json:"input_tokens"`
		OutputTokens int `json:"output_tokens"`
		TotalTokens  int `json:"total_tokens"`
	} `json:"usage"`
}

func parseClaudeResponse(resp *claudeResponse) *Response {
	return &Response{
		ID:     resp.ID,
		Status: "succeeded",
		Output: resp.Content,
		Metrics: Metrics{
			TotalTokens:      resp.Usage.TotalTokens,
			PromptTokens:     resp.Usage.InputTokens,
			CompletionTokens: resp.Usage.OutputTokens,
		},
	}
}

type claudeStreamChunk struct {
	Type    string `json:"type"`
	Content string `json:"content"`
	Done    bool   `json:"done"`
}

func parseClaudeStreamChunk(chunk *claudeStreamChunk) StreamChunk {
	chunkType := "text"
	if chunk.Done {
		chunkType = "done"
	}

	return StreamChunk{
		Type:    chunkType,
		Content: chunk.Content,
	}
}
