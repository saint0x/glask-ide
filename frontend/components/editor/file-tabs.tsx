"use client"

import type React from "react"

import { useState } from "react"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { FileIcon } from "./file-icon"

interface FileTab {
  id: string
  name: string
  path: string
  extension: string
  isModified: boolean
  isActive: boolean
}

interface FileTabsProps {
  className?: string
}

export function FileTabs({ className }: FileTabsProps) {
  // Sample open files
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      id: "1",
      name: "recent-sales.tsx",
      path: "/components/recent-sales.tsx",
      extension: "tsx",
      isModified: true,
      isActive: false,
    },
    {
      id: "2",
      name: "api.ts",
      path: "/lib/api.ts",
      extension: "ts",
      isModified: false,
      isActive: false,
    },
    {
      id: "3",
      name: "page.tsx",
      path: "/app/service/page.tsx",
      extension: "tsx",
      isModified: false,
      isActive: false,
    },
    {
      id: "4",
      name: "add-vehicle-form.tsx",
      path: "/components/add-vehicle-form.tsx",
      extension: "tsx",
      isModified: true,
      isActive: true,
    },
    {
      id: "5",
      name: "dashboard.tsx",
      path: "/app/dashboard/page.tsx",
      extension: "tsx",
      isModified: false,
      isActive: false,
    },
    {
      id: "6",
      name: "settings.tsx",
      path: "/app/settings/page.tsx",
      extension: "tsx",
      isModified: false,
      isActive: false,
    },
    {
      id: "7",
      name: "utils.ts",
      path: "/lib/utils.ts",
      extension: "ts",
      isModified: false,
      isActive: false,
    },
    {
      id: "8",
      name: "package.json",
      path: "/package.json",
      extension: "json",
      isModified: false,
      isActive: false,
    },
  ])

  const handleTabClick = (id: string) => {
    setTabs(
      tabs.map((tab) => ({
        ...tab,
        isActive: tab.id === id,
      })),
    )
  }

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setTabs(tabs.filter((tab) => tab.id !== id))
  }

  return (
    <div
      className={cn(
        "glassmorphic flex h-9 items-center border-b border-border overflow-x-auto overflow-y-hidden",
        className,
      )}
      style={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
      }}
    >
      <div className="flex min-w-max">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            onClick={() => handleTabClick(tab.id)}
            className={cn(
              "group flex h-9 min-w-0 max-w-[200px] cursor-pointer items-center border-r border-border px-3 transition-colors",
              tab.isActive ? "bg-[rgba(40,40,46,0.6)] text-[#e8e8ed]" : "hover:bg-[rgba(40,40,46,0.4)] text-[#a0a0a8]",
            )}
          >
            <div className="mr-2 flex-shrink-0 w-5 flex items-center justify-center">
              <FileIcon extension={tab.extension} />
            </div>
            <div className="truncate text-sm font-medium flex items-center">
              {tab.name}
              {tab.isModified && <span className="ml-1 text-[#a0a0a8]">●</span>}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => closeTab(tab.id, e)}
              className="ml-2 h-5 w-5 flex-shrink-0 rounded-sm opacity-0 transition-opacity group-hover:opacity-100"
            >
              <X className="h-3 w-3" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}

