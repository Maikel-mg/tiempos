"use client"

import * as React from "react"
import { Table } from "@tanstack/react-table"
import { X, Filter, CheckSquare, Square, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
  searchKey?: string
}

export function DataTableToolbar<TData>({
  table,
  searchKey,
}: DataTableToolbarProps<TData>) {
  const [searchValue, setSearchValue] = React.useState("")

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(value)
    } else {
      // Global search
      table.setGlobalFilter(value)
    }
  }

  const clearSearch = () => {
    setSearchValue("")
    if (searchKey) {
      table.getColumn(searchKey)?.setFilterValue(undefined)
    } else {
      table.setGlobalFilter("")
    }
  }

  const showAllColumns = () => {
    table.getAllColumns().forEach(column => {
      column.toggleVisibility(true)
    })
  }

  const hideAllColumns = () => {
    table.getAllColumns().forEach(column => {
      if (column.id !== 'select') {
        column.toggleVisibility(false)
      }
    })
  }

  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-1 items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Input
            placeholder="Buscar en cualquier columna..."
            value={searchValue}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-10"
          />
          {searchValue && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        
        {/* Selection buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              table.toggleAllPageRowsSelected(true)
            }}
          >
            <CheckSquare className="h-4 w-4 mr-2" />
            Seleccionar página
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              table.toggleAllPageRowsSelected(false)
            }}
          >
            <Square className="h-4 w-4 mr-2" />
            Deseleccionar
          </Button>
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-auto">
            <Filter className="h-4 w-4 mr-2" />
            Columnas
            <span className="ml-2 rounded-md bg-secondary px-1.5 py-0.5 text-xs font-semibold">
              {table.getAllColumns().filter(col => col.getIsVisible()).length}/
              {table.getAllColumns().length}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          <DropdownMenuLabel>Visibilidad de columnas</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="flex gap-2 mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={showAllColumns}
              className="flex-1"
            >
              <Eye className="h-4 w-4 mr-1" />
              Mostrar todas
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={hideAllColumns}
              className="flex-1"
            >
              <EyeOff className="h-4 w-4 mr-1" />
              Ocultar todas
            </Button>
          </div>
          <DropdownMenuSeparator />
          <div className="max-h-[300px] overflow-y-auto">
            {table
              .getAllColumns()
              .filter(
                (column) => column.getCanHide()
              )
              .map((column) => {
                return (
                  <DropdownMenuCheckboxItem
                    key={column.id}
                    className="capitalize"
                    checked={column.getIsVisible()}
onCheckedChange={(value: boolean) => {
                       column.toggleVisibility(!!value)
                     }}
                  >
                    {column.id}
                  </DropdownMenuCheckboxItem>
                )
              })}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}