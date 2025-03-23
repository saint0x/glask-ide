"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { Highlight, themes, type Language } from "prism-react-renderer"
import { readFile, writeFile } from "@/lib/api/filesystem"
import debounce from "lodash/debounce"

interface EditorProps {
  className?: string
  filePath?: string
  language?: Language
  readOnly?: boolean
  onChange?: (isModified: boolean) => void
}

export function Editor({ className, filePath, language = "tsx", readOnly = false, onChange }: EditorProps) {
  const [code, setCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedCode = useRef<string>("")
  const mountedRef = useRef(false)

  // Load file contents when filePath changes
  useEffect(() => {
    // Skip initial mount to prevent double loading
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }

    if (!filePath) {
      setCode("")
      setError(null)
      setIsDirty(false)
      lastSavedCode.current = ""
      return
    }

    const loadFile = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log("Loading file:", filePath) // Debug log
        const content = await readFile(filePath)
        setCode(content)
        setIsDirty(false)
        lastSavedCode.current = content
      } catch (err) {
        console.error("Error loading file:", err) // Debug log
        setError(err instanceof Error ? err.message : "Failed to load file")
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [filePath])

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (!filePath || !isDirty) return

      try {
        console.log("Saving file:", filePath) // Debug log
        await writeFile(filePath, content)
        lastSavedCode.current = content
        setIsDirty(false)
        onChange?.(false)
      } catch (err) {
        console.error("Error saving file:", err) // Debug log
        setError(err instanceof Error ? err.message : "Failed to save file")
      }
    }, 1000),
    [filePath, isDirty, onChange]
  )

  // Handle code changes
  const handleCodeChange = useCallback((newCode: string) => {
    setCode(newCode)
    const isModified = newCode !== lastSavedCode.current
    setIsDirty(isModified)
    onChange?.(isModified)
    debouncedSave(newCode)
  }, [debouncedSave, onChange])

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const start = e.currentTarget.selectionStart
      const end = e.currentTarget.selectionEnd
      const newCode = code.substring(0, start) + "  " + code.substring(end)
      setCode(newCode)
      // Set cursor position after tab
      requestAnimationFrame(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2
        }
      })
    } else if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
      // Handle manual save
      e.preventDefault()
      debouncedSave.flush()
    }
  }, [code, debouncedSave])

  // Cleanup effect
  useEffect(() => {
    return () => {
      debouncedSave.cancel()
    }
  }, [debouncedSave])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#4d9cf6] border-t-transparent" />
        <span className="ml-2 text-sm text-[#a0a0a8]">Loading...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <span className="text-sm text-red-500">{error}</span>
      </div>
    )
  }

  return (
    <div 
      className={cn("relative h-full w-full font-mono", className)}
      style={{
        background: "rgba(26, 26, 32, 0.8)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <Highlight 
        theme={themes.nightOwl} 
        code={code} 
        language={language}
      >
        {({ className: highlightClassName, style, tokens, getLineProps, getTokenProps }) => (
          <>
            <pre
              className={cn(
                "absolute h-full w-full overflow-auto rounded-lg bg-transparent p-4 text-sm",
                highlightClassName
              )}
              style={style}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
            <textarea
              ref={textareaRef}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              onKeyDown={handleKeyDown}
              spellCheck={false}
              className={cn(
                "absolute h-full w-full resize-none overflow-auto rounded-lg bg-transparent p-4 text-sm text-transparent caret-white outline-none",
                "selection:bg-[#163b59]"
              )}
              style={{
                WebkitTextFillColor: "transparent",
                fontFamily: "inherit",
              }}
              readOnly={readOnly}
            />
          </>
        )}
      </Highlight>
    </div>
  )
}

