package terminal

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

// Error codes for terminal operations
const (
	ErrSessionNotFound  = "SESSION_NOT_FOUND"
	ErrConnectionFailed = "CONNECTION_FAILED"
	ErrTerminalClosed   = "TERMINAL_CLOSED"
	ErrInvalidOperation = "INVALID_OPERATION"
	ErrMissingSessionId = "MISSING_SESSION_ID"
	ErrInvalidSessionId = "INVALID_SESSION_ID"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true // Accept all origins since this is for local development only
	},
	ReadBufferSize:   32 * 1024,
	WriteBufferSize:  32 * 1024,
	HandshakeTimeout: 10 * time.Second,
}

// TerminalMessage represents a message from the client
type TerminalMessage struct {
	Type string `json:"type"`
	Data string `json:"data,omitempty"`
	Rows uint16 `json:"rows,omitempty"`
	Cols uint16 `json:"cols,omitempty"`
}

// Handler represents the terminal HTTP handler
type Handler struct {
	manager *Manager
}

// NewHandler creates a new terminal handler
func NewHandler(manager *Manager) *Handler {
	return &Handler{manager: manager}
}

// TerminalResponse represents the API response structure
type TerminalResponse struct {
	SessionID string `json:"sessionId,omitempty"`
	Error     string `json:"error,omitempty"`
	Message   string `json:"message,omitempty"`
}

// HandleTerminalSession handles terminal session creation and WebSocket connections
func (h *Handler) HandleTerminalSession(w http.ResponseWriter, r *http.Request) {
	// Set permissive CORS headers for local development
	w.Header().Set("Access-Control-Allow-Origin", r.Header.Get("Origin"))
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Create new session if POST request
	if r.Method == "POST" {
		session, err := h.manager.NewSession()
		if err != nil {
			h.sendError(w, ErrConnectionFailed, err.Error())
			return
		}

		response := TerminalResponse{
			SessionID: session.ID,
			Message:   "Session created successfully",
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// Handle WebSocket connection
	sessionID := r.URL.Query().Get("sessionId")
	if sessionID == "" {
		h.sendError(w, ErrMissingSessionId, "Session ID is required")
		return
	}

	session, ok := h.manager.GetSession(sessionID)
	if !ok || session == nil {
		h.sendError(w, ErrSessionNotFound, "Session not found")
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}

	// Add client to session
	session.AddClient(sessionID, conn)
	defer session.RemoveClient(sessionID)

	// Handle WebSocket messages
	for {
		var msg TerminalMessage
		err := conn.ReadJSON(&msg)
		if err != nil {
			break
		}

		switch msg.Type {
		case "input":
			if _, err := session.PTY.Write([]byte(msg.Data)); err != nil {
				log.Printf("Failed to write to PTY: %v", err)
			}
		case "resize":
			if err := session.Resize(msg.Rows, msg.Cols); err != nil {
				log.Printf("Failed to resize terminal: %v", err)
			}
		}
	}
}

// sendError sends an error response
func (h *Handler) sendError(w http.ResponseWriter, code string, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusBadRequest)
	json.NewEncoder(w).Encode(TerminalResponse{
		Error:   code,
		Message: message,
	})
}
