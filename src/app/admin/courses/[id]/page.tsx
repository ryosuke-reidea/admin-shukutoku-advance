'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft } from 'lucide-react'
import { DAYS_OF_WEEK, COURSE_TYPES, PAYMENT_STATUSES } from '@/lib/constants'
import type { Course, Enrollment, Profile } from '@/lib/types/database'

interface EnrollmentWithStudent extends Enrollment {
  student: Profile
}

export default function CourseDetailPage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const supabase = createClient()

  const [course, setCourse] = useState<Course | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Edit fields
  const [dayOfWeek, setDayOfWeek] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [classroom, setClassroom] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course
        const { data: courseData } = await supabase
          .from('courses')
          .select('*, category:course_categories(*)')
          .eq('id', courseId)
          .single()

        if (courseData) {
          setCourse(courseData)
          setDayOfWeek(courseData.day_of_week || '')
          setStartTime(courseData.start_time || '')
          setEndTime(courseData.end_time || '')
          setClassroom(courseData.classroom || '')
        }

        // Fetch enrollments with student info
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*)')
          .eq('course_id', courseId)
          .order('created_at', { ascending: false })

        setEnrollments((enrollmentData as unknown as EnrollmentWithStudent[]) || [])
      } catch (error) {
        console.error('Error fetching course:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [courseId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    if (!course) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          day_of_week: dayOfWeek || null,
          start_time: startTime || null,
          end_time: endTime || null,
          classroom: classroom || null,
        })
        .eq('id', course.id)

      if (!error) {
        setCourse({ ...course, day_of_week: dayOfWeek, start_time: startTime, end_time: endTime, classroom })
      }
    } catch (error) {
      console.error('Error saving course:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <p className="text-muted-foreground">講座が見つかりません。</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <h1 className="text-2xl font-bold">{course.name}</h1>
      </div>

      {/* Course Info */}
      <Card>
        <CardHeader>
          <CardTitle>講座情報</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">カテゴリ</p>
              <p className="font-medium">{course.category?.name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">科目</p>
              <p className="font-medium">{course.subject}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">種別</p>
              <p className="font-medium">
                {COURSE_TYPES[course.course_type as keyof typeof COURSE_TYPES] || course.course_type}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">講師</p>
              <p className="font-medium">{course.instructor_name || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">定員</p>
              <p className="font-medium">{course.capacity}名</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">料金</p>
              <p className="font-medium">{course.price.toLocaleString()}円</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Settings */}
      <Card>
        <CardHeader>
          <CardTitle>スケジュール設定</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>曜日</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="曜日を選択" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS_OF_WEEK.map((day) => (
                    <SelectItem key={day} value={day}>{day}曜日</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>開始時間</Label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>終了時間</Label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>教室</Label>
              <Input
                value={classroom}
                onChange={(e) => setClassroom(e.target.value)}
                placeholder="教室名"
              />
            </div>
          </div>
          <Button className="mt-4" onClick={handleSave} disabled={saving}>
            {saving ? '保存中...' : '保存'}
          </Button>
        </CardContent>
      </Card>

      {/* Student Roster */}
      <Card>
        <CardHeader>
          <CardTitle>
            生徒名簿 ({enrollments.length}名)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">まだ申込はありません。</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>生徒名</TableHead>
                  <TableHead>メールアドレス</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>支払い状況</TableHead>
                  <TableHead>申込日</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrollments.map((enrollment) => (
                  <TableRow key={enrollment.id}>
                    <TableCell className="font-medium">
                      {enrollment.student?.display_name || '不明'}
                    </TableCell>
                    <TableCell>{enrollment.student?.email || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{enrollment.status}</Badge>
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
          )}
        </CardContent>
      </Card>
    </div>
  )
}
