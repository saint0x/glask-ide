package ai

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Service defines the interface for AI model interactions
type Service interface {
	Complete(ctx context.Context, prompt string, opts Options) (*Response, error)
	Stream(ctx context.Context, prompt string, callback func(StreamChunk) error, opts Options) error
	GetModels() []ModelInfo
	GetActiveModel() ModelInfo
	SetActiveModel(modelID string) error
}

// service implements the Service interface
type service struct {
	claudeConfig  Config
	geminiConfig  Config
	httpClient    *http.Client
	systemPrompts map[string]string
	modelManager  *ModelManager
}

// NewService creates a new AI service
func NewService(claudeConfig, geminiConfig Config) Service {
	return &service{
		claudeConfig: claudeConfig,
		geminiConfig: geminiConfig,
		httpClient: &http.Client{
			Timeout: time.Second * 30,
		},
		systemPrompts: make(map[string]string),
		modelManager:  NewModelManager(),
	}
}

// GetModels returns all available models
func (s *service) GetModels() []ModelInfo {
	return s.modelManager.GetModels()
}

// GetActiveModel returns the currently active model
func (s *service) GetActiveModel() ModelInfo {
	return s.modelManager.GetActiveModel()
}

// SetActiveModel changes the active model
func (s *service) SetActiveModel(modelID string) error {
	return s.modelManager.SetActiveModel(modelID)
}

// Complete sends a completion request to the appropriate AI model
func (s *service) Complete(ctx context.Context, prompt string, opts Options) (*Response, error) {
	startTime := time.Now()

	// Get the active model configuration
	activeModel := s.modelManager.GetActiveModel()
	config := s.getConfigForModel(activeModel.ID)

	// Build the request
	req, err := s.buildRequest(ctx, prompt, config, opts)
	if err != nil {
		return nil, fmt.Errorf("failed to build request: %w", err)
	}

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Parse the response based on the model
	var result *Response
	switch activeModel.Provider {
	case "anthropic":
		var claudeResp claudeResponse
		if err := json.NewDecoder(resp.Body).Decode(&claudeResp); err != nil {
			return nil, fmt.Errorf("failed to decode Claude response: %w", err)
		}
		result = parseClaudeResponse(&claudeResp)
	case "google":
		var geminiResp geminiResponse
		if err := json.NewDecoder(resp.Body).Decode(&geminiResp); err != nil {
			return nil, fmt.Errorf("failed to decode Gemini response: %w", err)
		}
		result = parseGeminiResponse(&geminiResp)
	default:
		return nil, fmt.Errorf("unsupported provider: %s", activeModel.Provider)
	}

	// Add metrics
	result.Metrics.TotalTime = time.Since(startTime)

	return result, nil
}

// Stream streams the AI response through a callback
func (s *service) Stream(ctx context.Context, prompt string, callback func(StreamChunk) error, opts Options) error {
	// Set streaming option
	opts.Stream = true

	// Get the active model configuration
	activeModel := s.modelManager.GetActiveModel()
	config := s.getConfigForModel(activeModel.ID)

	// Build the request
	req, err := s.buildRequest(ctx, prompt, config, opts)
	if err != nil {
		return fmt.Errorf("failed to build request: %w", err)
	}

	// Send the request
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Process the stream based on the model
	reader := json.NewDecoder(resp.Body)
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			var chunk StreamChunk
			switch activeModel.Provider {
			case "anthropic":
				var claudeChunk claudeStreamChunk
				if err := reader.Decode(&claudeChunk); err != nil {
					if err == io.EOF {
						return nil
					}
					return fmt.Errorf("failed to decode Claude stream chunk: %w", err)
				}
				chunk = parseClaudeStreamChunk(&claudeChunk)
			case "google":
				var geminiChunk geminiStreamChunk
				if err := reader.Decode(&geminiChunk); err != nil {
					if err == io.EOF {
						return nil
					}
					return fmt.Errorf("failed to decode Gemini stream chunk: %w", err)
				}
				chunk = parseGeminiStreamChunk(&geminiChunk)
			default:
				return fmt.Errorf("unsupported provider: %s", activeModel.Provider)
			}

			chunk.Timestamp = time.Now()
			if err := callback(chunk); err != nil {
				return fmt.Errorf("callback error: %w", err)
			}

			if chunk.Type == "done" {
				return nil
			}
		}
	}
}

// getConfigForModel returns the configuration for a specific model
func (s *service) getConfigForModel(modelID string) Config {
	switch modelID {
	case "claude-3-haiku-20240307":
		return s.claudeConfig
	case "gemini-pro":
		return s.geminiConfig
	default:
		return s.claudeConfig // Default to Claude if unknown
	}
}

// buildRequest creates an HTTP request for the AI API
func (s *service) buildRequest(ctx context.Context, prompt string, config Config, opts Options) (*http.Request, error) {
	switch config.Model {
	case "claude-3-haiku-20240307":
		return buildClaudeRequest(ctx, prompt, config, opts)
	case "gemini-pro":
		return buildGeminiRequest(ctx, prompt, config, opts)
	default:
		return nil, fmt.Errorf("unsupported model: %s", config.Model)
	}
}
