import { Card } from '@/shared/components/ui/card'
import { TxtDownload } from './txt-download'
import type { BatchDetail } from '@/features/batches/services/get-batch'

function formatDate(value: string | null): string {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('es-ES')
}

function formatMoney(value: number): string {
  return value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

interface BatchDetailProps {
  batch: BatchDetail
}

export function BatchDetailView({ batch }: BatchDetailProps) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Lote contable</h1>
          <p className="text-gray-600">
            {formatDate(batch.periodFrom)} — {formatDate(batch.periodTo)} | Estado: {batch.status}
          </p>
        </div>
        <TxtDownload batchId={batch.id} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <p className="text-sm text-gray-500">Total débito</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(batch.totalDebit)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Total crédito</p>
          <p className="mt-1 text-2xl font-semibold">{formatMoney(batch.totalCredit)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">Diferencia</p>
          <p className="mt-1 text-2xl font-semibold">
            {formatMoney(batch.totalDebit - batch.totalCredit)}
          </p>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Asientos</h2>
        {batch.entries.length === 0 && <p className="text-gray-600">Este lote no tiene asientos.</p>}
        {batch.entries.map((entry) => (
          <Card key={entry.id}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">
                #{entry.entryNumber} — {entry.concept ?? 'Sin concepto'}
              </h3>
              <span className="text-sm text-gray-500">{formatDate(entry.entryDate)}</span>
            </div>
            <table className="w-full text-sm">
              <thead className="border-b text-left text-gray-500">
                <tr>
                  <th className="pb-2">Cuenta</th>
                  <th className="pb-2">Concepto</th>
                  <th className="pb-2 text-right">Débito</th>
                  <th className="pb-2 text-right">Crédito</th>
                </tr>
              </thead>
              <tbody>
                {entry.lines.map((line) => (
                  <tr key={line.id} className="border-b last:border-0">
                    <td className="py-2 font-mono">{line.accountCode}</td>
                    <td className="py-2">{line.concept ?? '—'}</td>
                    <td className="py-2 text-right">{line.debit > 0 ? formatMoney(line.debit) : '—'}</td>
                    <td className="py-2 text-right">{line.credit > 0 ? formatMoney(line.credit) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        ))}
      </div>
    </div>
  )
}
