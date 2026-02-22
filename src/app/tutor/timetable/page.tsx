'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DAYS_OF_WEEK } from '@/lib/constants'
import type { TimetableSlot, Course } from '@/lib/types/database'

interface TimetableSlotWithCourse extends TimetableSlot {
  course: Course
}

export default function TutorTimetablePage() {
  const [slots, setSlots] = useState<TimetableSlotWithCourse[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('timetable_slots')
          .select('*, course:courses(*)')
          .order('day_of_week')
          .order('period')

        setSlots((data as unknown as TimetableSlotWithCourse[]) || [])
      } catch (error) {
        console.error('Error fetching timetable:', error)
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>時限</TableHead>
                    <TableHead>時間</TableHead>
                    <TableHead>講座名</TableHead>
                    <TableHead>科目</TableHead>
                    <TableHead>教室</TableHead>
                    <TableHead>講師</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {daySlots.map((slot) => (
                    <TableRow key={slot.id}>
                      <TableCell>
                        <Badge variant="outline">{slot.period}限</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {slot.start_time}~{slot.end_time}
                      </TableCell>
                      <TableCell className="font-medium">
                        {slot.course?.name || '-'}
                      </TableCell>
                      <TableCell>{slot.course?.subject || '-'}</TableCell>
                      <TableCell>
                        <Badge>{slot.classroom}</Badge>
                      </TableCell>
                      <TableCell>{slot.course?.instructor_name || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
