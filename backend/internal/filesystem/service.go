package filesystem

import (
	"fmt"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/fsnotify/fsnotify"
)

type service struct {
	watcher    *fsnotify.Watcher
	watchMutex sync.RWMutex
	callbacks  map[string][]func(FileInfo)
	dirPaths   map[string]string // Maps directory names to their absolute paths
	pathMutex  sync.RWMutex
}

func NewService() (Service, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	s := &service{
		watcher:   watcher,
		callbacks: make(map[string][]func(FileInfo)),
		dirPaths:  make(map[string]string),
		pathMutex: sync.RWMutex{},
	}

	// Start watching for filesystem events
	go s.watchLoop()

	return s, nil
}

// RegisterDirectory stores the absolute path for a directory
func (s *service) RegisterDirectory(name, absPath string) {
	s.pathMutex.Lock()
	defer s.pathMutex.Unlock()
	s.dirPaths[name] = absPath
}

func (s *service) resolvePath(path string) string {
	s.pathMutex.RLock()
	defer s.pathMutex.RUnlock()

	// If it's already absolute, return it
	if filepath.IsAbs(path) {
		return path
	}

	// Check if we have a registered path
	if absPath, ok := s.dirPaths[path]; ok {
		return absPath
	}

	// If path is ".", use current directory
	if path == "." {
		pwd, _ := os.Getwd()
		return pwd
	}

	// Default to joining with current directory
	pwd, _ := os.Getwd()
	return filepath.Join(pwd, path)
}

func (s *service) ListDirectory(path string, recursive bool) ([]FileInfo, error) {
	fmt.Printf("ListDirectory called with path: %s, recursive: %v\n", path, recursive)

	// Resolve the actual path
	absPath := s.resolvePath(path)
	fmt.Printf("Resolved path: %s\n", absPath)

	// Check if path exists
	fileInfo, err := os.Stat(absPath)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf("path does not exist: %s", path)
		}
		return nil, fmt.Errorf("failed to access path: %v", err)
	}

	if !fileInfo.IsDir() {
		return nil, fmt.Errorf("path is not a directory: %s", path)
	}

	var files []FileInfo
	walkFn := func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			fmt.Printf("Error walking path %s: %v\n", path, err)
			return nil // Continue walking despite errors
		}

		// Skip hidden files/folders unless explicitly included
		if strings.HasPrefix(info.Name(), ".") {
			if info.IsDir() && !recursive {
				return filepath.SkipDir
			}
			return nil
		}

		// Don't add the root directory itself
		if path == absPath {
			return nil
		}

		files = append(files, FileInfo{
			Path:    path,
			Name:    info.Name(),
			IsDir:   info.IsDir(),
			Size:    info.Size(),
			ModTime: info.ModTime().Unix(),
		})

		if !recursive && info.IsDir() {
			return filepath.SkipDir
		}

		return nil
	}

	if err := filepath.Walk(absPath, walkFn); err != nil {
		return nil, fmt.Errorf("failed to walk directory: %v", err)
	}

	return files, nil
}

func (s *service) getAbsolutePath(path string) (string, error) {
	// Path should already be absolute from metadata
	return path, nil
}

func (s *service) ReadFile(path string) ([]byte, error) {
	absPath, err := s.getAbsolutePath(path)
	if err != nil {
		return nil, err
	}
	return os.ReadFile(absPath)
}

func (s *service) WriteFile(path string, content []byte) error {
	absPath, err := s.getAbsolutePath(path)
	if err != nil {
		return err
	}
	return os.WriteFile(absPath, content, 0644)
}

func (s *service) DeleteFile(path string) error {
	absPath, err := s.getAbsolutePath(path)
	if err != nil {
		return err
	}
	return os.Remove(absPath)
}

func (s *service) CreateDirectory(path string) error {
	absPath, err := s.getAbsolutePath(path)
	if err != nil {
		return err
	}
	return os.MkdirAll(absPath, 0755)
}

func (s *service) DeleteDirectory(path string) error {
	absPath, err := s.getAbsolutePath(path)
	if err != nil {
		return err
	}
	return os.RemoveAll(absPath)
}

