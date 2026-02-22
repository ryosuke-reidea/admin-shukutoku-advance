'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DAYS_OF_WEEK } from '@/lib/constants'
import type { ClassroomAssignment, Course } from '@/lib/types/database'
import { formatTime } from '@/lib/utils'
import { useTermContext } from '@/components/term-selector'

interface AssignmentWithCourse extends ClassroomAssignment {
  course: Course
}

export default function TutorClassroomPage() {
  const { selectedTermId } = useTermContext()
  const [assignments, setAssignments] = useState<AssignmentWithCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      try {
        const { data } = await supabase
          .from('classroom_assignments')
          .select('*, course:courses(*)')
          .order('day_of_week')
          .order('start_time')

        // 選択中の会期でフィルタ
        let filtered = (data as unknown as AssignmentWithCourse[]) || []
        if (selectedTermId) {
          filtered = filtered.filter((a) => a.course?.term_id === selectedTermId)
        }
        setAssignments(filtered)
      } catch (error) {
        console.error('Error fetching classroom assignments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedTermId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Group by day
  const assignmentsByDay: Record<string, AssignmentWithCourse[]> = {}
  DAYS_OF_WEEK.forEach((day) => {
    assignmentsByDay[day] = assignments.filter((a) => a.day_of_week === day)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">教室割</h1>

      {DAYS_OF_WEEK.map((day) => {
        const dayAssignments = assignmentsByDay[day]
        if (dayAssignments.length === 0) return null

        return (
          <Card key={day}>
            <CardHeader>
              <CardTitle>{day}曜日</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>教室</TableHead>
                      <TableHead className="hidden sm:table-cell">時間</TableHead>
                      <TableHead>講座名</TableHead>
                      <TableHead className="hidden sm:table-cell">科目</TableHead>
                      <TableHead className="hidden md:table-cell">講師</TableHead>
                      <TableHead className="hidden lg:table-cell">備考</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dayAssignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell>
                          <Badge className="text-xs">{assignment.classroom}</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm whitespace-nowrap">
                          {formatTime(assignment.start_time)}~{formatTime(assignment.end_time)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {assignment.course?.name || '-'}
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                            {formatTime(assignment.start_time)}~{formatTime(assignment.end_time)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{assignment.course?.subject || '-'}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{assignment.course?.instructor_name || '-'}</TableCell>
                        <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                          {assignment.notes || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {assignments.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">教室割データがありません。</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
