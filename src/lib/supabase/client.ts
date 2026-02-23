import { createBrowserClient } from '@supabase/ssr'

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return createBrowserClient(
      'https://placeholder.supabase.co',
      'placeholder-anon-key'
    )
  }

  client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storageKey: 'sb-admin-auth-token',
      flowType: 'pkce',
    },
  })
  return client
}
