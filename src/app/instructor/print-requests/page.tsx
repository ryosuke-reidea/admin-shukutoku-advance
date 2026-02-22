'use client'

import { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Upload } from 'lucide-react'
import type { Course, PrintRequest } from '@/lib/types/database'

const STATUS_LABELS: Record<string, string> = {
  pending: '依頼中',
  printing: '印刷中',
  completed: '完了',
}

export default function InstructorPrintRequestsPage() {
  const { supabase, profile } = useAuth()
  const [courses, setCourses] = useState<Course[]>([])
  const [requests, setRequests] = useState<(PrintRequest & { course?: Course })[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [courseId, setCourseId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [copies, setCopies] = useState(1)
  const [requestedByDate, setRequestedByDate] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const fetchData = async () => {
    if (!profile) return
    try {
      const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .eq('instructor_id', profile.id)
      setCourses(coursesData || [])

      const { data: requestsData } = await supabase
        .from('print_requests')
        .select('*, course:courses(*)')
        .eq('instructor_id', profile.id)
        .order('created_at', { ascending: false })
      setRequests(requestsData || [])
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
    setDescription('')
    setCopies(1)
    setRequestedByDate('')
    setSelectedFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setShowForm(false)
  }

  const handleSubmit = async () => {
    if (!profile || !title || !selectedFile) return
    setSubmitting(true)

    try {
      // Upload file to Supabase Storage
      const fileExt = selectedFile.name.split('.').pop()
      const fileName = `${profile.id}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('print-files')
        .upload(fileName, selectedFile)

      if (uploadError) {
        console.error('Upload error:', uploadError)
        setSubmitting(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage
        .from('print-files')
        .getPublicUrl(uploadData.path)

      // Create print request
      await supabase
        .from('print_requests')
        .insert({
          instructor_id: profile.id,
          course_id: courseId || null,
          title,
          description: description || null,
          file_url: publicUrl,
          file_name: selectedFile.name,
          copies,
          status: 'pending',
          requested_by_date: requestedByDate || null,
        })

      resetForm()
      fetchData()
    } catch (error) {
      console.error('Error creating print request:', error)
    } finally {
      setSubmitting(false)
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
        <h1 className="text-2xl font-bold">プリント依頼</h1>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            新規依頼
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>新規プリント依頼</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>講座 (任意)</Label>
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="講座を選択 (任意)" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>{course.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>タイトル</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="プリントのタイトル" />
            </div>
            <div className="space-y-2">
              <Label>説明 (任意)</Label>
              <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="印刷に関する補足事項..." />
            </div>
            <div className="space-y-2">
              <Label>ファイル</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png"
                />
                {selectedFile && (
                  <Badge variant="outline">
                    <Upload className="h-3 w-3 mr-1" />
                    {selectedFile.name}
                  </Badge>
                )}
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>部数</Label>
                <Input type="number" min={1} value={copies} onChange={(e) => setCopies(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <Label>希望日</Label>
                <Input type="date" value={requestedByDate} onChange={(e) => setRequestedByDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleSubmit} disabled={!title || !selectedFile || submitting}>
                {submitting ? '送信中...' : '依頼する'}
              </Button>
              <Button variant="outline" onClick={resetForm}>キャンセル</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle>依頼履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <p className="text-sm text-muted-foreground">依頼はありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>タイトル</TableHead>
                    <TableHead>講座</TableHead>
                    <TableHead>ファイル</TableHead>
                    <TableHead>部数</TableHead>
                    <TableHead>希望日</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead>依頼日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.title}</TableCell>
                      <TableCell>{req.course?.name || '-'}</TableCell>
                      <TableCell>
                        <a
                          href={req.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline text-sm"
                        >
                          {req.file_name}
                        </a>
                      </TableCell>
                      <TableCell>{req.copies}部</TableCell>
                      <TableCell className="text-sm">
                        {req.requested_by_date
                          ? new Date(req.requested_by_date).toLocaleDateString('ja-JP')
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={req.status === 'completed' ? 'default' : req.status === 'printing' ? 'secondary' : 'outline'}>
                          {STATUS_LABELS[req.status] || req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(req.created_at).toLocaleDateString('ja-JP')}
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
