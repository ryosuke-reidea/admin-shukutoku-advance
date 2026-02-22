'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Monitor, Upload } from 'lucide-react'
import { COURSE_TYPES } from '@/lib/constants'
import type { Course, CourseCategory } from '@/lib/types/database'
import { formatTime } from '@/lib/utils'
import { useTermContext } from '@/components/term-selector'

interface CourseWithCount extends Course {
  enrollment_count: number
}

export default function AdminCoursesPage() {
  const { selectedTermId, loading: termLoading } = useTermContext()
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [coursesByCategory, setCoursesByCategory] = useState<Record<string, CourseWithCount[]>>({})
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedTermId) return
    setLoading(true)
    const supabase = createClient()
    try {
      const [catsRes, coursesRes] = await Promise.all([
        supabase.from('course_categories').select('*').order('display_order'),
        supabase.from('courses').select('*, enrollments(count)').eq('term_id', selectedTermId).order('display_order'),
      ])

      const cats = catsRes.data || []
      setCategories(cats)

      if (coursesRes.data && cats.length > 0) {
        const grouped: Record<string, CourseWithCount[]> = {}
        cats.forEach((cat: CourseCategory) => { grouped[cat.id] = [] })
        coursesRes.data.forEach((course: Course & { enrollments: unknown }) => {
          const enrollmentCount = (course.enrollments as unknown as { count: number }[])?.[0]?.count || 0
          const courseWithCount: CourseWithCount = { ...course, enrollment_count: enrollmentCount }
          if (grouped[course.category_id]) {
            grouped[course.category_id].push(courseWithCount)
          }
        })
        setCoursesByCategory(grouped)
      } else {
        setCoursesByCategory({})
      }
    } catch (error) {
      console.error('Error fetching courses:', error)
    } finally {
      setLoading(false)
    }
  }, [selectedTermId])

  useEffect(() => {
    if (!termLoading && selectedTermId) {
      fetchData()
    }
  }, [termLoading, selectedTermId, fetchData])

  if (termLoading || loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">講座概要</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/courses/import">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <Upload className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">一括</span>インポート
            </Button>
          </Link>
          <Link href="/admin/signage">
            <Button variant="outline" size="sm" className="text-xs sm:text-sm">
              <Monitor className="h-4 w-4 mr-1 sm:mr-2" />
              サイネージ
            </Button>
          </Link>
        </div>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">カテゴリが登録されていません。</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={categories[0]?.id}>
          <TabsList className="flex-wrap h-auto">
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                {cat.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {categories.map((cat) => (
            <TabsContent key={cat.id} value={cat.id}>
              <Card>
                <CardHeader>
                  <CardTitle>{cat.name} 講座一覧</CardTitle>
                </CardHeader>
                <CardContent>
                  {(coursesByCategory[cat.id] || []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">この会期のこのカテゴリには講座がありません。</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>講座名</TableHead>
                            <TableHead className="hidden sm:table-cell">科目</TableHead>
                            <TableHead>曜日/時間</TableHead>
                            <TableHead className="hidden md:table-cell">教室</TableHead>
                            <TableHead className="hidden md:table-cell">定員</TableHead>
                            <TableHead>申込数</TableHead>
                            <TableHead className="hidden lg:table-cell">種別</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(coursesByCategory[cat.id] || []).map((course) => (
                            <TableRow key={course.id}>
                              <TableCell>
                                <Link href={`/admin/courses/${course.id}`} className="font-medium text-primary hover:underline text-sm">
                                  {course.name}
                                </Link>
                                <div className="sm:hidden text-xs text-muted-foreground mt-0.5">{course.subject}</div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell text-sm">{course.subject}</TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                {course.day_of_week && course.start_time
                                  ? `${course.day_of_week} ${formatTime(course.start_time)}~${formatTime(course.end_time)}`
                                  : '-'}
                              </TableCell>
                              <TableCell className="hidden md:table-cell text-sm">{course.classroom || '-'}</TableCell>
                              <TableCell className="hidden md:table-cell text-sm">{course.capacity}</TableCell>
                              <TableCell>
                                <Badge variant={course.enrollment_count >= course.capacity ? 'destructive' : 'default'} className="text-xs">
                                  {course.enrollment_count}/{course.capacity}
                                </Badge>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell text-xs">
                                {COURSE_TYPES[course.course_type as keyof typeof COURSE_TYPES] || course.course_type}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  )
}
