"use client"

import { PanelRight, PanelBottomIcon as PanelDown, Settings, PanelLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface HeaderActionsProps {
  toggleChat: () => void
  toggleTerminal: () => void
  toggleFileSystem: () => void
  chatOpen: boolean
  terminalOpen: boolean
  fileSystemOpen: boolean
}

export function HeaderActions({
  toggleChat,
  toggleTerminal,
  toggleFileSystem,
  chatOpen,
  terminalOpen,
  fileSystemOpen,
}: HeaderActionsProps) {
  return (
    <div className="flex items-center space-x-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleFileSystem}
        className={cn(
          "h-8 w-8 rounded-full hover:bg-[#c0c0c8]/5",
          fileSystemOpen ? "text-[#e8e8ed]" : "text-[#a0a0a8] hover:text-[#e8e8ed]",
        )}
        aria-label={fileSystemOpen ? "Close file explorer" : "Open file explorer"}
      >
        <PanelLeft className="h-4 w-4" />
      </Button>

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
  )
}

