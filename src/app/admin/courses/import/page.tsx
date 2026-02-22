'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Upload, FileSpreadsheet, ArrowLeft, Download, Check, AlertTriangle, Trash2 } from 'lucide-react'
import { formatTime } from '@/lib/utils'
import { useTermContext } from '@/components/term-selector'

// ============================================================
// 型定義
// ============================================================
interface ImportRow {
  講座名: string
  科目: string
  カテゴリ: string
  対象学年: string
  種別: string
  講師名: string
  曜日: string
  開始時間: string
  終了時間: string
  教室: string
  定員: string
  料金: string
  学期: string
  ステータス: string
  時限: string
}

interface ParsedCourse {
  name: string
  subject: string
  category_slug: string
  target_grade: string
  course_type: string
  instructor_name: string
  day_of_week: string
  start_time: string
  end_time: string
  classroom: string
  capacity: number
  price: number
  term: string
  status: string
  period: number
  errors: string[]
}

interface CategoryMap {
  [slug: string]: string // slug -> id
}

// ============================================================
// CSV テンプレートデータ
// ============================================================
const CSV_TEMPLATE_HEADER = '講座名,科目,カテゴリ,対象学年,種別,講師名,曜日,開始時間,終了時間,教室,定員,料金,学期,ステータス,時限'
const CSV_TEMPLATE_ROWS = [
  '高3英語総合,英語,general,高3,group,田中太郎,月,15:30,16:50,A101,30,15000,2025前期,open,1',
  '高3数学IA,数学,general,高3,group,佐藤花子,火,17:00,18:20,A102,25,15000,2025前期,open,2',
  '高2英語基礎,英語,recommendation,高2,group,鈴木一郎,水,18:30,19:50,B201,20,15000,2025前期,open,3',
  '中3数学,数学,junior,中3,group,高橋次郎,木,15:30,16:50,C301,20,12000,2025前期,open,1',
]

const VALID_CATEGORIES = ['general', 'recommendation', 'ryugata', 'junior']
const VALID_COURSE_TYPES = ['group', 'individual_1on1', 'individual_1on2', 'individual_1on3']
const VALID_STATUSES = ['draft', 'open', 'closed']
const VALID_DAYS = ['月', '火', '水', '木', '金', '土']
const VALID_GRADES = ['高1', '高2', '高3', '中1', '中2', '中3']

