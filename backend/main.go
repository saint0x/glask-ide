package main

import (
	"context"
	"embed"
	"log"
	"net/http"
	"os"
	"time"

	"glask-ide/internal/api/handlers"
	"glask-ide/internal/filesystem"
	pb "glask-ide/internal/filesystem/proto"
	"glask-ide/internal/grpc"
	"glask-ide/internal/terminal"
)

//go:embed static
var frontendFiles embed.FS

// Initialize logger with timestamp
var logger = log.New(os.Stdout, "", log.Ldate|log.Ltime)

func main() {
	logger.Printf("🚀 Starting Glask IDE backend server...")

	// Initialize services
	logger.Printf("📁 Initializing filesystem service...")
	fsService, err := filesystem.NewService()
	if err != nil {
		logger.Fatalf("❌ Failed to create filesystem service: %v", err)
	}
	logger.Printf("✅ Filesystem service initialized")

	// Initialize terminal service
	logger.Printf("💻 Initializing terminal service...")
	termManager := terminal.NewManager()
	termHandler := terminal.NewHandler(termManager)
	logger.Printf("✅ Terminal service initialized")

	// Create in-process gRPC server
	logger.Printf("🔄 Starting gRPC server...")
	grpcServer := grpc.NewInProcessServer()
	pb.RegisterFileSystemServiceServer(grpcServer.Server, filesystem.NewGRPCServer(fsService))
	grpcServer.Start()
	defer grpcServer.Stop()
	logger.Printf("✅ gRPC server started")

	// Create gRPC client connection
	logger.Printf("🔌 Establishing gRPC client connection...")
	conn, err := grpcServer.Dial(context.Background())
	if err != nil {
		logger.Fatalf("❌ Failed to create gRPC client: %v", err)
	}
	defer conn.Close()
	logger.Printf("✅ gRPC client connected")

	// Create HTTP handlers with gRPC client
	fsHandler := handlers.NewFileSystemHandler(pb.NewFileSystemServiceClient(conn))

	// Start the server
	startServer(fsHandler, termHandler)
}

func startServer(fsHandler *handlers.FileSystemHandler, termHandler *terminal.Handler) {
	// Create router
	mux := http.NewServeMux()

	// Add logging middleware
	loggingMiddleware := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			logger.Printf("📡 %s Request: %s", r.Method, r.URL.Path)
			next(w, r)
			logger.Printf("✨ %s completed in %v", r.URL.Path, time.Since(start))
		}
	}

	// File system endpoints with logging
	mux.HandleFunc("/api/fs/list", loggingMiddleware(fsHandler.HandleListDirectory))
	mux.HandleFunc("/api/fs/watch", loggingMiddleware(fsHandler.HandleWatchDirectory))
	mux.HandleFunc("/api/fs/read", loggingMiddleware(fsHandler.HandleReadFile))
	mux.HandleFunc("/api/fs/write", loggingMiddleware(fsHandler.HandleWriteFile))
	mux.HandleFunc("/api/fs/delete", loggingMiddleware(fsHandler.HandleDeleteFile))
	mux.HandleFunc("/api/fs/move", loggingMiddleware(fsHandler.HandleMoveFile))
	mux.HandleFunc("/api/fs/mkdir", loggingMiddleware(fsHandler.HandleCreateDirectory))
	mux.HandleFunc("/api/fs/rmdir", loggingMiddleware(fsHandler.HandleDeleteDirectory))
	mux.HandleFunc("/api/fs/search", loggingMiddleware(fsHandler.HandleSearchFiles))

	// Terminal endpoints with logging
	mux.HandleFunc("/api/terminal/create", loggingMiddleware(termHandler.CreateSession))
	mux.HandleFunc("/api/terminal/connect", loggingMiddleware(termHandler.HandleTerminal))

	// Serve static frontend files
	mux.Handle("/", http.FileServer(http.FS(frontendFiles)))

	// Start the server
	logger.Printf("🌟 Server is starting on :3001...")
	logger.Printf("🔥 API endpoints ready:")
	logger.Printf("   - File System API: http://localhost:3001/api/fs/*")
	logger.Printf("   - Terminal API:    http://localhost:3001/api/terminal/*")

	if err := http.ListenAndServe(":3001", mux); err != nil {
		logger.Fatalf("❌ Server failed to start: %v", err)
	}
}
