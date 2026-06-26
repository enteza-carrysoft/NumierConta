import { listBatches } from '@/features/batches/services/list-batches'
import { BatchesList } from '@/features/batches/components/batches-list'
import { runEtlAction } from '@/features/etl/services/run-etl'
import { RunEtlButton } from '@/features/etl/components/run-etl-button'

export default async function BatchesPage() {
  const batches = await listBatches()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Lotes contables</h1>
      <RunEtlButton action={runEtlAction} />
      <BatchesList batches={batches} />
    </div>
  )
}
