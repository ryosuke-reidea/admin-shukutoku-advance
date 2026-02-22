'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import type { Profile, UserRole } from '@/lib/types/database'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  DollarSign,
  FileEdit,
  Mail,
  Monitor,
  StickyNote,
  Printer,
  Clock,
  Home,
  ClipboardList,
  LogOut,
  Menu,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const adminNav: NavItem[] = [
  { label: 'ダッシュボード', href: '/admin', icon: LayoutDashboard },
  { label: '講座概要', href: '/admin/courses', icon: BookOpen },
  { label: '申込生徒一覧', href: '/admin/students', icon: Users },
  { label: '売上管理', href: '/admin/revenue', icon: DollarSign },
  { label: 'フロント情報登録', href: '/admin/front-content', icon: FileEdit },
  { label: 'お問い合わせ', href: '/admin/contacts', icon: Mail },
  { label: 'サイネージ', href: '/admin/signage', icon: Monitor },
]

const instructorNav: NavItem[] = [
  { label: 'ダッシュボード', href: '/instructor', icon: LayoutDashboard },
  { label: '授業注意点', href: '/instructor/notes', icon: StickyNote },
  { label: 'プリント依頼', href: '/instructor/print-requests', icon: Printer },
]

const tutorNav: NavItem[] = [
  { label: 'ダッシュボード', href: '/tutor', icon: LayoutDashboard },
  { label: '時間割', href: '/tutor/timetable', icon: Clock },
  { label: '教室割', href: '/tutor/classroom', icon: Home },
  { label: '生徒名簿', href: '/tutor/students', icon: Users },
  { label: '注意点確認', href: '/tutor/notes', icon: ClipboardList },
  { label: 'プリント', href: '/tutor/prints', icon: Printer },
]

function getNavItems(role: UserRole): NavItem[] {
  switch (role) {
    case 'admin':
      return adminNav
    case 'instructor':
      return instructorNav
    case 'tutor':
      return tutorNav
    default:
      return []
  }
}

function getRoleLabel(role: UserRole): string {
  switch (role) {
    case 'admin':
      return '管理者'
    case 'instructor':
      return '講師'
    case 'tutor':
      return 'チューター'
    default:
      return ''
  }
}

interface AdminSidebarProps {
  profile: Profile
  onSignOut: () => void
}

function SidebarContent({ profile, onSignOut, navItems, pathname }: AdminSidebarProps & { navItems: NavItem[]; pathname: string }) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-6">
        <h2 className="text-lg font-bold">淑徳アドバンス</h2>
        <p className="text-sm text-muted-foreground">管理画面</p>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== `/${profile.role}` && pathname.startsWith(item.href + '/'))
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          )
        })}
      </nav>
      <Separator />
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {profile.display_name?.charAt(0) || profile.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile.display_name || profile.email}</p>
            <p className="text-xs text-muted-foreground">{getRoleLabel(profile.role)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" className="w-full" onClick={onSignOut}>
          <LogOut className="h-4 w-4 mr-2" />
          ログアウト
        </Button>
      </div>
    </div>
  )
}

export function AdminSidebar({ profile, onSignOut }: AdminSidebarProps) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const navItems = getNavItems(profile.role)

  return (
    <>
      {/* Mobile sidebar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-2 border-b bg-background px-4 py-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">ナビゲーション</SheetTitle>
            <SidebarContent
              profile={profile}
              onSignOut={onSignOut}
              navItems={navItems}
              pathname={pathname}
            />
          </SheetContent>
        </Sheet>
        <h1 className="text-sm font-bold">淑徳アドバンス 管理画面</h1>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r bg-background">
        <SidebarContent
          profile={profile}
          onSignOut={onSignOut}
          navItems={navItems}
          pathname={pathname}
        />
      </aside>
    </>
  )
}
