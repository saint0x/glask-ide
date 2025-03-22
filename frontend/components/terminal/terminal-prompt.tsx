"use client"

import type React from "react"

import { StatusIndicator } from "@/components/ui/status-indicator"

interface TerminalPromptProps {
  status?: "success" | "error" | "pending" | "none"
  command?: string
  isInput?: boolean
  onSubmit?: (command: string) => void
  inputRef?: React.RefObject<HTMLInputElement>
  value?: string
  onChange?: (value: string) => void
}

export function TerminalPrompt({
  status = "none",
  command,
  isInput = false,
  onSubmit,
  inputRef,
  value = "",
  onChange,
}: TerminalPromptProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit && value.trim()) {
      onSubmit(value)
    }
  }

  return (
    <div className="flex items-center">
      <StatusIndicator status={status} className="mr-1" />
      <span className="text-[#e8e8ed]">saint@supercomputer</span>
      <span className="mx-1 text-[#a0a0a8]">$</span>

      {isInput ? (
        <form onSubmit={handleSubmit} className="flex-1">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange && onChange(e.target.value)}
            className="flex-1 w-full bg-transparent text-[#e8e8ed] focus:outline-none"
            autoComplete="off"
            spellCheck="false"
          />
        </form>
      ) : (
        <span>{command}</span>
      )}
    </div>
  )
}

