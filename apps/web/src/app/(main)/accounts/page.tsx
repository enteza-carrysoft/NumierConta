import { listAccounts } from '@/features/accounts/services/list-accounts'
import { updateAccount } from '@/features/accounts/services/update-account'
import { AccountsList } from '@/features/accounts/components/accounts-list'

export default async function AccountsPage() {
  const accounts = await listAccounts()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold md:text-3xl">Cuentas</h1>
      <p className="text-gray-600">
        {accounts.length} cuentas en el plan contable de la empresa activa.
      </p>
      <AccountsList accounts={accounts} updateAction={updateAccount} />
    </div>
  )
}
