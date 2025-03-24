import type { FileItem } from "@/types/file"

const API_BASE_URL = "http://localhost:3001"
const WORKSPACE_STORAGE_KEY = "glask:workspace"
const FILE_CACHE_PREFIX = "glask:file:"
const DIRECTORY_CACHE_PREFIX = "glask:dir:"
const CACHE_TTL = 1000 * 60 * 60 // 1 hour

interface FileSystemResponse {
  items: Array<{
    path: string
    name: string
    size: number
    mode: string
    modTime: number
    isDir: boolean
  }>
}

interface WorkspaceInfo {
  name: string
  path: string
  timestamp: number
}

// Helper function to ensure paths are properly formatted
function normalizePath(path: string): string {
  if (!path) return ""
  
  // Convert Windows backslashes to forward slashes
  let normalized = path.replace(/\\/g, '/')
  
  // Remove any trailing slashes
  normalized = normalized.replace(/\/+$/, '')
  
  // If path is already absolute, return it normalized
  if (normalized.startsWith('/')) {
    return normalized
  }
  
  // If we have a workspace, prepend its path for relative paths
  const workspace = getWorkspace()
  if (workspace) {
    // If the path doesn't already include the workspace path, prepend it
    if (!normalized.includes(workspace.path)) {
      return `${workspace.path}/${normalized}`
    }
    return normalized
  }
  
  // If no workspace and path is not absolute, make it absolute using the Desktop path
  return `/Users/saint/Desktop/${normalized}`
}

// Get current workspace info
export function getWorkspace(): WorkspaceInfo | null {
  const stored = localStorage.getItem(WORKSPACE_STORAGE_KEY)
  if (!stored) return null
  
  try {
    const workspace = JSON.parse(stored) as WorkspaceInfo
    return workspace
  } catch (err) {
    console.error("Failed to parse workspace info:", err)
    return null
  }
}

// Set current workspace info
export function setWorkspace(path: string): void {
  // Ensure the path is absolute and normalized
  const normalizedPath = normalizePath(path)
  
  const workspace: WorkspaceInfo = {
    name: path.split('/').pop() || 'workspace',
    path: normalizedPath,
    timestamp: Date.now()
  }
  localStorage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(workspace))
  console.log("Workspace set:", workspace)
}

// Clear workspace info
export function clearWorkspace(): void {
  localStorage.removeItem(WORKSPACE_STORAGE_KEY)
  // Clear all cached files and directories
  Object.keys(localStorage).forEach(key => {
    if (key.startsWith(FILE_CACHE_PREFIX) || key.startsWith(DIRECTORY_CACHE_PREFIX)) {
      localStorage.removeItem(key)
    }
  })
}

// Cache helpers
function getCachedItem<T>(key: string): T | null {
  const stored = localStorage.getItem(key)
  if (!stored) return null
  
  try {
    const { data, timestamp } = JSON.parse(stored)
    if (Date.now() - timestamp > CACHE_TTL) {
      localStorage.removeItem(key)
      return null
    }
    return data as T
  } catch (err) {
    console.error("Failed to parse cached item:", err)
    return null
  }
}

function setCachedItem(key: string, data: any): void {
  const item = {
    data,
    timestamp: Date.now()
  }
  localStorage.setItem(key, JSON.stringify(item))
}

