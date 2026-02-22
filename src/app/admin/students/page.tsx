'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import { ENROLLMENT_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import type { Enrollment, Profile, Course, CourseCategory } from '@/lib/types/database'

interface EnrollmentWithRelations extends Enrollment {
  student: Profile
  course: Course & { category: CourseCategory }
}

export default function AdminStudentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*), course:courses!enrollments_course_id_fkey(*, category:course_categories(*))')
          .order('created_at', { ascending: false })

        setEnrollments((data as unknown as EnrollmentWithRelations[]) || [])
      } catch (error) {
        console.error('Error fetching students:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredEnrollments = useMemo(() => {
    if (!searchQuery.trim()) return enrollments
    const query = searchQuery.toLowerCase()
    return enrollments.filter((e) => {
      const studentName = e.student?.display_name?.toLowerCase() || ''
      const studentEmail = e.student?.email?.toLowerCase() || ''
      const courseName = e.course?.name?.toLowerCase() || ''
      const categoryName = e.course?.category?.name?.toLowerCase() || ''
      return (
        studentName.includes(query) ||
        studentEmail.includes(query) ||
        courseName.includes(query) ||
        categoryName.includes(query)
      )
    })
  }, [enrollments, searchQuery])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">申し込み生徒一覧</h1>
      <p className="text-sm text-muted-foreground">
        一般・推薦・留型・中学 一括表示
      </p>

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

      <Card>
        <CardHeader>
          <CardTitle>
            全申込一覧 ({filteredEnrollments.length}件)
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
                    <TableHead>メールアドレス</TableHead>
                    <TableHead>講座名</TableHead>
                    <TableHead>カテゴリ</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>支払い状況</TableHead>
                    <TableHead>申込日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.student?.display_name || '不明'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {enrollment.student?.email || '-'}
                      </TableCell>
                      <TableCell>{enrollment.course?.name || '-'}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {enrollment.course?.category?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {ENROLLMENT_STATUSES[enrollment.status as keyof typeof ENROLLMENT_STATUSES] || enrollment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {PAYMENT_STATUSES[enrollment.payment_status as keyof typeof PAYMENT_STATUSES] || enrollment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(enrollment.created_at).toLocaleDateString('ja-JP')}
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
