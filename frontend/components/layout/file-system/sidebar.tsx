"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { ChevronDown, ChevronRight, Search, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileIcon } from "./file-icon"
import { listDirectory, createDirectory, searchFiles, registerDirectory, getWorkspace, setWorkspace, clearWorkspace as clearWorkspaceStorage } from "@/lib/api/filesystem"
import type { FileItem } from "@/types/file"
import { Input } from "@/components/ui/input"
import debounce from "lodash/debounce"
import { FolderOpen } from "lucide-react"

interface FileSystemSidebarProps {
  isOpen: boolean
  onFileSelect: (file: FileItem) => void
}

export function FileSystemSidebar({ isOpen, onFileSelect }: FileSystemSidebarProps) {
  const [files, setFiles] = useState<FileItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workspacePath, setWorkspacePath] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  // Load initial files
  useEffect(() => {
    // Only load files if we have a workspace path
    if (workspacePath) {
      loadFiles(workspacePath)
    }
  }, [workspacePath])

  // Update useEffect to use new workspace functions
  useEffect(() => {
    const workspace = getWorkspace()
    if (workspace) {
      setWorkspacePath(workspace.path)
    }
  }, [])

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query) {
        loadFiles(".")
        setIsSearching(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        const results = await searchFiles(query)
        setFiles(results)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to search files")
        console.error("Failed to search files:", err)
      } finally {
        setIsLoading(false)
      }
    }, 300),
    []
  )

  // Handle search input
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value
    setSearchQuery(query)
    setIsSearching(!!query)
    debouncedSearch(query)
  }

  // Get sidebar width for responsive adjustments
  useEffect(() => {
    if (sidebarRef.current) {
      setSidebarWidth(sidebarRef.current.clientWidth)

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setSidebarWidth(entry.contentRect.width)
        }
      })

      resizeObserver.observe(sidebarRef.current)

      return () => {
        if (sidebarRef.current) {
          resizeObserver.unobserve(sidebarRef.current)
        }
        resizeObserver.disconnect()
      }
    }
  }, [isOpen])

  const handleSelectWorkspace = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) {
      console.log("No files selected")
      return
    }

    const firstFile = files[0]
    
    // Try different methods to get the directory path
    let dirPath: string | null = null
    
    // Method 1: Using webkitRelativePath to construct absolute path
    if (firstFile.webkitRelativePath) {
      const pathParts = firstFile.webkitRelativePath.split('/')
      if (pathParts.length > 1) {
        // Get the root directory name
        const rootDir = pathParts[0]
        // Construct absolute path using current working directory
        dirPath = `/Users/saint/Desktop/${rootDir}`
      }
    }
    
    // Method 2: Using path property (works in some browsers)
    if (!dirPath && 'path' in firstFile) {
      const path = (firstFile as any).path
      if (path) {
        // If path is already absolute, use it
        if (path.startsWith('/')) {
          dirPath = path.split(firstFile.name)[0].replace(/\/$/, '')
        } else {
          // Construct absolute path
          dirPath = `/Users/saint/Desktop/${path.split(firstFile.name)[0]}`.replace(/\/$/, '')
        }
      }
    }

    if (!dirPath) {
      console.error("Could not determine directory path")
      setError("Could not determine directory path. Please try a different folder.")
      return
    }

    console.log("Selected directory path:", dirPath)

    try {
      // Register the directory with its absolute path
      await registerDirectory("workspace", dirPath)
      console.log("Directory registered successfully:", dirPath)

      // Set the workspace path in storage
      setWorkspace(dirPath)
      console.log("Workspace path set in storage:", dirPath)

      // Set the workspace path in state
      setWorkspacePath(dirPath)

      // Load the files from the registered directory
      await loadFiles(dirPath)
    } catch (error) {
      console.error("Failed to register directory:", error)
      clearWorkspace()
      setError("Failed to register workspace directory. Please try again.")
    }
  }

  const loadFiles = async (path: string) => {
    try {
      setIsLoading(true)
      setError(null)
      
      console.log("Loading files from path:", path)
      const items = await listDirectory(path)
      console.log("Files loaded:", items)
      
      // No need for additional transformation since listDirectory already returns the correct format
      setFiles(items)
    } catch (error) {
      console.error("Failed to load files:", error)
      clearWorkspace()
      setError("Failed to load files. Please try selecting the workspace again.")
    } finally {
      setIsLoading(false)
    }
  }

  // Clear workspace function
  const clearWorkspace = () => {
    clearWorkspaceStorage()
    setWorkspacePath(null)
    setFiles([])
    setSearchQuery("")
    setIsSearching(false)
    setError(null)
  }

  const handleCreateFolder = async () => {
    if (!workspacePath) return

    try {
      setIsLoading(true)
      setError(null)
      await createDirectory(workspacePath)
      await loadFiles(workspacePath) // Reload files after creating directory
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create folder")
      console.error("Failed to create folder:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const toggleFolder = async (id: string, item: FileItem) => {
    if (!item.path) return

    setFiles((prevFiles) => {
      const updateFiles = (items: FileItem[]): FileItem[] => {
        return items.map((item) => {
          if (item.id === id) {
            return { ...item, isOpen: !item.isOpen }
          }
          if (item.children) {
            return { ...item, children: updateFiles(item.children) }
          }
          return item
        })
      }
      return updateFiles(prevFiles)
    })

    // Load children if folder is being opened and has no children yet
    if (item.type === "folder" && (!item.children || item.children.length === 0)) {
      try {
        const children = await listDirectory(item.path)
        setFiles((prevFiles) => {
          const updateFiles = (items: FileItem[]): FileItem[] => {
            return items.map((prevItem) => {
              if (prevItem.id === id) {
                return {
                  ...prevItem,
                  children: children.map(child => ({
                    ...child,
                    id: child.path, // Use the full path as the id
                    isOpen: false,
                    children: child.type === "folder" ? [] : undefined
                  }))
                }
              }
              if (prevItem.children) {
                return { ...prevItem, children: updateFiles(prevItem.children) }
              }
              return prevItem
            })
          }
          return updateFiles(prevFiles)
        })
      } catch (err) {
        console.error("Failed to load folder contents:", err)
        setError("Failed to load folder contents")
      }
    }
  }

  // Adjust display based on sidebar width
  const isCompact = sidebarWidth !== null && sidebarWidth < 150

  const handleFileClick = (file: FileItem) => {
    if (file.type === "file") {
      onFileSelect(file)
    }
  }

  const renderFiles = (items: FileItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} style={{ paddingLeft: isCompact ? `${level * 8}px` : `${level * 12}px` }}>
        {item.type === "folder" ? (
          <div className="flex flex-col">
            <div
              className="flex cursor-pointer items-center py-1 px-2 hover:bg-[#c0c0c8]/5 rounded-lg"
              onClick={() => toggleFolder(item.id, item)}
            >
              <Button variant="ghost" size="icon" className="mr-1.5 h-4 w-4 p-0 hover:bg-transparent">
                {item.isOpen ? (
                  <ChevronDown className="h-3.5 w-3.5 text-[#a0a0a8]" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-[#a0a0a8]" />
                )}
              </Button>
              <span className={cn("text-sm text-[#e8e8ed]", isCompact && "truncate max-w-[60px]")}>{item.name}</span>
            </div>
            {item.isOpen && item.children && <div className="mt-1">{renderFiles(item.children, level + 1)}</div>}
          </div>
        ) : (
          <div
            className={cn(
              "flex cursor-pointer items-center py-1 px-2 hover:bg-[#c0c0c8]/5 rounded-lg",
              item.isActive && "bg-[#c0c0c8]/10 font-medium text-[#e8e8ed]",
            )}
            onClick={() => handleFileClick(item)}
          >
            <div className={cn("ml-4 mr-1.5 w-5 flex justify-center", isCompact && "ml-2 mr-1")}>
              <FileIcon extension={item.extension || ""} />
            </div>
            <span className={cn("text-sm text-[#e8e8ed]", isCompact && "truncate max-w-[60px]")}>{item.name}</span>
          </div>
        )}
      </div>
    ))
  }

  const getDirectoryName = (path: string | null) => {
    if (!path) return null
    return path.split('/').pop()
  }

  return (
    <div
      ref={sidebarRef}
      className="h-full w-full border-r border-border rounded-tr-xl rounded-br-xl"
      style={{
        background: "rgba(26, 26, 32, 0.8)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)",
      }}
    >
      <div className="flex h-full flex-col">
        <div className="flex items-center p-3 border-b border-border">
          <div className="flex-1 flex justify-center">
            <h2 className={cn("text-sm font-semibold text-[#e8e8ed] px-2", isCompact && "truncate")}>
              {isCompact ? "FILES" : isSearching ? "SEARCH RESULTS" : getDirectoryName(workspacePath) || "NO WORKSPACE"}
            </h2>
          </div>
          <div className="flex items-center gap-1">
            {workspacePath && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
                onClick={clearWorkspace}
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Clear Workspace</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
              onClick={() => document.getElementById("folder-select")?.click()}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">Open Folder</span>
            </Button>
            <input
              type="file"
              id="folder-select"
              // @ts-ignore
              webkitdirectory="true"
              directory="true"
              mozdirectory="true"
              className="hidden"
              onChange={handleSelectWorkspace}
            />
          </div>
        </div>

        {!workspacePath ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <FolderOpen className="h-8 w-8 text-[#a0a0a8] mb-2" />
            <p className="text-sm text-[#a0a0a8]">No workspace selected</p>
            <p className="text-sm text-[#a0a0a8]">Click the + button to open a folder</p>
          </div>
        ) : (
          <>
            {!isCompact && (
              <div className="flex items-center border-b border-border p-3">
                <Search className={cn("mr-2 h-3.5 w-3.5", isSearching ? "text-[#4d9cf6]" : "text-[#a0a0a8]")} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={handleSearch}
                  placeholder="Search files..."
                  className="w-full bg-transparent text-sm text-[#e8e8ed] placeholder-[#a0a0a8] focus:outline-none"
                />
                {isSearching && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
                    onClick={() => {
                      setSearchQuery("")
                      setIsSearching(false)
                      loadFiles(workspacePath)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    <span className="sr-only">Clear search</span>
                  </Button>
                )}
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-1">
              {error ? (
                <div className="p-3 text-sm text-red-500">{error}</div>
              ) : isLoading ? (
                <div className="flex items-center justify-center p-3">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4d9cf6] border-t-transparent" />
                  <span className="ml-2 text-sm text-[#a0a0a8]">
                    {isSearching ? "Searching..." : "Loading..."}
                  </span>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <FolderOpen className="h-8 w-8 text-[#a0a0a8] mb-2" />
                  <p className="text-sm text-[#a0a0a8]">
                    {isSearching ? "No files found" : "No files in this directory"}
                  </p>
                </div>
              ) : (
                renderFiles(files)
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

