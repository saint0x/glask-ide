package filesystem

import "time"

// FileInfo represents metadata about a file
type FileInfo struct {
	Path      string    `json:"path"`
	Name      string    `json:"name"`
	Size      int64     `json:"size"`
	Mode      string    `json:"mode"` // file, directory, symlink
	ModTime   time.Time `json:"modTime"`
	Language  string    `json:"language,omitempty"`
	Metadata  Metadata  `json:"metadata,omitempty"`
}

// Metadata holds additional file information
type Metadata struct {
	Symbols     []Symbol     `json:"symbols,omitempty"`
	Imports     []string     `json:"imports,omitempty"`
	References  []Reference  `json:"references,omitempty"`
	LastIndexed time.Time    `json:"lastIndexed"`
}

// Symbol represents a code symbol (function, class, variable, etc.)
type Symbol struct {
	Name       string `json:"name"`
	Type       string `json:"type"` // function, class, interface, variable
	Signature  string `json:"signature,omitempty"`
	LineNumber int    `json:"lineNumber"`
	Column     int    `json:"column"`
	Scope      string `json:"scope,omitempty"`
}

// Reference represents a usage/reference of a symbol
type Reference struct {
	Symbol     string `json:"symbol"`
	LineNumber int    `json:"lineNumber"`
	Column     int    `json:"column"`
	Type       string `json:"type"` // call, declaration, usage
}

// SearchOptions represents options for file/content search
type SearchOptions struct {
	Query        string   `json:"query"`
	FilePatterns []string `json:"filePatterns,omitempty"`
	MaxResults   int      `json:"maxResults"`
	SymbolTypes  []string `json:"symbolTypes,omitempty"`
	Recursive    bool     `json:"recursive"`
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
} 