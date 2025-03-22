package ai

import (
	"context"
	pb "glask-ide/internal/ai/proto"
)

// GRPCServer implements the AIService gRPC interface
type GRPCServer struct {
	pb.UnimplementedAIServiceServer
	service Service
}

// NewGRPCServer creates a new gRPC server instance
func NewGRPCServer(service Service) *GRPCServer {
	return &GRPCServer{
		service: service,
	}
}

// Complete handles completion requests
func (s *GRPCServer) Complete(ctx context.Context, req *pb.CompletionRequest) (*pb.CompletionResponse, error) {
	opts := Options{
		MaxTokens:     int(req.GetMaxTokens()),
		Temperature:   float64(req.GetTemperature()),
		StopSequences: req.StopSequences,
		TopP:          float64(req.GetTopP()),
		TopK:          int(req.GetTopK()),
	}

	resp, err := s.service.Complete(ctx, req.Prompt, opts)
	if err != nil {
		return nil, err
	}

	return &pb.CompletionResponse{
		Id:     resp.ID,
		Status: resp.Status,
		Output: resp.Output,
		Error:  &resp.Error,
		Metrics: &pb.CompletionMetrics{
			TotalTokens:      int32(resp.Metrics.TotalTokens),
			PromptTokens:     int32(resp.Metrics.PromptTokens),
			CompletionTokens: int32(resp.Metrics.CompletionTokens),
			TotalTimeMs:      resp.Metrics.TotalTime.Milliseconds(),
		},
	}, nil
}

// StreamComplete handles streaming completion requests
func (s *GRPCServer) StreamComplete(req *pb.CompletionRequest, stream pb.AIService_StreamCompleteServer) error {
	opts := Options{
		MaxTokens:     int(req.GetMaxTokens()),
		Temperature:   float64(req.GetTemperature()),
		StopSequences: req.StopSequences,
		TopP:          float64(req.GetTopP()),
		TopK:          int(req.GetTopK()),
		Stream:        true,
	}

	callback := func(chunk StreamChunk) error {
		return stream.Send(&pb.CompletionChunk{
			Type:      chunk.Type,
			Content:   chunk.Content,
			Timestamp: chunk.Timestamp.UnixNano() / 1e6, // Convert to milliseconds
		})
	}

	return s.service.Stream(stream.Context(), req.Prompt, callback, opts)
}

// GetModels returns available models
func (s *GRPCServer) GetModels(ctx context.Context, req *pb.GetModelsRequest) (*pb.GetModelsResponse, error) {
	models := s.service.GetModels()
	activeModel := s.service.GetActiveModel()

	pbModels := make([]*pb.ModelInfo, len(models))
	for i, model := range models {
		pbModels[i] = &pb.ModelInfo{
			Id:           model.ID,
			Name:         model.Name,
			Provider:     model.Provider,
			MaxTokens:    int32(model.MaxTokens),
			Capabilities: model.Capabilities,
			Description:  model.Description,
		}
	}

	return &pb.GetModelsResponse{
		Models: pbModels,
		ActiveModel: &pb.ModelInfo{
			Id:           activeModel.ID,
			Name:         activeModel.Name,
			Provider:     activeModel.Provider,
			MaxTokens:    int32(activeModel.MaxTokens),
			Capabilities: activeModel.Capabilities,
			Description:  activeModel.Description,
		},
	}, nil
}

// SetActiveModel changes the active model
func (s *GRPCServer) SetActiveModel(ctx context.Context, req *pb.SetActiveModelRequest) (*pb.SetActiveModelResponse, error) {
	if err := s.service.SetActiveModel(req.ModelId); err != nil {
		errStr := err.Error()
		return &pb.SetActiveModelResponse{
			Success: false,
			Error:   &errStr,
		}, nil
	}

	activeModel := s.service.GetActiveModel()
	return &pb.SetActiveModelResponse{
		Success: true,
		ActiveModel: &pb.ModelInfo{
			Id:           activeModel.ID,
			Name:         activeModel.Name,
			Provider:     activeModel.Provider,
			MaxTokens:    int32(activeModel.MaxTokens),
			Capabilities: activeModel.Capabilities,
			Description:  activeModel.Description,
		},
	}, nil
}
