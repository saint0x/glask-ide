package terminal

import (
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"sync"
	"time"

	"github.com/creack/pty"
	"github.com/gorilla/websocket"
)

var logger = log.New(os.Stdout, "TERM: ", log.Ldate|log.Ltime)

// Session represents a terminal session that can handle multiple clients
type Session struct {
	ID      string
	PTY     *os.File
	Command *exec.Cmd
	Clients map[string]*websocket.Conn
	mu      sync.RWMutex
	done    chan struct{}
}

// Manager handles terminal sessions
type Manager struct {
	sessions sync.Map
}

// NewManager creates a new terminal session manager
func NewManager() *Manager {
	logger.Printf("🔧 Terminal manager initialized")
	return &Manager{}
}

// NewSession creates a new terminal session
func (m *Manager) NewSession() (*Session, error) {
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/bash"
	}

	// Create command with proper environment
	cmd := exec.Command(shell)
	cmd.Env = append(os.Environ(),
		"TERM=xterm-256color",
		"COLORTERM=truecolor",
		"LANG=en_US.UTF-8",
	)

	// Create PTY with specific window size
	ptmx, err := pty.Start(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to start PTY: %v", err)
	}

	// Set terminal size (80 columns x 24 rows is standard)
	if err := pty.Setsize(ptmx, &pty.Winsize{
		Rows: 24,
		Cols: 80,
		X:    0,
		Y:    0,
	}); err != nil {
		ptmx.Close()
		cmd.Process.Kill()
		return nil, fmt.Errorf("failed to set terminal size: %v", err)
	}

	session := &Session{
		ID:      generateID(),
		PTY:     ptmx,
		Command: cmd,
		Clients: make(map[string]*websocket.Conn),
		done:    make(chan struct{}),
	}

	// Store session
	m.sessions.Store(session.ID, session)
	logger.Printf("✨ Created new session: %s", session.ID)

	// Start output handler
	go session.handleOutput()

	return session, nil
}

// handleOutput broadcasts terminal output to all connected clients
func (s *Session) handleOutput() {
	defer func() {
		s.Close()
		logger.Printf("🏁 Output handler stopped for session: %s", s.ID)
	}()

	buffer := make([]byte, 32*1024)
	for {
		select {
		case <-s.done:
			return
		default:
			n, err := s.PTY.Read(buffer)
			if err != nil {
				if err != io.EOF {
					logger.Printf("⚠️ Read error in session %s: %v", s.ID, err)
				}
				return
			}

			if n > 0 {
				output := buffer[:n]
				s.broadcast(output)
			}
		}
	}
}

// broadcast sends data to all connected clients
func (s *Session) broadcast(data []byte) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for clientID, conn := range s.Clients {
		err := conn.WriteMessage(websocket.TextMessage, data)
		if err != nil {
			logger.Printf("⚠️ Failed to write to client %s: %v", clientID, err)
			// Don't remove client here to avoid map mutation during iteration
		}
	}
}

// AddClient adds a new client to the session
func (s *Session) AddClient(clientID string, conn *websocket.Conn) {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.Clients[clientID] = conn
	logger.Printf("👤 Client %s joined session %s", clientID, s.ID)
}

// RemoveClient removes a client from the session
func (s *Session) RemoveClient(clientID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if conn, exists := s.Clients[clientID]; exists {
		conn.Close()
		delete(s.Clients, clientID)
		logger.Printf("👋 Client %s left session %s", clientID, s.ID)
	}
}

// Write sends data to the terminal
func (s *Session) Write(data []byte) error {
	_, err := s.PTY.Write(data)
	return err
}

// Close closes the terminal session
func (s *Session) Close() error {
	select {
	case <-s.done:
		return nil
	default:
		close(s.done)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	// Close all client connections
	for clientID, conn := range s.Clients {
		conn.Close()
		delete(s.Clients, clientID)
	}

	// Kill the process
	if s.Command != nil && s.Command.Process != nil {
		s.Command.Process.Kill()
	}

	// Close PTY
	if s.PTY != nil {
		s.PTY.Close()
	}

	logger.Printf("🔚 Session closed: %s", s.ID)
	return nil
}

// GetSession retrieves a session by ID
func (m *Manager) GetSession(id string) (*Session, bool) {
	if sess, ok := m.sessions.Load(id); ok {
		return sess.(*Session), true
	}
	return nil, false
}

// CloseSession closes and removes a session
func (m *Manager) CloseSession(id string) {
	if sess, ok := m.sessions.Load(id); ok {
		session := sess.(*Session)
		session.Close()
		m.sessions.Delete(id)
		logger.Printf("🗑️ Session removed: %s", id)
	}
}

// generateID generates a unique session ID
func generateID() string {
	return fmt.Sprintf("%d", time.Now().UnixNano())
}

// Resize updates the terminal window size
func (s *Session) Resize(rows, cols uint16) error {
	return pty.Setsize(s.PTY, &pty.Winsize{
		Rows: rows,
		Cols: cols,
		X:    0,
		Y:    0,
	})
}
