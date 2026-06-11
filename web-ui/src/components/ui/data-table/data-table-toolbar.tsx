"use client"

import { X } from "lucide-react"
import { Input } from "@/components/ui/input"

interface DataTableToolbarProps {
  searchValue: string
  onSearchChange: (value: string) => void
  searchKey?: string
}

export function DataTableToolbar({
  searchValue,
  onSearchChange,
}: DataTableToolbarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Buscar en cualquier columna..."
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchValue && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}