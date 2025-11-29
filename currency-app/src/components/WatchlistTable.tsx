'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import { Trash2 } from 'lucide-react';
import type { WatchlistItem } from '@/lib/api-client';

interface WatchlistTableProps {
  data: WatchlistItem[];
  onRemove?: (item: WatchlistItem) => void;
  isLoading?: boolean;
}

export function WatchlistTable({
  data,
  onRemove,
  isLoading = false,
}: WatchlistTableProps) {
  const columns: ColumnDef<WatchlistItem>[] = [
    {
      accessorKey: 'pair',
      header: 'Currency Pair',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="font-semibold text-lg">
            {item.base}/{item.quote}
          </div>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Added',
      cell: ({ row }) => {
        const date = new Date(row.original.created_at);
        return (
          <div className="text-white/60 text-sm">
            {date.toLocaleDateString()} {date.toLocaleTimeString()}
          </div>
        );
      },
    },
    ...(onRemove
      ? [
          {
            id: 'actions',
            header: 'Actions',
            cell: ({ row }) => (
              <button
                onClick={() => onRemove(row.original)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 transition-colors"
              >
                <Trash2 size={16} />
                <span>Remove</span>
              </button>
            ),
          } as ColumnDef<WatchlistItem>,
        ]
      : []),
  ];

  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="No items in watchlist"
    />
  );
}

