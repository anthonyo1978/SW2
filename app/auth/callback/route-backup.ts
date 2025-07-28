import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  console.log("=== AUTH CALLBACK START (SSR VERSION) ===")
  console.log("Request URL:", request.url)
  console.log("Code parameter:", code ? "present" : "missing")

  if (!code) {
    console.error("No code parameter in callback URL")
    return NextResponse.redirect(`${origin}/auth/error`)
  }

  try {
    const response = NextResponse.redirect(`${origin}${next}`)

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            request.cookies.set({
              name,
              value,
              ...options,
            })
            response.cookies.set({
              name,
              value,
              ...options,
            })
          },
          remove(name: string, options: any) {
            request.cookies.set({
              name,
              value: '',
              ...options,
            })
            response.cookies.set({
              name,
              value: '',
              ...options,
            })
          },
        },
      }
    )

    console.log("Attempting to exchange code for session (SSR)...")
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    console.log("Session exchange result (SSR):", {
      hasData: !!sessionData,
      hasUser: !!sessionData?.user,
      userId: sessionData?.user?.id,
      email: sessionData?.user?.email,
      error: sessionError
    })

    if (sessionError) {
      console.error("Session exchange error (SSR):", sessionError)
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    if (!sessionData?.user) {
      console.error("No user data returned (SSR)")
      return NextResponse.redirect(`${origin}/auth/error`)
    }

    // Check for existing profile
    console.log("Checking for existing profile (SSR)...")
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single()

    console.log("Profile query result (SSR):", {
      hasProfile: !!existingProfile,
      organizationId: existingProfile?.organization_id,
      error: profileError
    })

    if (existingProfile && existingProfile.organization_id) {
      console.log("Existing user, redirecting to dashboard")
      return NextResponse.redirect(`${origin}/dashboard`)
    } else {
      console.log("New user, redirecting to setup")
      return NextResponse.redirect(`${origin}/auth/setup-organization`)
    }

  } catch (error) {
    console.error("Unexpected error in SSR callback:", error)
    return NextResponse.redirect(`${origin}/auth/error`)
  }
}