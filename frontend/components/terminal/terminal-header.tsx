"use client"

import { TerminalIcon, X, Maximize2, Minimize2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TerminalHeaderProps {
  isMaximized: boolean
  toggleMaximize: () => void
  toggleTerminal: () => void
}

export function TerminalHeader({ isMaximized, toggleMaximize, toggleTerminal }: TerminalHeaderProps) {
  return (
    <div className="flex h-10 items-center justify-between border-b border-border px-3">
      <div className="flex items-center">
        <TerminalIcon className="mr-2 h-4 w-4 text-[#a0a0a8]" />
        <span className="text-sm font-medium text-[#e8e8ed]">Terminal</span>
      </div>

      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleMaximize}
          className="h-7 w-7 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
        >
          {isMaximized ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span className="sr-only">{isMaximized ? "Minimize" : "Maximize"}</span>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTerminal}
          className="h-7 w-7 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
        >
          <X className="h-3.5 w-3.5" />
          <span className="sr-only">Close</span>
        </Button>
      </div>
    </div>
  )
}

