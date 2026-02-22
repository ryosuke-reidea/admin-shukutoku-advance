'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Printer, Check } from 'lucide-react'
import type { PrintRequest, Course, Profile } from '@/lib/types/database'

interface PrintRequestWithRelations extends PrintRequest {
  course: Course
  instructor: Profile
}

const STATUS_LABELS: Record<string, string> = {
  pending: '依頼中',
  printing: '印刷中',
  completed: '完了',
}

export default function TutorPrintsPage() {
  const [requests, setRequests] = useState<PrintRequestWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('print_requests')
        .select('*, course:courses(*), instructor:profiles!print_requests_instructor_id_fkey(*)')
        .order('created_at', { ascending: false })

      setRequests((data as unknown as PrintRequestWithRelations[]) || [])
    } catch (error) {
      console.error('Error fetching print requests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleUpdateStatus = async (id: string, status: 'printing' | 'completed') => {
    const supabase = createClient()
    try {
      const updateData: Record<string, unknown> = { status }
      if (status === 'completed') {
        updateData.completed_at = new Date().toISOString()
      }
      await supabase
        .from('print_requests')
        .update(updateData)
        .eq('id', id)
      fetchData()
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const handlePrint = (fileUrl: string) => {
    window.open(fileUrl, '_blank')
    window.print()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  const pendingRequests = requests.filter((r) => r.status !== 'completed')
  const completedRequests = requests.filter((r) => r.status === 'completed')

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">プリント</h1>

      {/* Pending Requests */}
      <Card>
        <CardHeader>
          <CardTitle>未処理プリント ({pendingRequests.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">未処理のプリントはありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead className="hidden sm:table-cell">講師</TableHead>
                    <TableHead className="hidden md:table-cell">講座</TableHead>
                    <TableHead className="hidden sm:table-cell">部数</TableHead>
                    <TableHead className="hidden md:table-cell">希望日</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-sm">
                        {req.title}
                        <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                          {req.instructor?.display_name || '-'} / {req.copies}部
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{req.instructor?.display_name || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{req.course?.name || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{req.copies}部</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">
                        {req.requested_by_date
                          ? new Date(req.requested_by_date).toLocaleDateString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={req.status === 'printing' ? 'secondary' : 'outline'} className="text-xs">
                          {STATUS_LABELS[req.status] || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePrint(req.file_url)}
                            className="h-7 text-xs"
                          >
                            <Printer className="h-3 w-3 mr-1" />
                            印刷
                          </Button>
                          {req.status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(req.id, 'printing')}
                              className="h-7 text-xs"
                            >
                              印刷中
                            </Button>
                          )}
                          {req.status !== 'completed' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUpdateStatus(req.id, 'completed')}
                              className="h-7 text-xs"
                            >
                              <Check className="h-3 w-3 mr-1" />
                              完了
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

      {/* Completed Requests */}
      {completedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>完了済みプリント ({completedRequests.length}件)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead className="hidden sm:table-cell">講師</TableHead>
                    <TableHead className="hidden md:table-cell">講座</TableHead>
                    <TableHead className="hidden sm:table-cell">部数</TableHead>
                    <TableHead>完了日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedRequests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium text-sm">
                        {req.title}
                        <div className="sm:hidden text-xs text-muted-foreground mt-0.5">{req.instructor?.display_name || '-'} / {req.copies}部</div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{req.instructor?.display_name || '-'}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{req.course?.name || '-'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{req.copies}部</TableCell>
                      <TableCell className="text-sm">
                        {req.completed_at
                          ? new Date(req.completed_at).toLocaleDateString('ja-JP')
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
