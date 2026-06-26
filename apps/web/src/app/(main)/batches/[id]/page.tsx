import { notFound } from 'next/navigation'
import { getBatch } from '@/features/batches/services/get-batch'
import { BatchDetailView } from '@/features/batches/components/batch-detail'

interface BatchDetailPageProps {
  params: Promise<{ id: string }>
}

export default async function BatchDetailPage({ params }: BatchDetailPageProps) {
  const { id } = await params
  const batch = await getBatch(id)

  if (!batch) {
    notFound()
  }

  return <BatchDetailView batch={batch} />
}
