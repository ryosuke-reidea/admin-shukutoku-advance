'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/database'

// プロフィールキャッシュ（同じセッション内で重複取得を防ぐ）
let profileCache: { userId: string; data: Profile } | null = null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    const supabase = createClient()

    const fetchProfile = async (userId: string, userEmail?: string) => {
      // キャッシュがあればそれを使う
      if (profileCache && profileCache.userId === userId) {
        return profileCache.data
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error || !data) {
        // プロフィールが見つからない場合、自動作成を試みる
        if (userEmail) {
          console.warn('Profile not found in useAuth, attempting auto-create:', userEmail)
          const { error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: userId,
              email: userEmail,
              role: 'student',
              display_name: userEmail.split('@')[0] || 'ユーザー',
            })

          if (!insertError) {
            // 再取得
            const { data: newData } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single()

            if (newData) {
              profileCache = { userId, data: newData }
              return newData
            }
          } else {
            console.error('Profile auto-create error:', insertError.message)
          }
        }
        if (error) console.error('Profile fetch error:', error.message)
        return null
      }

      if (data) {
        profileCache = { userId, data }
      }
      return data
    }

    const initAuth = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (!isMounted.current) return

        if (authError || !authUser) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          return
        }

        setUser(authUser)

        const profileData = await fetchProfile(authUser.id, authUser.email)
        if (isMounted.current) {
          setProfile(profileData)
          setLoading(false)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (isMounted.current) {
          setUser(null)
          setProfile(null)
          setLoading(false)
        }
      }
    }

    initAuth()

    // Safety timeout - 5秒に短縮
    const timeout = setTimeout(() => {
      if (isMounted.current) {
        setLoading(false)
      }
    }, 5000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user: User } | null) => {
        if (!isMounted.current) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          profileCache = null
          return
        }

        if (session?.user) {
          setUser(session.user)
          if (event === 'SIGNED_IN') {
            profileCache = null // 新規ログイン時はキャッシュクリア
            // ログインページ側のプロフィール取得/作成との競合を防ぐため少し待機
            await new Promise((resolve) => setTimeout(resolve, 1000))
            if (!isMounted.current) return
          }
          const profileData = await fetchProfile(session.user.id, session.user.email)
          if (isMounted.current) setProfile(profileData)
        }
      }
    )

    return () => {
      isMounted.current = false
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  const signOut = useCallback(async () => {
    const supabase = createClient()
    profileCache = null
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/login')
  }, [router])

  return { user, profile, loading, signOut }
}
