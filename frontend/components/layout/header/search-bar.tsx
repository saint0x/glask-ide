import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"

export function SearchBar() {
  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="flex items-center w-full max-w-xl">
        <div className="flex items-center mr-2 space-x-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
          >
            Undo
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 rounded-lg px-2 text-xs text-[#a0a0a8] hover:text-[#e8e8ed] hover:bg-[#c0c0c8]/5"
          >
            Redo
          </Button>
        </div>

        <div
          className="flex h-8 flex-1 items-center rounded-lg border border-border-medium bg-[rgba(26,26,32,0.4)] px-3"
          style={{
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
          }}
        >
          <Search className="mr-2 h-3.5 w-3.5 text-[#a0a0a8]" />
          <input
            type="text"
            placeholder="Search or jump to file..."
            className="w-full bg-transparent text-sm text-[#e8e8ed] placeholder-[#a0a0a8] focus:outline-none"
          />
        </div>
      </div>
    </div>
  )
}

