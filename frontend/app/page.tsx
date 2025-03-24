"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Header, FileSystemSidebar, ChatSidebar } from "@/components/layout"
import { Terminal } from "@/components/terminal"
import { Editor } from "@/components/editor"
import { FileTabs } from "@/components/editor/file-tabs"
import { cn } from "@/lib/utils"
import type { FileItem } from "@/types/file"

interface OpenFile extends FileItem {
  isModified: boolean
  isActive: boolean
  path: string
}

export default function IDE() {
  const [fileSystemOpen, setFileSystemOpen] = useState(true)
  const [chatOpen, setChatOpen] = useState(true)
  const [terminalOpen, setTerminalOpen] = useState(true)
  const [terminalHeight, setTerminalHeight] = useState("var(--terminal-height)")
  const [mounted, setMounted] = useState(false)
  const [openFiles, setOpenFiles] = useState<OpenFile[]>([])
  const [selectedFile, setSelectedFile] = useState<OpenFile | null>(null)

  // Custom sidebar widths
  const [fileSystemWidth, setFileSystemWidth] = useState<number | null>(null)
  const [chatSidebarWidth, setChatSidebarWidth] = useState<number | null>(null)

  // Refs for resizing
  const fileSystemResizeRef = useRef<HTMLDivElement>(null)
  const chatSidebarResizeRef = useRef<HTMLDivElement>(null)

  // Initialize state from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedFileSystemState = localStorage.getItem("ide_filesystem_state")
      const savedChatState = localStorage.getItem("ide_chat_state")
      const savedTerminalState = localStorage.getItem("ide_terminal_state")
      const savedFileSystemWidth = localStorage.getItem("ide_filesystem_width")
      const savedChatSidebarWidth = localStorage.getItem("ide_chat_sidebar_width")

      // Default to true for file system and terminal if not set
      setFileSystemOpen(savedFileSystemState !== null ? savedFileSystemState === "true" : true)
      setChatOpen(savedChatState === "true")
      setTerminalOpen(savedTerminalState !== null ? savedTerminalState === "true" : true)

      // Set custom widths if saved
      if (savedFileSystemWidth) {
        setFileSystemWidth(Number.parseInt(savedFileSystemWidth))
      }
      if (savedChatSidebarWidth) {
        setChatSidebarWidth(Number.parseInt(savedChatSidebarWidth))
      }

      setMounted(true)
    }
  }, [])

  // Save state to localStorage when it changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("ide_filesystem_state", String(fileSystemOpen))
      localStorage.setItem("ide_chat_state", String(chatOpen))
      localStorage.setItem("ide_terminal_state", String(terminalOpen))

      if (fileSystemWidth) {
        localStorage.setItem("ide_filesystem_width", String(fileSystemWidth))
      }
      if (chatSidebarWidth) {
        localStorage.setItem("ide_chat_sidebar_width", String(chatSidebarWidth))
      }
    }
  }, [fileSystemOpen, chatOpen, terminalOpen, fileSystemWidth, chatSidebarWidth, mounted])

  // Update terminal height when terminal state changes
  useEffect(() => {
    setTerminalHeight(terminalOpen ? "var(--terminal-height)" : "var(--terminal-height-collapsed)")
  }, [terminalOpen])

  const toggleFileSystem = useCallback(() => {
    setFileSystemOpen((prev) => !prev)
  }, [])

  const toggleChat = useCallback(() => {
    setChatOpen((prev) => !prev)
  }, [])

  const toggleTerminal = useCallback(() => {
    setTerminalOpen((prev) => !prev)
  }, [])

  // File system resize handler
  const handleFileSystemResize = useCallback((e: MouseEvent) => {
    if (!fileSystemResizeRef.current) return

    const newWidth = e.clientX
    // Set min and max width constraints - reduced minimum to 100px
    if (newWidth >= 100 && newWidth <= 500) {
      setFileSystemWidth(newWidth)
      document.documentElement.style.setProperty("--sidebar-width", `${newWidth}px`)
    }
  }, [])

  // Chat sidebar resize handler
  const handleChatSidebarResize = useCallback((e: MouseEvent) => {
    if (!chatSidebarResizeRef.current) return

    const newWidth = window.innerWidth - e.clientX
    // Set min and max width constraints
    if (newWidth >= 100 && newWidth <= 500) {
      setChatSidebarWidth(newWidth)
      document.documentElement.style.setProperty("--chat-sidebar-width", `${newWidth}px`)
    }
  }, [])

  // Setup resize event listeners
  const setupFileSystemResize = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => handleFileSystemResize(e)
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.userSelect = "none" // Prevent text selection during resize

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleFileSystemResize])

  // Setup chat sidebar resize event listeners
  const setupChatSidebarResize = useCallback(() => {
    const handleMouseMove = (e: MouseEvent) => handleChatSidebarResize(e)
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    document.body.style.userSelect = "none" // Prevent text selection during resize

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [handleChatSidebarResize])

  // Set custom CSS variables on mount
  useEffect(() => {
    if (fileSystemWidth) {
      document.documentElement.style.setProperty("--sidebar-width", `${fileSystemWidth}px`)
    }
    if (chatSidebarWidth) {
      document.documentElement.style.setProperty("--chat-sidebar-width", `${chatSidebarWidth}px`)
    }
  }, [fileSystemWidth, chatSidebarWidth])

  // Handle file selection from sidebar
  const handleFileSelect = useCallback((file: FileItem) => {
    if (file.type === "folder") return

    // Check if file is already open
    const existingFile = openFiles.find(f => f.path === file.path)
    if (existingFile) {
      // If already open, just make it active
      setOpenFiles(prev => prev.map(f => ({
        ...f,
        isActive: f.path === file.path
      })))
      setSelectedFile({ ...existingFile, isActive: true })
      return
    }

    // Add new file to open files
    const newFile: OpenFile = {
      ...file,
      path: file.path || file.name, // Use name as fallback if path is not available
      isModified: false,
      isActive: true
    }

    setOpenFiles(prev => [
      ...prev.map(f => ({ ...f, isActive: false })),
      newFile
    ])
    setSelectedFile(newFile)
  }, [openFiles])

  // Handle file tab selection
  const handleTabSelect = useCallback((filePath: string) => {
    setOpenFiles(prev => {
      const newFiles = prev.map(f => ({
        ...f,
        isActive: f.path === filePath
      }))
      const selectedFile = newFiles.find(f => f.path === filePath)
      if (selectedFile) {
        setSelectedFile(selectedFile)
      }
      return newFiles
    })
  }, [])

  // Handle file tab close
  const handleTabClose = useCallback((filePath: string) => {
    const fileToClose = openFiles.find(f => f.path === filePath)
    if (!fileToClose) return

    setOpenFiles(prev => {
      const newFiles = prev.filter(f => f.path !== filePath)
      // If we're closing the active file, make the last file active
      if (fileToClose.isActive && newFiles.length > 0) {
        newFiles[newFiles.length - 1].isActive = true
        setSelectedFile(newFiles[newFiles.length - 1])
      } else if (newFiles.length === 0) {
        setSelectedFile(null)
      }
      return newFiles
    })
  }, [openFiles])

  // Handle file content change
  const handleFileChange = useCallback((filePath: string, isModified: boolean) => {
    setOpenFiles(prev => prev.map(f => 
      f.path === filePath ? { ...f, isModified } : f
    ))
  }, [])

  return (
    <div className="flex h-screen w-screen flex-col overflow-hidden">
      <Header
        toggleFileSystem={toggleFileSystem}
        toggleChat={toggleChat}
        toggleTerminal={toggleTerminal}
        fileSystemOpen={fileSystemOpen}
        chatOpen={chatOpen}
        terminalOpen={terminalOpen}
      />

      <div className="relative flex flex-1 overflow-hidden">
        {/* File System Sidebar - Fixed position */}
        <div
          className={cn(
            "fixed top-12 bottom-0 left-0 z-20 transition-transform duration-300 ease-in-out",
            !fileSystemOpen && "-translate-x-full",
          )}
          style={{ width: "var(--sidebar-width)" }}
        >
          <FileSystemSidebar isOpen={fileSystemOpen} onFileSelect={handleFileSelect} />
        </div>

        {/* File System Resize Handle */}
        {fileSystemOpen && (
          <div
            ref={fileSystemResizeRef}
            className="fixed left-[var(--sidebar-width)] top-12 bottom-0 z-30 w-1 cursor-ew-resize hover:bg-[#4d9cf6]/30 transition-colors duration-150"
            onMouseDown={(e) => {
              e.preventDefault()
              setupFileSystemResize()
            }}
          />
        )}

        {/* Chat Sidebar - Fixed position */}
        <div
          className={cn(
            "fixed top-12 bottom-0 right-0 z-20 transition-transform duration-300 ease-in-out",
            !chatOpen && "translate-x-full",
          )}
          style={{ width: "var(--chat-sidebar-width)" }}
        >
          <ChatSidebar isOpen={chatOpen} />
        </div>

        {/* Chat Sidebar Resize Handle */}
        {chatOpen && (
          <div
            ref={chatSidebarResizeRef}
            className="fixed right-[var(--chat-sidebar-width)] top-12 bottom-0 z-30 w-1 cursor-ew-resize hover:bg-[#4d9cf6]/30 transition-colors duration-150"
            onMouseDown={(e) => {
              e.preventDefault()
              setupChatSidebarResize()
            }}
          />
        )}

        {/* Main Editor Area - Adjusts width based on sidebar states */}
        <div
          className="flex flex-col flex-1 transition-all duration-300 ease-in-out"
          style={{
            marginLeft: fileSystemOpen ? "var(--sidebar-width)" : "0",
            marginRight: chatOpen ? "var(--chat-sidebar-width)" : "0",
            width: `calc(100% - ${fileSystemOpen ? "var(--sidebar-width)" : "0px"} - ${chatOpen ? "var(--chat-sidebar-width)" : "0px"})`,
          }}
        >
          {/* File Tabs */}
          <FileTabs 
            files={openFiles}
            onSelect={handleTabSelect}
            onClose={handleTabClose}
          />

          {/* Editor */}
          <div className="flex-1 overflow-hidden">
            {selectedFile && (
              <Editor
                className="h-full w-full"
                filePath={selectedFile.path}
                onChange={(isModified) => handleFileChange(selectedFile.path, isModified)}
              />
            )}
          </div>
        </div>
      </div>

      {/* Terminal - positioned to respect sidebar widths */}
      <div
        className="fixed bottom-0 z-20 transition-all duration-300 ease-in-out"
        style={{
          left: fileSystemOpen ? "var(--sidebar-width)" : "0",
          right: chatOpen ? "var(--chat-sidebar-width)" : "0",
        }}
      >
        <Terminal isOpen={terminalOpen} height={terminalHeight} toggleTerminal={toggleTerminal} />
      </div>
    </div>
  )
}