// ============================================================
// メインコンポーネント
// ============================================================
export default function CourseImportPage() {
  const router = useRouter()
  const { selectedTermId, activeTerm } = useTermContext()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsedData, setParsedData] = useState<ParsedCourse[]>([])
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null)
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [fileName, setFileName] = useState('')
  const [clearExisting, setClearExisting] = useState(false)

  // CSVテンプレートダウンロード
  const downloadTemplate = () => {
    const content = [CSV_TEMPLATE_HEADER, ...CSV_TEMPLATE_ROWS].join('\n')
    const bom = '\uFEFF'
    const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'courses_template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // CSVパース
  const parseCSV = (text: string): ImportRow[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    if (lines.length < 2) return []

    const headers = lines[0].split(',').map(h => h.trim())
    const rows: ImportRow[] = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim())
      const row: Record<string, string> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx] || ''
      })
      rows.push(row as unknown as ImportRow)
    }
    return rows
  }

  // バリデーション付きパース
  const validateAndParse = (rows: ImportRow[]): ParsedCourse[] => {
    return rows.map((row) => {
      const errors: string[] = []

      if (!row.講座名) errors.push('講座名は必須です')
      if (!row.科目) errors.push('科目は必須です')
      if (!VALID_CATEGORIES.includes(row.カテゴリ)) errors.push(`カテゴリが不正: ${row.カテゴリ}`)
      if (!VALID_GRADES.includes(row.対象学年)) errors.push(`対象学年が不正: ${row.対象学年}`)
      if (!VALID_COURSE_TYPES.includes(row.種別)) errors.push(`種別が不正: ${row.種別}`)
      if (row.曜日 && !VALID_DAYS.includes(row.曜日)) errors.push(`曜日が不正: ${row.曜日}`)
      if (row.ステータス && !VALID_STATUSES.includes(row.ステータス)) errors.push(`ステータスが不正: ${row.ステータス}`)

      const capacity = parseInt(row.定員) || 0
      if (capacity <= 0) errors.push('定員は1以上の数値が必要です')

      const price = parseInt(row.料金) || 0
      const period = parseInt(row.時限) || 0

      return {
        name: row.講座名,
        subject: row.科目,
        category_slug: row.カテゴリ,
        target_grade: row.対象学年,
        course_type: row.種別 || 'group',
        instructor_name: row.講師名 || '',
        day_of_week: row.曜日 || '',
        start_time: row.開始時間 || '',
        end_time: row.終了時間 || '',
        classroom: row.教室 || '',
        capacity,
        price,
        term: row.学期 || '',
        status: row.ステータス || 'open',
        period,
        errors,
      }
    })
  }

  // ファイル選択
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      const rows = parseCSV(text)
      const parsed = validateAndParse(rows)
      setParsedData(parsed)
      setStep('preview')
    }
    reader.readAsText(file, 'UTF-8')
  }

  // インポート実行
  const handleImport = async () => {
    setImporting(true)
    const supabase = createClient()

    try {
      // カテゴリマップ取得
      const { data: cats } = await supabase
        .from('course_categories')
        .select('id, slug')
      const catMap: CategoryMap = {}
      cats?.forEach((c: { id: string; slug: string }) => { catMap[c.slug] = c.id })

      // 既存データ削除（オプション）
      if (clearExisting) {
        await supabase.from('timetable_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('classroom_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('enrollments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
        await supabase.from('courses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
      }

      let success = 0
      let failed = 0

      for (const course of parsedData) {
        if (course.errors.length > 0) {
          failed++
          continue
        }

        const categoryId = catMap[course.category_slug]
        if (!categoryId) {
          failed++
          continue
        }

        // 講座を作成（選択中の会期のterm_idを自動設定）
        const { data: createdCourse, error: courseError } = await supabase
          .from('courses')
          .insert({
            category_id: categoryId,
            name: course.name,
            subject: course.subject,
            description: '',
            instructor_name: course.instructor_name || null,
            course_type: course.course_type,
            day_of_week: course.day_of_week || null,
            start_time: course.start_time || null,
            end_time: course.end_time || null,
            classroom: course.classroom || null,
            capacity: course.capacity,
            price: course.price,
            target_grade: course.target_grade,
            term: course.term || null,
            term_id: selectedTermId || null,
            status: course.status,
            display_order: success + 1,
          })
          .select()
          .single()

        if (courseError || !createdCourse) {
          failed++
          continue
        }

        // 時間割スロットも作成（曜日・時限がある場合）
        if (course.day_of_week && course.period > 0) {
          await supabase.from('timetable_slots').insert({
            course_id: createdCourse.id,
            day_of_week: course.day_of_week,
            period: course.period,
            start_time: course.start_time,
            end_time: course.end_time,
            classroom: course.classroom || '',
            term: course.term || '',
          })
        }

        // 教室割も作成（教室がある場合）
        if (course.classroom && course.day_of_week) {
          await supabase.from('classroom_assignments').insert({
            course_id: createdCourse.id,
            classroom: course.classroom,
            day_of_week: course.day_of_week,
            start_time: course.start_time || '',
            end_time: course.end_time || '',
          })
        }

        success++
      }

      setImportResult({ success, failed })
      setStep('done')
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({ success: 0, failed: parsedData.length })
      setStep('done')
    } finally {
      setImporting(false)
    }
  }

  const validCount = parsedData.filter(d => d.errors.length === 0).length
  const errorCount = parsedData.filter(d => d.errors.length > 0).length

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/admin/courses')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">講座一括インポート</h1>
          <p className="text-sm text-muted-foreground">
            CSVファイルから講座データを一括で登録できます
          </p>
          {activeTerm && (
            <p className="text-sm mt-1">
              インポート先会期: <Badge variant="default" className="text-xs">{activeTerm.name}</Badge>
            </p>
          )}
        </div>
      </div>

      {/* ステップ: アップロード */}
      {step === 'upload' && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* CSVアップロード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Upload className="h-5 w-5" />
                CSVファイルをアップロード
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm font-medium">クリックしてCSVファイルを選択</p>
                <p className="text-xs text-muted-foreground mt-1">UTF-8 エンコーディングの CSV ファイル</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />

              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <input
                  type="checkbox"
                  id="clearExisting"
                  checked={clearExisting}
                  onChange={(e) => setClearExisting(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="clearExisting" className="text-sm flex items-center gap-2">
                  <Trash2 className="h-4 w-4 text-destructive" />
                  既存の講座・時間割データを削除してから登録
                </label>
              </div>
            </CardContent>
          </Card>

          {/* テンプレートダウンロード */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Download className="h-5 w-5" />
                テンプレート
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm space-y-3">
                <p className="font-medium">CSVファイルの形式:</p>
                <div className="rounded-lg bg-muted p-3 text-xs font-mono overflow-x-auto">
                  <div className="text-primary font-bold">講座名,科目,カテゴリ,対象学年,種別,講師名,曜日,開始時間,終了時間,教室,定員,料金,学期,ステータス,時限</div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground"><strong>カテゴリ:</strong> general / recommendation / ryugata / junior</p>
                  <p className="text-xs text-muted-foreground"><strong>対象学年:</strong> 高1 / 高2 / 高3 / 中1 / 中2 / 中3</p>
                  <p className="text-xs text-muted-foreground"><strong>種別:</strong> group / individual_1on1 / individual_1on2 / individual_1on3</p>
                  <p className="text-xs text-muted-foreground"><strong>曜日:</strong> 月 / 火 / 水 / 木 / 金 / 土</p>
                  <p className="text-xs text-muted-foreground"><strong>ステータス:</strong> draft / open / closed</p>
                  <p className="text-xs text-muted-foreground"><strong>時限:</strong> 1 / 2 / 3 / 4 (土曜のみ4限あり)</p>
                </div>
              </div>

              <Button onClick={downloadTemplate} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                テンプレートCSVをダウンロード
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ステップ: プレビュー */}
      {step === 'preview' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  インポートプレビュー - {fileName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{validCount} 件 有効</Badge>
                  {errorCount > 0 && <Badge variant="destructive">{errorCount} 件 エラー</Badge>}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-8">#</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>講座名</TableHead>
                      <TableHead>科目</TableHead>
                      <TableHead>カテゴリ</TableHead>
                      <TableHead>学年</TableHead>
                      <TableHead>曜日</TableHead>
                      <TableHead>時間</TableHead>
                      <TableHead>教室</TableHead>
                      <TableHead>定員</TableHead>
                      <TableHead>料金</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((course, idx) => (
                      <TableRow key={idx} className={course.errors.length > 0 ? 'bg-destructive/5' : ''}>
                        <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>
                          {course.errors.length === 0 ? (
                            <Check className="h-4 w-4 text-green-600" />
                          ) : (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="text-xs text-destructive">{course.errors[0]}</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-medium text-sm">{course.name}</TableCell>
                        <TableCell className="text-sm">{course.subject}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{course.category_slug}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{course.target_grade}</TableCell>
                        <TableCell className="text-sm">{course.day_of_week}</TableCell>
                        <TableCell className="text-xs">{formatTime(course.start_time)}~{formatTime(course.end_time)}</TableCell>
                        <TableCell className="text-sm">{course.classroom}</TableCell>
                        <TableCell className="text-sm">{course.capacity}</TableCell>
                        <TableCell className="text-sm">{course.price.toLocaleString()}円</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setStep('upload')
                setParsedData([])
                setFileName('')
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              戻る
            </Button>
            <div className="flex items-center gap-3">
              {clearExisting && (
                <Badge variant="destructive" className="text-xs">
                  <Trash2 className="h-3 w-3 mr-1" />
                  既存データ削除
                </Badge>
              )}
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
              >
                {importing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    インポート中...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    {validCount}件をインポート
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ステップ: 完了 */}
      {step === 'done' && importResult && (
        <Card>
          <CardContent className="py-12 text-center space-y-4">
            {importResult.success > 0 ? (
              <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-8 w-8 text-green-600" />
              </div>
            ) : (
              <div className="w-16 h-16 mx-auto rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            )}
            <div>
              <h2 className="text-xl font-bold">インポート完了</h2>
              <p className="text-muted-foreground mt-1">
                {importResult.success}件 成功 / {importResult.failed}件 失敗
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-4">
              <Button variant="outline" onClick={() => {
                setStep('upload')
                setParsedData([])
                setFileName('')
                setImportResult(null)
              }}>
                別のファイルをインポート
              </Button>
              <Button onClick={() => router.push('/admin/courses')}>
                講座一覧へ戻る
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
