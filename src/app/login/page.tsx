'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

// リトライ付きのプロフィール取得/作成
async function getOrCreateProfile(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userEmail: string,
  maxRetries = 3
): Promise<{ role: string } | null> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // プロフィール取得を試みる
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (profile && !profileError) {
        return profile
      }

      // プロフィールが無い場合、作成を試みる
      if (attempt === 0) {
        console.warn('Profile not found, attempting auto-create for:', userEmail)
      }

      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: userEmail,
          role: 'admin',
          display_name: userEmail.split('@')[0] || 'ユーザー',
        })

      // 既に存在する場合（競合挿入）はエラーでも再取得すればOK
      if (insertError && !insertError.message.includes('duplicate')) {
        console.error('Profile insert error:', insertError.message)
      }

      // 少し待ってから再取得
      await new Promise((resolve) => setTimeout(resolve, 500))

      const { data: newProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()

      if (newProfile) return newProfile
    } catch (err) {
      console.warn(`Profile fetch attempt ${attempt + 1} failed:`, err)
      // リトライ前に待機
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }
  return null
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()

      // Step 1: サインイン
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        console.error('Sign in error:', signInError.message, signInError)
        setError(`サインインエラー: ${signInError.message}`)
        setLoading(false)
        return
      }

      const user = signInData?.user
      if (!user) {
        setError('認証に失敗しました。ユーザーが見つかりません。')
        setLoading(false)
        return
      }

      // Step 2: プロフィール取得/作成（リトライ付き）
      const profile = await getOrCreateProfile(supabase, user.id, user.email || email)

      if (!profile) {
        setError('プロフィールの取得に失敗しました。管理者にお問い合わせください。')
        setLoading(false)
        return
      }

      // Only allow admin, instructor, tutor roles
      if (!['admin', 'instructor', 'tutor'].includes(profile.role)) {
        await supabase.auth.signOut()
        setError(`アクセス権限がありません。(role: ${profile.role})`)
        setLoading(false)
        return
      }

      // Step 3: ロールに応じてリダイレクト
      // window.location.href を使用してフルリロードし、auth stateを確実に更新
      switch (profile.role) {
        case 'admin':
          window.location.href = '/admin'
          break
        case 'instructor':
          window.location.href = '/instructor'
          break
        case 'tutor':
          window.location.href = '/tutor'
          break
        default:
          window.location.href = '/login'
      }
    } catch (err) {
      console.error('Login exception:', err)
      setError(`予期しないエラー: ${err instanceof Error ? err.message : String(err)}`)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">淑徳アドバンス</CardTitle>
          <CardDescription className="text-base">管理画面</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                placeholder="パスワード"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
