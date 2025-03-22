"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { Send, Image } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { AgentSelector } from "./agent-selector"

interface ChatBarProps {
  onSendMessage: (message: string) => void
  className?: string
}

interface ContextFile {
  id: string
  name: string
  path: string
  language: string
}

export function ChatBar({ onSendMessage, className }: ChatBarProps) {
  const [input, setInput] = useState("")
  const [mode, setMode] = useState<"agent" | "ask">("agent")
  const [isExpanded, setIsExpanded] = useState(false)
  const [contextFiles, setContextFiles] = useState<ContextFile[]>([
    { id: "1", name: "index.ts", path: "/lib/index.ts", language: "ts" },
  ])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [sidebarWidth, setSidebarWidth] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Auto-resize textarea as content grows
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [input])

  const handleSendMessage = () => {
    if (!input.trim()) return
    onSendMessage(input)
    setInput("")
    setIsExpanded(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = "32px"
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleModeChange = (newMode: "agent" | "ask") => {
    setMode(newMode)
  }

  const removeContextFile = (id: string) => {
    setContextFiles((prev) => prev.filter((file) => file.id !== id))
  }

  const handleImageUpload = () => {
    // This would be implemented with a file input in a real application
    console.log("Image upload clicked")
  }

  const handleResize = useCallback(() => {
    const chatSidebar = document.querySelector("[data-chat-sidebar]")
    if (!chatSidebar) return

    const width = chatSidebar.clientWidth
    setSidebarWidth(width)
  }, [])

  useEffect(() => {
    // Initial check
    handleResize()

    // Set up resize observer
    const resizeObserver = new ResizeObserver(handleResize)
    const chatSidebar = document.querySelector("[data-chat-sidebar]")
    if (chatSidebar) {
      resizeObserver.observe(chatSidebar)
    }

    return () => {
      if (chatSidebar) {
        resizeObserver.unobserve(chatSidebar)
      }
      resizeObserver.disconnect()
    }
  }, [handleResize])

  // Calculate visibility states based on sidebar width
  const getAgentTextVisibility = () => {
    if (!sidebarWidth) return false
    return sidebarWidth >= 300
  }

  const getModelVisibility = () => {
    if (!sidebarWidth) return false
    return sidebarWidth >= 350
  }

  const agentTextVisible = getAgentTextVisibility()
  const modelVisible = getModelVisibility()

  return (
    <div
      ref={containerRef}
      data-chat-bar
      className={cn(
        "glassmorphic w-full rounded-xl shadow-lg transition-all duration-300 ease-in-out",
        isExpanded ? "p-3" : "p-2",
        className,
      )}
      style={{
        background: "rgba(26, 26, 32, 0.8)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(192, 192, 200, 0.1)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)",
      }}
    >
      {/* Context Files */}
      {contextFiles.length > 0 && (
        <div className="mb-2 flex items-center gap-1">
          {contextFiles.map((file) => (
            <div key={file.id} className="flex h-6 items-center gap-1.5">
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-[rgba(26,26,32,0.9)] border border-[#c0c0c8]/10">
                <span className="text-[#a0a0a8]">@</span>
              </div>
              <div className="flex h-5 items-center justify-center rounded-md bg-[rgba(26,26,32,0.9)] border border-[#c0c0c8]/10 px-2">
                <span className="text-xs text-[#e8e8ed] leading-none">{file.name}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Area */}
      <div className="relative mb-2">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value)
            if (e.target.value.length > 0 && !isExpanded) {
              setIsExpanded(true)
            } else if (e.target.value.length === 0 && isExpanded) {
              setIsExpanded(false)
            }
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsExpanded(true)}
          placeholder="Plan, search, build anything"
          className="min-h-8 max-h-[120px] w-full resize-none border-0 bg-transparent py-1 px-0 text-sm text-[#e8e8ed] placeholder-[#a0a0a8]/70 focus:outline-none focus:ring-0"
          style={{
            lineHeight: "1.5rem",
            caretColor: "#e8e8ed",
          }}
        />
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between text-xs">
        {/* Agent Selector */}
        <div className="flex items-center gap-1">
          <AgentSelector mode={mode} onModeChange={handleModeChange} />
        </div>

        {/* Right Controls: Model, Image, Send */}
        <div className="flex items-center gap-2">
          {/* Model Selector */}
          {modelVisible && (
            <div className="flex items-center gap-1 text-[#a0a0a8]">
              <span className="truncate max-w-[100px]">claude-3.5-sonnet</span>
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M1 1L5 5L9 1"
                  stroke="#a0a0a8"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          {/* Image Upload Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleImageUpload}
            className="h-6 w-6 rounded-md text-[#a0a0a8] hover:bg-[#c0c0c8]/10 hover:text-[#e8e8ed] flex-shrink-0"
          >
            <Image className="h-3.5 w-3.5" />
            <span className="sr-only">Upload image</span>
          </Button>

          {/* Send Button - Always visible with text */}
          <Button
            variant="ghost"
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className="flex h-7 items-center gap-1 rounded-lg border border-[#c0c0c8]/10 bg-[#c0c0c8]/5 px-2 text-xs text-[#e8e8ed] hover:bg-[#c0c0c8]/10 disabled:opacity-50 disabled:hover:bg-transparent flex-shrink-0"
          >
            <span className="flex items-center">Send</span>
            <Send className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  )
}

