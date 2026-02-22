'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { InstructorNote, Course, Profile } from '@/lib/types/database'

interface NoteWithRelations extends InstructorNote {
  course: Course
  instructor: Profile
}

export default function TutorNotesPage() {
  const [notes, setNotes] = useState<NoteWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('instructor_notes')
          .select('*, course:courses(*), instructor:profiles!instructor_notes_instructor_id_fkey(*)')
          .in('target_audience', ['tutor', 'both'])
          .order('created_at', { ascending: false })

        setNotes((data as unknown as NoteWithRelations[]) || [])
      } catch (error) {
        console.error('Error fetching notes:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">注意点確認</h1>
      <p className="text-sm text-muted-foreground">
        講師から共有されたチューター向け注意点
      </p>

      <Card>
        <CardHeader>
          <CardTitle>注意点一覧 ({notes.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">注意点はありません。</p>
          ) : (
            <div className="space-y-4">
              {notes.map((note, index) => (
                <div key={note.id}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{note.title}</h3>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">
                          {note.target_audience === 'tutor' ? 'チューター向け' : '全体'}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{note.course?.name || '不明な講座'}</span>
                      <span>/</span>
                      <span>{note.instructor?.display_name || '不明な講師'}</span>
                    </div>
                    <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                      {note.content}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(note.created_at).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  {index < notes.length - 1 && <Separator className="mt-4" />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
