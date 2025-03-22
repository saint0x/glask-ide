import { getFileIconByExtension } from "@/lib/file-icons"

interface FileIconProps {
  extension: string
  className?: string
  size?: "sm" | "md" | "lg"
}

export function FileIcon({ extension, className, size = "md" }: FileIconProps) {
  const iconDef = getFileIconByExtension(extension)

  const fontSize = {
    sm: "10px",
    md: "12px",
    lg: "14px",
  }

  return (
    <div
      className={`flex items-center justify-center font-medium leading-none ${className}`}
      style={{
        color: iconDef.bgColor, // Use the background color as the text color
        fontSize: fontSize[size],
        fontWeight: 600,
      }}
    >
      {iconDef.label.substring(0, 2)}
    </div>
  )
}

