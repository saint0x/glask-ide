export type CommandStatus = "success" | "error" | "pending" | "none"

export interface TerminalLine {
  id: string
  content: string
  isCommand: boolean
  status?: CommandStatus
}

