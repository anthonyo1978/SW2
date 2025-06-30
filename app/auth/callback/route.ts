import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")

  if (code) {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    try {
      // Exchange code for session
      const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)

      if (sessionError) {
        console.error("Session exchange error:", sessionError)
        return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
      }

      if (sessionData.user) {
        console.log("User verified successfully:", sessionData.user.id)

        // Check if we need to create organization manually
        // This will be handled by a client-side component that checks localStorage
        return NextResponse.redirect(`${requestUrl.origin}/auth/setup-organization`)
      }
    } catch (error) {
      console.error("Error in auth callback:", error)
      return NextResponse.redirect(`${requestUrl.origin}/auth/error`)
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${requestUrl.origin}/dashboard`)
}
