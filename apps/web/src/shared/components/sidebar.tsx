'use client'

import Link from 'next/link'
import { NavLink } from '@/shared/components/ui/nav-link'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Empresas', href: '/companies' },
  { name: 'Cuentas', href: '/accounts' },
  { name: 'Mapeo', href: '/mapping' },
  { name: 'Lotes', href: '/batches' },
]

export function Sidebar() {
  return (
    <aside className="hidden w-64 flex-col border-r bg-white md:flex">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
          NumierConta
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-4">
        {navigation.map((item) => (
          <NavLink key={item.href} href={item.href}>
            {item.name}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
