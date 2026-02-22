'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import type { FrontContent, TuitionInfo } from '@/lib/types/database'

const SECTIONS = [
  { value: 'hero', label: 'ヒーロー' },
  { value: 'about', label: '概要' },
  { value: 'merits', label: 'メリット' },
  { value: 'announcements', label: 'お知らせ' },
]

export default function AdminFrontContentPage() {
  const [contents, setContents] = useState<FrontContent[]>([])
  const [tuitionInfos, setTuitionInfos] = useState<TuitionInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [tuitionDialogOpen, setTuitionDialogOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<FrontContent | null>(null)
  const [editingTuition, setEditingTuition] = useState<TuitionInfo | null>(null)

  // Form state for FrontContent
  const [section, setSection] = useState('')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [displayOrder, setDisplayOrder] = useState(0)
  const [isActive, setIsActive] = useState(true)

  // Form state for TuitionInfo
  const [tuitionLabel, setTuitionLabel] = useState('')
  const [tuitionCourseType, setTuitionCourseType] = useState('')
  const [tuitionPrice, setTuitionPrice] = useState(0)
  const [tuitionUnit, setTuitionUnit] = useState('')
  const [tuitionNotes, setTuitionNotes] = useState('')
  const [tuitionDisplayOrder, setTuitionDisplayOrder] = useState(0)

  const supabase = createClient()

  const fetchData = async () => {
    try {
      const { data: contentData } = await supabase
        .from('front_content')
        .select('*')
        .order('section')
        .order('display_order')
      setContents(contentData || [])

      const { data: tuitionData } = await supabase
        .from('tuition_info')
        .select('*')
        .order('display_order')
      setTuitionInfos(tuitionData || [])
    } catch (error) {
      console.error('Error fetching front content:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const resetContentForm = () => {
    setSection('')
    setTitle('')
    setContent('')
    setImageUrl('')
    setDisplayOrder(0)
    setIsActive(true)
    setEditingContent(null)
  }

  const resetTuitionForm = () => {
    setTuitionLabel('')
    setTuitionCourseType('')
    setTuitionPrice(0)
    setTuitionUnit('')
    setTuitionNotes('')
    setTuitionDisplayOrder(0)
    setEditingTuition(null)
  }

  const openEditContent = (item: FrontContent) => {
    setEditingContent(item)
    setSection(item.section)
    setTitle(item.title || '')
    setContent(item.content || '')
    setImageUrl(item.image_url || '')
    setDisplayOrder(item.display_order)
    setIsActive(item.is_active)
    setDialogOpen(true)
  }

  const openEditTuition = (item: TuitionInfo) => {
    setEditingTuition(item)
    setTuitionLabel(item.label)
    setTuitionCourseType(item.course_type)
    setTuitionPrice(item.price)
    setTuitionUnit(item.unit)
    setTuitionNotes(item.notes || '')
    setTuitionDisplayOrder(item.display_order)
    setTuitionDialogOpen(true)
  }

  const handleSaveContent = async () => {
    try {
      if (editingContent) {
        await supabase
          .from('front_content')
          .update({
            section,
            title: title || null,
            content: content || null,
            image_url: imageUrl || null,
            display_order: displayOrder,
            is_active: isActive,
          })
          .eq('id', editingContent.id)
      } else {
        await supabase
          .from('front_content')
          .insert({
            section,
            title: title || null,
            content: content || null,
            image_url: imageUrl || null,
            display_order: displayOrder,
            is_active: isActive,
            metadata: {},
          })
      }
      resetContentForm()
      setDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving content:', error)
    }
  }

  const handleDeleteContent = async (id: string) => {
    if (!confirm('このコンテンツを削除しますか?')) return
    try {
      await supabase.from('front_content').delete().eq('id', id)
      fetchData()
    } catch (error) {
      console.error('Error deleting content:', error)
    }
  }

  const handleToggleActive = async (item: FrontContent) => {
    try {
      await supabase
        .from('front_content')
        .update({ is_active: !item.is_active })
        .eq('id', item.id)
      fetchData()
    } catch (error) {
      console.error('Error toggling active:', error)
    }
  }

  const handleSaveTuition = async () => {
    try {
      if (editingTuition) {
        await supabase
          .from('tuition_info')
          .update({
            label: tuitionLabel,
            course_type: tuitionCourseType,
            price: tuitionPrice,
            unit: tuitionUnit,
            notes: tuitionNotes || null,
            display_order: tuitionDisplayOrder,
          })
          .eq('id', editingTuition.id)
      } else {
        await supabase
          .from('tuition_info')
          .insert({
            label: tuitionLabel,
            course_type: tuitionCourseType,
            price: tuitionPrice,
            unit: tuitionUnit,
            notes: tuitionNotes || null,
            display_order: tuitionDisplayOrder,
          })
      }
      resetTuitionForm()
      setTuitionDialogOpen(false)
      fetchData()
    } catch (error) {
      console.error('Error saving tuition info:', error)
    }
  }

  const handleDeleteTuition = async (id: string) => {
    if (!confirm('この料金情報を削除しますか?')) return
    try {
      await supabase.from('tuition_info').delete().eq('id', id)
      fetchData()
    } catch (error) {
      console.error('Error deleting tuition info:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">フロント情報登録</h1>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">コンテンツ管理</TabsTrigger>
          <TabsTrigger value="tuition">料金情報</TabsTrigger>
        </TabsList>

        {/* Content Management */}
        <TabsContent value="content">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>フロントコンテンツ</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetContentForm() }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingContent ? 'コンテンツ編集' : 'コンテンツ作成'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>セクション</Label>
                      <Select value={section} onValueChange={setSection}>
                        <SelectTrigger>
                          <SelectValue placeholder="セクションを選択" />
                        </SelectTrigger>
                        <SelectContent>
                          {SECTIONS.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>タイトル</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>コンテンツ</Label>
                      <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
                    </div>
                    <div className="space-y-2">
                      <Label>画像URL</Label>
                      <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>表示順</Label>
                      <Input type="number" value={displayOrder} onChange={(e) => setDisplayOrder(Number(e.target.value))} />
                    </div>
                    <Button onClick={handleSaveContent} className="w-full">
                      {editingContent ? '更新' : '作成'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {contents.length === 0 ? (
                <p className="text-sm text-muted-foreground">コンテンツがありません。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>セクション</TableHead>
                      <TableHead>タイトル</TableHead>
                      <TableHead>表示順</TableHead>
                      <TableHead>ステータス</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contents.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Badge variant="outline">
                            {SECTIONS.find((s) => s.value === item.section)?.label || item.section}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{item.title || '-'}</TableCell>
                        <TableCell>{item.display_order}</TableCell>
                        <TableCell>
                          <Badge
                            variant={item.is_active ? 'default' : 'secondary'}
                            className="cursor-pointer"
                            onClick={() => handleToggleActive(item)}
                          >
                            {item.is_active ? '有効' : '無効'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditContent(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteContent(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tuition Info */}
        <TabsContent value="tuition">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>料金情報</CardTitle>
              <Dialog open={tuitionDialogOpen} onOpenChange={(open) => { setTuitionDialogOpen(open); if (!open) resetTuitionForm() }}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    新規作成
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{editingTuition ? '料金情報編集' : '料金情報作成'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>ラベル</Label>
                      <Input value={tuitionLabel} onChange={(e) => setTuitionLabel(e.target.value)} placeholder="例: 集団授業（英語）" />
                    </div>
                    <div className="space-y-2">
                      <Label>授業タイプ</Label>
                      <Input value={tuitionCourseType} onChange={(e) => setTuitionCourseType(e.target.value)} placeholder="例: group" />
                    </div>
                    <div className="space-y-2">
                      <Label>料金</Label>
                      <Input type="number" value={tuitionPrice} onChange={(e) => setTuitionPrice(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <Label>単位</Label>
                      <Input value={tuitionUnit} onChange={(e) => setTuitionUnit(e.target.value)} placeholder="例: 月額" />
                    </div>
                    <div className="space-y-2">
                      <Label>備考</Label>
                      <Textarea value={tuitionNotes} onChange={(e) => setTuitionNotes(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>表示順</Label>
                      <Input type="number" value={tuitionDisplayOrder} onChange={(e) => setTuitionDisplayOrder(Number(e.target.value))} />
                    </div>
                    <Button onClick={handleSaveTuition} className="w-full">
                      {editingTuition ? '更新' : '作成'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {tuitionInfos.length === 0 ? (
                <p className="text-sm text-muted-foreground">料金情報がありません。</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ラベル</TableHead>
                      <TableHead>タイプ</TableHead>
                      <TableHead>料金</TableHead>
                      <TableHead>単位</TableHead>
                      <TableHead>表示順</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tuitionInfos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.label}</TableCell>
                        <TableCell>{item.course_type}</TableCell>
                        <TableCell>{item.price.toLocaleString()}円</TableCell>
                        <TableCell>{item.unit}</TableCell>
                        <TableCell>{item.display_order}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="icon" onClick={() => openEditTuition(item)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleDeleteTuition(item.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
