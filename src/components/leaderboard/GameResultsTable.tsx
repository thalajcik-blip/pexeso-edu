import { useEffect, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { columns } from './columns'
import type { GameResultRow } from '../../types/gameResult'
import { getGameResults } from '../../services/resultsService'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Skeleton } from '../ui/skeleton'

export function GameResultsTable() {
  const [data, setData] = useState<GameResultRow[]>([])
  const [loading, setLoading] = useState(true)
  const [sorting, setSorting] = useState<SortingState>([{ id: 'played_at', desc: true }])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])

  useEffect(() => {
    const load = async () => {
      try {
        const results = await getGameResults({ limit: 100 })
        setData(results)
      } catch (err) {
        console.error('[GameResultsTable] load error:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    state: { sorting, columnFilters },
    initialState: { pagination: { pageSize: 20 } },
  })

  return (
    <div>
      {/* Filter toolbar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <Input
          placeholder="Hledej sadu..."
          value={(table.getColumn('set_name')?.getFilterValue() as string) ?? ''}
          onChange={(e) =>
            table.getColumn('set_name')?.setFilterValue(e.target.value)
          }
          className="max-w-[200px]"
        />
        <Select
          onValueChange={(val) =>
            table.getColumn('game_mode')?.setFilterValue(val === 'all' ? undefined : [val])
          }
          defaultValue="all"
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Vsechny mody" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsechny mody</SelectItem>
            <SelectItem value="pexequiz">PexeQuiz</SelectItem>
            <SelectItem value="lightning">Bleskovy kviz</SelectItem>
          </SelectContent>
        </Select>
        <Select
          onValueChange={(val) =>
            table.getColumn('type')?.setFilterValue(val === 'all' ? undefined : [val])
          }
          defaultValue="all"
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Vsechny typy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Vsechny typy</SelectItem>
            <SelectItem value="false">Solo</SelectItem>
            <SelectItem value="true">Online</SelectItem>
          </SelectContent>
        </Select>
        {columnFilters.length > 0 && (
          <Button variant="ghost" onClick={() => table.resetColumnFilters()}>
            Resetovat
          </Button>
        )}
      </div>

      {/* Table */}
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="text-center text-muted-foreground py-8"
                >
                  Zadne vysledky
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: 16,
        }}
      >
        <span className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} vysledku
        </span>
        <span className="text-sm">
          {table.getState().pagination.pageIndex + 1} / {table.getPageCount() || 1}
        </span>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Predchazejici
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Dalsi
          </Button>
        </div>
      </div>
    </div>
  )
}
