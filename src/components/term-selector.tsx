'use client'

import { useEffect, useState, useCallback, createContext, useContext } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from 'lucide-react'
import type { Term } from '@/lib/types/database'

// ============================================================
// Context: 会期を全管理画面で共有
// ============================================================
interface TermContextValue {
  terms: Term[]
  activeTerm: Term | null
  selectedTermId: string | null
  setSelectedTermId: (id: string) => void
  loading: boolean
}

const TermContext = createContext<TermContextValue>({
  terms: [],
  activeTerm: null,
  selectedTermId: null,
  setSelectedTermId: () => {},
  loading: true,
})

export function useTermContext() {
  return useContext(TermContext)
}

export function TermProvider({ children }: { children: React.ReactNode }) {
  const [terms, setTerms] = useState<Term[]>([])
  const [selectedTermId, setSelectedTermId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchTerms = async () => {
      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('terms')
          .select('*')
          .order('display_order', { ascending: false })

        if (error) {
          console.warn('Terms table not available:', error.message)
          return
        }

        if (data && data.length > 0) {
          setTerms(data)
          const active = data.find((t: Term) => t.is_active)
          setSelectedTermId(active?.id ?? data[0]?.id ?? null)
        }
      } catch (err) {
        console.warn('Terms fetch failed:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchTerms()
  }, [])

  const activeTerm = terms.find((t) => t.id === selectedTermId) ?? null

  return (
    <TermContext.Provider value={{ terms, activeTerm, selectedTermId, setSelectedTermId, loading }}>
      {children}
    </TermContext.Provider>
  )
}

// ============================================================
// UI: 会期選択ドロップダウン
// ============================================================
export function TermSelector() {
  const { terms, selectedTermId, setSelectedTermId, loading } = useTermContext()

  if (loading || terms.length === 0) return null

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Calendar className="h-4 w-4" />
        <span>会期:</span>
      </div>
      <Select value={selectedTermId ?? ''} onValueChange={setSelectedTermId}>
        <SelectTrigger className="w-[280px]">
          <SelectValue placeholder="会期を選択" />
        </SelectTrigger>
        <SelectContent>
          {terms.map((term) => (
            <SelectItem key={term.id} value={term.id}>
              <div className="flex items-center gap-2">
                <span>{term.name}</span>
                {term.is_active && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    有効
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
