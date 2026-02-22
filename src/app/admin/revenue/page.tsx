'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, AlertCircle } from 'lucide-react'
import { PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/constants'
import type { Enrollment, Profile, Course } from '@/lib/types/database'

interface EnrollmentWithRelations extends Enrollment {
  student: Profile
  course: Course
}

export default function AdminRevenuePage() {
  const [enrollments, setEnrollments] = useState<EnrollmentWithRelations[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data } = await supabase
          .from('enrollments')
          .select('*, student:profiles!enrollments_student_id_fkey(*), course:courses!enrollments_course_id_fkey(*)')
          .order('created_at', { ascending: false })

        setEnrollments((data as unknown as EnrollmentWithRelations[]) || [])
      } catch (error) {
        console.error('Error fetching revenue data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const { totalRevenue, paidAmount, unpaidAmount, paidEnrollments, unpaidEnrollments } = useMemo(() => {
    let total = 0
    let paid = 0
    let unpaid = 0
    const paidList: EnrollmentWithRelations[] = []
    const unpaidList: EnrollmentWithRelations[] = []

    enrollments.forEach((e) => {
      total += e.payment_amount || 0
      if (e.payment_status === 'paid') {
        paid += e.payment_amount || 0
        paidList.push(e)
      } else {
        unpaid += e.payment_amount || 0
        unpaidList.push(e)
      }
    })

    return {
      totalRevenue: total,
      paidAmount: paid,
      unpaidAmount: unpaid,
      paidEnrollments: paidList,
      unpaidEnrollments: unpaidList,
    }
  }, [enrollments])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">売上管理</h1>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">総売上見込み</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRevenue.toLocaleString()}円</div>
            <p className="text-xs text-muted-foreground">{enrollments.length}件の申込</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">入金済み</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{paidAmount.toLocaleString()}円</div>
            <p className="text-xs text-muted-foreground">{paidEnrollments.length}件</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未入金</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{unpaidAmount.toLocaleString()}円</div>
            <p className="text-xs text-muted-foreground">{unpaidEnrollments.length}件</p>
          </CardContent>
        </Card>
      </div>

      {/* Unpaid Enrollments */}
      {unpaidEnrollments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>未入金一覧</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>生徒名</TableHead>
                    <TableHead>講座名</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>支払い方法</TableHead>
                    <TableHead>支払い状況</TableHead>
                    <TableHead>申込日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {unpaidEnrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.student?.display_name || '不明'}
                      </TableCell>
                      <TableCell>{enrollment.course?.name || '-'}</TableCell>
                      <TableCell>{(enrollment.payment_amount || 0).toLocaleString()}円</TableCell>
                      <TableCell className="text-sm">
                        {enrollment.payment_method
                          ? PAYMENT_METHODS[enrollment.payment_method as keyof typeof PAYMENT_METHODS] || enrollment.payment_method
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {PAYMENT_STATUSES[enrollment.payment_status as keyof typeof PAYMENT_STATUSES] || enrollment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(enrollment.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Enrollments */}
      <Card>
        <CardHeader>
          <CardTitle>全入金履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {enrollments.length === 0 ? (
            <p className="text-sm text-muted-foreground">データがありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>生徒名</TableHead>
                    <TableHead>講座名</TableHead>
                    <TableHead>金額</TableHead>
                    <TableHead>支払い方法</TableHead>
                    <TableHead>支払い状況</TableHead>
                    <TableHead>申込日</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.map((enrollment) => (
                    <TableRow key={enrollment.id}>
                      <TableCell className="font-medium">
                        {enrollment.student?.display_name || '不明'}
                      </TableCell>
                      <TableCell>{enrollment.course?.name || '-'}</TableCell>
                      <TableCell>{(enrollment.payment_amount || 0).toLocaleString()}円</TableCell>
                      <TableCell className="text-sm">
                        {enrollment.payment_method
                          ? PAYMENT_METHODS[enrollment.payment_method as keyof typeof PAYMENT_METHODS] || enrollment.payment_method
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={enrollment.payment_status === 'paid' ? 'default' : 'secondary'}>
                          {PAYMENT_STATUSES[enrollment.payment_status as keyof typeof PAYMENT_STATUSES] || enrollment.payment_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(enrollment.created_at).toLocaleDateString('ja-JP')}
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
