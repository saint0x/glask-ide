import { getFileIconByExtension } from "@/lib/file-icons"

interface FileIconProps {
  extension: string
  className?: string
}

export function FileIcon({ extension, className }: FileIconProps) {
  const iconDef = getFileIconByExtension(extension)

  return (
    <div
      className={`flex items-center justify-center font-medium leading-none ${className}`}
      style={{
        color: iconDef.bgColor, // Use the background color as the text color
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      {iconDef.label.substring(0, 2)}
    </div>
  )
}

