package filesystem

import (
	"context"
	"os"

	pb "glask-ide/internal/filesystem/proto"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type grpcServer struct {
	pb.UnimplementedFileSystemServiceServer
	service Service
}

func NewGRPCServer(service Service) pb.FileSystemServiceServer {
	return &grpcServer{service: service}
}

func (s *grpcServer) ListDirectory(ctx context.Context, req *pb.ListDirectoryRequest) (*pb.ListDirectoryResponse, error) {
	files, err := s.service.ListDirectory(req.Path, req.Recursive)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	items := make([]*pb.FileInfo, len(files))
	for i, f := range files {
		items[i] = &pb.FileInfo{
			Path:    f.Path,
			Name:    f.Name,
			Size:    f.Size,
			Mode:    f.Mode,
			ModTime: f.ModTime.Unix(),
			IsDir:   f.Mode == "directory",
		}
	}

	return &pb.ListDirectoryResponse{Items: items}, nil
}

func (s *grpcServer) WatchDirectory(req *pb.WatchDirectoryRequest, stream pb.FileSystemService_WatchDirectoryServer) error {
	// Create a channel for file events
	eventCh := make(chan FileInfo)
	defer close(eventCh)

	// Start watching the directory
	callback := func(info FileInfo) {
		eventCh <- info
	}

	if err := s.service.WatchPath(req.Path, callback); err != nil {
		return status.Error(codes.Internal, err.Error())
	}
	defer s.service.UnwatchPath(req.Path)

	// Stream events to the client
	for {
		select {
		case <-stream.Context().Done():
			return nil
		case info := <-eventCh:
			event := &pb.FileEvent{
				Type: pb.FileEvent_MODIFIED, // Default to modified
				Path: info.Path,
				FileInfo: &pb.FileInfo{
					Path:    info.Path,
					Name:    info.Name,
					Size:    info.Size,
					Mode:    info.Mode,
					ModTime: info.ModTime.Unix(),
					IsDir:   info.Mode == "directory",
				},
			}
			if err := stream.Send(event); err != nil {
				return err
			}
		}
	}
}

func (s *grpcServer) ReadFile(ctx context.Context, req *pb.ReadFileRequest) (*pb.ReadFileResponse, error) {
	content, err := s.service.ReadFile(req.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, status.Error(codes.NotFound, "file not found")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.ReadFileResponse{Content: content}, nil
}

func (s *grpcServer) WriteFile(ctx context.Context, req *pb.WriteFileRequest) (*pb.WriteFileResponse, error) {
	err := s.service.WriteFile(req.Path, req.Content)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.WriteFileResponse{Success: true}, nil
}

func (s *grpcServer) DeleteFile(ctx context.Context, req *pb.DeleteFileRequest) (*pb.DeleteFileResponse, error) {
	err := s.service.DeleteFile(req.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, status.Error(codes.NotFound, "file not found")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.DeleteFileResponse{Success: true}, nil
}

func (s *grpcServer) MoveFile(ctx context.Context, req *pb.MoveFileRequest) (*pb.MoveFileResponse, error) {
	err := s.service.MoveFile(req.OldPath, req.NewPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, status.Error(codes.NotFound, "file not found")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.MoveFileResponse{Success: true}, nil
}

func (s *grpcServer) CreateDirectory(ctx context.Context, req *pb.CreateDirectoryRequest) (*pb.CreateDirectoryResponse, error) {
	err := s.service.CreateDirectory(req.Path)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.CreateDirectoryResponse{Success: true}, nil
}

func (s *grpcServer) DeleteDirectory(ctx context.Context, req *pb.DeleteDirectoryRequest) (*pb.DeleteDirectoryResponse, error) {
	err := s.service.DeleteDirectory(req.Path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, status.Error(codes.NotFound, "directory not found")
		}
		return nil, status.Error(codes.Internal, err.Error())
	}

	return &pb.DeleteDirectoryResponse{Success: true}, nil
}

func (s *grpcServer) SearchFiles(ctx context.Context, req *pb.SearchRequest) (*pb.SearchResponse, error) {
	opts := SearchOptions{
		Query:        req.Query,
		FilePatterns: req.FilePatterns,
		MaxResults:   int(req.MaxResults),
	}

	files, err := s.service.SearchFiles(opts)
	if err != nil {
		return nil, status.Error(codes.Internal, err.Error())
	}

	results := make([]*pb.FileInfo, len(files))
	for i, f := range files {
		results[i] = &pb.FileInfo{
			Path:    f.Path,
			Name:    f.Name,
			Size:    f.Size,
			Mode:    f.Mode,
			ModTime: f.ModTime.Unix(),
			IsDir:   f.Mode == "directory",
		}
	}

	return &pb.SearchResponse{
		Results:    results,
		TotalCount: int32(len(results)),
	}, nil
}
