"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Maximize2, Minimize2, TerminalIcon, Plus, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TerminalProps {
  isOpen: boolean
  height: string
  toggleTerminal: () => void
  fileSystemOpen?: boolean
  chatOpen?: boolean
}

interface TerminalLine {
  id: string
  content: string
  isCommand: boolean
  status?: "success" | "error" | "pending" | "none"
}

interface TerminalTab {
  id: string
  label: string
  isActive: boolean
  priority: number // Higher priority tabs will be shown first when space is limited
}

interface TerminalPane {
  id: string
  lines: TerminalLine[]
  command: string
  commandStatus: "success" | "error" | "pending" | "none"
  sessionId?: string
  socket?: WebSocket
  isConnecting?: boolean
  retryCount?: number
  lineCounter: number // Add counter for unique line IDs
}

// Sample terminal history
const initialTerminalLines: TerminalLine[] = []

const initialTabs: TerminalTab[] = [
  { id: "problems", label: "Problems", isActive: false, priority: 3 },
  { id: "terminal", label: "Terminal", isActive: true, priority: 4 },
  { id: "output", label: "Output", isActive: false, priority: 2 },
  { id: "ports", label: "Ports", isActive: false, priority: 1 },
  { id: "debug", label: "Debug Console", isActive: false, priority: 0 },
]

