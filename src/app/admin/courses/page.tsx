'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Monitor } from 'lucide-react'
import { COURSE_TYPES } from '@/lib/constants'
import type { Course, CourseCategory } from '@/lib/types/database'

interface CourseWithCount extends Course {
  enrollment_count: number
}

export default function AdminCoursesPage() {
  const [categories, setCategories] = useState<CourseCategory[]>([])
  const [coursesByCategory, setCoursesByCategory] = useState<Record<string, CourseWithCount[]>>({})
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories
        const { data: cats } = await supabase
          .from('course_categories')
          .select('*')
          .order('display_order')
        setCategories(cats || [])

        // Fetch courses with enrollment counts
        const { data: courses } = await supabase
          .from('courses')
          .select('*, enrollments(count)')
          .order('display_order')

        if (courses && cats) {
          const grouped: Record<string, CourseWithCount[]> = {}
          cats.forEach((cat) => {
            grouped[cat.id] = []
          })
          courses.forEach((course) => {
            const enrollmentCount = (course.enrollments as unknown as { count: number }[])?.[0]?.count || 0
            const courseWithCount: CourseWithCount = {
              ...course,
              enrollment_count: enrollmentCount,
            }
            if (grouped[course.category_id]) {
              grouped[course.category_id].push(courseWithCount)
            }
          })
          setCoursesByCategory(grouped)
        }
      } catch (error) {
        console.error('Error fetching courses:', error)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">講座概要</h1>
        <Link href="/admin/signage">
          <Button variant="outline">
            <Monitor className="h-4 w-4 mr-2" />
            サイネージ表示
          </Button>
        </Link>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">カテゴリが登録されていません。</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs defaultValue={categories[0]?.id}>
          <TabsList>
            {categories.map((cat) => (
              <TabsTrigger key={cat.id} value={cat.id}>
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
                    <p className="text-sm text-muted-foreground">このカテゴリには講座がありません。</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>講座名</TableHead>
                          <TableHead>科目</TableHead>
                          <TableHead>曜日/時間</TableHead>
                          <TableHead>教室</TableHead>
                          <TableHead>定員</TableHead>
                          <TableHead>申込数</TableHead>
                          <TableHead>種別</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(coursesByCategory[cat.id] || []).map((course) => (
                          <TableRow key={course.id}>
                            <TableCell>
                              <Link
                                href={`/admin/courses/${course.id}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {course.name}
                              </Link>
                            </TableCell>
                            <TableCell>{course.subject}</TableCell>
                            <TableCell>
                              {course.day_of_week && course.start_time
                                ? `${course.day_of_week} ${course.start_time}~${course.end_time || ''}`
                                : '-'}
                            </TableCell>
                            <TableCell>{course.classroom || '-'}</TableCell>
                            <TableCell>{course.capacity}</TableCell>
                            <TableCell>
                              <Badge variant={course.enrollment_count >= course.capacity ? 'destructive' : 'default'}>
                                {course.enrollment_count}/{course.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs">
                              {COURSE_TYPES[course.course_type as keyof typeof COURSE_TYPES] || course.course_type}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
