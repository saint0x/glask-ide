package filesystem

import "time"

// FileInfo represents metadata about a file
type FileInfo struct {
	Path    string `json:"path"`
	Name    string `json:"name"`
	IsDir   bool   `json:"isDir"`
	Size    int64  `json:"size"`
	ModTime int64  `json:"modTime"` // Unix timestamp
}

// Metadata holds additional file information
type Metadata struct {
	Symbols     []Symbol    `json:"symbols,omitempty"`
	Imports     []string    `json:"imports,omitempty"`
	References  []Reference `json:"references,omitempty"`
	LastIndexed time.Time   `json:"lastIndexed"`
}

// Symbol represents a code symbol (function, class, variable, etc.)
type Symbol struct {
	Name     string   `json:"name"`
	Kind     string   `json:"kind"`
	Path     string   `json:"path"`
	Line     int      `json:"line"`
	Column   int      `json:"column"`
	Parent   string   `json:"parent,omitempty"`
	Children []string `json:"children,omitempty"`
	FileInfo FileInfo
}

// Reference represents a usage/reference of a symbol
type Reference struct {
	Path     string `json:"path"`
	Line     int    `json:"line"`
	Column   int    `json:"column"`
	Context  string `json:"context"`
	Snippet  string `json:"snippet"`
	FileInfo FileInfo
}

// SearchOptions represents options for file/content search
type SearchOptions struct {
	Query         string
	Path          string
	MaxResults    int
	IncludeHidden bool
	FileTypes     []string
	FilePatterns  []string // Patterns to match file names against (e.g., "*.go", "*.ts")
}

// Service defines the interface for filesystem operations
type Service interface {
	// File operations
	ReadFile(path string) ([]byte, error)
	WriteFile(path string, content []byte) error
	DeleteFile(path string) error
	MoveFile(oldPath, newPath string) error

	// Directory operations
	ListDirectory(path string, recursive bool) ([]FileInfo, error)
	CreateDirectory(path string) error
	DeleteDirectory(path string) error

	// Search operations
	SearchFiles(opts SearchOptions) ([]FileInfo, error)
	SearchContent(opts SearchOptions) ([]Reference, error)
	SearchSymbols(opts SearchOptions) ([]Symbol, error)

	// Indexing operations
	IndexFile(path string) error
	IndexDirectory(path string) error
	GetFileMetadata(path string) (Metadata, error)

	// Watch operations
	WatchPath(path string, callback func(FileInfo)) error
	UnwatchPath(path string) error

	// New method
	RegisterDirectory(name, absPath string)
}
