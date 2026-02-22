'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, StickyNote } from 'lucide-react'
import type { Course, InstructorNote } from '@/lib/types/database'

export default function InstructorDashboard() {
  const { supabase, profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [recentNotes, setRecentNotes] = useState<InstructorNote[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile) return

    const fetchData = async () => {
      try {
        // Fetch instructor's courses
        const { data: coursesData } = await supabase
          .from('courses')
          .select('*')
          .eq('instructor_id', profile.id)
          .order('created_at', { ascending: false })
        setCourses(coursesData || [])

        // Fetch recent notes
        const { data: notesData } = await supabase
          .from('instructor_notes')
          .select('*')
          .eq('instructor_id', profile.id)
          .order('created_at', { ascending: false })
          .limit(5)
        setRecentNotes(notesData || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">講師ダッシュボード</h1>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">担当講座数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">投稿済み注意点</CardTitle>
            <StickyNote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{recentNotes.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* My Courses */}
      <Card>
        <CardHeader>
          <CardTitle>担当講座</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-muted-foreground">担当講座はありません。</p>
          ) : (
            <div className="space-y-3">
              {courses.map((course) => (
                <div key={course.id} className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">{course.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {course.subject} / {course.day_of_week ? `${course.day_of_week}曜日` : '-'} {course.start_time || ''}~{course.end_time || ''}
                    </p>
                  </div>
                  <Badge variant="outline">{course.classroom || '-'}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Notes */}
      <Card>
        <CardHeader>
          <CardTitle>最近の注意点</CardTitle>
        </CardHeader>
        <CardContent>
          {recentNotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">投稿はありません。</p>
          ) : (
            <div className="space-y-3">
              {recentNotes.map((note) => (
                <div key={note.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">{note.title}</p>
                    <Badge variant="outline">
                      {note.target_audience === 'student' ? '生徒向け' : note.target_audience === 'tutor' ? 'チューター向け' : '全体'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(note.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