func (s *service) WatchPath(path string, callback func(FileInfo)) error {
	s.watchMutex.Lock()
	defer s.watchMutex.Unlock()

	// Add callback
	s.callbacks[path] = append(s.callbacks[path], callback)

	// Start watching the path
	return s.watcher.Add(path)
}

func (s *service) UnwatchPath(path string) error {
	s.watchMutex.Lock()
	defer s.watchMutex.Unlock()

	if err := s.watcher.Remove(path); err != nil {
		return err
	}

	delete(s.callbacks, path)
	return nil
}

func (s *service) watchLoop() {
	for {
		select {
		case event, ok := <-s.watcher.Events:
			if !ok {
				return
			}
			s.handleFSEvent(event)
		case err, ok := <-s.watcher.Errors:
			if !ok {
				return
			}
			fmt.Printf("Error watching filesystem: %v\n", err)
		}
	}
}

func (s *service) handleFSEvent(event fsnotify.Event) {
	// Get file info
	info, err := os.Stat(event.Name)
	if err != nil {
		if os.IsNotExist(err) && event.Op&fsnotify.Remove != 0 {
			// Notify about deletion
			fileInfo := FileInfo{
				Path:    event.Name,
				Name:    filepath.Base(event.Name),
				IsDir:   false,
				Size:    0,
				ModTime: 0,
			}
			s.notifyCallbacks(event.Name, fileInfo)
		}
		return
	}

	// Create FileInfo
	fileInfo := FileInfo{
		Path:    event.Name,
		Name:    info.Name(),
		Size:    info.Size(),
		ModTime: info.ModTime().Unix(),
		IsDir:   info.IsDir(),
	}

	// Notify callbacks
	s.notifyCallbacks(event.Name, fileInfo)
}

func (s *service) notifyCallbacks(path string, info FileInfo) {
	// Notify callbacks for the specific path
	for _, cb := range s.callbacks[path] {
		cb(info)
	}

	// Notify callbacks for parent directories
	dir := filepath.Dir(path)
	for watchPath, callbacks := range s.callbacks {
		if strings.HasPrefix(dir, watchPath) {
			for _, cb := range callbacks {
				cb(info)
			}
		}
	}
}

func (s *service) getModeString(mode os.FileMode) string {
	switch {
	case mode.IsDir():
		return "directory"
	case mode&os.ModeSymlink != 0:
		return "symlink"
	default:
		return "file"
	}
}

func (s *service) MoveFile(oldPath, newPath string) error {
	absOldPath, err := s.getAbsolutePath(oldPath)
	if err != nil {
		return err
	}
	absNewPath, err := s.getAbsolutePath(newPath)
	if err != nil {
		return err
	}
	return os.Rename(absOldPath, absNewPath)
}

func (s *service) SearchFiles(opts SearchOptions) ([]FileInfo, error) {
	var results []FileInfo

	// Get absolute path for search
	var searchPath string
	if filepath.IsAbs(opts.Path) {
		searchPath = opts.Path
	} else {
		searchPath = "/" + opts.Path
	}

	walkFn := func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return nil
		}

		// Skip hidden files
		if strings.HasPrefix(info.Name(), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Use the full path since we're not working relative to a workspace
		results = append(results, FileInfo{
			Path:    path,
			Name:    info.Name(),
			Size:    info.Size(),
			ModTime: info.ModTime().Unix(),
			IsDir:   info.IsDir(),
		})

		return nil
	}

	if err := filepath.Walk(searchPath, walkFn); err != nil {
		return nil, err
	}

	return results, nil
}

func (s *service) SearchContent(opts SearchOptions) ([]Reference, error) {
	// This will be implemented later when we add code indexing
	return nil, nil
}

func (s *service) SearchSymbols(opts SearchOptions) ([]Symbol, error) {
	// This will be implemented later when we add code indexing
	return nil, nil
}

func (s *service) IndexFile(path string) error {
	// This will be implemented later when we add code indexing
	return nil
}

func (s *service) IndexDirectory(path string) error {
	// This will be implemented later when we add code indexing
	return nil
}

func (s *service) GetFileMetadata(path string) (Metadata, error) {
	// This will be implemented later when we add code indexing
	return Metadata{}, nil
}
