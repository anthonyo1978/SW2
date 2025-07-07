import { createClientComponentClient } from "@supabase/auth-helpers-nextjs"

// Create the client component client
export const supabase = createClientComponentClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
})

// Export createClient as an alias for compatibility
export const createClient = () =>
  createClientComponentClient({
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  })

// Site URL for redirects
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
