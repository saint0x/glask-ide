package handlers

import (
	"encoding/json"
	"net/http"
	"path/filepath"
	"strconv"

	pb "glask-ide/internal/filesystem/proto"

	"github.com/gorilla/websocket"
)

var fsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Since this is a local app
	},
}

type FileSystemHandler struct {
	fsService pb.FileSystemServiceClient
}

func NewFileSystemHandler(fsService pb.FileSystemServiceClient) *FileSystemHandler {
	return &FileSystemHandler{
		fsService: fsService,
	}
}

// HandleListDirectory handles directory listing requests
func (h *FileSystemHandler) HandleListDirectory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		path = "."
	}

	recursive := r.URL.Query().Get("recursive") == "true"
	includeHidden := r.URL.Query().Get("includeHidden") == "true"

	resp, err := h.fsService.ListDirectory(r.Context(), &pb.ListDirectoryRequest{
		Path:          path,
		Recursive:     recursive,
		IncludeHidden: includeHidden,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleWatchDirectory handles directory watching via WebSocket
func (h *FileSystemHandler) HandleWatchDirectory(w http.ResponseWriter, r *http.Request) {
	conn, err := fsUpgrader.Upgrade(w, r, nil)
	if err != nil {
		http.Error(w, "Could not upgrade connection", http.StatusInternalServerError)
		return
	}
	defer conn.Close()

	// Read watch request from WebSocket
	var req struct {
		Path      string `json:"path"`
		Recursive bool   `json:"recursive"`
	}

	if err := conn.ReadJSON(&req); err != nil {
		conn.WriteJSON(map[string]string{"error": "Invalid request"})
		return
	}

	// Start watching directory
	stream, err := h.fsService.WatchDirectory(r.Context(), &pb.WatchDirectoryRequest{
		Path:      req.Path,
		Recursive: req.Recursive,
	})
	if err != nil {
		conn.WriteJSON(map[string]string{"error": err.Error()})
		return
	}

	// Stream events to WebSocket
	for {
		event, err := stream.Recv()
		if err != nil {
			break
		}

		if err := conn.WriteJSON(event); err != nil {
			break
		}
	}
}

// HandleReadFile handles file read requests
func (h *FileSystemHandler) HandleReadFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Path is required", http.StatusBadRequest)
		return
	}

	resp, err := h.fsService.ReadFile(r.Context(), &pb.ReadFileRequest{Path: path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Set content type based on file extension
	contentType := "application/octet-stream"
	if ext := filepath.Ext(path); ext != "" {
		switch ext {
		case ".txt", ".md", ".go", ".js", ".ts", ".html", ".css":
			contentType = "text/plain"
		case ".json":
			contentType = "application/json"
		}
	}

	w.Header().Set("Content-Type", contentType)
	w.Write(resp.Content)
}

// HandleWriteFile handles file write requests
func (h *FileSystemHandler) HandleWriteFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost && r.Method != http.MethodPut {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path    string `json:"path"`
		Content []byte `json:"content"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.fsService.WriteFile(r.Context(), &pb.WriteFileRequest{
		Path:    req.Path,
		Content: req.Content,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleDeleteFile handles file deletion requests
func (h *FileSystemHandler) HandleDeleteFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Path is required", http.StatusBadRequest)
		return
	}

	resp, err := h.fsService.DeleteFile(r.Context(), &pb.DeleteFileRequest{Path: path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleMoveFile handles file move/rename requests
func (h *FileSystemHandler) HandleMoveFile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		OldPath string `json:"oldPath"`
		NewPath string `json:"newPath"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.fsService.MoveFile(r.Context(), &pb.MoveFileRequest{
		OldPath: req.OldPath,
		NewPath: req.NewPath,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleCreateDirectory handles directory creation requests
func (h *FileSystemHandler) HandleCreateDirectory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Path string `json:"path"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	resp, err := h.fsService.CreateDirectory(r.Context(), &pb.CreateDirectoryRequest{Path: req.Path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleDeleteDirectory handles directory deletion requests
func (h *FileSystemHandler) HandleDeleteDirectory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	path := r.URL.Query().Get("path")
	if path == "" {
		http.Error(w, "Path is required", http.StatusBadRequest)
		return
	}

	resp, err := h.fsService.DeleteDirectory(r.Context(), &pb.DeleteDirectoryRequest{Path: path})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}

// HandleSearchFiles handles file search requests
func (h *FileSystemHandler) HandleSearchFiles(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	query := r.URL.Query().Get("query")
	patterns := r.URL.Query()["pattern"]
	maxResults := 100 // Default limit
	if maxStr := r.URL.Query().Get("maxResults"); maxStr != "" {
		if max, err := strconv.Atoi(maxStr); err == nil {
			maxResults = max
		}
	}

	resp, err := h.fsService.SearchFiles(r.Context(), &pb.SearchRequest{
		Query:        query,
		FilePatterns: patterns,
		MaxResults:   int32(maxResults),
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(resp)
}
