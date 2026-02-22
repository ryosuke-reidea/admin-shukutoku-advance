'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2, CheckCircle } from 'lucide-react'
import { useTermContext } from '@/components/term-selector'
import type { Term } from '@/lib/types/database'

export default function AdminTermsPage() {
  const { refreshTerms } = useTermContext()
  const [terms, setTerms] = useState<Term[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTerm, setEditingTerm] = useState<Term | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [enrollmentStart, setEnrollmentStart] = useState('')
  const [enrollmentEnd, setEnrollmentEnd] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)

  const fetchData = async () => {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('terms')
        .select('*')
        .order('display_order', { ascending: true })
      setTerms(data || [])
    } catch (error) {
      console.error('Error fetching terms:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const resetForm = () => {
    setName('')
    setSlug('')
    setStartDate('')
    setEndDate('')
    setEnrollmentStart('')
    setEnrollmentEnd('')
    setDisplayOrder(terms.length + 1)
    setEditingTerm(null)
  }

  const openEdit = (term: Term) => {
    setEditingTerm(term)
    setName(term.name)
    setSlug(term.slug)
    setStartDate(term.start_date)
    setEndDate(term.end_date)
    setEnrollmentStart(term.enrollment_start || '')
    setEnrollmentEnd(term.enrollment_end || '')
    setDisplayOrder(term.display_order)
    setDialogOpen(true)
  }

  const openCreate = () => {
    resetForm()
    setDisplayOrder(terms.length + 1)
    setDialogOpen(true)
  }

  const handleSave = async () => {
    const supabase = createClient()
    try {
      const termData = {
        name,
        slug,
        start_date: startDate,
        end_date: endDate,
        enrollment_start: enrollmentStart || null,
        enrollment_end: enrollmentEnd || null,
        display_order: displayOrder,
      }

      if (editingTerm) {
        await supabase
          .from('terms')
          .update(termData)
          .eq('id', editingTerm.id)
      } else {
        await supabase
          .from('terms')
          .insert({ ...termData, is_active: false })
      }

      resetForm()
      setDialogOpen(false)
      await fetchData()
      await refreshTerms()
    } catch (error) {
      console.error('Error saving term:', error)
    }
  }

  const handleSetActive = async (termId: string) => {
    const supabase = createClient()
    try {
      // 全会期をfalseにリセット
      await supabase
        .from('terms')
        .update({ is_active: false })
        .neq('id', '')

      // 対象をtrueに
      await supabase
        .from('terms')
        .update({ is_active: true })
        .eq('id', termId)

      await fetchData()
      await refreshTerms()
    } catch (error) {
      console.error('Error setting active term:', error)
    }
  }

  const handleDelete = async (termId: string) => {
    if (!confirm('この会期を削除しますか？紐づく講座や申込データがある場合は削除できません。')) return
    const supabase = createClient()
    try {
      const { error } = await supabase
        .from('terms')
        .delete()
        .eq('id', termId)

      if (error) {
        alert('削除できませんでした。この会期に紐づく講座や申込データがある可能性があります。')
        console.error('Error deleting term:', error)
        return
      }

      await fetchData()
      await refreshTerms()
    } catch (error) {
      console.error('Error deleting term:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  const activeTerm = terms.find((t) => t.is_active)

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">会期管理</h1>
          {activeTerm && (
            <p className="text-sm text-muted-foreground mt-1">
              現在有効: <span className="font-medium text-foreground">{activeTerm.name}</span>
            </p>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm() }}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              新規会期
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingTerm ? '会期を編集' : '新規会期を作成'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>会期名</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例: 2025年度 1学期"
                  />
                </div>
                <div className="space-y-2">
                  <Label>スラッグ</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="例: 2025-term1"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>開始日</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>終了日</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>申込受付開始日</Label>
                  <Input
                    type="date"
                    value={enrollmentStart}
                    onChange={(e) => setEnrollmentStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>申込受付終了日</Label>
                  <Input
                    type="date"
                    value={enrollmentEnd}
                    onChange={(e) => setEnrollmentEnd(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>表示順</Label>
                <Input
                  type="number"
                  value={displayOrder}
                  onChange={(e) => setDisplayOrder(Number(e.target.value))}
                />
              </div>
              <Button onClick={handleSave} className="w-full" disabled={!name || !slug || !startDate || !endDate}>
                {editingTerm ? '更新' : '作成'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>会期一覧 ({terms.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <p className="text-sm text-muted-foreground">会期が登録されていません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>順序</TableHead>
                    <TableHead>会期名</TableHead>
                    <TableHead className="hidden sm:table-cell">期間</TableHead>
                    <TableHead className="hidden md:table-cell">申込受付期間</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {terms.map((term) => (
                    <TableRow key={term.id} className={term.is_active ? 'bg-green-50' : ''}>
                      <TableCell className="text-sm">{term.display_order}</TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{term.name}</div>
                        <div className="text-xs text-muted-foreground">{term.slug}</div>
                        <div className="sm:hidden text-xs text-muted-foreground mt-1">
                          {term.start_date} 〜 {term.end_date}
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm whitespace-nowrap">
                        {term.start_date} 〜 {term.end_date}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm whitespace-nowrap">
                        {term.enrollment_start && term.enrollment_end
                          ? `${term.enrollment_start} 〜 ${term.enrollment_end}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        {term.is_active ? (
                          <Badge variant="default" className="text-xs">
                            有効
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs">
                            無効
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {!term.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetActive(term.id)}
                              title="この会期を有効にする"
                              className="h-8 w-8 p-0"
                            >
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(term)}
                            className="h-8 w-8 p-0"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!term.is_active && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(term.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
