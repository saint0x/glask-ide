package terminal

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // Allow all origins for local development
	},
}

// Handler represents the terminal HTTP handler
type Handler struct {
	manager *Manager
}

// NewHandler creates a new terminal handler
func NewHandler(manager *Manager) *Handler {
	return &Handler{manager: manager}
}

type CreateSessionResponse struct {
	SessionID string `json:"sessionId"`
}

// CreateSession creates a new terminal session
func (h *Handler) CreateSession(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}

	session, err := h.manager.NewSession()
	if err != nil {
		log.Printf("Failed to create terminal session: %v", err)
		http.Error(w, "Failed to create terminal session", http.StatusInternalServerError)
		return
	}

	response := CreateSessionResponse{
		SessionID: session.ID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

// HandleTerminal handles WebSocket connections for terminal sessions
func (h *Handler) HandleTerminal(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("sessionId")
	if sessionID == "" {
		http.Error(w, "Session ID is required", http.StatusBadRequest)
		return
	}

	session, ok := h.manager.GetSession(sessionID)
	if !ok {
		http.Error(w, "Session not found", http.StatusNotFound)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("Failed to upgrade connection: %v", err)
		return
	}
	defer conn.Close()

	log.Printf("WebSocket connection established for session: %s", sessionID)

	// Create channels for communication
	done := make(chan struct{})
	defer close(done)

	// Handle terminal input (from WebSocket to terminal)
	go func() {
		for {
			_, message, err := conn.ReadMessage()
			if err != nil {
				if !websocket.IsCloseError(err, websocket.CloseGoingAway, websocket.CloseNormalClosure) {
					log.Printf("WebSocket read error: %v", err)
				}
				return
			}

			_, err = session.Write(message)
			if err != nil {
				log.Printf("Failed to write to terminal: %v", err)
				return
			}
		}
	}()

	// Handle terminal output (from terminal to WebSocket)
	buffer := make([]byte, 1024)
	for {
		n, err := session.Read(buffer)
		if err != nil {
			log.Printf("Failed to read from terminal: %v", err)
			return
		}

		if n > 0 {
			err = conn.WriteMessage(websocket.TextMessage, buffer[:n])
			if err != nil {
				log.Printf("Failed to write to WebSocket: %v", err)
				return
			}
		}
	}
}
