"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Building2, User } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function CompleteSetupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<any>(null)

  // Form state
  const [organizationName, setOrganizationName] = useState("")
  const [abn, setAbn] = useState("")
  const [phone, setPhone] = useState("")
  const [fullName, setFullName] = useState("")

  useEffect(() => {
    checkUserAndRedirect()
  }, [])

  const checkUserAndRedirect = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()

      if (userError || !user) {
        console.error("User not authenticated:", userError)
        router.push("/auth/signin")
        return
      }

      // Check if user already has a profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single()

      if (existingProfile && existingProfile.organization_id) {
        console.log("User already has organization, redirecting to dashboard")
        router.push("/dashboard")
        return
      }

      // Set user data for form
      setUser(user)
      setFullName(user.user_metadata?.full_name || "")
      setLoading(false)

    } catch (err) {
      console.error("Error checking user:", err)
      router.push("/auth/signin")
    }
  }

  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setError("")
    setCreating(true)

    try {
      // Validation
      if (!organizationName.trim() || !fullName.trim()) {
        setError("Please fill in all required fields")
        setCreating(false)
        return
      }

      console.log("Creating organization for authenticated user...")

      // Try using the database function first
      let orgCreated = false
      let orgId = null

      try {
        const { data, error: rpcError } = await supabase.rpc("create_organization_and_admin", {
          user_id: user.id,
          user_email: user.email,
          full_name: fullName.trim(),
          organization_name: organizationName.trim(),
          abn: abn.trim() || null,
          phone: phone.trim() || null,
          plan: "starter",
        })

        console.log("RPC Function result:", { data, error: rpcError })

        if (rpcError) {
          console.error("Database function error:", rpcError)
          throw new Error(`Database function failed: ${rpcError.message || 'Unknown error'}`)
        }

        if (data) {
          orgId = data
          orgCreated = true
          console.log("Organization created successfully via function:", orgId)
        }
      } catch (functionError) {
        console.error("Function approach failed:", functionError)
        console.log("Falling back to manual organization creation...")
        
        // Fallback: Create organization and profile manually
        try {
          // Step 1: Create organization
          const { data: newOrg, error: orgError } = await supabase
            .from("organizations")
            .insert([{
              name: organizationName.trim(),
              abn: abn.trim() || null,
              phone: phone.trim() || null,
            }])
            .select("id")
            .single()

          if (orgError) {
            throw new Error(`Failed to create organization: ${orgError.message}`)
          }

          console.log("Organization created manually:", newOrg.id)
          
          // Step 2: Create profile
          const { error: profileError } = await supabase
            .from("profiles")
            .insert([{
              id: user.id,
              organization_id: newOrg.id,
              email: user.email,
              full_name: fullName.trim(),
              phone: phone.trim() || null,
              role: 'admin',
              subscription_status: 'trial',
              trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
            }])

          if (profileError) {
            throw new Error(`Failed to create profile: ${profileError.message}`)
          }

          orgId = newOrg.id
          orgCreated = true
          console.log("Profile created manually for organization:", orgId)

        } catch (manualError) {
          console.error("Manual creation also failed:", manualError)
          throw manualError
        }
      }

      if (!orgCreated || !orgId) {
        throw new Error("Organization creation failed - no organization ID returned")
      }

      // Redirect to dashboard
      router.push("/dashboard")

    } catch (err: any) {
      console.error("Unexpected error:", err)
      setError("An unexpected error occurred. Please try again.")
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Setup</h1>
          <p className="text-gray-600">Your account is verified. Let's create your organization to get started.</p>
          {user && (
            <p className="text-sm text-green-600 mt-2">✓ Signed in as {user.email}</p>
          )}
        </div>

        <form onSubmit={handleCompleteSetup} className="space-y-8">
          {/* Organization Details */}
          <Card className="border border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-gray-900">Organization Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="organizationName" className="text-gray-700">
                  Organization Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="organizationName"
                  type="text"
                  placeholder="e.g., Caring Hands Support Services"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="abn" className="text-gray-700">
                  ABN (Optional)
                </Label>
                <Input
                  id="abn"
                  type="text"
                  placeholder="e.g., 12 345 678 901"
                  value={abn}
                  onChange={(e) => setAbn(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phone" className="text-gray-700">
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="e.g., 02 9876 5432"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Personal Details */}
          <Card className="border border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-gray-900">Your Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="fullName" className="text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label className="text-gray-700">Email Address</Label>
                <Input
                  type="email"
                  value={user?.email || ""}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">Your verified email address</p>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="text-center">
            <Button
              type="submit"
              size="lg"
              disabled={creating}
              className="px-12 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {creating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Organization...
                </>
              ) : (
                "Complete Setup"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}