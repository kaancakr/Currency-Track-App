'use client';

import { ColumnDef } from '@tanstack/react-table';
import { DataTable } from './DataTable';
import type { Rate } from '@/lib/api-client';

const formatNumber = (value: number) =>
  new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  }).format(value);

const formatTimestamp = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'short',
        timeStyle: 'medium',
      }).format(new Date(value))
    : '—';

const columns: ColumnDef<Rate>[] = [
  {
    accessorKey: 'pair',
    header: 'Currency Pair',
    cell: ({ row }) => {
      const rate = row.original;
      return (
        <div className="font-semibold">
          {rate.base}/{rate.quote}
        </div>
      );
    },
  },
  {
    accessorKey: 'rate',
    header: 'Exchange Rate',
    cell: ({ row }) => {
      const rate = row.original.rate;
      return (
        <div className="font-mono text-lg text-emerald-300">
          {formatNumber(rate)}
        </div>
      );
    },
  },
  {
    accessorKey: 'fetched_at',
    header: 'Last Updated',
    cell: ({ row }) => (
      <div className="text-white/60 text-xs">
        {formatTimestamp(row.original.fetched_at)}
      </div>
    ),
  },
];

interface RatesTableProps {
  data: Rate[];
  isLoading?: boolean;
}

export function RatesTable({ data, isLoading = false }: RatesTableProps) {
  return (
    <DataTable
      data={data}
      columns={columns}
      isLoading={isLoading}
      emptyMessage="No rates available"
    />
  );
}

