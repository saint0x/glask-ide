package ai

import "fmt"

// ModelInfo represents information about an AI model
type ModelInfo struct {
	ID           string   `json:"id"`
	Name         string   `json:"name"`
	Provider     string   `json:"provider"` // "anthropic" or "google"
	MaxTokens    int      `json:"maxTokens"`
	Capabilities []string `json:"capabilities"` // e.g. ["completion", "chat", "code"]
	Description  string   `json:"description"`
}

// ModelManager handles model selection and configuration
type ModelManager struct {
	models       map[string]ModelInfo
	activeModel  string
	defaultModel string
}

// NewModelManager creates a new model manager with default configurations
func NewModelManager() *ModelManager {
	models := map[string]ModelInfo{
		"claude-3-haiku-20240307": {
			ID:        "claude-3-haiku-20240307",
			Name:      "Claude 3 Haiku",
			Provider:  "anthropic",
			MaxTokens: 48000,
			Capabilities: []string{
				"completion",
				"chat",
				"code",
				"analysis",
				"long-context",
			},
			Description: "Fast and efficient for most tasks, best for longer contexts",
		},
		"gemini-pro": {
			ID:        "gemini-pro",
			Name:      "Gemini Pro",
			Provider:  "google",
			MaxTokens: 32000,
			Capabilities: []string{
				"completion",
				"chat",
				"code",
				"quick-response",
			},
			Description: "Quick responses, ideal for code completion",
		},
	}

	return &ModelManager{
		models:       models,
		activeModel:  "claude-3-haiku-20240307", // Default to Claude
		defaultModel: "claude-3-haiku-20240307",
	}
}

// GetModels returns all available models
func (m *ModelManager) GetModels() []ModelInfo {
	models := make([]ModelInfo, 0, len(m.models))
	for _, model := range m.models {
		models = append(models, model)
	}
	return models
}

// GetActiveModel returns the currently active model
func (m *ModelManager) GetActiveModel() ModelInfo {
	return m.models[m.activeModel]
}

// SetActiveModel changes the active model
func (m *ModelManager) SetActiveModel(modelID string) error {
	if _, exists := m.models[modelID]; !exists {
		return fmt.Errorf("model %s not found", modelID)
	}
	m.activeModel = modelID
	return nil
}

// GetModelByCapability returns the best model for a given capability
func (m *ModelManager) GetModelByCapability(capability string) ModelInfo {
	// First try active model
	activeModel := m.models[m.activeModel]
	for _, cap := range activeModel.Capabilities {
		if cap == capability {
			return activeModel
		}
	}

	// Fall back to default model
	return m.models[m.defaultModel]
}
