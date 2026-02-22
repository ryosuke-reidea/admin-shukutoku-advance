'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, DollarSign, Mail } from 'lucide-react'
import { ENROLLMENT_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import type { Enrollment, Profile, Course } from '@/lib/types/database'

interface EnrollmentWithRelations extends Enrollment {
  student: Profile
  course: Course
}

export default function AdminDashboard() {
  const [courseCount, setCourseCount] = useState(0)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [unreadContacts, setUnreadContacts] = useState(0)
  const [recentEnrollments, setRecentEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch course count
        const { count: courses } = await supabase
          .from('courses')
          .select('*', { count: 'exact', head: true })
        setCourseCount(courses || 0)

        // Fetch enrollment count
        const { count: enrollments } = await supabase
          .from('enrollments')
          .select('*', { count: 'exact', head: true })
        setEnrollmentCount(enrollments || 0)

        // Fetch total revenue (sum of paid enrollments)
        const { data: paidEnrollments } = await supabase
          .from('enrollments')
          .select('payment_amount')
          .eq('payment_status', 'paid')
        const revenue = paidEnrollments?.reduce((sum, e) => sum + (e.payment_amount || 0), 0) || 0
        setTotalRevenue(revenue)

        // Fetch unread contacts
        const { count: contacts } = await supabase
          .from('contact_submissions')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'unread')
        setUnreadContacts(contacts || 0)

        // Fetch recent enrollments
        const { data: recent } = await supabase
          .from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*), course:courses!enrollments_course_id_fkey(*)')
          .order('created_at', { ascending: false })
          .limit(10)
        setRecentEnrollments((recent as unknown as EnrollmentWithRelations[]) || [])
      } catch (error) {
        console.error('Error fetching dashboard data:', error)
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
      <h1 className="text-2xl font-bold">ダッシュボード</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総講座数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総申込数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollmentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}円</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未対応お問い合わせ</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadContacts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>最近の申込 (直近10件)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentEnrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">申込データがありません。</p>
          ) : (
            <div className="space-y-3">
              {recentEnrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {enrollment.student?.display_name || enrollment.student?.email || '不明'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {enrollment.course?.name || '不明な講座'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {ENROLLMENT_STATUSES[enrollment.status as keyof typeof ENROLLMENT_STATUSES] || enrollment.status}
                    </Badge>
                    <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'}>
                      {PAYMENT_STATUSES[enrollment.payment_status as keyof typeof PAYMENT_STATUSES] || enrollment.payment_status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
