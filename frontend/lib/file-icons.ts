// File type definitions for colored file icons
export interface FileIconDefinition {
  extension: string
  label: string
  bgColor: string // Now used as the text color
  textColor: string // Not used in this implementation but kept for future flexibility
  icon?: string // For special cases where we use an icon instead of text
}

// Map of file extensions to their icon representations
export const fileIcons: Record<string, FileIconDefinition> = {
  // TypeScript
  ts: {
    extension: "ts",
    label: "TS",
    bgColor: "#3178c6", // TypeScript blue
    textColor: "#ffffff",
  },
  tsx: {
    extension: "tsx",
    label: "TSX",
    bgColor: "#3178c6", // TypeScript blue
    textColor: "#ffffff",
  },

  // JavaScript
  js: {
    extension: "js",
    label: "JS",
    bgColor: "#f1e05a", // JavaScript yellow
    textColor: "#000000",
  },
  jsx: {
    extension: "jsx",
    label: "JSX",
    bgColor: "#f1e05a", // JavaScript yellow
    textColor: "#000000",
  },

  // JSON
  json: {
    extension: "json",
    label: "{}",
    bgColor: "#f1e05a", // Similar to JS yellow but slightly different
    textColor: "#000000",
  },

  // CSS
  css: {
    extension: "css",
    label: "CSS",
    bgColor: "#563d7c", // CSS purple
    textColor: "#ffffff",
  },

  // HTML
  html: {
    extension: "html",
    label: "HTML",
    bgColor: "#e34c26", // HTML orange/red
    textColor: "#ffffff",
  },

  // Markdown
  md: {
    extension: "md",
    label: "↓",
    bgColor: "#083fa1", // Markdown blue
    textColor: "#ffffff",
  },

  // YAML
  yml: {
    extension: "yml",
    label: "YML",
    bgColor: "#cb171e", // YAML red
    textColor: "#ffffff",
  },
  yaml: {
    extension: "yaml",
    label: "YAML",
    bgColor: "#cb171e", // YAML red
    textColor: "#ffffff",
  },

  // Python
  py: {
    extension: "py",
    label: "PY",
    bgColor: "#3572A5", // Python blue
    textColor: "#ffffff",
  },

  // Go
  go: {
    extension: "go",
    label: "GO",
    bgColor: "#00ADD8", // Go blue
    textColor: "#ffffff",
  },

  // Rust
  rs: {
    extension: "rs",
    label: "RS",
    bgColor: "#DEA584", // Rust orange/brown
    textColor: "#000000",
  },

  // C/C++
  c: {
    extension: "c",
    label: "C",
    bgColor: "#555555", // C gray
    textColor: "#ffffff",
  },
  cpp: {
    extension: "cpp",
    label: "C++",
    bgColor: "#f34b7d", // C++ pink
    textColor: "#ffffff",
  },

  // Java
  java: {
    extension: "java",
    label: "JAVA",
    bgColor: "#b07219", // Java brown
    textColor: "#ffffff",
  },

  // PHP
  php: {
    extension: "php",
    label: "PHP",
    bgColor: "#4F5D95", // PHP purple
    textColor: "#ffffff",
  },

  // Ruby
  rb: {
    extension: "rb",
    label: "RB",
    bgColor: "#701516", // Ruby red
    textColor: "#ffffff",
  },

  // Swift
  swift: {
    extension: "swift",
    label: "SWIFT",
    bgColor: "#F05138", // Swift orange
    textColor: "#ffffff",
  },

  // Shell/Bash
  sh: {
    extension: "sh",
    label: "SH",
    bgColor: "#89e051", // Shell green
    textColor: "#000000",
  },
  bash: {
    extension: "bash",
    label: "BASH",
    bgColor: "#89e051", // Shell green
    textColor: "#000000",
  },

  // Docker
  dockerfile: {
    extension: "dockerfile",
    label: "DOCKER",
    bgColor: "#384d54", // Docker blue
    textColor: "#ffffff",
  },

  // Config files
  conf: {
    extension: "conf",
    label: "CONF",
    bgColor: "#6d8086", // Config gray
    textColor: "#ffffff",
  },

  // Text files
  txt: {
    extension: "txt",
    label: "TXT",
    bgColor: "#6d8086", // Text gray
    textColor: "#ffffff",
  },
}

// Get file icon definition by extension
export function getFileIconByExtension(extension: string): FileIconDefinition {
  // Remove leading dot if present
  const ext = extension.startsWith(".") ? extension.substring(1) : extension

  // Return the icon definition if it exists, otherwise return a default
  return (
    fileIcons[ext.toLowerCase()] || {
      extension: ext,
      label: ext.toUpperCase().substring(0, 3),
      bgColor: "#6d8086", // Default gray
      textColor: "#ffffff",
    }
  )
}

