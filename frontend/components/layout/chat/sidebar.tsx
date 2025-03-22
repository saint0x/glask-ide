"use client"

import { useState } from "react"
import { Plus, ChevronDown, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChatBar } from "./chat-bar"
import { Highlight, themes, type Language } from "prism-react-renderer"

interface ChatSidebarProps {
  isOpen: boolean
}

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface ChatThread {
  id: string
  title: string
  lastMessage: string
  timestamp: Date
  isActive: boolean
}

// Sample chat threads
const initialThreads: ChatThread[] = [
  {
    id: "1",
    title: "TypeScript Interface Help",
    lastMessage: "How do I extend interfaces?",
    timestamp: new Date(),
    isActive: true,
  },
  {
    id: "2",
    title: "React Component Structure",
    lastMessage: "What's the best way to organize components?",
    timestamp: new Date(Date.now() - 1000 * 60 * 30),
    isActive: false,
  },
  {
    id: "3",
    title: "Debugging Help",
    lastMessage: "I'm getting a strange error...",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
    isActive: false,
  },
]

// Sample messages
const initialMessages: Message[] = [
  {
    id: "1",
    role: "user",
    content: "How do I extend interfaces in TypeScript?",
    timestamp: new Date(Date.now() - 1000 * 60 * 5),
  },
  {
    id: "2",
    role: "assistant",
    content:
      "To extend interfaces in TypeScript, you can use the `extends` keyword. Here's an example:\n\n```typescript\ninterface BaseInterface {\n  id: number;\n  name: string;\n}\n\ninterface ExtendedInterface extends BaseInterface {\n  age: number;\n  email: string;\n}\n```\n\nThis way, `ExtendedInterface` will have all the properties from `BaseInterface` plus its own properties.",
    timestamp: new Date(Date.now() - 1000 * 60 * 4),
  },
  {
    id: "3",
    role: "user",
    content: "Can I extend multiple interfaces?",
    timestamp: new Date(Date.now() - 1000 * 60 * 3),
  },
  {
    id: "4",
    role: "assistant",
    content:
      "Yes, you can extend multiple interfaces in TypeScript by separating them with commas. Here's how:\n\n```typescript\ninterface Interface1 {\n  prop1: string;\n}\n\ninterface Interface2 {\n  prop2: number;\n}\n\ninterface CombinedInterface extends Interface1, Interface2 {\n  prop3: boolean;\n}\n```\n\nNow `CombinedInterface` will have all properties from both `Interface1` and `Interface2`, plus its own `prop3`.",
    timestamp: new Date(Date.now() - 1000 * 60 * 2),
  },
]

// Custom theme based on glassmorphic aesthetic
const customTheme = {
  ...themes.vsDark,
  plain: {
    color: "#e8e8ed",
    backgroundColor: "transparent",
  },
  styles: [
    ...themes.vsDark.styles,
    {
      types: ["keyword", "builtin", "operator"],
      style: {
        color: "#ff79c6",
      },
    },
    {
      types: ["string", "char", "tag", "selector"],
      style: {
        color: "#8be9fd",
      },
    },
    {
      types: ["function", "class-name"],
      style: {
        color: "#50fa7b",
      },
    },
    {
      types: ["comment"],
      style: {
        color: "#6272a4",
        fontStyle: "italic",
      },
    },
    {
      types: ["constant", "number", "boolean"],
      style: {
        color: "#bd93f9",
      },
    },
    {
      types: ["attr-name", "property"],
      style: {
        color: "#ffb86c",
      },
    },
    {
      types: ["punctuation"],
      style: {
        color: "#a0a0a8",
      },
    },
    {
      types: ["variable"],
      style: {
        color: "#f8f8f2",
      },
    },
  ],
}

