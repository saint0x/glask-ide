"use client"

import { useState, useEffect, useRef } from "react"
import { ChevronDown, ChevronRight, Search, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileIcon } from "./file-icon"

interface FileSystemSidebarProps {
  isOpen: boolean
}

interface FileItem {
  id: string
  name: string
  type: "file" | "folder"
  extension?: string
  children?: FileItem[]
  isOpen?: boolean
  isActive?: boolean
}

// Sample file structure
const initialFiles: FileItem[] = [
  {
    id: "1",
    name: "app",
    type: "folder",
    isOpen: true,
    children: [
      { id: "1-1", name: "layout.tsx", type: "file", extension: "tsx" },
      { id: "1-2", name: "page.tsx", type: "file", extension: "tsx", isActive: true },
      { id: "1-3", name: "globals.css", type: "file", extension: "css" },
    ],
  },
  {
    id: "2",
    name: "components",
    type: "folder",
    isOpen: true,
    children: [
      { id: "2-1", name: "header.tsx", type: "file", extension: "tsx" },
      { id: "2-2", name: "file-system-sidebar.tsx", type: "file", extension: "tsx" },
      { id: "2-3", name: "chat-sidebar.tsx", type: "file", extension: "tsx" },
      { id: "2-4", name: "terminal.tsx", type: "file", extension: "tsx" },
      { id: "2-5", name: "editor.tsx", type: "file", extension: "tsx" },
    ],
  },
  {
    id: "3",
    name: "lib",
    type: "folder",
    children: [{ id: "3-1", name: "utils.ts", type: "file", extension: "ts" }],
  },
  {
    id: "4",
    name: "public",
    type: "folder",
    children: [],
  },
  { id: "5", name: "tailwind.config.ts", type: "file", extension: "ts" },
  { id: "6", name: "tsconfig.json", type: "file", extension: "json" },
  { id: "7", name: "package.json", type: "file", extension: "json" },
  { id: "8", name: "README.md", type: "file", extension: "md" },
]

export function FileSystemSidebar({ isOpen }: FileSystemSidebarProps) {
  const [files, setFiles] = useState<FileItem[]>(initialFiles)
  const [searchQuery, setSearchQuery] = useState("")
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)

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

  const toggleFolder = (id: string) => {
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
  }

  // Adjust display based on sidebar width
  const isCompact = sidebarWidth !== null && sidebarWidth < 150

  const renderFiles = (items: FileItem[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} style={{ paddingLeft: isCompact ? `${level * 8}px` : `${level * 12}px` }}>
        {item.type === "folder" ? (
          <div className="flex flex-col">
            <div
              className="flex cursor-pointer items-center py-1 px-2 hover:bg-[#c0c0c8]/5 rounded-lg"
              onClick={() => toggleFolder(item.id)}
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
        <div className="flex items-center justify-between p-3 border-b border-border">
          <h2 className={cn("text-sm font-semibold text-[#e8e8ed]", isCompact && "truncate")}>
            {isCompact ? "FILES" : "EXPLORER"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="sr-only">New File</span>
          </Button>
        </div>

        {!isCompact && (
          <div className="flex items-center border-b border-border p-3">
            <Search className="mr-2 h-3.5 w-3.5 text-[#a0a0a8]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search files..."
              className="w-full bg-transparent text-sm text-[#e8e8ed] placeholder-[#a0a0a8] focus:outline-none"
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-1">{renderFiles(files)}</div>
      </div>
    </div>
  )
}

