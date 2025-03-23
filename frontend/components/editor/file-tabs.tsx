"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileIcon } from "./file-icon"
import { FileItem } from "@/types/file"

interface OpenFile extends FileItem {
  isModified: boolean
  isActive: boolean
}

interface FileTabsProps {
  className?: string
  files: OpenFile[]
  onSelect: (filePath: string) => void
  onClose: (filePath: string) => void
}

export function FileTabs({ className, files, onSelect, onClose }: FileTabsProps) {
  const handleTabClick = (filePath: string) => {
    onSelect(filePath)
  }

  const closeTab = (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onClose(filePath)
  }

  return (
    <div
      className={cn(
        "glassmorphic flex h-9 items-center border-b border-border overflow-x-auto overflow-y-hidden",
        className,
      )}
      style={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="flex min-w-max">
        {files.map((file) => (
          <div
            key={file.path}
            onClick={() => handleTabClick(file.path)}
            className={cn(
              "group flex h-9 min-w-0 max-w-[200px] cursor-pointer items-center border-r border-border px-3 transition-colors",
              file.isActive ? "bg-[rgba(40,40,46,0.6)] text-[#e8e8ed]" : "hover:bg-[rgba(40,40,46,0.4)] text-[#a0a0a8]",
            )}
          >
            <div className="mr-2 flex-shrink-0 w-5 flex items-center justify-center">
              <FileIcon extension={file.extension || ""} />
            </div>
            <div className="truncate text-sm font-medium flex items-center">
              {file.name}
              {file.isModified && <span className="ml-1 text-[#a0a0a8]">●</span>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => closeTab(file.path, e)}
              className="ml-2 h-5 w-5 flex-shrink-0 rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

