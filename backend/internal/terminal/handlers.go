package terminal

import (
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

// Error codes for terminal operations
const (
	ErrSessionNotFound  = "SESSION_NOT_FOUND"
	ErrConnectionFailed = "CONNECTION_FAILED"
	ErrTerminalClosed   = "TERMINAL_CLOSED"
	ErrInvalidOperation = "INVALID_OPERATION"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		origin := r.Header.Get("Origin")
		return origin == "http://localhost:3000" // Only allow our frontend origin
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

// HandleTerminalSession handles both session creation and WebSocket connections
func (h *Handler) HandleTerminalSession(w http.ResponseWriter, r *http.Request) {
	// Set CORS headers
	w.Header().Set("Access-Control-Allow-Origin", "http://localhost:3000")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept")
	w.Header().Set("Access-Control-Allow-Credentials", "true")

	// Handle preflight requests
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Handle WebSocket upgrade request
	if websocket.IsWebSocketUpgrade(r) {
		// Additional headers for WebSocket
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Accept, Sec-WebSocket-Accept, Sec-WebSocket-Key, Sec-WebSocket-Version, Sec-WebSocket-Protocol")

		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			log.Printf("Failed to upgrade connection: %v", err)
			h.sendError(w, ErrConnectionFailed, "Failed to establish WebSocket connection")
			return
		}

		// Get session ID from query params
		sessionID := r.URL.Query().Get("sessionId")
		if sessionID == "" {
			conn.Close()
			return
		}

		session, exists := h.manager.GetSession(sessionID)
		if !exists {
			conn.Close()
			h.sendError(w, ErrSessionNotFound, "Session not found")
			return
		}

		// Generate unique client ID
		clientID := uuid.New().String()

		// Add client to session
		session.AddClient(clientID, conn)
		defer session.RemoveClient(clientID)

		// Set up ping handler
		conn.SetPingHandler(func(data string) error {
			return conn.WriteControl(websocket.PongMessage, []byte(data), time.Now().Add(time.Second))
		})

		// Start ping ticker
		go h.startPingTicker(conn, session.done)

		// Handle incoming messages
		for {
			messageType, data, err := conn.ReadMessage()
			if err != nil {
				if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					log.Printf("WebSocket error: %v", err)
				}
				return
			}

			if messageType != websocket.TextMessage {
				continue
			}

			// Try to parse as a terminal message
			var msg TerminalMessage
			if err := json.Unmarshal(data, &msg); err == nil {
				switch msg.Type {
				case "resize":
					if err := session.Resize(msg.Rows, msg.Cols); err != nil {
						log.Printf("Failed to resize terminal: %v", err)
					}
					continue
				case "input":
					if err := session.Write([]byte(msg.Data)); err != nil {
						log.Printf("Failed to write to PTY: %v", err)
						return
					}
					continue
				}
			}

			// If not a special message, treat as raw input
			if err := session.Write(data); err != nil {
				log.Printf("Failed to write to PTY: %v", err)
				return
			}
		}
		return
	}

	// Handle session creation
	if r.Method != http.MethodPost {
		h.sendError(w, ErrInvalidOperation, "Method not allowed")
		return
	}

	h.createSession(w, r)
}

// createSession creates a new terminal session
func (h *Handler) createSession(w http.ResponseWriter, r *http.Request) {
	session, err := h.manager.NewSession()
	if err != nil {
		log.Printf("Failed to create terminal session: %v", err)
		h.sendError(w, ErrConnectionFailed, "Failed to create terminal session")
		return
	}

	response := TerminalResponse{
		SessionID: session.ID,
		Message:   "Session created successfully",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// startPingTicker sends periodic pings to keep the connection alive
func (h *Handler) startPingTicker(conn *websocket.Conn, done chan struct{}) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := conn.WriteControl(websocket.PingMessage, []byte{}, time.Now().Add(time.Second)); err != nil {
				log.Printf("Failed to send ping: %v", err)
				return
			}
		case <-done:
			return
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