export function Terminal({ isOpen, height, toggleTerminal, fileSystemOpen = true, chatOpen = true }: TerminalProps) {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>(initialTerminalLines)
  const [command, setCommand] = useState("")
  const [isMaximized, setIsMaximized] = useState(false)
  const [commandStatus, setCommandStatus] = useState<"success" | "error" | "pending" | "none">("none")
  const leftTerminalRef = useRef<HTMLDivElement>(null)
  const rightTerminalRef = useRef<HTMLDivElement>(null)
  const leftInputRef = useRef<HTMLInputElement>(null)
  const rightInputRef = useRef<HTMLInputElement>(null)
  const [tabs, setTabs] = useState<TerminalTab[]>(initialTabs)
  const [visibleTabs, setVisibleTabs] = useState<TerminalTab[]>(initialTabs)
  const [hiddenTabs, setHiddenTabs] = useState([])
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const tabsContainerRef = useRef<HTMLDivElement>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const [isSplit, setIsSplit] = useState(false)

  // Initialize terminal panes with line counters
  const [terminalPanes, setTerminalPanes] = useState<TerminalPane[]>([
    {
      id: "left",
      lines: [],
      command: "",
      commandStatus: "none",
      lineCounter: 0, // Start with 0 since we have no initial lines
    },
  ])

  const [activePane, setActivePane] = useState<string>("left")

  // Auto-scroll to bottom when lines are added to either pane
  useEffect(() => {
    setTimeout(() => {
      if (leftTerminalRef.current) {
        leftTerminalRef.current.scrollTop = leftTerminalRef.current.scrollHeight
      }

      if (isSplit && rightTerminalRef.current) {
        rightTerminalRef.current.scrollTop = rightTerminalRef.current.scrollHeight
      }
    }, 0)
  }, [terminalPanes, isSplit])

  // Focus input when terminal is opened
  useEffect(() => {
    if (isOpen) {
      if (isSplit) {
        if (activePane === "left" && leftInputRef.current) {
          leftInputRef.current.focus()
        } else if (activePane === "right" && rightInputRef.current) {
          rightInputRef.current.focus()
        }
      } else if (leftInputRef.current) {
        leftInputRef.current.focus()
      }
    }
  }, [isOpen, isSplit, activePane])

  // Calculate which tabs should be visible based on available space
  const calculateVisibleTabs = useCallback(() => {
    if (!tabsContainerRef.current) return

    // Get container width
    const containerWidth = tabsContainerRef.current.clientWidth

    // Space for controls on the right
    const controlsWidth = 180

    // Available width for tabs
    const availableWidth = containerWidth - controlsWidth

    // If we have plenty of space (expanded terminal or sidebars collapsed), show all tabs
    if (isMaximized || !fileSystemOpen || !chatOpen || availableWidth > 500) {
      setVisibleTabs(tabs)
      setHiddenTabs([])
      return
    }

    // Otherwise, we're in compact mode - show active tab and maybe adjacent ones
    const activeTabIndex = tabs.findIndex((tab) => tab.isActive)

    // Always show the active tab
    const visible: TerminalTab[] = [tabs[activeTabIndex]]

    // Try to add one tab before and one after if they exist
    let remainingWidth = availableWidth - 120 // Approximate width for active tab

    // Add tab before active if possible
    if (activeTabIndex > 0 && remainingWidth > 100) {
      visible.unshift(tabs[activeTabIndex - 1])
      remainingWidth -= 100
    }

    // Add tab after active if possible
    if (activeTabIndex < tabs.length - 1 && remainingWidth > 100) {
      visible.push(tabs[activeTabIndex + 1])
      remainingWidth -= 100
    }

    // All other tabs go to hidden
    const hidden = tabs.filter((tab) => !visible.some((v) => v.id === tab.id))

    setVisibleTabs(visible)
    setHiddenTabs(hidden)
  }, [tabs, isMaximized, fileSystemOpen, chatOpen])

  // Recalculate visible tabs when terminal is resized
  useEffect(() => {
    const handleResize = () => {
      calculateVisibleTabs()
    }

    window.addEventListener("resize", handleResize)

    // Initial calculation
    setTimeout(calculateVisibleTabs, 0) // Use setTimeout to ensure DOM is ready

    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [calculateVisibleTabs])

  useEffect(() => {
    if (isOpen) {
      // Recalculate after the terminal is fully visible
      setTimeout(calculateVisibleTabs, 300)
    }
  }, [isOpen, calculateVisibleTabs])

  useEffect(() => {
    // Recalculate when sidebar states change
    setTimeout(calculateVisibleTabs, 300)
  }, [fileSystemOpen, chatOpen, calculateVisibleTabs])

  useEffect(() => {
    // Recalculate when terminal is maximized or minimized
    calculateVisibleTabs()
  }, [isMaximized, calculateVisibleTabs])

  // Close more menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Helper function to generate unique line ID
  const generateLineId = (paneId: string, counter: number) => {
    return `${paneId}-${Date.now()}-${counter}`
  }

  // Create a new terminal session with retry logic
  const createTerminalSession = async (paneId: string) => {
    const paneIndex = terminalPanes.findIndex(pane => pane.id === paneId)
    if (paneIndex === -1) return

    const pane = terminalPanes[paneIndex]
    if (pane.isConnecting) return

    console.log(`[Terminal ${paneId}] Creating new terminal session`)

    try {
      const response = await fetch('http://localhost:3001/api/terminal/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to create terminal session: ${response.statusText}`)
      }

      const { sessionId } = await response.json()
      console.log(`[Terminal ${paneId}] Session created with ID: ${sessionId}`)
      const socket = new WebSocket(`ws://localhost:3001/api/terminal/connect?sessionId=${sessionId}`)

      socket.onopen = () => {
        console.log(`[Terminal ${paneId}] WebSocket connection established`)
        setTerminalPanes(prevPanes => {
          const newPanes = [...prevPanes]
          const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
          if (paneIndex !== -1) {
            const counter = newPanes[paneIndex].lineCounter + 1
            newPanes[paneIndex] = {
              ...newPanes[paneIndex],
              sessionId,
              socket,
              lineCounter: counter,
              lines: [...newPanes[paneIndex].lines, {
                id: generateLineId(paneId, counter),
                content: 'Terminal connected',
                isCommand: false,
                status: "success"
              }]
            }
          }
          return newPanes
        })
      }

      socket.onmessage = (event) => {
        console.log(`[Terminal ${paneId}] Received output:`, event.data)
        setTerminalPanes(prevPanes => {
          const newPanes = [...prevPanes]
          const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
          if (paneIndex === -1) return prevPanes
          
          const counter = newPanes[paneIndex].lineCounter + 1
          const pane = { ...newPanes[paneIndex], lineCounter: counter }
          
          // Check if this is the end of command output (usually contains a newline at the end)
          const isCommandComplete = event.data.endsWith('\n') || event.data.endsWith('\r')
          
          // Update the last command's status to success when we get output
          const updatedLines = [...pane.lines]
          const lastCommandIndex = updatedLines.length - 1
          if (lastCommandIndex >= 0 && updatedLines[lastCommandIndex].isCommand) {
            console.log(`[Terminal ${paneId}] Command completed successfully:`, updatedLines[lastCommandIndex].content)
            updatedLines[lastCommandIndex] = {
              ...updatedLines[lastCommandIndex],
              status: "success" // Blue for success
            }
          }
          
          // Add the new output line
          pane.lines = [
            ...updatedLines,
            {
              id: generateLineId(paneId, counter),
              content: event.data,
              isCommand: false,
              status: "none"
            }
          ]
          
          newPanes[paneIndex] = {
            ...pane,
            commandStatus: isCommandComplete ? "success" : "none" // Only set success if command is complete
          }
          return newPanes
        })
      }

      socket.onclose = () => {
        console.log(`[Terminal ${paneId}] Session ${sessionId} closed`)
        // Try to reconnect if not intentionally closed
        setTerminalPanes(prevPanes => {
          const newPanes = [...prevPanes]
          const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
          if (paneIndex !== -1) {
            newPanes[paneIndex] = {
              ...newPanes[paneIndex],
              socket: undefined,
              sessionId: undefined,
              isConnecting: false,
              lines: [...newPanes[paneIndex].lines, {
                id: generateLineId(paneId, counter + 1),
                content: 'Terminal disconnected. Attempting to reconnect...',
                isCommand: false,
                status: "error"
              }],
              lineCounter: counter + 1
            }
          }
          return newPanes
        })

        // Attempt to reconnect after a delay
        setTimeout(() => {
          createTerminalSession(paneId)
        }, 2000)
      }

      socket.onerror = (error) => {
        console.error(`[Terminal ${paneId}] WebSocket error:`, error)
        setTerminalPanes(prevPanes => {
          const newPanes = [...prevPanes]
          const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
          if (paneIndex !== -1) {
            newPanes[paneIndex] = {
              ...newPanes[paneIndex],
              isConnecting: false,
              lines: [...newPanes[paneIndex].lines, {
                id: generateLineId(paneId, counter + 1),
                content: 'Failed to connect to terminal. Retrying...',
                isCommand: false,
                status: "error"
              }],
              lineCounter: counter + 1
            }
          }
          return newPanes
        })
      }

    } catch (error) {
      console.error(`[Terminal ${paneId}] Failed to create session:`, error)
      setTerminalPanes(prevPanes => {
        const newPanes = [...prevPanes]
        const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
        if (paneIndex !== -1) {
          const counter = newPanes[paneIndex].lineCounter + 1
          newPanes[paneIndex] = {
            ...newPanes[paneIndex],
            isConnecting: false,
            lines: [...newPanes[paneIndex].lines, {
              id: generateLineId(paneId, counter),
              content: `Connection failed: ${error.message}. Retrying in 2s...`,
              isCommand: false,
              status: "error"
            }],
            lineCounter: counter
          }
        }
        return newPanes
      })

      // Retry connection after delay
      setTimeout(() => {
        createTerminalSession(paneId)
      }, 2000)
    }
  }

  // Initialize terminal session when component mounts or when split
  useEffect(() => {
    if (isOpen) {
      createTerminalSession('left')
    }
  }, [isOpen])

  // Handle split terminal
  const handleSplitTerminal = () => {
    if (!isSplit) {
      setTerminalPanes(prev => [
        ...prev,
        {
          id: "right",
          lines: [],
          command: "",
          commandStatus: "none",
          lineCounter: 0
        }
      ])
      setIsSplit(true)
      createTerminalSession('right')
    }
  }

  // Clean up terminal sessions when component unmounts
  useEffect(() => {
    return () => {
      terminalPanes.forEach(pane => {
        if (pane.socket) {
          pane.socket.close()
        }
      })
    }
  }, [])

  const handleCommandSubmit = (e: React.FormEvent, paneId: string) => {
    e.preventDefault()

    const paneIndex = terminalPanes.findIndex((pane) => pane.id === paneId)
    if (paneIndex === -1) return

    const pane = terminalPanes[paneIndex]
    const commandText = pane.command.trim()
    if (!commandText) return

    // Log command execution
    console.log(`[Terminal ${paneId}] Executing command: ${commandText}`)

    const counter = pane.lineCounter + 1
    const newLines = [
      ...pane.lines,
      {
        id: generateLineId(paneId, counter),
        content: commandText,
        isCommand: true,
        status: "none" // Start with no status indicator
      }
    ]

    // Special case for clear command
    if (commandText === "clear") {
      console.log(`[Terminal ${paneId}] Clearing terminal`)
      const clearedPane = {
        ...pane,
        lines: [],
        command: "",
        commandStatus: "success" as const,
        lineCounter: 0
      }
      const newPanes = [...terminalPanes]
      newPanes[paneIndex] = clearedPane
      setTerminalPanes(newPanes)
      return
    }

    // Send command to backend
    if (pane.socket && pane.socket.readyState === WebSocket.OPEN) {
      try {
        console.log(`[Terminal ${paneId}] Sending command to WebSocket`)
        pane.socket.send(commandText + '\n')
        
        const newPane = {
          ...pane,
          lines: newLines,
          command: "",
          commandStatus: "none",
          lineCounter: counter
        }
        
        const newPanes = [...terminalPanes]
        newPanes[paneIndex] = newPane
        setTerminalPanes(newPanes)

        // Set a timeout to mark command as unsuccessful if no response
        setTimeout(() => {
          setTerminalPanes(prevPanes => {
            const currentPanes = [...prevPanes]
            const paneIndex = currentPanes.findIndex(p => p.id === paneId)
            if (paneIndex === -1) return prevPanes

            const lastLine = currentPanes[paneIndex].lines[currentPanes[paneIndex].lines.length - 1]
            if (lastLine && lastLine.content === commandText && lastLine.status === "none") {
              console.log(`[Terminal ${paneId}] Command timed out: ${commandText}`)
              const updatedLines = [...currentPanes[paneIndex].lines]
              updatedLines[updatedLines.length - 1] = {
                ...lastLine,
                status: "pending" // Yellow for unsuccessful
              }
              currentPanes[paneIndex] = {
                ...currentPanes[paneIndex],
                lines: updatedLines,
                commandStatus: "pending"
              }
            }
            return currentPanes
          })
        }, 1000) // Reduced timeout to 1 second for faster feedback

      } catch (error) {
        console.error(`[Terminal ${paneId}] Failed to send command:`, error)
        const errorPane = {
          ...pane,
          lines: [...newLines, {
            id: generateLineId(paneId, counter + 1),
            content: 'Failed to send command to terminal',
            isCommand: false,
            status: "error"
          }],
          command: "",
          commandStatus: "error" as const,
          lineCounter: counter + 1
        }
        
        const newPanes = [...terminalPanes]
        newPanes[paneIndex] = errorPane
        setTerminalPanes(newPanes)
      }
    } else {
      console.error(`[Terminal ${paneId}] Terminal not connected`)
      const errorPane = {
        ...pane,
        lines: [...newLines, {
          id: generateLineId(paneId, counter + 1),
          content: 'Terminal not connected',
          isCommand: false,
          status: "error"
        }],
        command: "",
        commandStatus: "error" as const,
        lineCounter: counter + 1
      }
      
      const newPanes = [...terminalPanes]
      newPanes[paneIndex] = errorPane
      setTerminalPanes(newPanes)
    }
  }

  const toggleMaximize = () => {
    setIsMaximized((prev) => !prev)
  }

  const getStatusColor = (status?: "success" | "error" | "pending" | "none") => {
    switch (status) {
      case "success":
        return "text-[#4d9cf6]" // Blue for success
      case "error":
        return "text-[#f6564d]" // Red for error
      case "pending":
        return "text-[#f6c84d]" // Yellow for pending
      default:
        return "text-[#a0a0a8]" // Default gray
    }
  }

  const switchTab = (tabId: string) => {
    setTabs(
      tabs.map((tab) => ({
        ...tab,
        isActive: tab.id === tabId,
      })),
    )
    setShowMoreMenu(false)
  }

  const toggleMoreMenu = () => {
    setShowMoreMenu((prev) => !prev)
  }

  const handlePaneClick = (paneId: string) => {
    setActivePane(paneId)
  }

  const handleCommandChange = (value: string, paneId: string) => {
    const paneIndex = terminalPanes.findIndex((pane) => pane.id === paneId)
    if (paneIndex === -1) return

    const updatedPanes = [...terminalPanes]
    updatedPanes[paneIndex] = {
      ...updatedPanes[paneIndex],
      command: value,
    }

    setTerminalPanes(updatedPanes)
  }

  return (
    <div
      className="glassmorphic relative z-10 border-t border-border rounded-t-xl w-full"
      style={{
        height: isMaximized ? "40vh" : height,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        transform: isOpen ? "translateY(0)" : "translateY(100%)",
        opacity: isOpen ? 1 : 0,
        transition: "transform 200ms ease-in-out, opacity 200ms ease-in-out, height 200ms ease-in-out",
      }}
    >
      <div className="flex h-10 items-center justify-between border-b border-border">
        <div className="flex items-center overflow-hidden" ref={tabsContainerRef}>
          <div className="flex h-full">
            {visibleTabs.map((tab) => (
              <button
                key={tab.id}
                data-tab-id={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`h-full px-3.5 text-sm font-medium transition-colors whitespace-nowrap flex items-center ${
                  tab.isActive
                    ? "bg-[rgba(40,40,46,0.6)] text-[#e8e8ed] border-t-2 border-t-[#4d9cf6] pt-0.5"
                    : "text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[rgba(40,40,46,0.3)]"
                }`}
              >
                {tab.label}
              </button>
            ))}

            {hiddenTabs.length > 0 && (
              <div className="relative">
                <button
                  onClick={toggleMoreMenu}
                  className="h-full px-2.5 text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[rgba(40,40,46,0.3)] flex items-center"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>

                {showMoreMenu && (
                  <div
                    ref={moreMenuRef}
                    className="absolute left-0 top-10 z-50 min-w-[150px] rounded-md border border-border bg-[rgba(26,26,32,0.95)] shadow-lg"
                  >
                    {hiddenTabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => switchTab(tab.id)}
                        className="flex w-full items-center px-4 py-2 text-sm text-[#a0a0a8] hover:bg-[rgba(40,40,46,0.6)] hover:text-[#e8e8ed]"
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-1 pr-2">
          <div className="flex items-center mr-2">
            <button className="flex items-center h-6 px-2 text-xs text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5 rounded">
              <TerminalIcon className="mr-1 h-3.5 w-3.5" />
              <span>zsh</span>
              <ChevronDown className="ml-1 h-3 w-3" />
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">New Terminal</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSplitTerminal}
              className={cn(
                "h-6 w-6 rounded-md hover:bg-[#c0c0c8]/5",
                isSplit ? "text-[#e8e8ed]" : "text-[#a0a0a8] hover:text-[#e8e8ed]",
              )}
              aria-label={isSplit ? "Unsplit Terminal" : "Split Terminal"}
            >
              <div className="h-3.5 w-3.5 flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" />
                  <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" strokeWidth="1.5" />
                </svg>
              </div>
            </Button>
          </div>
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

      <div
        className="h-[calc(100%-2.5rem)] overflow-hidden flex"
        style={{
          transition: "height 200ms ease-in-out",
        }}
      >
        {/* Left Terminal Pane */}
        <div
          ref={leftTerminalRef}
          className={cn(
            "h-full overflow-y-auto p-3 font-mono text-sm text-[#e8e8ed]",
            isSplit ? "w-1/2 border-r border-border" : "w-full",
          )}
          onClick={() => handlePaneClick("left")}
          style={{
            outline: activePane === "left" && isSplit ? "1px solid rgba(77, 156, 246, 0.3)" : "none",
            outlineOffset: "-1px",
          }}
        >
          <div className="pb-1">
            {terminalPanes[0].lines.map((line) => (
              <div key={line.id} className="mb-1 whitespace-pre-wrap">
                {line.isCommand ? (
                  <div className="flex items-center">
                    <span className={cn("mr-1 text-xs", getStatusColor(line.status))}>●</span>
                    <span className="text-[#e8e8ed]">saint@supercomputer</span>
                    <span className="mx-1 text-[#a0a0a8]">$</span>
                    <span>{line.content}</span>
                  </div>
                ) : (
                  <div className="pl-6">{line.content}</div>
                )}
              </div>
            ))}
          </div>

          {/* Only show input form if there's no pending command */}
          {(!terminalPanes[0].lines.length || 
            terminalPanes[0].lines[terminalPanes[0].lines.length - 1].status !== "none") && (
            <form onSubmit={(e) => handleCommandSubmit(e, "left")} className="flex items-center">
              <span className={cn("mr-1 text-xs", getStatusColor(terminalPanes[0].commandStatus))}>●</span>
              <span className="text-[#e8e8ed]">saint@supercomputer</span>
              <span className="mx-1 text-[#a0a0a8]">$</span>
              <input
                ref={leftInputRef}
                type="text"
                value={terminalPanes[0].command}
                onChange={(e) => handleCommandChange(e.target.value, "left")}
                className="flex-1 bg-transparent text-[#e8e8ed] focus:outline-none"
                autoComplete="off"
                spellCheck="false"
              />
            </form>
          )}
        </div>

        {/* Right Terminal Pane (only shown when split) */}
        {isSplit && terminalPanes.length > 1 && (
          <div
            ref={rightTerminalRef}
            className="w-1/2 h-full overflow-y-auto p-3 font-mono text-sm text-[#e8e8ed]"
            onClick={() => handlePaneClick("right")}
            style={{
              outline: activePane === "right" ? "1px solid rgba(77, 156, 246, 0.3)" : "none",
              outlineOffset: "-1px",
            }}
          >
            <div className="pb-1">
              {terminalPanes[1].lines.map((line) => (
                <div key={line.id} className="mb-1 whitespace-pre-wrap">
                  {line.isCommand ? (
                    <div className="flex items-center">
                      <span className={cn("mr-1 text-xs", getStatusColor(line.status))}>●</span>
                      <span className="text-[#e8e8ed]">saint@supercomputer</span>
                      <span className="mx-1 text-[#a0a0a8]">$</span>
                      <span>{line.content}</span>
                    </div>
                  ) : (
                    <div className="pl-6">{line.content}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Only show input form if there's no pending command */}
            {(!terminalPanes[1].lines.length || 
              terminalPanes[1].lines[terminalPanes[1].lines.length - 1].status !== "none") && (
              <form onSubmit={(e) => handleCommandSubmit(e, "right")} className="flex items-center">
                <span className={cn("mr-1 text-xs", getStatusColor(terminalPanes[1].commandStatus))}>●</span>
                <span className="text-[#e8e8ed]">saint@supercomputer</span>
                <span className="mx-1 text-[#a0a0a8]">$</span>
                <input
                  ref={rightInputRef}
                  type="text"
                  value={terminalPanes[1].command}
                  onChange={(e) => handleCommandChange(e.target.value, "right")}
                  className="flex-1 bg-transparent text-[#e8e8ed] focus:outline-none"
                  autoComplete="off"
                  spellCheck="false"
                />
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

