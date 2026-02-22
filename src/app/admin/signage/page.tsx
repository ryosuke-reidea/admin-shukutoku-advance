'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Maximize, Minimize } from 'lucide-react'
import type { Course, CourseCategory } from '@/lib/types/database'
import { useTermContext } from '@/components/term-selector'

// ============================================================
// 定数
// ============================================================
const ALL_DAYS = ['月', '火', '水', '木', '金', '土'] as const

const WEEKDAY_PERIODS = [
  { label: '1限', time: '15:30〜16:50' },
  { label: '2限', time: '17:00〜18:20' },
  { label: '3限', time: '18:30〜19:50' },
] as const

const SATURDAY_PERIODS = [
  { label: '1限', time: '13:10〜14:30' },
  { label: '2限', time: '14:40〜16:00' },
  { label: '3限', time: '16:10〜17:30' },
  { label: '4限', time: '17:40〜19:00' },
] as const

const MAX_PERIODS = 4

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  general:        { bg: '#e0f4f8', text: '#1b99a4', border: '#1b99a4' },
  recommendation: { bg: '#fff3e0', text: '#e09520', border: '#f6ad3c' },
  ryugata:        { bg: '#e8f5e9', text: '#2e7d32', border: '#4caf50' },
  junior:         { bg: '#e3f2fd', text: '#1565c0', border: '#2196f3' },
}

// ============================================================
// 型定義
// ============================================================
interface TimetableSlot {
  id: string
  course_id: string
  day_of_week: string
  period: number
  start_time: string
  end_time: string
  classroom: string
  term: string
  course: {
    id: string
    name: string
    subject: string
    instructor_name: string | null
    target_grade: string | null
    category_id: string
    status: string
  } | null
}

interface CategoryInfo {
  id: string
  slug: string
  name: string
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function AdminSignagePage() {
  const { selectedTermId } = useTermContext()
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [categories, setCategories] = useState<CategoryInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()
      try {
        const [slotsRes, catRes] = await Promise.all([
          supabase
            .from('timetable_slots')
            .select(`
              *,
              course:courses(id, name, subject, instructor_name, target_grade, category_id, status, term_id)
            `)
            .order('day_of_week')
            .order('period'),
          supabase
            .from('course_categories')
            .select('id, slug, name')
            .order('display_order'),
        ])

        // 選択中の会期でフィルタ（course.term_idで絞り込み）
        let filteredSlots = (slotsRes.data as unknown as TimetableSlot[]) || []
        if (selectedTermId) {
          filteredSlots = filteredSlots.filter(
            (slot) => (slot.course as Record<string, unknown>)?.term_id === selectedTermId
          )
        }

        setSlots(filteredSlots)
        setCategories((catRes.data as unknown as CategoryInfo[]) || [])
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedTermId]) // eslint-disable-line react-hooks/exhaustive-deps

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

  const getCategorySlug = (categoryId: string): string => {
    return categories.find((c) => c.id === categoryId)?.slug ?? 'general'
  }

  const getSlots = (day: string, period: number): TimetableSlot[] => {
    return slots.filter(
      (s) => s.day_of_week === day && s.period === period && s.course?.status === 'open'
    )
  }

  const getPeriodInfo = (day: string, periodIdx: number) => {
    if (day === '土') {
      return SATURDAY_PERIODS[periodIdx] || null
    }
    return WEEKDAY_PERIODS[periodIdx] || null
  }

