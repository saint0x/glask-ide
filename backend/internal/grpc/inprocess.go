package grpc

import (
	"context"
	"net"

	"google.golang.org/grpc"
	"google.golang.org/grpc/test/bufconn"
)

const bufSize = 1024 * 1024

// InProcessServer creates a gRPC server for in-process communication
type InProcessServer struct {
	*grpc.Server
	listener *bufconn.Listener
}

// NewInProcessServer creates a new in-process gRPC server
func NewInProcessServer() *InProcessServer {
	listener := bufconn.Listen(bufSize)
	server := grpc.NewServer()

	return &InProcessServer{
		Server:   server,
		listener: listener,
	}
}

// Start starts the in-process server
func (s *InProcessServer) Start() {
	go s.Server.Serve(s.listener)
}

// Stop stops the in-process server
func (s *InProcessServer) Stop() {
	s.Server.Stop()
}

// Dial creates a client connection to the in-process server
func (s *InProcessServer) Dial(ctx context.Context) (*grpc.ClientConn, error) {
	return grpc.DialContext(ctx, "bufnet",
		grpc.WithContextDialer(func(context.Context, string) (net.Conn, error) {
			return s.listener.Dial()
		}),
		grpc.WithInsecure(),
	)
} 