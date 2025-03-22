"use client"

import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface AgentSelectorProps {
  mode: "agent" | "ask"
  onModeChange: (mode: "agent" | "ask") => void
  className?: string
}

export function AgentSelector({ mode, onModeChange, className }: AgentSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  const handleModeSelect = (newMode: "agent" | "ask") => {
    onModeChange(newMode)
    setIsOpen(false)
  }

  // Both modes should have blue dots
  const getDotColor = () => "bg-[#4d9cf6]"

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        className={cn(
          "flex h-7 items-center gap-1 rounded-lg border border-[#c0c0c8]/10 bg-[#c0c0c8]/5 px-2 text-xs text-[#e8e8ed] hover:bg-[#c0c0c8]/10",
          className,
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="flex items-center">
          <span className={cn("mr-1 inline-flex h-2 w-2 rounded-full", getDotColor())}></span>
          {mode === "agent" ? "Agent" : "Ask"}
        </span>
        <svg width="7" height="4" viewBox="0 0 7 4" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M1 1L3.5 3L6 1" stroke="#a0a0a8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Button>

      {isOpen && (
        <div ref={menuRef} className="absolute left-0 bottom-9 z-50 min-w-[120px]">
          <button
            className="flex h-7 w-full items-center gap-1 rounded-lg border border-[#c0c0c8]/10 px-2 text-xs text-[#a0a0a8] hover:text-[#e8e8ed]"
            onClick={() => handleModeSelect(mode === "agent" ? "ask" : "agent")}
            style={{
              background: "rgba(26, 26, 32, 0.9)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
            }}
          >
            <span className="flex items-center">
              <span className={cn("mr-1 inline-flex h-2 w-2 rounded-full", getDotColor())}></span>
              {mode === "agent" ? "Ask" : "Agent"}
            </span>
          </button>
        </div>
      )}
    </div>
  )
}