// Function to format message content with code blocks
const formatMessageContent = (content: string) => {
  // Split by code block markers
  const parts = content.split(/(```[\s\S]*?```)/g)

  return parts.map((part, index) => {
    // Check if this part is a code block
    if (part.startsWith("```") && part.endsWith("```")) {
      // Extract language and code
      const match = part.match(/```(\w+)?\n([\s\S]*?)```/)
      if (match) {
        const [_, language = "typescript", code] = match
        return (
          <div
            key={index}
            className="mt-2 mb-2 rounded-md overflow-hidden bg-[rgba(26,26,32,0.7)] border border-[#c0c0c8]/10"
          >
            <div className="px-3 py-1 text-xs text-[#a0a0a8] bg-[rgba(26,26,32,0.9)] border-b border-[#c0c0c8]/10">
              {language}
            </div>
            <div className="p-3">
              <Highlight theme={customTheme} code={code} language={language as Language}>
                {({ className, style, tokens, getLineProps, getTokenProps }) => (
                  <pre
                    className="whitespace-pre-wrap break-words overflow-x-hidden text-xs"
                    style={{ ...style, backgroundColor: "transparent" }}
                  >
                    {tokens.map((line, i) => {
                      // Extract the key from getLineProps and pass it directly
                      const lineProps = getLineProps({ line })
                      const { key: lineKey, ...restLineProps } = lineProps

                      return (
                        <div key={i} {...restLineProps}>
                          {line.map((token, key) => {
                            // Extract the key from getTokenProps and pass it directly
                            const tokenProps = getTokenProps({ token })
                            const { key: tokenKey, ...restTokenProps } = tokenProps

                            return <span key={key} {...restTokenProps} />
                          })}
                        </div>
                      )
                    })}
                  </pre>
                )}
              </Highlight>
            </div>
          </div>
        )
      }
    }

    // Regular text - split by newlines to preserve formatting
    return part.split("\n").map((line, lineIndex) => (
      <span key={`${index}-${lineIndex}`}>
        {line}
        {lineIndex < part.split("\n").length - 1 && <br />}
      </span>
    ))
  })
}

// Client-only timestamp component
function TimeDisplay({ date }: { date: Date }) {
  return <>{date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</>
}

export function ChatSidebar({ isOpen }: ChatSidebarProps) {
  const [threads, setThreads] = useState<ChatThread[]>(initialThreads)
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [showThreads, setShowThreads] = useState(false)

  const handleSendMessage = (content: string) => {
    if (!content.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    }

    setMessages([...messages, newMessage])

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm simulating a response to your message. In a real application, this would be an actual response from an AI assistant.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
    }, 1000)
  }

  const toggleThreadsView = () => {
    setShowThreads((prev) => !prev)
  }

  const glassmorphicStyle = {
    background: "rgba(26, 26, 32, 0.6)",
    backdropFilter: "blur(10px)",
    WebkitBackdropFilter: "blur(10px)",
    border: "1px solid rgba(192, 192, 200, 0.1)",
    borderRadius: "16px",
  }

  return (
    <div
      data-chat-sidebar
      className={cn("h-full w-full", !isOpen && "hidden")}
      style={glassmorphicStyle}
    >
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleThreadsView}
            className="text-sm font-medium text-[#e8e8ed] rounded-lg"
          >
            {showThreads ? "Current Thread" : "TypeScript Interface Help"}
            <ChevronDown className="ml-1 h-4 w-4" />
          </Button>
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="sr-only">New Chat</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-full text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              <span className="sr-only">More Options</span>
            </Button>
          </div>
        </div>

        {showThreads ? (
          <div className="flex-1 overflow-y-auto p-3 pb-24">
            <div className="mb-4">
              <Button
                className="text-[#e8e8ed] hover:bg-[#c0c0c8]/20 h-10 w-full flex-shrink-0 relative rounded-xl"
                style={glassmorphicStyle}
              >
                <Plus className="h-4 w-4 absolute left-3" />
                <span className="mx-auto">New Chat</span>
              </Button>
            </div>

            <div className="space-y-2">
              {threads.map((thread) => (
                <div
                  key={thread.id}
                  className={cn(
                    "cursor-pointer rounded-xl p-3 transition-colors",
                    thread.isActive ? "bg-[#c0c0c8]/10" : "hover:bg-[#c0c0c8]/5",
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-[#e8e8ed]">{thread.title}</h3>
                    <span className="text-xs text-[#a0a0a8]"><TimeDisplay date={thread.timestamp} /></span>
                  </div>
                  <p className="mt-1 truncate text-xs text-[#a0a0a8]">{thread.lastMessage}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-3 pb-24">
            <div className="space-y-6">
              {messages.map((message) => (
                <div key={message.id} className="message-container">
                  {/* User Message - With glassmorphic bubble */}
                  {message.role === "user" && (
                    <div className="flex justify-end">
                      <div className="max-w-[90%] rounded-2xl px-4 py-3 text-[#e8e8ed]" style={glassmorphicStyle}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        <p className="mt-1 text-xs text-[#a0a0a8] text-right"><TimeDisplay date={message.timestamp} /></p>
                      </div>
                    </div>
                  )}

                  {/* AI Message - Directly on canvas */}
                  {message.role === "assistant" && (
                    <div className="max-w-[90%] px-1 py-1 text-[#e8e8ed]">
                      <div className="text-sm">{formatMessageContent(message.content)}</div>
                      <p className="mt-1 text-xs text-[#a0a0a8]"><TimeDisplay date={message.timestamp} /></p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Floating Chat Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-10">
          <ChatBar onSendMessage={handleSendMessage} />
        </div>
      </div>
    </div>
  )
}

