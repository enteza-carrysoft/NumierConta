import { getUserContext } from '@/features/auth/services/get-user-context'
import { getDashboardStats } from '@/features/dashboard/services/get-dashboard-stats'
import { runEtlAction } from '@/features/etl/services/run-etl'
import { RunEtlButton } from '@/features/etl/components/run-etl-button'
import { Card, CardTitle, CardValue } from '@/shared/components/ui/card'

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

export default async function DashboardPage() {
  const context = await getUserContext()

  if (!context.authenticated || !context.onboarded) {
    return null
  }

  const { user, company, organization } = context
  const stats = await getDashboardStats()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Dashboard</h1>
        <p className="mt-1 text-gray-600">
          {organization?.name} / {company?.name ?? 'Sin empresa activa'}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardTitle>Empresas</CardTitle>
          <CardValue>{stats.totalCompanies}</CardValue>
        </Card>
        <Card>
          <CardTitle>Lotes este mes</CardTitle>
          <CardValue>{stats.monthBatches}</CardValue>
        </Card>
        <Card>
          <CardTitle>Asientos este mes</CardTitle>
          <CardValue>{stats.monthEntries}</CardValue>
        </Card>
        <Card>
          <CardTitle>Movimiento este mes</CardTitle>
          <CardValue>{formatCurrency(stats.monthAmount)}</CardValue>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <RunEtlButton action={runEtlAction} />

        <Card>
          <CardTitle>Accesos rápidos</CardTitle>
          <ul className="mt-2 list-inside list-disc space-y-1 text-gray-600">
            <li>Revisa tus lotes contables en "Lotes"</li>
            <li>Configura el mapeo de cuentas en "Mapeo"</li>
            <li>Descarga TXT para ClassicConta desde el detalle de un lote</li>
          </ul>
        </Card>
      </div>
    </div>
  )
}
