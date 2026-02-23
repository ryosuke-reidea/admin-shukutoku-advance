'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { AdminSidebar } from '@/components/layout/admin-sidebar'
import { TermProvider, TermSelector } from '@/components/term-selector'

export default function TutorLayout({ children }: { children: React.ReactNode }) {
  const { profile, loading, signOut } = useAuth()
  const redirected = useRef(false)

  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'tutor') && !redirected.current) {
      redirected.current = true
      window.location.href = '/login'
    }
  }, [profile, loading])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        </div>
      </div>
    )
  }

  if (!profile || profile.role !== 'tutor') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">リダイレクト中...</p>
        </div>
      </div>
    )
  }

  return (
    <TermProvider>
      <div className="min-h-screen">
        <AdminSidebar profile={profile} onSignOut={signOut} />
        <main className="lg:pl-64">
          <div className="pt-16 lg:pt-0">
            <div className="border-b bg-white px-6 py-3 lg:px-8">
              <TermSelector />
            </div>
            <div className="p-6 lg:p-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </TermProvider>
  )
}
