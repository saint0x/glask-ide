package ai

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
)

const geminiAPIURL = "https://generativelanguage.googleapis.com/v1/models/%s:generateContent"

type geminiRequest struct {
	Contents         []geminiContent        `json:"contents"`
	GenerationConfig geminiGenerationConfig `json:"generationConfig,omitempty"`
	SafetySettings   []geminiSafetySetting  `json:"safetySettings,omitempty"`
}

type geminiContent struct {
	Role  string       `json:"role"`
	Parts []geminiPart `json:"parts"`
}

type geminiPart struct {
	Text string `json:"text"`
}

type geminiGenerationConfig struct {
	Temperature     float64  `json:"temperature,omitempty"`
	MaxOutputTokens int      `json:"maxOutputTokens,omitempty"`
	StopSequences   []string `json:"stopSequences,omitempty"`
	TopP            float64  `json:"topP,omitempty"`
	TopK            int      `json:"topK,omitempty"`
}

type geminiSafetySetting struct {
	Category  string `json:"category"`
	Threshold string `json:"threshold"`
}

func buildGeminiRequest(ctx context.Context, prompt string, config Config, opts Options) (*http.Request, error) {
	reqBody := geminiRequest{
		Contents: []geminiContent{
			{
				Role: "user",
				Parts: []geminiPart{
					{Text: config.SystemPrompt + "\n\n" + prompt},
				},
			},
		},
		GenerationConfig: geminiGenerationConfig{
			Temperature:     opts.Temperature,
			MaxOutputTokens: opts.MaxTokens,
			StopSequences:   opts.StopSequences,
			TopP:            opts.TopP,
			TopK:            opts.TopK,
		},
		SafetySettings: []geminiSafetySetting{
			{Category: "HARM_CATEGORY_HARASSMENT", Threshold: "BLOCK_NONE"},
			{Category: "HARM_CATEGORY_HATE_SPEECH", Threshold: "BLOCK_NONE"},
			{Category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", Threshold: "BLOCK_NONE"},
			{Category: "HARM_CATEGORY_DANGEROUS_CONTENT", Threshold: "BLOCK_NONE"},
		},
	}

	jsonBody, err := json.Marshal(reqBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request body: %w", err)
	}

	url := fmt.Sprintf(geminiAPIURL, config.Model)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewReader(jsonBody))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("x-goog-api-key", config.APIToken)

	return req, nil
}

type geminiResponse struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason  string `json:"finishReason"`
		SafetyRatings []struct {
			Category    string `json:"category"`
			Probability string `json:"probability"`
		} `json:"safetyRatings"`
		TokenCount int `json:"tokenCount"`
	} `json:"candidates"`
	PromptFeedback struct {
		TokenCount int `json:"tokenCount"`
	} `json:"promptFeedback"`
}

func parseGeminiResponse(resp *geminiResponse) *Response {
	if len(resp.Candidates) == 0 {
		return &Response{
			Status: "failed",
			Error:  "no candidates in response",
		}
	}

	candidate := resp.Candidates[0]
	output := ""
	if len(candidate.Content.Parts) > 0 {
		output = candidate.Content.Parts[0].Text
	}

	return &Response{
		Status: "succeeded",
		Output: output,
		Metrics: Metrics{
			TotalTokens:      candidate.TokenCount + resp.PromptFeedback.TokenCount,
			PromptTokens:     resp.PromptFeedback.TokenCount,
			CompletionTokens: candidate.TokenCount,
		},
	}
}

type geminiStreamChunk struct {
	Candidates []struct {
		Content struct {
			Parts []struct {
				Text string `json:"text"`
			} `json:"parts"`
		} `json:"content"`
		FinishReason string `json:"finishReason"`
	} `json:"candidates"`
}

func parseGeminiStreamChunk(chunk *geminiStreamChunk) StreamChunk {
	if len(chunk.Candidates) == 0 {
		return StreamChunk{
			Type:    "error",
			Content: "no candidates in chunk",
		}
	}

	candidate := chunk.Candidates[0]
	content := ""
	if len(candidate.Content.Parts) > 0 {
		content = candidate.Content.Parts[0].Text
	}

	chunkType := "text"
	if candidate.FinishReason != "" {
		chunkType = "done"
	}

	return StreamChunk{
		Type:    chunkType,
		Content: content,
	}
}