  // 現在の日時を取得
  const now = new Date()
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div
      className={`${isFullscreen ? 'p-4 bg-gray-50 min-h-screen' : 'space-y-4'}`}
      style={isFullscreen ? { fontFamily: "'Noto Sans JP', sans-serif" } : {}}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className={`font-bold ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
            教室割一覧
          </h1>
          <p className={`text-muted-foreground ${isFullscreen ? 'text-base mt-1' : 'text-sm'}`}>
            {dateStr} 現在
          </p>
        </div>
        <Button variant="outline" onClick={toggleFullscreen} size={isFullscreen ? 'lg' : 'default'}>
          {isFullscreen ? <Minimize className="h-5 w-5 mr-2" /> : <Maximize className="h-4 w-4 mr-2" />}
          {isFullscreen ? '通常表示' : 'フルスクリーン'}
        </Button>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((cat) => {
          const color = CATEGORY_COLORS[cat.slug] || CATEGORY_COLORS.general
          return (
            <span
              key={cat.id}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-bold border ${isFullscreen ? 'text-sm' : 'text-xs'}`}
              style={{
                backgroundColor: color.bg,
                color: color.text,
                borderColor: color.border + '40',
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color.border }}
              />
              {cat.name}
            </span>
          )
        })}
      </div>

      {/* 時間割テーブル（月〜土 1画面表示） */}
      <div className="overflow-x-auto">
        <div
          className="rounded-xl border overflow-hidden"
          style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
        >
          <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr>
                <th
                  className={`bg-gray-800 text-white text-center font-bold ${isFullscreen ? 'py-3 px-3 text-base' : 'py-2 px-2 text-xs'}`}
                  style={{ width: '80px' }}
                >
                  時限
                </th>
                {ALL_DAYS.map((day) => (
                  <th
                    key={day}
                    className={`bg-gray-800 text-white text-center font-bold ${isFullscreen ? 'py-3 px-2 text-base' : 'py-2 px-1 text-xs'}`}
                  >
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: MAX_PERIODS }, (_, periodIdx) => {
                // 月〜金は3限まで、土は4限まで
                const isWeekdayPeriod = periodIdx < WEEKDAY_PERIODS.length

                return (
                  <tr
                    key={periodIdx}
                    className="border-t"
                    style={{
                      backgroundColor: periodIdx % 2 === 0 ? 'white' : '#fafafa',
                    }}
                  >
                    {/* 時限ヘッダーセル */}
                    <td
                      className={`text-center border-r bg-gray-50 ${isFullscreen ? 'py-3 px-2' : 'py-2 px-1'}`}
                    >
                      <div className={`font-bold ${isFullscreen ? 'text-base' : 'text-sm'}`}>
                        {periodIdx + 1}限
                      </div>
                    </td>
                    {/* 各曜日セル */}
                    {ALL_DAYS.map((day) => {
                      const periodInfo = getPeriodInfo(day, periodIdx)
                      // 月〜金で4限目はない
                      if (!periodInfo) {
                        return (
                          <td
                            key={`${day}-${periodIdx}`}
                            className="border-r last:border-r-0 p-1 align-top"
                            style={{ backgroundColor: '#f5f5f5' }}
                          >
                            <div className="flex items-center justify-center h-full py-3">
                              <span className="text-xs text-gray-300">—</span>
                            </div>
                          </td>
                        )
                      }

                      const cellSlots = getSlots(day, periodIdx + 1)

                      return (
                        <td
                          key={`${day}-${periodIdx}`}
                          className={`border-r last:border-r-0 align-top ${isFullscreen ? 'p-2' : 'p-1'}`}
                        >
                          {/* 時間表示 */}
                          <div className={`text-center mb-1 ${isFullscreen ? 'text-xs' : 'text-[9px]'} text-muted-foreground`}>
                            {periodInfo.time}
                          </div>
                          {/* 講座カード */}
                          {cellSlots.length > 0 ? (
                            <div className="space-y-1">
                              {cellSlots.map((slot) => {
                                const slug = slot.course ? getCategorySlug(slot.course.category_id) : 'general'
                                const color = CATEGORY_COLORS[slug] || CATEGORY_COLORS.general
                                return (
                                  <div
                                    key={slot.id}
                                    className={`rounded-lg border-l-[3px] ${isFullscreen ? 'p-2' : 'p-1.5'}`}
                                    style={{
                                      borderLeftColor: color.border,
                                      backgroundColor: color.bg + '60',
                                    }}
                                  >
                                    <div className={`font-bold leading-tight ${isFullscreen ? 'text-sm' : 'text-[10px]'}`}>
                                      {slot.course?.name}
                                    </div>
                                    <div className={`mt-0.5 flex flex-wrap items-center gap-1 ${isFullscreen ? 'text-xs' : 'text-[8px]'} text-muted-foreground`}>
                                      {slot.classroom && (
                                        <span
                                          className="font-bold px-1 py-0.5 rounded"
                                          style={{ backgroundColor: color.bg, color: color.text, fontSize: isFullscreen ? '11px' : '8px' }}
                                        >
                                          {slot.classroom}
                                        </span>
                                      )}
                                      {slot.course?.instructor_name && (
                                        <span>{slot.course.instructor_name}</span>
                                      )}
                                    </div>
                                    {slot.course?.target_grade && (
                                      <div
                                        className={`mt-0.5 ${isFullscreen ? 'text-[10px]' : 'text-[7px]'}`}
                                        style={{ color: color.text }}
                                      >
                                        {slot.course.target_grade}・{slot.course.subject}
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center py-2">
                              <div className="w-4 h-[1px] bg-gray-200 rounded" />
                            </div>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 統計 */}
      <div className={`flex flex-wrap gap-4 ${isFullscreen ? 'text-base' : 'text-sm'}`}>
        <div className="text-muted-foreground">
          開講中: <strong>{slots.filter(s => s.course?.status === 'open').length}</strong> コマ
        </div>
        {ALL_DAYS.map((day) => {
          const dayCount = slots.filter(s => s.day_of_week === day && s.course?.status === 'open').length
          if (dayCount === 0) return null
          return (
            <div key={day} className="text-muted-foreground">
              {day}: <strong>{dayCount}</strong>
            </div>
          )
        })}
      </div>
    </div>
  )
}
