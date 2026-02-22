'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Maximize, Minimize } from 'lucide-react'
import { DAYS_OF_WEEK } from '@/lib/constants'
import type { Course, CourseCategory } from '@/lib/types/database'

interface CourseWithCategory extends Course {
  category: CourseCategory
}

export default function AdminSignagePage() {
  const [courses, setCourses] = useState<CourseWithCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('courses')
          .select('*, category:course_categories(*)')
          .eq('status', 'open')
          .order('day_of_week')
          .order('start_time')

        setCourses((data as unknown as CourseWithCategory[]) || [])
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  // Group courses by day
  const coursesByDay: Record<string, CourseWithCategory[]> = {}
  DAYS_OF_WEEK.forEach((day) => {
    coursesByDay[day] = courses.filter((c) => c.day_of_week === day)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${isFullscreen ? 'p-8 bg-white min-h-screen' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-bold ${isFullscreen ? 'text-4xl' : 'text-2xl'}`}>
            サイネージ表示
          </h1>
          <p className={`text-muted-foreground ${isFullscreen ? 'text-lg mt-2' : 'text-sm'}`}>
            全カテゴリ 教室割一覧
          </p>
        </div>
        <Button variant="outline" onClick={toggleFullscreen}>
          {isFullscreen ? <Minimize className="h-4 w-4 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
          {isFullscreen ? '通常表示' : 'フルスクリーン'}
        </Button>
      </div>

      <div className="grid gap-6">
        {DAYS_OF_WEEK.map((day) => {
          const dayCourses = coursesByDay[day]
          if (dayCourses.length === 0) return null

          return (
            <div key={day} className="rounded-lg border overflow-hidden">
              <div className="bg-primary px-4 py-2">
                <h2 className={`font-bold text-primary-foreground ${isFullscreen ? 'text-2xl' : 'text-lg'}`}>
                  {day}曜日
                </h2>
              </div>
              <div className="divide-y">
                {dayCourses.map((course) => (
                  <div
                    key={course.id}
                    className={`flex items-center justify-between px-4 ${isFullscreen ? 'py-4' : 'py-3'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`font-mono font-medium ${isFullscreen ? 'text-xl w-40' : 'text-sm w-28'}`}>
                        {course.start_time || '--:--'}~{course.end_time || '--:--'}
                      </div>
                      <div>
                        <p className={`font-medium ${isFullscreen ? 'text-xl' : 'text-sm'}`}>
                          {course.name}
                        </p>
                        <p className={`text-muted-foreground ${isFullscreen ? 'text-base' : 'text-xs'}`}>
                          {course.subject} / {course.instructor_name || '-'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className={isFullscreen ? 'text-base px-3 py-1' : ''}>
                        {course.category?.name || '-'}
                      </Badge>
                      <div className={`font-bold text-primary ${isFullscreen ? 'text-2xl min-w-[120px] text-right' : 'text-lg min-w-[80px] text-right'}`}>
                        {course.classroom || '-'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}

        {courses.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">表示する講座がありません。</p>
          </div>
        )}
      </div>
    </div>
  )
}
