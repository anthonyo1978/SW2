import { createBrowserClient } from '@supabase/ssr';

// Create the client component client
export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Export createClient as an alias for compatibility
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// Site URL for redirects - prioritize local development
export const SITE_URL = (() => {
  // In browser, use the current origin
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  // In server-side rendering, use environment variable or default
  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
})()

// Helper function to get the correct auth callback URL
export const getAuthCallbackUrl = () => {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : SITE_URL
  return `${baseUrl}/auth/callback`
}
