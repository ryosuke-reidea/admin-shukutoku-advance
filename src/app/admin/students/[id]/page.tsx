'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, User, Mail, Phone, GraduationCap, BookOpen } from 'lucide-react'
import { ENROLLMENT_STATUSES, PAYMENT_STATUSES, PAYMENT_METHODS } from '@/lib/constants'
import type { Profile, Enrollment, Course, CourseCategory } from '@/lib/types/database'
import { formatTime } from '@/lib/utils'

interface EnrollmentWithCourse extends Enrollment {
  course: (Course & { category: CourseCategory }) | null
}

// 個別指導のnotesからメタデータを取得
function parseIndividualNotes(notes: string | null): { day?: string; period?: string; subject?: string; format?: string } | null {
  if (!notes) return null
  try {
    const parsed = JSON.parse(notes)
    if (parsed.type === 'individual') return parsed
    return null
  } catch {
    return null
  }
}

const INDIVIDUAL_FORMAT_LABELS: Record<string, string> = {
  individual_1on1: '1対1',
  individual_1on2: '1対2',
  individual_1on3: '1対3',
}

const PAYMENT_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  paid: 'default',
  partial: 'secondary',
  unpaid: 'destructive',
  refunded: 'outline',
}

const ENROLLMENT_STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmed: 'default',
  pending: 'secondary',
  cancelled: 'destructive',
  completed: 'outline',
}

