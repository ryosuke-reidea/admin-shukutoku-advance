'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { Course, InstructorNote } from '@/lib/types/database'

export default function InstructorNotesPage() {
  const { profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [notes, setNotes] = useState<(InstructorNote & { course?: Course })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingNote, setEditingNote] = useState<InstructorNote | null>(null)

  // Form state
  const [courseId, setCourseId] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [targetAudience, setTargetAudience] = useState<'student' | 'tutor' | 'both'>('both')

  const fetchData = async () => {
    if (!profile) return
    const supabase = createClient()
    try {
      const [coursesRes, notesRes] = await Promise.all([
        supabase.from('courses').select('*').eq('instructor_id', profile.id),
        supabase.from('instructor_notes').select('*, course:courses(*)').eq('instructor_id', profile.id).order('created_at', { ascending: false }),
      ])
      setCourses(coursesRes.data || [])
      setNotes(notesRes.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const resetForm = () => {
    setCourseId('')
    setTitle('')
    setContent('')
    setTargetAudience('both')
    setEditingNote(null)
    setShowForm(false)
  }

  const handleEdit = (note: InstructorNote) => {
    setEditingNote(note)
    setCourseId(note.course_id)
    setTitle(note.title)
    setContent(note.content)
    setTargetAudience(note.target_audience)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!profile || !courseId || !title || !content) return
    const supabase = createClient()
    try {
      if (editingNote) {
        await supabase
          .from('instructor_notes')
          .update({
            course_id: courseId,
            title,
            content,
            target_audience: targetAudience,
          })
          .eq('id', editingNote.id)
      } else {
        await supabase
          .from('instructor_notes')
          .insert({
            instructor_id: profile.id,
            course_id: courseId,
            title,
            content,
            target_audience: targetAudience,
          })
      }
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error saving note:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この注意点を削除しますか?')) return
    const supabase = createClient()
    try {
      await supabase.from('instructor_notes').delete().eq('id', id)
      fetchData()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">授業注意点投稿</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規作成
          </Button>
        )}
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingNote ? '注意点を編集' : '新規注意点作成'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>講座</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="講座を選択" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>対象</Label>
              <Select value={targetAudience} onValueChange={(v) => setTargetAudience(v as 'student' | 'tutor' | 'both')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">生徒向け</SelectItem>
                  <SelectItem value="tutor">チューター向け</SelectItem>
                  <SelectItem value="both">全体</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="注意点のタイトル" />
            </div>
            <div className="space-y-2">
              <Label>内容</Label>
              <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} placeholder="注意点の詳細を入力..." />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={!courseId || !title || !content}>
                {editingNote ? '更新' : '投稿'}
              </Button>
              <Button variant="outline" onClick={resetForm}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notes List */}
      <Card>
        <CardHeader>
          <CardTitle>投稿済み注意点</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">投稿はありません。</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note) => (
                <div key={note.id}>
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{note.title}</p>
                        <Badge variant="outline">
                          {note.target_audience === 'student' ? '生徒向け' : note.target_audience === 'tutor' ? 'チューター向け' : '全体'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {note.course?.name || '不明な講座'}
                      </p>
                      <p className="text-sm mt-2 whitespace-pre-wrap">{note.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(note.created_at).toLocaleDateString('ja-JP')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 ml-4">
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(note)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(note.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <Separator className="mt-4" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
