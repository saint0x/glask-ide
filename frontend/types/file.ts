export interface FileTab {
  id: string
  name: string
  path: string
  extension: string
  isModified: boolean
  isActive: boolean
}

export interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  extension?: string
  children?: FileItem[]
  isOpen?: boolean
  isActive?: boolean
}

