import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    // Get the current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const body = await request.json()
    const { organizationName, abn, phone, fullName, plan } = body

    // Check if user already has an organization
    const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

    if (existingProfile) {
      return NextResponse.json({ error: "Organization already exists" }, { status: 400 })
    }

    // Call our database function directly
    const { data, error } = await supabase.rpc("create_organization_and_admin", {
      user_id: user.id,
      user_email: user.email,
      full_name: fullName,
      organization_name: organizationName,
      abn: abn || null,
      phone: phone || null,
      plan: plan || "starter",
    })

    if (error) {
      console.error("Database function error:", error)
      return NextResponse.json({ error: "Failed to create organization" }, { status: 500 })
    }

    return NextResponse.json({ success: true, organizationId: data })
  } catch (error) {
    console.error("API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