export async function listDirectory(path: string): Promise<FileItem[]> {
  const normalizedPath = normalizePath(path)
  const cacheKey = DIRECTORY_CACHE_PREFIX + normalizedPath
  
  // Try to get from cache first
  const cached = getCachedItem<FileItem[]>(cacheKey)
  if (cached) {
    console.log("Using cached directory listing:", normalizedPath)
    return cached
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/fs/list?path=${encodeURIComponent(normalizedPath)}`)
    if (!response.ok) {
      throw new Error(`Failed to list directory: ${response.statusText}`)
    }
    const data: FileSystemResponse = await response.json()
    console.log("Raw response data:", data)
    
    const items: FileItem[] = data.items.map(item => ({
      id: item.path,
      name: item.name,
      path: item.path,
      type: item.isDir ? "folder" as const : "file" as const,
      extension: !item.isDir ? item.name.split(".").pop() || "" : undefined,
      children: item.isDir ? [] : undefined,
      isOpen: false,
      isActive: false
    }))
    
    console.log("Transformed items:", items)
    
    // Cache the result
    setCachedItem(cacheKey, items)
    return items
  } catch (err) {
    // If request fails and we have cached data, use it as fallback
    const cached = getCachedItem<FileItem[]>(cacheKey)
    if (cached) {
      console.log("Using cached directory listing as fallback:", normalizedPath)
      return cached
    }
    throw err
  }
}

export async function readFile(path: string): Promise<string> {
  if (!path) throw new Error("Path is required")
  
  const normalizedPath = normalizePath(path)
  const cacheKey = FILE_CACHE_PREFIX + normalizedPath
  
  // Try to get from cache first
  const cached = getCachedItem<string>(cacheKey)
  if (cached) {
    console.log("Using cached file content:", normalizedPath)
    return cached
  }
  
  console.log("Reading file:", normalizedPath)
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/fs/read?path=${encodeURIComponent(normalizedPath)}`, {
      headers: {
        'Accept': 'text/plain,*/*'
      }
    })
    
    if (!response.ok) {
      console.error("Failed to read file:", {
        status: response.status,
        statusText: response.statusText,
        path: normalizedPath
      })
      throw new Error(`Failed to read file: ${response.statusText}`)
    }
    
    const content = await response.text()
    // Cache the result
    setCachedItem(cacheKey, content)
    return content
  } catch (err) {
    // If request fails and we have cached data, use it as fallback
    const cached = getCachedItem<string>(cacheKey)
    if (cached) {
      console.log("Using cached file content as fallback:", normalizedPath)
      return cached
    }
    throw err
  }
}

export async function writeFile(path: string, content: string): Promise<void> {
  if (!path) throw new Error("Path is required")
  
  const normalizedPath = normalizePath(path)
  console.log("Writing file:", normalizedPath)
  
  try {
    // Convert content to base64
    const contentBuffer = new TextEncoder().encode(content)
    const base64Content = btoa(String.fromCharCode(...contentBuffer))
    
    const response = await fetch(`${API_BASE_URL}/api/fs/write`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        path: normalizedPath, 
        content: base64Content
      }),
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error("Failed to write file:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        path: normalizedPath
      })
      throw new Error(`Failed to write file: ${response.statusText}`)
    }
    
    console.log("File written successfully:", normalizedPath)
    
    // Update cache
    const cacheKey = FILE_CACHE_PREFIX + normalizedPath
    setCachedItem(cacheKey, content)
    
    // Invalidate directory cache for the parent directory
    const parentDir = normalizedPath.substring(0, normalizedPath.lastIndexOf('/'))
    if (parentDir) {
      localStorage.removeItem(DIRECTORY_CACHE_PREFIX + parentDir)
    }
  } catch (err) {
    console.error("Error writing file:", err)
    throw err
  }
}

export async function createDirectory(path: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/fs/mkdir`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ path }),
  })
  if (!response.ok) {
    throw new Error(`Failed to create directory: ${response.statusText}`)
  }
}

export async function searchFiles(query: string): Promise<FileItem[]> {
  const response = await fetch(`${API_BASE_URL}/api/fs/search?q=${encodeURIComponent(query)}`)
  if (!response.ok) {
    throw new Error(`Failed to search files: ${response.statusText}`)
  }
  return response.json()
}

export async function registerDirectory(name: string, path: string): Promise<void> {
  const normalizedPath = normalizePath(path)
  console.log("Registering directory with normalized path:", normalizedPath)
  
  const response = await fetch(`${API_BASE_URL}/api/fs/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ 
      name,
      path: normalizedPath
    }),
  })
  
  if (!response.ok) {
    console.error("Failed to register directory:", {
      status: response.status,
      statusText: response.statusText,
      path: normalizedPath
    })
    throw new Error(`Failed to register directory: ${response.statusText}`)
  }
  
  // Clear any existing cache when registering a new directory
  clearWorkspace()
}

export async function deleteDirectory(path: string): Promise<boolean> {
  const response = await fetch(`/api/fs/directory?path=${encodeURIComponent(path)}`, {
    method: "DELETE",
  })

  if (!response.ok) {
    throw new Error(`Failed to delete directory: ${response.statusText}`)
  }

  const data = await response.json()
  return data.success
} 