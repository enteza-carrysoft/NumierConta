import Link from 'next/link'
import { Card } from '@/shared/components/ui/card'
import type { Batch } from '@/features/batches/services/list-batches'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-ES')
}

interface BatchesListProps {
  batches: Batch[]
}

export function BatchesList({ batches }: BatchesListProps) {
  if (batches.length === 0) {
    return <p className="text-gray-600">No hay lotes contables todavía.</p>
  }

  return (
    <div className="space-y-4">
      {batches.map((batch) => (
        <Link key={batch.id} href={`/batches/${batch.id}`} className="block">
          <Card className="transition-colors hover:border-indigo-300">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Lote {formatDate(batch.periodFrom)} — {formatDate(batch.periodTo)}
                </h3>
                <p className="text-sm text-gray-600">
                  Asientos: {batch.totalDebit.toFixed(2)} € / {batch.totalCredit.toFixed(2)} € |{' '}
                  {batch.balanced ? 'Cuadrado' : 'Descuadrado'}
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  batch.status === 'exported'
                    ? 'bg-green-100 text-green-800'
                    : batch.status === 'reviewed'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-800'
                }`}
              >
                {batch.status}
              </span>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
