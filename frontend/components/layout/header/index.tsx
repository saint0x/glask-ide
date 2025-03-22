"use client"
import { HeaderActions } from "./header-actions"
import { SearchBar } from "./search-bar"

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
      <div className="flex items-center space-x-2">{/* File system toggle button removed from here */}</div>

      <SearchBar />

      <HeaderActions
        toggleChat={toggleChat}
        toggleTerminal={toggleTerminal}
        toggleFileSystem={toggleFileSystem}
        chatOpen={chatOpen}
        terminalOpen={terminalOpen}
        fileSystemOpen={fileSystemOpen}
      />
    </header>
  )
}

