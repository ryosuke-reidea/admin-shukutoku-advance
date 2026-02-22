'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BookOpen, Users, DollarSign, Mail, AlertCircle } from 'lucide-react'
import { ENROLLMENT_STATUSES, PAYMENT_STATUSES } from '@/lib/constants'
import { useTermContext } from '@/components/term-selector'
import type { Enrollment, Profile, Course } from '@/lib/types/database'

interface EnrollmentWithRelations extends Enrollment {
  student: Profile
  course: Course
}

export default function AdminDashboard() {
  const { selectedTermId, activeTerm, loading: termLoading } = useTermContext()
  const [courseCount, setCourseCount] = useState(0)
  const [enrollmentCount, setEnrollmentCount] = useState(0)
  const [totalRevenue, setTotalRevenue] = useState(0)
  const [unpaidAmount, setUnpaidAmount] = useState(0)
  const [unreadContacts, setUnreadContacts] = useState(0)
  const [recentEnrollments, setRecentEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    if (!selectedTermId) return
    setLoading(true)
    const supabase = createClient()

    try {
      const [coursesRes, enrollmentsRes, paidRes, unpaidRes, contactsRes, recentRes] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('term_id', selectedTermId),
        supabase.from('enrollments').select('*', { count: 'exact', head: true }).eq('term_id', selectedTermId),
        supabase.from('enrollments').select('payment_amount').eq('term_id', selectedTermId).eq('payment_status', 'paid'),
        supabase.from('enrollments').select('payment_amount').eq('term_id', selectedTermId).neq('payment_status', 'paid'),
        supabase.from('contact_submissions').select('*', { count: 'exact', head: true }).eq('status', 'unread'),
        supabase.from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*), course:courses!enrollments_course_id_fkey(*)')
          .eq('term_id', selectedTermId)
          .order('created_at', { ascending: false })
          .limit(10),
      ])

      setCourseCount(coursesRes.count || 0)
      setEnrollmentCount(enrollmentsRes.count || 0)
      setTotalRevenue(
        paidRes.data?.reduce((sum: number, e: { payment_amount: number | null }) => sum + (e.payment_amount || 0), 0) || 0
      )
      setUnpaidAmount(
        unpaidRes.data?.reduce((sum: number, e: { payment_amount: number | null }) => sum + (e.payment_amount || 0), 0) || 0
      )
      setUnreadContacts(contactsRes.count || 0)
      setRecentEnrollments((recentRes.data as unknown as EnrollmentWithRelations[]) || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        {activeTerm && (
          <Badge variant="outline" className="text-sm px-3 py-1">
            {activeTerm.start_date} 〜 {activeTerm.end_date}
          </Badge>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">講座数</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">申込数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollmentCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">入金済み</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalRevenue.toLocaleString()}円</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未入金</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{unpaidAmount.toLocaleString()}円</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未対応問い合わせ</CardTitle>
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
            <p className="text-sm text-muted-foreground">この会期の申込データはありません。</p>
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
