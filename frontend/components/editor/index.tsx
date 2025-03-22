"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { cn } from "@/lib/utils"
import { Highlight, themes, type Language } from "prism-react-renderer"

interface EditorProps {
  className?: string
  code?: string
  language?: Language
  readOnly?: boolean
  onChange?: (value: string) => void
}

export function Editor({ className, code: initialCode, language = "tsx", readOnly = false, onChange }: EditorProps) {
  const [code, setCode] = useState(
    initialCode ||
      `import { useState, useEffect } from "react";

// Define the Vehicle type
export interface VehicleType {
  id: string;
  make: string;
  model: string;
  year: number;
  color: string;
  vin: string;
}

interface AddVehicleFormProps {
  onSubmit: (vehicle: Omit<VehicleType, "id">) => Promise<void>;
  isLoading?: boolean;
}

export default function AddVehicleForm({ onSubmit, isLoading = false }: AddVehicleFormProps) {
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      await onSubmit({
        make,
        model,
        year,
        color,
        vin
      });
      
      // Reset form after successful submission
      setMake("");
      setModel("");
      setYear(new Date().getFullYear());
      setColor("");
      setVin("");
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className="vehicle-form">
      <h2 className="text-xl font-bold mb-4">Add New Vehicle</h2>
      
      {error && (
        <div className="error-message mb-4 p-3 bg-red-100 text-red-800 rounded">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="make" className="block mb-1">Make</label>
          <input
            id="make"
            type="text"
            value={make}
            onChange={(e) => setMake(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="model" className="block mb-1">Model</label>
          <input
            id="model"
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="year" className="block mb-1">Year</label>
          <input
            id="year"
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            required
            min={1900}
            max={new Date().getFullYear() + 1}
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="color" className="block mb-1">Color</label>
          <input
            id="color"
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            required
            className="w-full p-2 border rounded"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="vin" className="block mb-1">VIN</label>
          <input
            id="vin"
            type="text"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            required
            pattern="[A-HJ-NPR-Z0-9]{17}"
            title="Valid 17-character VIN (excluding I, O, Q)"
            className="w-full p-2 border rounded"
          />
        </div>
        
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isLoading ? 'Adding...' : 'Add Vehicle'}
        </button>
      </form>
    </div>
  );
}`,
  )

  const editorRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Handle code changes
  const handleCodeChange = (newCode: string) => {
    setCode(newCode)
    if (onChange) {
      onChange(newCode)
    }
  }

  // Ensure proper text wrapping and boundary handling
  useEffect(() => {
    const handleResize = () => {
      if (editorRef.current) {
        // Ensure the editor respects the boundaries
        editorRef.current.style.maxWidth = "100%"
      }
    }

    // Initial setup
    handleResize()

    // Set up resize observer
    const resizeObserver = new ResizeObserver(handleResize)
    if (editorRef.current) {
      resizeObserver.observe(editorRef.current)
    }

    // Clean up
    return () => {
      resizeObserver.disconnect()
    }
  }, [])

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

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Tab") {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd

      // Insert tab at cursor position
      const newValue = textarea.value.substring(0, start) + "  " + textarea.value.substring(end)
      textarea.value = newValue

      // Move cursor after the inserted tab
      textarea.selectionStart = textarea.selectionEnd = start + 2

      // Update state
      handleCodeChange(newValue)
    }
  }

  return (
    <div
      ref={editorRef}
      className={cn(
        "h-full w-full overflow-auto bg-[rgba(20,20,26,0.7)] p-4 font-mono text-sm rounded-lg m-2 relative",
        className,
      )}
    >
      {/* Hidden textarea for editing */}
      <textarea
        ref={textareaRef}
        value={code}
        onChange={(e) => handleCodeChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="absolute inset-0 h-full w-full resize-none overflow-hidden bg-transparent p-4 font-mono text-sm text-transparent caret-white outline-none z-10"
        spellCheck="false"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        data-gramm="false"
        readOnly={readOnly}
      />

      {/* Syntax highlighted code display */}
      <Highlight theme={customTheme} code={code} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className="whitespace-pre-wrap break-words overflow-x-hidden pointer-events-none"
            style={{ ...style, backgroundColor: "transparent" }}
          >
            {tokens.map((line, i) => {
              // Extract the key from getLineProps and pass it directly
              const lineProps = getLineProps({ line })
              const { key: lineKey, ...restLineProps } = lineProps

              return (
                <div key={i} {...restLineProps} style={{ display: "flex" }}>
                  <span className="text-[#6272a4] opacity-60 select-none mr-4 text-right w-8">{i + 1}</span>
                  <span>
                    {line.map((token, key) => {
                      // Extract the key from getTokenProps and pass it directly
                      const tokenProps = getTokenProps({ token })
                      const { key: tokenKey, ...restTokenProps } = tokenProps

                      return <span key={key} {...restTokenProps} />
                    })}
                  </span>
                </div>
              )
            })}
          </pre>
        )}
      </Highlight>
    </div>
  )
}

