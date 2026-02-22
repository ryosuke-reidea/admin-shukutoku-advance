'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Search } from 'lucide-react'
import type { Enrollment, Profile, Course } from '@/lib/types/database'

interface EnrollmentWithRelations extends Enrollment {
  student: Profile
  course: Course
}

export default function TutorStudentsPage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*), course:courses!enrollments_course_id_fkey(*)')
          .eq('status', 'confirmed')
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
      const name = e.student?.display_name?.toLowerCase() || ''
      const email = e.student?.email?.toLowerCase() || ''
      const course = e.course?.name?.toLowerCase() || ''
      return name.includes(query) || email.includes(query) || course.includes(query)
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
      <h1 className="text-2xl font-bold">生徒名簿</h1>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="生徒名・メール・講座名で検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>在籍生徒一覧 ({filteredEnrollments.length}名)</CardTitle>
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
                    <TableHead>学年</TableHead>
                    <TableHead>講座名</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>登録日</TableHead>
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
                      <TableCell>
                        {enrollment.student?.grade ? (
                          <Badge variant="outline">{enrollment.student.grade}年</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{enrollment.course?.name || '-'}</TableCell>
                      <TableCell>{enrollment.course?.subject || '-'}</TableCell>
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
