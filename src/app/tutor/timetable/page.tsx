'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DAYS_OF_WEEK } from '@/lib/constants'
import type { TimetableSlot, Course } from '@/lib/types/database'
import { formatTime } from '@/lib/utils'
import { useTermContext } from '@/components/term-selector'

interface TimetableSlotWithCourse extends TimetableSlot {
  course: Course
}

export default function TutorTimetablePage() {
  const { selectedTermId } = useTermContext()
  const [slots, setSlots] = useState<TimetableSlotWithCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      try {
        const { data } = await supabase
          .from('timetable_slots')
          .select('*, course:courses(*)')
          .order('day_of_week')
          .order('period')

        // 選択中の会期でフィルタ
        let filtered = (data as unknown as TimetableSlotWithCourse[]) || []
        if (selectedTermId) {
          filtered = filtered.filter((slot) => slot.course?.term_id === selectedTermId)
        }
        setSlots(filtered)
      } catch (error) {
        console.error('Error fetching timetable:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedTermId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  // Group by day
  const slotsByDay: Record<string, TimetableSlotWithCourse[]> = {}
  DAYS_OF_WEEK.forEach((day) => {
    slotsByDay[day] = slots.filter((s) => s.day_of_week === day)
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">時間割</h1>

      {DAYS_OF_WEEK.map((day) => {
        const daySlots = slotsByDay[day]
        if (daySlots.length === 0) return null

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
                      <TableHead>時限</TableHead>
                      <TableHead className="hidden sm:table-cell">時間</TableHead>
                      <TableHead>講座名</TableHead>
                      <TableHead className="hidden sm:table-cell">科目</TableHead>
                      <TableHead>教室</TableHead>
                      <TableHead className="hidden md:table-cell">講師</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daySlots.map((slot) => (
                      <TableRow key={slot.id}>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{slot.period}限</Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell font-mono text-sm whitespace-nowrap">
                          {formatTime(slot.start_time)}~{formatTime(slot.end_time)}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {slot.course?.name || '-'}
                          <div className="sm:hidden text-xs text-muted-foreground mt-0.5">
                            {formatTime(slot.start_time)}~{formatTime(slot.end_time)} {slot.course?.subject || ''}
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm">{slot.course?.subject || '-'}</TableCell>
                        <TableCell>
                          <Badge className="text-xs">{slot.classroom}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm">{slot.course?.instructor_name || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )
      })}

      {slots.length === 0 && (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">時間割データがありません。</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
