'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'
import { Card } from '@/shared/components/ui/card'
import { AccountForm } from './account-form'
import type { Account } from '@/features/accounts/services/list-accounts'
import type { UpdateAccountState } from '@/features/accounts/services/update-account'

interface AccountsListProps {
  accounts: Account[]
  updateAction: (prevState: UpdateAccountState, formData: FormData) => Promise<UpdateAccountState>
}

export function AccountsList({ accounts, updateAction }: AccountsListProps) {
  const [editing, setEditing] = useState<string | null>(null)

  if (accounts.length === 0) {
    return <p className="text-gray-600">No hay cuentas en esta empresa.</p>
  }

  return (
    <div className="space-y-4">
      {accounts.map((account) => (
        <Card key={account.id}>
          {editing === account.id ? (
            <AccountForm account={account} action={updateAction} />
          ) : (
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {account.code} — {account.title}
                </h3>
                <p className="text-sm text-gray-600">
                  Clase: {account.accountClass ?? '—'} | Tipo IVA: {account.vatType ?? '—'} |{' '}
                  {account.vatRate ? `${account.vatRate}%` : ''}
                </p>
              </div>
              <Button variant="secondary" onClick={() => setEditing(account.id)}>
                Editar
              </Button>
            </div>
          )}
        </Card>
      ))}
    </div>
  )
}
