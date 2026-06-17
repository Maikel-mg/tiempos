"use client"

import * as React from "react"
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DataTablePagination } from "./data-table-pagination"
import { DataTableToolbar } from "./data-table-toolbar"

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  onRowSelectionChange?: (selectedRows: TData[]) => void
  selectedRows?: TData[]
  globalFilter?: string
  getRowId?: (row: TData, index: number) => string
  onRowClick?: (row: TData) => void
  columnToggle?: {
    columns: { id: string; label: string; visible: boolean }[];
    onToggle: (columnId: string, visible: boolean) => void;
  };
  /** Index of the currently active row for keyboard navigation (-1 = none). */
  activeIndex?: number;
  /** Returns props to spread on each <tr> for keyboard navigation. */
  getRowProps?: (index: number) => Record<string, unknown>;
  /** Ref to attach to the <table> element for keyboard navigation container. */
  tableRef?: React.RefObject<HTMLTableElement>;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  onRowSelectionChange,
  selectedRows,
  globalFilter,
  getRowId,
  onRowClick,
  columnToggle,
  getRowProps,
  tableRef,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({})
  const [searchValue, setSearchValue] = React.useState("")

  // Extract accessor keys from column definitions for pre-table filtering
  const searchableKeys = React.useMemo(() => {
    return columns
      .map((col) => ('accessorKey' in col ? (col.accessorKey as string) : null))
      .filter((key): key is string => !!key);
  }, [columns]);

  // Filter data BEFORE passing to the table
  const filteredData = React.useMemo(() => {
    if (!searchValue) return data;
    const term = searchValue.toLowerCase();
    return data.filter((row) =>
      searchableKeys.some((key) => {
        const value = (row as Record<string, unknown>)[key];
        return String(value ?? '').toLowerCase().includes(term);
      })
    );
  }, [data, searchableKeys, searchValue]);

  // Sync external selected rows if provided
  React.useEffect(() => {
    if (selectedRows && selectedRows.length > 0) {
      const rowMap: Record<string, boolean> = {}
      selectedRows.forEach((row, index) => {
        const id = getRowId ? getRowId(row, index) : index.toString()
        rowMap[id] = true
      })
      setRowSelection(rowMap)
    }
  }, [selectedRows, getRowId])

  const table = useReactTable({
    data: filteredData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter: globalFilter ?? '',
    },
    getRowId: (row, index) => getRowId ? getRowId(row, index) : index.toString(),
  })

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onRowSelectionChange) {
      const idToRowMap = new Map<string, TData>()
      data.forEach((row, index) => {
        const id = getRowId ? getRowId(row, index) : index.toString()
        idToRowMap.set(id, row)
      })

      const selectedData = Object.keys(rowSelection)
        .filter(key => rowSelection[key])
        .map(key => idToRowMap.get(key))
        .filter((row): row is TData => row !== undefined)

      onRowSelectionChange(selectedData)
    }
  }, [rowSelection, data, onRowSelectionChange, getRowId])

  return (
    <div className="space-y-3">
      <DataTableToolbar
        searchValue={searchValue}
        onSearchChange={setSearchValue}
        searchKey={searchKey}
        columnToggle={columnToggle}
      />
      <div className="rounded-lg border border-border/50 overflow-hidden">
        <Table ref={tableRef as React.RefObject<HTMLTableElement>}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row, rowIndex) => {
                const rowData = row.original;
                const keyboardProps = getRowProps ? getRowProps(rowIndex) : {};
                return (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  onClick={() => onRowClick?.(rowData)}
                  className={onRowClick ? "cursor-pointer hover:bg-muted/50" : undefined}
                  {...keyboardProps}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No hay datos para mostrar
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <DataTablePagination table={table} />
    </div>
  )
}