export default function StudentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [student, setStudent] = useState<Profile | null>(null)
  const [enrollments, setEnrollments] = useState<EnrollmentWithCourse[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      try {
        const [profileRes, enrollmentsRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('*')
            .eq('id', studentId)
            .single(),
          supabase
            .from('enrollments')
            .select('*, course:courses!left(*, category:course_categories(*))')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false }),
        ])

        setStudent(profileRes.data)
        setEnrollments((enrollmentsRes.data as unknown as EnrollmentWithCourse[]) || [])
      } catch (error) {
        console.error('Error fetching student data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [studentId])

  const handleUpdatePaymentStatus = async (enrollmentId: string, newStatus: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from('enrollments')
        .update({ payment_status: newStatus })
        .eq('id', enrollmentId)

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId ? { ...e, payment_status: newStatus as Enrollment['payment_status'] } : e
        )
      )
    } catch (error) {
      console.error('Error updating payment status:', error)
    }
  }

  const handleUpdateEnrollmentStatus = async (enrollmentId: string, newStatus: string) => {
    const supabase = createClient()
    try {
      await supabase
        .from('enrollments')
        .update({ status: newStatus })
        .eq('id', enrollmentId)

      setEnrollments((prev) =>
        prev.map((e) =>
          e.id === enrollmentId ? { ...e, status: newStatus as Enrollment['status'] } : e
        )
      )
    } catch (error) {
      console.error('Error updating enrollment status:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          戻る
        </Button>
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">生徒が見つかりません。</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Group enrollments by term
  const enrollmentsByTerm = enrollments.reduce<Record<string, EnrollmentWithCourse[]>>((acc, enrollment) => {
    const term = enrollment.course?.term || (enrollment.course_id ? '未設定' : '個別指導')
    if (!acc[term]) acc[term] = []
    acc[term].push(enrollment)
    return acc
  }, {})

  // Calculate totals
  const totalAmount = enrollments.reduce((sum, e) => sum + (e.payment_amount || 0), 0)
  const paidAmount = enrollments
    .filter((e) => e.payment_status === 'paid')
    .reduce((sum, e) => sum + (e.payment_amount || 0), 0)
  const unpaidAmount = totalAmount - paidAmount

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/students">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            生徒一覧
          </Button>
        </Link>
        <h1 className="text-2xl font-bold">生徒詳細</h1>
      </div>

      {/* Student Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {student.display_name || '名前未設定'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">メールアドレス</p>
                <p className="text-sm font-medium">{student.email}</p>
              </div>
            </div>
            {student.phone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">電話番号</p>
                  <p className="text-sm font-medium">{student.phone}</p>
                </div>
              </div>
            )}
            {student.grade && (
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">学年</p>
                  <p className="text-sm font-medium">{student.grade}</p>
                </div>
              </div>
            )}
            {student.student_number && (
              <div className="flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">生徒番号</p>
                  <p className="text-sm font-medium">{student.student_number}</p>
                </div>
              </div>
            )}
          </div>
          {(student.parent_name || student.parent_phone) && (
            <>
              <Separator className="my-4" />
              <div className="grid gap-4 md:grid-cols-2">
                {student.parent_name && (
                  <div>
                    <p className="text-xs text-muted-foreground">保護者名</p>
                    <p className="text-sm font-medium">{student.parent_name}</p>
                  </div>
                )}
                {student.parent_phone && (
                  <div>
                    <p className="text-xs text-muted-foreground">保護者電話番号</p>
                    <p className="text-sm font-medium">{student.parent_phone}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Payment Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">合計金額</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">¥{totalAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">支払い済み</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">¥{paidAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">未払い</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">¥{unpaidAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      {/* Enrollments by Term */}
      {Object.keys(enrollmentsByTerm).length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">申し込みはありません。</p>
          </CardContent>
        </Card>
      ) : (
        Object.entries(enrollmentsByTerm).map(([term, termEnrollments]) => {
          const termTotal = termEnrollments.reduce((sum, e) => sum + (e.payment_amount || 0), 0)
          const termPaid = termEnrollments
            .filter((e) => e.payment_status === 'paid')
            .reduce((sum, e) => sum + (e.payment_amount || 0), 0)

          return (
            <Card key={term}>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <CardTitle className="text-lg">{term}</CardTitle>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className="text-muted-foreground">
                      合計: <span className="font-bold text-foreground">¥{termTotal.toLocaleString()}</span>
                    </span>
                    <span className="text-muted-foreground">
                      支払済: <span className="font-bold text-green-600">¥{termPaid.toLocaleString()}</span>
                    </span>
                    {termTotal - termPaid > 0 && (
                      <span className="text-muted-foreground">
                        未払: <span className="font-bold text-red-600">¥{(termTotal - termPaid).toLocaleString()}</span>
                      </span>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>講座名</TableHead>
                        <TableHead className="hidden lg:table-cell">カテゴリ</TableHead>
                        <TableHead className="hidden md:table-cell">曜日/時間</TableHead>
                        <TableHead>金額</TableHead>
                        <TableHead className="hidden lg:table-cell">支払方法</TableHead>
                        <TableHead>支払状況</TableHead>
                        <TableHead>ステータス</TableHead>
                        <TableHead className="hidden sm:table-cell">申込日</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {termEnrollments.map((enrollment) => {
                        const isIndividual = !enrollment.course_id || !enrollment.course
                        const individualNotes = parseIndividualNotes(enrollment.notes)
                        return (
                        <TableRow key={enrollment.id}>
                          <TableCell className="font-medium text-sm">
                            {isIndividual ? (
                              <div>
                                <span>個別指導</span>
                                {individualNotes && (
                                  <span className="text-muted-foreground ml-1 text-xs">
                                    {individualNotes.subject && `${individualNotes.subject} `}
                                    {individualNotes.format && `(${INDIVIDUAL_FORMAT_LABELS[individualNotes.format] || individualNotes.format})`}
                                  </span>
                                )}
                              </div>
                            ) : (
                              enrollment.course?.name || '-'
                            )}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <Badge
                              variant="outline"
                              className="text-xs"
                              style={isIndividual ? { borderColor: '#9333ea', color: '#7c3aed' } : undefined}
                            >
                              {isIndividual ? '個別' : enrollment.course?.category?.name || '-'}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-sm whitespace-nowrap">
                            {isIndividual && individualNotes
                              ? `${individualNotes.day}曜 ${individualNotes.period}`
                              : enrollment.course?.day_of_week && enrollment.course?.start_time
                                ? `${enrollment.course.day_of_week} ${formatTime(enrollment.course.start_time)}~${formatTime(enrollment.course.end_time)}`
                                : '-'}
                          </TableCell>
                          <TableCell className="font-medium text-sm whitespace-nowrap">
                            ¥{(enrollment.payment_amount || 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell text-sm">
                            {enrollment.payment_method
                              ? PAYMENT_METHODS[enrollment.payment_method as keyof typeof PAYMENT_METHODS] || enrollment.payment_method
                              : '-'}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={enrollment.payment_status}
                              onValueChange={(val) => handleUpdatePaymentStatus(enrollment.id, val)}
                            >
                              <SelectTrigger className="w-[100px] sm:w-[120px] h-8 text-xs">
                                <SelectValue>
                                  <Badge variant={PAYMENT_STATUS_COLORS[enrollment.payment_status] || 'secondary'} className="text-xs">
                                    {PAYMENT_STATUSES[enrollment.payment_status as keyof typeof PAYMENT_STATUSES] || enrollment.payment_status}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(PAYMENT_STATUSES).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={enrollment.status}
                              onValueChange={(val) => handleUpdateEnrollmentStatus(enrollment.id, val)}
                            >
                              <SelectTrigger className="w-[90px] sm:w-[110px] h-8 text-xs">
                                <SelectValue>
                                  <Badge variant={ENROLLMENT_STATUS_COLORS[enrollment.status] || 'secondary'} className="text-xs">
                                    {ENROLLMENT_STATUSES[enrollment.status as keyof typeof ENROLLMENT_STATUSES] || enrollment.status}
                                  </Badge>
                                </SelectValue>
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ENROLLMENT_STATUSES).map(([key, label]) => (
                                  <SelectItem key={key} value={key}>{label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-sm">
                            {new Date(enrollment.created_at).toLocaleDateString('ja-JP')}
                          </TableCell>
                        </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )
        })
      )}
    </div>
  )
}
