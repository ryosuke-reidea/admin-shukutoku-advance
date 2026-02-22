'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
import { Mail, Eye, Reply } from 'lucide-react'
import type { ContactSubmission } from '@/lib/types/database'

const STATUS_LABELS: Record<string, string> = {
  unread: '未読',
  read: '既読',
  replied: '返信済み',
}

const STATUS_VARIANTS: Record<string, 'destructive' | 'secondary' | 'default'> = {
  unread: 'destructive',
  read: 'secondary',
  replied: 'default',
}

export default function AdminContactsPage() {
  const [contacts, setContacts] = useState<ContactSubmission[]>([])
  const [selectedContact, setSelectedContact] = useState<ContactSubmission | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = async () => {
    const supabase = createClient()
    try {
      const { data } = await supabase
        .from('contact_submissions')
        .select('*')
        .order('created_at', { ascending: false })
      setContacts(data || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleMarkAsRead = async (contact: ContactSubmission) => {
    const supabase = createClient()
    try {
      await supabase
        .from('contact_submissions')
        .update({ status: 'read' })
        .eq('id', contact.id)
      fetchData()
    } catch (error) {
      console.error('Error updating contact:', error)
    }
  }

  const handleMarkAsReplied = async (contact: ContactSubmission) => {
    const supabase = createClient()
    try {
      await supabase
        .from('contact_submissions')
        .update({ status: 'replied' })
        .eq('id', contact.id)
      fetchData()
      setSelectedContact(null)
    } catch (error) {
      console.error('Error updating contact:', error)
    }
  }

  const handleOpenContact = async (contact: ContactSubmission) => {
    setSelectedContact(contact)
    if (contact.status === 'unread') {
      await handleMarkAsRead(contact)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-muted-foreground">読み込み中...</p>
      </div>
    )
  }

  const unreadCount = contacts.filter((c) => c.status === 'unread').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">お問い合わせ管理</h1>
          {unreadCount > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              未読: {unreadCount}件
            </p>
          )}
        </div>
        <Mail className="h-5 w-5 text-muted-foreground" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>お問い合わせ一覧 ({contacts.length}件)</CardTitle>
        </CardHeader>
        <CardContent>
          {contacts.length === 0 ? (
            <p className="text-sm text-muted-foreground">お問い合わせはありません。</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>名前</TableHead>
                    <TableHead className="hidden md:table-cell">メール</TableHead>
                    <TableHead className="hidden sm:table-cell">件名</TableHead>
                    <TableHead className="hidden lg:table-cell">カテゴリ</TableHead>
                    <TableHead>ステータス</TableHead>
                    <TableHead className="hidden sm:table-cell">受信日</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {contacts.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className={contact.status === 'unread' ? 'bg-muted/50 font-medium' : ''}
                    >
                      <TableCell className="font-medium text-sm">
                        {contact.name}
                        <div className="sm:hidden text-xs text-muted-foreground mt-0.5 truncate max-w-[150px]">{contact.subject}</div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm">{contact.email}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{contact.subject}</TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant="outline" className="text-xs">{contact.category}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANTS[contact.status] || 'secondary'} className="text-xs">
                          {STATUS_LABELS[contact.status] || contact.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">
                        {new Date(contact.created_at).toLocaleDateString('ja-JP')}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenContact(contact)}
                          className="h-8 w-8 p-0 sm:h-auto sm:w-auto sm:px-3"
                        >
                          <Eye className="h-4 w-4 sm:mr-1" />
                          <span className="hidden sm:inline">詳細</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Contact Detail Dialog */}
      <Dialog open={!!selectedContact} onOpenChange={(open) => { if (!open) setSelectedContact(null) }}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>お問い合わせ詳細</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">名前</p>
                  <p className="font-medium">{selectedContact.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">メール</p>
                  <p className="font-medium">{selectedContact.email}</p>
                </div>
                {selectedContact.phone && (
                  <div>
                    <p className="text-sm text-muted-foreground">電話番号</p>
                    <p className="font-medium">{selectedContact.phone}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">カテゴリ</p>
                  <p className="font-medium">{selectedContact.category}</p>
                </div>
              </div>
              <Separator />
              <div>
                <p className="text-sm text-muted-foreground mb-1">件名</p>
                <p className="font-medium">{selectedContact.subject}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">メッセージ</p>
                <div className="rounded-md bg-muted p-3 text-sm whitespace-pre-wrap">
                  {selectedContact.message}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                受信日: {new Date(selectedContact.created_at).toLocaleString('ja-JP')}
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                {selectedContact.status !== 'replied' && (
                  <Button onClick={() => handleMarkAsReplied(selectedContact)} size="sm">
                    <Reply className="h-4 w-4 mr-2" />
                    返信済みにする
                  </Button>
                )}
                <Badge variant={STATUS_VARIANTS[selectedContact.status] || 'secondary'}>
                  {STATUS_LABELS[selectedContact.status] || selectedContact.status}
                </Badge>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
