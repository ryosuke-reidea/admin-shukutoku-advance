'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, Eye } from 'lucide-react'
import { ENROLLMENT_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import type { Enrollment, Profile, Course, CourseCategory } from '@/lib/types/database'
import { useTermContext } from '@/components/term-selector'

interface EnrollmentWithRelations extends Enrollment {
  student: Profile
  course: (Course & { category: CourseCategory }) | null
}

const CATEGORY_TABS = [
  { value: 'all', label: '全体' },
  { value: 'general', label: '一般' },
  { value: 'recommendation', label: '推薦' },
  { value: 'ryugata', label: '留型' },
  { value: 'junior', label: '中学' },
  { value: 'individual', label: '個別' },
]

// 個別指導のnotesからメタデータを取得するヘルパー
function parseIndividualNotes(notes: string | null): { day?: string; period?: string; subject?: string; format?: string } | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed.type === 'individual') return parsed
    return null
  } catch {
    return null
  }
}

const INDIVIDUAL_FORMAT_LABELS: Record<string, string> = {
  individual_1on1: '1対1',
  individual_1on2: '1対2',
  individual_1on3: '1対3',
}

export default function AdminStudentsPage() {
  const { selectedTermId, loading: termLoading } = useTermContext()
  const [enrollments, setEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!selectedTermId) return
      setLoading(true)
      const supabase = createClient()
      try {
        // enrollmentsテーブル自体のterm_idで直接フィルタ
        // course_idがNULLの個別指導もfetchするためleft joinスタイル
        const { data } = await supabase
          .from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*), course:courses!left(*, category:course_categories(*))')
          .eq('term_id', selectedTermId)
          .order('created_at', { ascending: false })

        setEnrollments((data as unknown as EnrollmentWithRelations[]) || [])
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoading(false)
      }
    }

    if (!termLoading && selectedTermId) {
      fetchData()
    }
  }, [termLoading, selectedTermId])

  const filteredEnrollments = useMemo(() => {
    let filtered = enrollments

    // Category filter
    if (activeTab === 'individual') {
      // 個別指導：course_idがNULL（個別指導申込）
      filtered = filtered.filter((e) => !e.course_id || !e.course)
    } else if (activeTab !== 'all') {
      filtered = filtered.filter((e) => e.course?.category?.slug === activeTab)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter((e) => {
        const studentName = e.student?.display_name?.toLowerCase() || ''
        const studentEmail = e.student?.email?.toLowerCase() || ''
        const courseName = e.course?.name?.toLowerCase() || ''
        const categoryName = e.course?.category?.name?.toLowerCase() || ''
        const notes = parseIndividualNotes(e.notes)
        const notesSubject = notes?.subject?.toLowerCase() || ''
        return (
          studentName.includes(query) ||
          studentEmail.includes(query) ||
          courseName.includes(query) ||
          categoryName.includes(query) ||
          notesSubject.includes(query)
        )
      })
    }

    return filtered
  }, [enrollments, searchQuery, activeTab])

  // Calculate counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: enrollments.length }
    CATEGORY_TABS.forEach((tab) => {
      if (tab.value === 'all') return
      if (tab.value === 'individual') {
        counts[tab.value] = enrollments.filter((e) => !e.course_id || !e.course).length
      } else {
        counts[tab.value] = enrollments.filter((e) => e.course?.category?.slug === tab.value).length
      }
    })
    return counts
  }, [enrollments])

  if (termLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">申し込み生徒一覧</h1>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="生徒名・メール・講座名・カテゴリで検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="flex-wrap h-auto">
          {CATEGORY_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value} className="text-xs sm:text-sm">
              {tab.label}
              <Badge variant="secondary" className="ml-1 sm:ml-2 text-[10px] sm:text-xs px-1 sm:px-1.5 py-0">
                {categoryCounts[tab.value] || 0}
              </Badge>
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORY_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle>
                  {tab.label === '全体' ? '全申込一覧' : `${tab.label} 申込一覧`} ({filteredEnrollments.length}件)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredEnrollments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">データがありません。</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>生徒名</TableHead>
                          <TableHead className="hidden md:table-cell">メールアドレス</TableHead>
                          <TableHead>講座名</TableHead>
                          <TableHead className="hidden sm:table-cell">カテゴリ</TableHead>
                          <TableHead className="hidden lg:table-cell">ステータス</TableHead>
                          <TableHead>支払い</TableHead>
                          <TableHead className="hidden sm:table-cell">申込日</TableHead>
                          <TableHead>操作</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredEnrollments.map((enrollment) => {
                          const individualNotes = parseIndividualNotes(enrollment.notes)
                          const isIndividual = !enrollment.course_id || !enrollment.course
                          return (
                            <TableRow key={enrollment.id}>
                              <TableCell className="font-medium">
                                <Link
                                  href={`/admin/students/${enrollment.student_id}`}
                                  className="text-primary hover:underline text-sm"
                                >
                                  {enrollment.student?.display_name || '不明'}
                                </Link>
                                <div className="md:hidden text-xs text-muted-foreground mt-0.5 truncate max-w-[120px]">
                                  {enrollment.student?.email || '-'}
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm">
                                {enrollment.student?.email || '-'}
                              </TableCell>
                              <TableCell className="text-sm max-w-[120px] sm:max-w-none">
                                {isIndividual && individualNotes ? (
                                  <div>
                                    <span className="font-medium">個別指導</span>
                                    <span className="text-muted-foreground ml-1 text-xs">
                                      {individualNotes.day}曜 {individualNotes.period}
                                    </span>
                                    {individualNotes.subject && (
                                      <span className="text-muted-foreground ml-1 text-xs">/ {individualNotes.subject}</span>
                                    )}
                                    {individualNotes.format && (
                                      <span className="text-muted-foreground ml-1 text-xs">
                                        ({INDIVIDUAL_FORMAT_LABELS[individualNotes.format] || individualNotes.format})
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="truncate">{enrollment.course?.name || '-'}</span>
                                )}
                              </TableCell>
                              <TableCell className="hidden sm:table-cell">
                                <Badge
                                  variant="outline"
                                  className="text-xs"
                                  style={isIndividual ? { borderColor: '#9333ea', color: '#7c3aed' } : undefined}
                                >
                                  {isIndividual ? '個別' : enrollment.course?.category?.name || '-'}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell">
                                <Badge variant="outline" className="text-xs">
                                  {ENROLLMENT_STATUSES[enrollment.status as keyof typeof ENROLLMENT_STATUSES] || enrollment.status}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'} className="text-xs">
                                  {PAYMENT_STATUSES[enrollment.payment_status as keyof typeof PAYMENT_STATUSES] || enrollment.payment_status}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">
                                {new Date(enrollment.created_at).toLocaleDateString('ja-JP')}
                              </TableCell>
                              <TableCell>
                                <Link href={`/admin/students/${enrollment.student_id}`}>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3">
                                    <Eye className="h-4 w-4 sm:mr-1" />
                                    <span className="hidden sm:inline">詳細</span>
                                  </Button>
                                </Link>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}
