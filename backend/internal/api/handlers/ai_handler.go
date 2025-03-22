package handlers

import (
	"encoding/json"
	"net/http"

	pb "glask-ide/internal/ai/proto"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Since this is a local app
	},
}

type AIHandler struct {
	aiService pb.AIServiceClient
}

func NewAIHandler(aiService pb.AIServiceClient) *AIHandler {
	return &AIHandler{
		aiService: aiService,
	}
}

// HandleComplete handles single completion requests
func (h *AIHandler) HandleComplete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Prompt        string   `json:"prompt"`
		MaxTokens     *int32   `json:"maxTokens,omitempty"`
		Temperature   *float32 `json:"temperature,omitempty"`
		StopSequences []string `json:"stopSequences,omitempty"`
		TopP          *float32 `json:"topP,omitempty"`
		TopK          *int32   `json:"topK,omitempty"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	// Convert to gRPC request
	grpcReq := &pb.CompletionRequest{
		Prompt:        req.Prompt,
		MaxTokens:     req.MaxTokens,
		Temperature:   req.Temperature,
		StopSequences: req.StopSequences,
		TopP:          req.TopP,
		TopK:          req.TopK,
	}

	// Call gRPC service
	resp, err := h.aiService.Complete(r.Context(), grpcReq)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleStream handles streaming completion requests via WebSocket
func (h *AIHandler) HandleStream(w http.ResponseWriter, r *http.Request) {
	// Upgrade to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not upgrade connection", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// Read request from WebSocket
	var req struct {
		Prompt        string   `json:"prompt"`
		MaxTokens     *int32   `json:"maxTokens,omitempty"`
		Temperature   *float32 `json:"temperature,omitempty"`
		StopSequences []string `json:"stopSequences,omitempty"`
		TopP          *float32 `json:"topP,omitempty"`
		TopK          *int32   `json:"topK,omitempty"`
	}

	if err := conn.ReadJSON(&req); err != nil {
		conn.WriteJSON(map[string]string{"error": "Invalid request"})
		return
	}

	// Convert to gRPC request
	grpcReq := &pb.CompletionRequest{
		Prompt:        req.Prompt,
		MaxTokens:     req.MaxTokens,
		Temperature:   req.Temperature,
		StopSequences: req.StopSequences,
		TopP:          req.TopP,
		TopK:          req.TopK,
		Stream:        ptr(true),
	}

	// Start streaming
	stream, err := h.aiService.StreamComplete(r.Context(), grpcReq)
	if err != nil {
		conn.WriteJSON(map[string]string{"error": err.Error()})
		return
	}

	// Stream responses back to WebSocket
	for {
		chunk, err := stream.Recv()
		if err != nil {
			break
		}

		if err := conn.WriteJSON(chunk); err != nil {
			break
		}

		if chunk.Type == "done" {
			break
		}
	}
}

// HandleGetModels returns available models
func (h *AIHandler) HandleGetModels(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	resp, err := h.aiService.GetModels(r.Context(), &pb.GetModelsRequest{})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleSetActiveModel changes the active model
func (h *AIHandler) HandleSetActiveModel(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ModelID string `json:"modelId"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.aiService.SetActiveModel(r.Context(), &pb.SetActiveModelRequest{
		ModelId: req.ModelID,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// Helper function to create bool pointer
func ptr[T any](v T) *T {
	return &v
}
