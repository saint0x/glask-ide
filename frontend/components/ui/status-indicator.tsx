import { cn } from "@/lib/utils"

type StatusType = "success" | "error" | "warning" | "info" | "pending" | "none"

interface StatusIndicatorProps {
  status: StatusType
  className?: string
  size?: "sm" | "md" | "lg"
}

export function StatusIndicator({ status, className, size = "md" }: StatusIndicatorProps) {
  const getStatusColor = (status: StatusType) => {
    switch (status) {
      case "success":
        return "text-[#4d9cf6]" // Blue for success
      case "error":
        return "text-[#f6564d]" // Red for error
      case "warning":
        return "text-[#f6c84d]" // Yellow for warning
      case "info":
        return "text-[#4dc4f6]" // Light blue for info
      case "pending":
        return "text-[#f6c84d]" // Yellow for pending
      default:
        return "text-[#a0a0a8]" // Default gray
    }
  }

  const sizeClass = {
    sm: "text-[10px]",
    md: "text-xs",
    lg: "text-sm",
  }

  return <span className={cn(sizeClass[size], getStatusColor(status), className)}>●</span>
}

