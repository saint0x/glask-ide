import { FileItem } from "@/types/file"

const API_BASE_URL = "http://localhost:3001"

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

export async function listDirectory(path: string, recursive: boolean = false): Promise<FileItem[]> {
  if (!path) {
    throw new Error("Path is required")
  }

  const normalizedPath = normalizePath(path)
  console.log("Listing directory:", normalizedPath)
  
  const response = await fetch(
    `${API_BASE_URL}/api/fs/list?path=${encodeURIComponent(normalizedPath)}&recursive=${recursive}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to list directory:", errorText)
    throw new Error(`Failed to list directory: ${response.statusText}`)
  }

  const data: FileSystemResponse = await response.json()
  
  // Convert the API response to our FileItem format
  return data.items.map((item) => ({
    id: normalizePath(item.path), // Use normalized path as unique identifier
    name: item.name,
    type: item.isDir ? "folder" : "file",
    extension: !item.isDir ? item.name.split(".").pop() : undefined,
    children: item.isDir ? [] : undefined,
    isOpen: false,
    isActive: false,
    path: normalizePath(item.path), // Keep the normalized full path
  }))
}

export async function createDirectory(path: string): Promise<boolean> {
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

  const data = await response.json()
  return data.success
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

export async function searchFiles(query: string, maxResults: number = 100): Promise<FileItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/fs/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  )

  if (!response.ok) {
    throw new Error(`Failed to search files: ${response.statusText}`)
  }

  const data: FileSystemResponse = await response.json()
  
  return data.items.map((item) => ({
    id: item.path,
    name: item.name,
    type: item.isDir ? "folder" : "file",
    extension: item.isDir ? undefined : item.name.split(".").pop(),
    children: item.isDir ? [] : undefined,
    isOpen: false,
    isActive: false,
  }))
}

export async function registerDirectory(name: string, absPath: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/fs/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      path: absPath,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Failed to register directory:", errorText)
    throw new Error(`Failed to register directory: ${response.statusText}`)
  }
}

// Helper function to ensure paths are properly formatted
function normalizePath(path: string): string {
  // Convert Windows backslashes to forward slashes
  path = path.replace(/\\/g, '/')
  
  // Remove any trailing slashes
  path = path.replace(/\/+$/, '')
  
  return path
} 