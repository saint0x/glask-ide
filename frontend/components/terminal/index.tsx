"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback } from "react"
import { X, Maximize2, Minimize2, TerminalIcon, Plus, ChevronDown, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import ansiHTML from 'ansi-html'
import { decode } from 'html-entities'

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
  lineCounter: number
  isConnecting?: boolean
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

// Initialize ansi-html
ansiHTML.setColors({
  reset: ['fff', '000'], // [FG, BG]
  black: '000',
  red: 'f66',
  green: '2d2',
  yellow: 'fd3',
  blue: '36f',
  magenta: 'f6f',
  cyan: '3ff',
  lightgrey: 'ccc',
  darkgrey: '999',
})

// Update the processTerminalOutput function to better handle control sequences
const processTerminalOutput = (text: string): string => {
  // Remove common terminal control sequences that we don't want to display
  let processed = text
    // Remove terminal title sequences
    .replace(/\x1B\][0-9;]*;?[a-zA-Z]/g, '')
    // Remove cursor position sequences
    .replace(/\x1B\[[0-9;]*[ABCDEFGJKST]/g, '')
    // Remove clear screen sequences
    .replace(/\x1B\[2J/g, '')
    // Remove clear line sequences
    .replace(/\x1B\[2K/g, '')
    // Remove cursor save/restore sequences
    .replace(/\x1B7|\x1B8/g, '')
    // Remove terminal mode sequences
    .replace(/\x1B\[\?[0-9;]*[hlm]/g, '')
    // Remove other common control sequences
    .replace(/\x1B\[[\x30-\x3F]*[\x20-\x2F]*[\x40-\x7E]/g, '')
    // Remove other escape sequences
    .replace(/\x1B[^[]/g, '')
    // Remove bell character
    .replace(/\x07/g, '')
    // Remove null characters
    .replace(/\x00/g, '')

  // Convert remaining ANSI color sequences to HTML
  processed = ansiHTML(processed)
  
  // Decode HTML entities
  processed = decode(processed)
  
  return processed
}

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
  const [hiddenTabs, setHiddenTabs] = useState<TerminalTab[]>([])
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
      lineCounter: 0,
      isConnecting: false
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

  // Update the generateLineId function to ensure uniqueness
  const generateLineId = (paneId: string, counter: number) => {
    return `${paneId}-${Date.now()}-${counter}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Create a new terminal session with retry logic
  const createTerminalSession = async (paneId: string) => {
    const paneIndex = terminalPanes.findIndex(pane => pane.id === paneId)
    if (paneIndex === -1) return

    // Set connecting state
    setTerminalPanes(prevPanes => {
      const newPanes = [...prevPanes]
      const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
      if (paneIndex !== -1) {
        newPanes[paneIndex] = {
          ...newPanes[paneIndex],
          isConnecting: true,
          lines: [{
            id: generateLineId(paneId, 1),
            content: "Connecting to terminal...",
            isCommand: false,
            status: "pending"
          }]
        }
      }
      return newPanes
    })

    console.log(`[Terminal ${paneId}] Creating new terminal session`)

    // Retry logic
    const maxRetries = 3
    let retryCount = 0
    let lastError = null

    while (retryCount < maxRetries) {
      try {
        // Create new session
        const response = await fetch('http://localhost:3001/api/terminal/session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          credentials: 'include',
          mode: 'cors'
        })
        
        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`)
        }

        const data = await response.json()
        if (!data.sessionId) {
          throw new Error('Invalid response: missing sessionId')
        }

        const sessionId = data.sessionId
        console.log(`[Terminal ${paneId}] Session created with ID: ${sessionId}`)

        // Create WebSocket connection
        const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
        const socket = new WebSocket(`${wsProtocol}//localhost:3001/api/terminal/session?sessionId=${sessionId}`)

        // Set a connection timeout
        const connectionTimeout = setTimeout(() => {
          if (socket.readyState !== WebSocket.OPEN) {
            socket.close()
            throw new Error('WebSocket connection timeout')
          }
        }, 5000)

        socket.onopen = () => {
          clearTimeout(connectionTimeout)
          console.log(`[Terminal ${paneId}] WebSocket connection established`)
          setTerminalPanes(prevPanes => {
            const newPanes = [...prevPanes]
            const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
            if (paneIndex !== -1) {
              newPanes[paneIndex] = {
                ...newPanes[paneIndex],
                sessionId,
                socket,
                isConnecting: false,
                lines: [{
                  id: generateLineId(paneId, 1),
                  content: "Terminal connected",
                  isCommand: false,
                  status: "success"
                }]
              }
            }
            return newPanes
          })
        }

        socket.onclose = () => {
          console.log(`[Terminal ${paneId}] WebSocket connection closed`)
          setTerminalPanes(prevPanes => {
            const newPanes = [...prevPanes]
            const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
            if (paneIndex !== -1) {
              newPanes[paneIndex] = {
                ...newPanes[paneIndex],
                socket: undefined,
                isConnecting: false,
                lines: [
                  ...newPanes[paneIndex].lines,
                  {
                    id: generateLineId(paneId, newPanes[paneIndex].lineCounter + 1),
                    content: "Terminal disconnected",
                    isCommand: false,
                    status: "error"
                  }
                ]
              }
            }
            return newPanes
          })
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
                lines: [
                  ...newPanes[paneIndex].lines,
                  {
                    id: generateLineId(paneId, newPanes[paneIndex].lineCounter + 1),
                    content: "Connection error occurred",
                    isCommand: false,
                    status: "error"
                  }
                ]
              }
            }
            return newPanes
          })
        }

        socket.onmessage = (event) => {
          const data = event.data
          if (typeof data === 'string') {
            handleTerminalOutput(data, paneId)
          }
        }

        return // Success - exit the retry loop
      } catch (error) {
        lastError = error
        retryCount++
        console.error(`[Terminal ${paneId}] Attempt ${retryCount} failed:`, error)
        
        if (retryCount < maxRetries) {
          // Add exponential backoff
          const delay = Math.min(1000 * Math.pow(2, retryCount - 1), 5000)
          console.log(`[Terminal ${paneId}] Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }

    // If we get here, all retries failed
    console.error(`[Terminal ${paneId}] All connection attempts failed:`, lastError)
    setTerminalPanes(prevPanes => {
      const newPanes = [...prevPanes]
      const paneIndex = newPanes.findIndex(pane => pane.id === paneId)
      if (paneIndex !== -1) {
        newPanes[paneIndex] = {
          ...newPanes[paneIndex],
          isConnecting: false,
          lines: [{
            id: generateLineId(paneId, 1),
            content: `Connection failed after ${maxRetries} attempts: ${lastError instanceof Error ? lastError.message : 'Unknown error'}`,
            isCommand: false,
            status: "error"
          }]
        }
      }
      return newPanes
    })
  }

  // Initialize terminal session when component mounts or when split
  useEffect(() => {
    if (isOpen) {
      createTerminalSession('left')
    }
  }, [isOpen])

  // Handle split terminal
  const handleSplitTerminal = () => {
    if (isSplit) {
      // Remove right pane
      setTerminalPanes(prev => prev.filter(p => p.id !== "right"))
      setActivePane("left")
    } else {
      // Add right pane
      const newPane: TerminalPane = {
        id: "right",
        lines: [],
        command: "",
        commandStatus: "none",
        lineCounter: 0,
        isConnecting: false
      }
      setTerminalPanes(prev => [...prev, newPane])
      setActivePane("right")
    }
    setIsSplit(!isSplit)
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

  // Add ResizeObserver to monitor terminal size changes
  useEffect(() => {
    const leftTerminal = leftTerminalRef.current
    const rightTerminal = rightTerminalRef.current

    if (!leftTerminal && !rightTerminal) return

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const terminal = entry.target
        const paneId = terminal === leftTerminal ? "left" : "right"
        const pane = terminalPanes.find(p => p.id === paneId)
        
        if (pane?.socket && pane.socket.readyState === WebSocket.OPEN) {
          // Calculate rows and columns based on character dimensions
          // Assuming monospace font where each character is roughly 8x16 pixels
          const charWidth = 8
          const charHeight = 16
          const cols = Math.floor(entry.contentRect.width / charWidth)
          const rows = Math.floor(entry.contentRect.height / charHeight)

          const resizeMessage = {
            type: "resize",
            rows: rows,
            cols: cols
          }
          pane.socket.send(JSON.stringify(resizeMessage))
        }
      }
    })

    if (leftTerminal) {
      resizeObserver.observe(leftTerminal)
    }
    if (rightTerminal) {
      resizeObserver.observe(rightTerminal)
    }

    return () => {
      resizeObserver.disconnect()
    }
  }, [terminalPanes])

  // Update the handleTerminalOutput function to be simpler
  const handleTerminalOutput = (data: string, paneId: string) => {
    const processedContent = processTerminalOutput(data)
    const newLine: TerminalLine = {
      id: generateLineId(paneId, terminalPanes.find(p => p.id === paneId)?.lineCounter || 0),
      content: processedContent,
      isCommand: false,
      status: "none"
    }

    setTerminalPanes(prev => prev.map(pane => 
      pane.id === paneId 
        ? { 
            ...pane, 
            lines: [...pane.lines, newLine],
            lineCounter: pane.lineCounter + 1
          }
        : pane
    ))
  }

  // Update the command submit handler to be simpler
  const handleCommandSubmit = (e: React.FormEvent, paneId: string) => {
    e.preventDefault()
    const pane = terminalPanes.find(p => p.id === paneId)
    if (!pane) return

    const command = pane.command.trim()
    if (!command) return

    // Add command to lines
    const commandLine: TerminalLine = {
      id: generateLineId(paneId, pane.lineCounter),
      content: `$ ${command}`,
      isCommand: true,
      status: "pending"
    }

    // Update pane with new command line
    const updatedPane: TerminalPane = {
      ...pane,
      lines: [...pane.lines, commandLine],
      command: "",
      commandStatus: "pending",
      lineCounter: pane.lineCounter + 1
    }

    setTerminalPanes(prev => prev.map(p => 
      p.id === paneId ? updatedPane : p
    ))

    // Send command to backend
    if (pane.socket?.readyState === WebSocket.OPEN) {
      pane.socket.send(JSON.stringify({ type: "command", command }))
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

  // Update the command rendering
  const renderCommandLine = (line: TerminalLine) => {
    if (line.isCommand) {
      return (
        <div className="flex items-center">
          <span className={cn("mr-1 text-xs", getStatusColor(line.status))}>●</span>
          <span>{line.content}</span>
        </div>
      )
    }
    
    return (
      <div className="pl-6" style={{ whiteSpace: "pre" }}>
        <span dangerouslySetInnerHTML={{ __html: processTerminalOutput(line.content) }} />
      </div>
    )
  }

  // Update the terminal input form to be simpler
  const renderTerminalInput = (pane: TerminalPane, paneId: string) => {
    return (
      <form onSubmit={(e) => handleCommandSubmit(e, paneId)} className="flex items-center">
        <span className={cn("mr-1 text-xs", getStatusColor(pane.commandStatus))}>●</span>
        <span className="text-[#e8e8ed]">saint@supercomputer</span>
        <span className="mx-1 text-[#a0a0a8]">$</span>
        <input
          ref={paneId === "left" ? leftInputRef : rightInputRef}
          type="text"
          value={pane.command}
          onChange={(e) => handleCommandChange(e.target.value, paneId)}
          className="flex-1 bg-transparent text-[#e8e8ed] focus:outline-none"
          autoComplete="off"
          spellCheck="false"
        />
      </form>
    )
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
            fontFamily: "Menlo, Monaco, 'Courier New', monospace",
            WebkitFontSmoothing: "antialiased",
            MozOsxFontSmoothing: "grayscale",
          }}
        >
          <div className="pb-1">
            {terminalPanes[0].lines.map((line) => (
              <div 
                key={line.id} 
                className="mb-1"
                style={{
                  whiteSpace: "pre",
                  wordWrap: "break-word",
                  overflowWrap: "break-word"
                }}
              >
                {renderCommandLine(line)}
              </div>
            ))}
          </div>

          {/* Only show input form if there's no pending command */}
          {(!terminalPanes[0].lines.length || 
            terminalPanes[0].lines[terminalPanes[0].lines.length - 1].status !== "none") && (
            renderTerminalInput(terminalPanes[0], "left")
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
              fontFamily: "Menlo, Monaco, 'Courier New', monospace",
              WebkitFontSmoothing: "antialiased",
              MozOsxFontSmoothing: "grayscale",
            }}
          >
            <div className="pb-1">
              {terminalPanes[1].lines.map((line) => (
                <div 
                  key={line.id} 
                  className="mb-1"
                  style={{
                    whiteSpace: "pre",
                    wordWrap: "break-word",
                    overflowWrap: "break-word"
                  }}
                >
                  {renderCommandLine(line)}
                </div>
              ))}
            </div>

            {/* Only show input form if there's no pending command */}
            {(!terminalPanes[1].lines.length || 
              terminalPanes[1].lines[terminalPanes[1].lines.length - 1].status !== "none") && (
              renderTerminalInput(terminalPanes[1], "right")
            )}
          </div>
        )}
      </div>
    </div>
  )
}

