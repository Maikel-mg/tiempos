"use client"

import { ColumnDef } from "@tanstack/react-table"
import { Checkbox } from "@/components/ui/checkbox"

export interface SelectColumnConfig {
  id?: string
  enableSorting?: boolean
  enableHiding?: boolean
}

export function createSelectColumn<T>(config: SelectColumnConfig = {}): ColumnDef<T> {
  const {
    id = "select",
    enableSorting = false,
    enableHiding = false,
  } = config

  return {
    id,
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected() || !!table.getIsSomePageRowsSelected()}
        onChange={(e) => {
          table.toggleAllPageRowsSelected(e.target.checked)
        }}
        aria-label="Seleccionar todos"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onChange={(e) => {
          row.toggleSelected(e.target.checked)
        }}
        aria-label="Seleccionar fila"
      />
    ),
    enableSorting,
    enableHiding,
  } as ColumnDef<T>
}

export type { ColumnDef }