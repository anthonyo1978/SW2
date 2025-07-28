"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Loader2, CheckCircle, Building2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function SetupOrganizationPage() {
  const router = useRouter()
  const [status, setStatus] = useState<"loading" | "creating" | "success" | "error">("loading")
  const [error, setError] = useState("")

  useEffect(() => {
    setupOrganization()
  }, [])

  const setupOrganization = async () => {
    try {
      // Check if user is authenticated
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("User not authenticated:", userError)
        router.push("/auth/signin")
        return
      }

      // Check if organization already exists
      const { data: existingProfile } = await supabase.from("profiles").select("*").eq("id", user.id).single()

      if (existingProfile && existingProfile.organization_id) {
        console.log("Organization already exists, redirecting to dashboard")
        router.push("/dashboard")
        return
      }

      // Get pending organization data from localStorage
      const pendingOrgData = localStorage.getItem("pendingOrganization")
      if (!pendingOrgData) {
        console.log("No pending organization data - user needs to complete signup manually")
        
        // For users who signed in without completing setup, redirect to manual completion
        console.log("Redirecting to complete setup page")
        router.push("/auth/complete-setup")
        return
      }

      const orgData = JSON.parse(pendingOrgData)
      console.log("Creating organization with data:", orgData)

      setStatus("creating")

      // Create organization using database function with fallback
      console.log("RPC parameters:", {
        user_id: user.id,
        user_email: orgData.email,
        full_name: orgData.fullName,
        organization_name: orgData.organizationName,
        abn: orgData.abn,
        phone: orgData.phone,
        plan: orgData.plan,
      })

      const { data: orgId, error: orgError } = await supabase.rpc("create_organization_and_admin", {
        user_id: user.id,
        user_email: orgData.email,
        full_name: orgData.fullName,
        organization_name: orgData.organizationName,
        abn: orgData.abn,
        phone: orgData.phone,
        plan: orgData.plan,
      })

      console.log("RPC result:", { data: orgId, error: orgError })

      if (orgError) {
        console.error("Organization creation error:", orgError)
        setError(`Failed to create organization: ${orgError.message || 'Database function error'}`)
        setStatus("error")
        return
      }

      if (!orgId) {
        console.error("No organization ID returned from function")
        setError("Organization creation failed - no ID returned")
        setStatus("error")
        return
      }

      console.log("Organization created successfully:", orgId)

      // Clean up localStorage
      localStorage.removeItem("pendingOrganization")

      setStatus("success")

      // Redirect to dashboard after a brief success message
      setTimeout(() => {
        router.push("/dashboard")
      }, 2000)
    } catch (err: any) {
      console.error("Setup organization error:", err)
      setError("An unexpected error occurred during setup")
      setStatus("error")
    }
  }

  const handleRetry = () => {
    setStatus("loading")
    setError("")
    setupOrganization()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            {status === "loading" || status === "creating" ? (
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            ) : status === "success" ? (
              <CheckCircle className="w-8 h-8 text-green-600" />
            ) : (
              <Building2 className="w-8 h-8 text-blue-600" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === "loading" && "Setting Up Your Account"}
            {status === "creating" && "Creating Your Organization"}
            {status === "success" && "Welcome to Swivel CRM!"}
            {status === "error" && "Setup Error"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "loading" && <p className="text-gray-600">Preparing your organization setup...</p>}

          {status === "creating" && (
            <div className="space-y-2">
              <p className="text-gray-600">Creating your organization and setting up your account...</p>
              <p className="text-sm text-gray-500">This may take a few moments</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-2">
              <p className="text-green-600 font-medium">Your organization has been created successfully!</p>
              <p className="text-gray-600">Redirecting you to your dashboard...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <p className="text-red-600">{error}</p>
              <Button onClick={handleRetry} className="w-full">
                Try Again
              </Button>
              <p className="text-sm text-gray-500">
                If this continues to fail, please contact support with the error details.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
