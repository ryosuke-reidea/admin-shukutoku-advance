'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

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

      // Step 2: プロフィール取得
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profileError) {
        console.error('Profile error:', profileError.message, profileError)
        setError(`プロフィール取得エラー: ${profileError.message}`)
        setLoading(false)
        return
      }

      if (!profile) {
        setError('プロフィールが見つかりません。管理者にお問い合わせください。')
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
      switch (profile.role) {
        case 'admin':
          router.push('/admin')
          break
        case 'instructor':
          router.push('/instructor')
          break
        case 'tutor':
          router.push('/tutor')
          break
        default:
          router.push('/login')
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
