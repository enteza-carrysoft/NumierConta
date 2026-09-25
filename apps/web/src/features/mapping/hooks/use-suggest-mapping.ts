'use client'

import { useState } from 'react'
import type { MappingSuggestion } from '@/app/api/mapping-rules/suggest/route'

interface SuggestParams {
  rule_type: string
  match_key: string
}

interface UseSuggestMappingResult {
  suggest: (params: SuggestParams) => Promise<MappingSuggestion | null>
  loading: boolean
  error: string | null
}

export function useSuggestMapping(): UseSuggestMappingResult {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function suggest(params: SuggestParams): Promise<MappingSuggestion | null> {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/mapping-rules/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const data = await response.json()
      if (!response.ok) {
        setError(data.error ?? 'Error al obtener sugerencia')
        return null
      }
      return data.suggestion as MappingSuggestion
    } catch {
      setError('Error de conexión')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { suggest, loading, error }
}
