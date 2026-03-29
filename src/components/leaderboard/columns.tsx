import { ColumnDef } from '@tanstack/react-table'
import { ArrowUpDown } from 'lucide-react'
import type { GameResultRow } from '../../types/gameResult'
import { Avatar } from '../auth/Avatar'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { MODE_LABELS } from '../../services/resultsService'

export const columns: ColumnDef<GameResultRow>[] = [
  {
    accessorKey: 'username',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Hrac
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Avatar avatarId={row.original.avatar_id} size={28} />
        <span>{row.getValue('username')}</span>
      </div>
    ),
  },
  {
    accessorKey: 'set_name',
    header: 'Sada',
    cell: ({ row }) => <span>{row.getValue('set_name')}</span>,
    filterFn: 'includesString',
  },
  {
    accessorKey: 'game_mode',
    header: 'Mod',
    cell: ({ row }) => {
      const mode = row.getValue('game_mode') as string
      return (
        <Badge variant={mode === 'lightning' ? 'secondary' : 'default'}>
          {MODE_LABELS[mode]?.emoji} {MODE_LABELS[mode]?.label}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true
      return value.includes(row.getValue(id))
    },
  },
  {
    accessorKey: 'score',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Skore
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <span style={{ fontWeight: 700, color: '#F5C400' }}>
        {row.getValue('score')}
      </span>
    ),
  },
  {
    accessorKey: 'accuracy',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Presnost
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const accuracy = row.getValue('accuracy') as number | null
      if (accuracy === null) return <span>—</span>
      const color =
        accuracy >= 90 ? '#1D9E75' : accuracy >= 60 ? '#F5C400' : '#E24B4A'
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div
            style={{
              width: 40,
              height: 4,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.1)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${accuracy}%`,
                height: '100%',
                background: color,
                borderRadius: 2,
              }}
            />
          </div>
          <span style={{ fontSize: '0.8rem' }}>{accuracy}%</span>
        </div>
      )
    },
  },
  {
    id: 'type',
    accessorKey: 'is_multiplayer',
    header: 'Typ',
    cell: ({ row }) => {
      const val = row.getValue('type') as boolean
      return <Badge variant="outline">{val ? 'Online' : 'Solo'}</Badge>
    },
    filterFn: (row, id, value) => {
      if (!value || value.length === 0) return true
      return value.includes(String(row.getValue(id)))
    },
  },
  {
    accessorKey: 'played_at',
    header: ({ column }) => (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      >
        Datum
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const val = row.getValue('played_at') as string
      return (
        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>
          {new Date(val).toLocaleDateString('cs-CZ', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      )
    },
  },
]
