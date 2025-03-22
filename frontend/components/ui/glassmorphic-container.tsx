import type React from "react"
import { cn } from "@/lib/utils"

interface GlassmorphicContainerProps {
  children: React.ReactNode
  className?: string
  intensity?: "light" | "medium" | "heavy"
  rounded?: boolean
  border?: boolean
}

export function GlassmorphicContainer({
  children,
  className,
  intensity = "medium",
  rounded = true,
  border = true,
}: GlassmorphicContainerProps) {
  const bgOpacity = {
    light: "0.3",
    medium: "0.6",
    heavy: "0.8",
  }

  return (
    <div
      className={cn(border && "border border-border", rounded && "rounded-xl", className)}
      style={{
        background: `rgba(26, 26, 32, ${bgOpacity[intensity]})`,
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 8px 32px 0 rgba(0, 0, 0, 0.2)",
      }}
    >
      {children}
    </div>
  )
}

