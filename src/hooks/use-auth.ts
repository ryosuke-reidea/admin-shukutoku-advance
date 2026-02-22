'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'
import type { Profile } from '@/lib/types/database'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    const supabase = createClient()

    const getUser = async () => {
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

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (!isMounted.current) return

        if (profileError) {
          console.error('Profile fetch error:', profileError)
          setProfile(null)
        } else {
          setProfile(profileData)
        }
      } catch (err) {
        console.error('Auth error:', err)
        if (isMounted.current) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (isMounted.current) {
          setLoading(false)
        }
      }
    }

    getUser()

    // Safety timeout - if loading takes more than 8s, force complete
    const timeout = setTimeout(() => {
      if (isMounted.current) {
        setLoading(false)
      }
    }, 8000)

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: { user: User } | null) => {
        if (!isMounted.current) return
        setUser(session?.user ?? null)
        if (session?.user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()
          if (isMounted.current) setProfile(profileData)
        } else {
          if (isMounted.current) setProfile(null)
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    router.push('/login')
  }, [router])

  return { user, profile, loading, signOut }
}
