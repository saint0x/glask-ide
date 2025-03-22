package terminal

import (
	"fmt"
	"log"
	"os"
	"os/exec"
	"sync"
)

var logger = log.New(os.Stdout, "TERM: ", log.Ldate|log.Ltime)

// Session represents a terminal session
type Session struct {
	ID      string
	cmd     *exec.Cmd
	stdin   *os.File
	stdout  *os.File
	done    chan struct{}
	cleanup sync.Once
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
	// Get user's shell
	shell := os.Getenv("SHELL")
	if shell == "" {
		shell = "/bin/sh"
	}
	logger.Printf("🐚 Creating new terminal session with shell: %s", shell)

	// Create command
	cmd := exec.Command(shell)
	cmd.Env = append(os.Environ(), "TERM=xterm-256color")

	// Create pipes for stdin/stdout
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return nil, fmt.Errorf("failed to create stdin pipe: %v", err)
	}

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		stdin.Close()
		return nil, fmt.Errorf("failed to create stdout pipe: %v", err)
	}

	// Start the command
	if err := cmd.Start(); err != nil {
		stdin.Close()
		stdout.Close()
		return nil, fmt.Errorf("failed to start command: %v", err)
	}

	session := &Session{
		ID:     generateID(),
		cmd:    cmd,
		stdin:  stdin.(*os.File),
		stdout: stdout.(*os.File),
		done:   make(chan struct{}),
	}

	// Store session
	m.sessions.Store(session.ID, session)
	logger.Printf("✨ New terminal session created: %s", session.ID)

	return session, nil
}

// Write writes data to the terminal
func (s *Session) Write(p []byte) (n int, err error) {
	return s.stdin.Write(p)
}

// Read reads data from the terminal
func (s *Session) Read(p []byte) (n int, err error) {
	return s.stdout.Read(p)
}

// Close closes the terminal session
func (s *Session) Close() {
	s.cleanup.Do(func() {
		logger.Printf("🔄 Cleaning up terminal session: %s", s.ID)
		close(s.done)
		if s.stdin != nil {
			s.stdin.Close()
		}
		if s.stdout != nil {
			s.stdout.Close()
		}
		if s.cmd != nil && s.cmd.Process != nil {
			s.cmd.Process.Kill()
			logger.Printf("✅ Terminal process killed for session: %s", s.ID)
		}
	})
}

// IsClosed checks if the session is closed
func (s *Session) IsClosed() bool {
	select {
	case <-s.done:
		return true
	default:
		return false
	}
}

// GetSession gets a session by ID
func (m *Manager) GetSession(id string) (*Session, bool) {
	if sess, ok := m.sessions.Load(id); ok {
		logger.Printf("📍 Retrieved session: %s", id)
		return sess.(*Session), true
	}
	logger.Printf("❓ Session not found: %s", id)
	return nil, false
}

// CloseSession closes and removes a session
func (m *Manager) CloseSession(id string) {
	if sess, ok := m.sessions.Load(id); ok {
		sess.(*Session).Close()
		m.sessions.Delete(id)
		logger.Printf("🗑️ Session removed from manager: %s", id)
	}
}

// generateID generates a unique session ID
func generateID() string {
	id := fmt.Sprintf("sess_%d", os.Getpid())
	logger.Printf("🆔 Generated new session ID: %s", id)
	return id
}
