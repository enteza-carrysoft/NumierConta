'use client'

import { useState } from 'react'
import { Button } from '@/shared/components/ui/button'

interface TxtDownloadProps {
  batchId: string
}

export function TxtDownload({ batchId }: TxtDownloadProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function downloadFiles() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/batches/${batchId}/generate-txt`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error ?? 'Error generando TXT')
      }

      const { subcuentas, diario, filenames } = await res.json()
      downloadBase64(filenames.subcuentas, subcuentas)
      downloadBase64(filenames.diario, diario)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }

  function downloadBase64(filename: string, base64: string) {
    const bytes = atob(base64)
    const buffer = new Uint8Array(bytes.length)
    for (let i = 0; i < bytes.length; i++) {
      buffer[i] = bytes.charCodeAt(i)
    }
    const blob = new Blob([buffer], { type: 'text/plain;charset=windows-1252' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-2">
      <Button onClick={downloadFiles} disabled={loading}>
        {loading ? 'Generando...' : 'Descargar TXT para ClassicConta'}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}
