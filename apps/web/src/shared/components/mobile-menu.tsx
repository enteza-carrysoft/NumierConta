'use client'

import { useState } from 'react'
import Link from 'next/link'

const navigation = [
  { name: 'Dashboard', href: '/dashboard' },
  { name: 'Empresas', href: '/companies' },
  { name: 'Cuentas', href: '/accounts' },
  { name: 'Mapeo', href: '/mapping' },
  { name: 'Lotes', href: '/batches' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
        aria-label="Abrir menú"
      >
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-white">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <span className="text-lg font-bold text-indigo-600">NumierConta</span>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-2 text-gray-600 hover:bg-gray-100"
              aria-label="Cerrar menú"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <nav className="space-y-1 p-4">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2 text-base font-medium text-gray-700 hover:bg-gray-50"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
