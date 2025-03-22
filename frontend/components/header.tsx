"use client"

import { PanelRight, PanelBottomIcon as PanelDown, Search, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HeaderProps {
  toggleFileSystem: () => void
  toggleChat: () => void
  toggleTerminal: () => void
  fileSystemOpen: boolean
  chatOpen: boolean
  terminalOpen: boolean
}

export function Header({
  toggleFileSystem,
  toggleChat,
  toggleTerminal,
  fileSystemOpen,
  chatOpen,
  terminalOpen,
}: HeaderProps) {
  return (
    <header
      className="glassmorphic z-10 flex h-12 items-center justify-between border-b border-border px-2 rounded-b-xl"
      style={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="flex flex-1 items-center justify-center px-4">
        <div className="flex items-center w-full max-w-xl">
          <div className="flex items-center mr-2 space-x-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
            >
              Undo
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-7 rounded-lg px-2 text-xs text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
            >
              Redo
            </Button>
          </div>

          <div
            className="flex h-8 flex-1 items-center rounded-lg border border-border-medium bg-[rgba(26,26,32,0.4)] px-3"
            style={{
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            <Search className="mr-2 h-3.5 w-3.5 text-[#a0a0a8]" />
            <input
              type="text"
              placeholder="Search or jump to file..."
              className="w-full bg-transparent text-sm text-[#e8e8ed] placeholder-[#a0a0a8] focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="w-8"></div>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTerminal}
          className={cn(
            "h-8 w-8 rounded-full hover:bg-[#c0c0c8]/5",
            terminalOpen ? "text-[#e8e8ed]" : "text-[#a0a0a8] hover:text-[#e8e8ed]",
          )}
          aria-label={terminalOpen ? "Minimize terminal" : "Open terminal"}
        >
          <PanelDown className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleChat}
          className={cn(
            "h-8 w-8 rounded-full hover:bg-[#c0c0c8]/5",
            chatOpen ? "text-[#e8e8ed]" : "text-[#a0a0a8] hover:text-[#e8e8ed]",
          )}
          aria-label={chatOpen ? "Close chat" : "Open chat"}
        >
          <PanelRight className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </header>
  )
}

