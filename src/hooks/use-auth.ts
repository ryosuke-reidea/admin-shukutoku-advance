'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/database'

// プロフィールキャッシュ（同じセッション内で重複取得を防ぐ）
let profileCache: { userId: string; data: Profile } | null = null

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const isMounted = useRef(true)
  const initDone = useRef(false)

  useEffect(() => {
    isMounted.current = true
    initDone.current = false
    const supabase = createClient()

    const fetchProfile = async (userId: string, retries = 3): Promise<Profile | null> => {
      // キャッシュがあればそれを使う
      if (profileCache && profileCache.userId === userId) {
        return profileCache.data
      }

      for (let attempt = 0; attempt < retries; attempt++) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()

        if (data && !error) {
          profileCache = { userId, data }
          return data
        }

        // リトライ前に待機（プロフィールがログインページで作成中の可能性がある）
        if (attempt < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
        }
      }

      console.error('Profile not found after retries for userId:', userId)
      return null
    }

    const initAuth = async () => {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()

        if (!isMounted.current) return

        if (authError || !authUser) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          initDone.current = true
          return
        }

        setUser(authUser)

        const profileData = await fetchProfile(authUser.id)
        if (isMounted.current) {
          setProfile(profileData)
          setLoading(false)
          initDone.current = true
        }
      } catch (err) {
        console.error('Auth init error:', err)
        if (isMounted.current) {
          setUser(null)
          setProfile(null)
          setLoading(false)
          initDone.current = true
        }
      }
    }

    initAuth()

    // Safety timeout - 8秒
    const timeout = setTimeout(() => {
      if (isMounted.current && loading) {
        setLoading(false)
        initDone.current = true
      }
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: string, session: { user: User } | null) => {
        if (!isMounted.current) return

        if (event === 'SIGNED_OUT') {
          setUser(null)
          setProfile(null)
          profileCache = null
          return
        }

        // initAuthが完了するまでSIGNED_INイベントは無視（重複処理防止）
        if (event === 'SIGNED_IN' && !initDone.current) {
          return
        }

        if (session?.user) {
          setUser(session.user)
          if (event === 'SIGNED_IN') {
            profileCache = null
          }
          const profileData = await fetchProfile(session.user.id)
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
    window.location.href = '/login'
  }, [])

  return { user, profile, loading, signOut }
}
