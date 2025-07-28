import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  console.log("=== AUTH CALLBACK START ===")
  console.log("Request URL:", requestUrl.toString())
  console.log("Code parameter:", code ? "present" : "missing")

  if (!code) {
    console.error("No code parameter in callback URL")
    return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
  }

  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    console.log("Supabase client created successfully")

    // Exchange code for session
    console.log("Attempting to exchange code for session...")
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

    console.log("Session exchange result:", {
      hasData: !!sessionData,
      hasUser: !!sessionData?.user,
      userId: sessionData?.user?.id,
      email: sessionData?.user?.email,
      emailConfirmed: sessionData?.user?.email_confirmed_at,
      error: sessionError
    })

    if (sessionError) {
      console.error("Session exchange error details:", {
        message: sessionError.message,
        status: sessionError.status,
        code: sessionError.code
      })
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
    }

    if (!sessionData?.user) {
      console.error("No user data returned from session exchange")
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
    }

    console.log("User verified successfully:", sessionData.user.id)

    // Check if this user already has a profile/organization
    console.log("Checking for existing profile...")
    const { data: existingProfile, error: profileError } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", sessionData.user.id)
      .single()

    console.log("Profile query result:", {
      hasProfile: !!existingProfile,
      organizationId: existingProfile?.organization_id,
      error: profileError
    })

    // Don't treat "no rows" as an error for new users
    if (profileError && profileError.code !== 'PGRST116') {
      console.error("Profile query error:", profileError)
      // Continue anyway - might be a new user
    }

    if (existingProfile && existingProfile.organization_id) {
      // Existing user with organization - go to dashboard
      console.log("Existing user with organization, redirecting to dashboard")
      return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
    } else {
      // New user or user without organization - go to setup
      console.log("New user or user without organization, redirecting to setup")
      return NextResponse.redirect(`${requestUrl.origin}/auth/setup-organization`)
    }

  } catch (error) {
    console.error("Unexpected error in auth callback:", {
      error,
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })
    return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
  }
}
