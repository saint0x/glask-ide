"use client"

import type React from "react"

import { useState, useEffect, useRef, useCallback } from "react"
import { cn } from "@/lib/utils"
import { readFile, writeFile } from "@/lib/api/filesystem"
import debounce from "lodash/debounce"
import { getLanguageFromPath, highlightCode, formatCode, getThemeStyles } from "@/lib/code-utils"

interface EditorProps {
  className?: string
  filePath?: string
  readOnly?: boolean
  onChange?: (isModified: boolean) => void
}

export function Editor({ className, filePath, readOnly = false, onChange }: EditorProps) {
  const [code, setCode] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [language, setLanguage] = useState<string>("plaintext")
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
      setLanguage("plaintext")
      return
    }

    // Set language based on file extension
    setLanguage(getLanguageFromPath(filePath))

    const loadFile = async () => {
      try {
        setIsLoading(true)
        setError(null)
        console.log("Loading file:", filePath)
        const content = await readFile(filePath)
        setCode(content)
        setIsDirty(false)
        lastSavedCode.current = content
      } catch (err) {
        console.error("Error loading file:", err)
        setError(err instanceof Error ? err.message : "Failed to load file")
      } finally {
        setIsLoading(false)
      }
    }

    loadFile()
  }, [filePath])

  // Format code on demand (Shift + Alt + F)
  const handleFormat = useCallback(async () => {
    if (!code || !language) return
    try {
      const formatted = await formatCode(code, language)
      setCode(formatted)
      setIsDirty(true)
      onChange?.(true)
    } catch (err) {
      console.error("Error formatting code:", err)
    }
  }, [code, language, onChange])

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (content: string) => {
      if (!filePath || !isDirty) return

      try {
        console.log("Saving file:", filePath)
        await writeFile(filePath, content)
        lastSavedCode.current = content
        setIsDirty(false)
        onChange?.(false)
        console.log("File saved successfully")
      } catch (err) {
        console.error("Error saving file:", err)
        setError(err instanceof Error ? err.message : "Failed to save file")
      }
    }, 1000),
    [filePath, isDirty, onChange]
  )

  // Handle code changes
  const handleCodeChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newCode = e.target.value
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
      if (isDirty) {
        debouncedSave.flush()
      }
    } else if (e.key === "f" && e.shiftKey && e.altKey) {
      // Handle format
      e.preventDefault()
      handleFormat()
    }
  }, [code, debouncedSave, isDirty, handleFormat])

  // Cleanup effect
  useEffect(() => {
    return () => {
      // Save any pending changes before unmounting
      if (isDirty) {
        debouncedSave.flush()
      }
      debouncedSave.cancel()
    }
  }, [debouncedSave, isDirty])

  // Add syntax highlighting styles
  useEffect(() => {
    const styleId = 'editor-syntax-styles'
    let styleEl = document.getElementById(styleId)
    
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    
    // Add base theme styles
    const themeStyles = getThemeStyles(true) // Use dark theme
    styleEl.textContent = `
      .editor-content {
        color: #d4d4d4;
        background: transparent;
      }
      .editor-content pre {
        margin: 0;
        padding: 0;
        background: transparent;
      }
      ${themeStyles}
    `
  }, [])

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

  const highlightedCode = highlightCode(code, language)

  return (
    <div 
      className={cn("relative h-full w-full font-mono", className)}
      style={{
        background: "rgba(26, 26, 32, 0.8)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="editor-content absolute h-full w-full overflow-auto rounded-lg bg-transparent p-4 text-sm">
        <pre dangerouslySetInnerHTML={{ __html: highlightedCode }} />
      </div>
      <textarea
        ref={textareaRef}
        value={code}
        onChange={handleCodeChange}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className={cn(
          "absolute h-full w-full resize-none overflow-auto rounded-lg bg-transparent p-4 text-sm text-transparent caret-white outline-none",
          "selection:bg-[#163b59]"
        )}
        style={{
          WebkitTextFillColor: "transparent",
          fontFamily: "inherit",
          caretColor: "#fff",
        }}
        readOnly={readOnly}
      />
    </div>
  )
}

