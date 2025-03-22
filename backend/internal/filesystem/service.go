package filesystem

import (
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
}

func NewService() (Service, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	s := &service{
		watcher:   watcher,
		callbacks: make(map[string][]func(FileInfo)),
	}

	// Start watching for filesystem events
	go s.watchLoop()

	return s, nil
}

func (s *service) ListDirectory(path string, recursive bool) ([]FileInfo, error) {
	var files []FileInfo

	walkFn := func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden files and directories
		if strings.HasPrefix(info.Name(), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		files = append(files, FileInfo{
			Path:    path,
			Name:    info.Name(),
			Size:    info.Size(),
			Mode:    s.getModeString(info.Mode()),
			ModTime: info.ModTime(),
		})

		if !recursive && info.IsDir() && path != "." {
			return filepath.SkipDir
		}

		return nil
	}

	if err := filepath.Walk(path, walkFn); err != nil {
		return nil, err
	}

	return files, nil
}

func (s *service) ReadFile(path string) ([]byte, error) {
	return os.ReadFile(path)
}

func (s *service) WriteFile(path string, content []byte) error {
	return os.WriteFile(path, content, 0644)
}

func (s *service) DeleteFile(path string) error {
	return os.Remove(path)
}

func (s *service) CreateDirectory(path string) error {
	return os.MkdirAll(path, 0755)
}

func (s *service) DeleteDirectory(path string) error {
	return os.RemoveAll(path)
}

func (s *service) WatchPath(path string, callback func(FileInfo)) error {
	s.watchMutex.Lock()
	defer s.watchMutex.Unlock()

	if err := s.watcher.Add(path); err != nil {
		return err
	}

	s.callbacks[path] = append(s.callbacks[path], callback)
	return nil
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
			// TODO: Handle errors appropriately
			println("watch error:", err.Error())
		}
	}
}

func (s *service) handleFSEvent(event fsnotify.Event) {
	s.watchMutex.RLock()
	defer s.watchMutex.RUnlock()

	// Get file info
	info, err := os.Stat(event.Name)
	if err != nil {
		// File might have been deleted
		if os.IsNotExist(err) && event.Op&fsnotify.Remove != 0 {
			// Notify about deletion
			fileInfo := FileInfo{
				Path: event.Name,
				Name: filepath.Base(event.Name),
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
		Mode:    s.getModeString(info.Mode()),
		ModTime: info.ModTime(),
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
	return os.Rename(oldPath, newPath)
}

func (s *service) SearchFiles(opts SearchOptions) ([]FileInfo, error) {
	// For the IDE's file explorer, we'll implement a basic file search
	var results []FileInfo
	
	walkFn := func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Skip hidden files
		if strings.HasPrefix(info.Name(), ".") {
			if info.IsDir() {
				return filepath.SkipDir
			}
			return nil
		}

		// Check if file matches any of the patterns
		if len(opts.FilePatterns) > 0 {
			matched := false
			for _, pattern := range opts.FilePatterns {
				if match, _ := filepath.Match(pattern, info.Name()); match {
					matched = true
					break
				}
			}
			if !matched {
				return nil
			}
		}

		// Check if name matches query
		if opts.Query != "" && !strings.Contains(strings.ToLower(info.Name()), strings.ToLower(opts.Query)) {
			return nil
		}

		results = append(results, FileInfo{
			Path:    path,
			Name:    info.Name(),
			Size:    info.Size(),
			Mode:    s.getModeString(info.Mode()),
			ModTime: info.ModTime(),
		})

		if len(results) >= opts.MaxResults && opts.MaxResults > 0 {
			return filepath.SkipAll
		}

		return nil
	}

	err := filepath.Walk(".", walkFn)
	if err != nil {
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
