"use client"

import type React from "react"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Building2, User, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function OrganizationSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const plan = searchParams.get("plan") || "starter"

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  // Form state
  const [organizationName, setOrganizationName] = useState("")
  const [abn, setAbn] = useState("")
  const [phone, setPhone] = useState("")
  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    // Validation
    if (!organizationName.trim() || !fullName.trim() || !email.trim() || password.length < 6) {
      setError("Please fill in all required fields")
      setIsLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setIsLoading(false)
      return
    }

    try {
      console.log("Starting manual signup process (bypassing trigger)...")

      // Step 1: Create user WITHOUT metadata to avoid trigger issues
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      console.log("Auth signup response:", { authData, error: signUpError })

      if (signUpError) {
        console.error("Auth signup error:", signUpError)
        if (signUpError.message.includes("User already registered")) {
          setError("An account with this email already exists. Please sign in instead.")
        } else {
          setError(signUpError.message || "An error occurred during signup")
        }
        setIsLoading(false)
        return
      }

      if (authData.user) {
        console.log("User created successfully:", authData.user.id)

        // Step 2: Store organization details for later creation
        // We'll create the organization after email verification
        const orgData = {
          userId: authData.user.id,
          organizationName: organizationName.trim(),
          abn: abn.trim() || null,
          phone: phone.trim() || null,
          fullName: fullName.trim(),
          email: email.trim(),
          plan: plan,
        }

        // Store in localStorage for the callback to pick up
        localStorage.setItem("pendingOrganization", JSON.stringify(orgData))

        console.log("Stored organization data for post-verification creation")

        // Redirect to email verification with special flag
        router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&manual=true`)
      }
    } catch (err: any) {
      console.error("Unexpected signup error:", err)
      setError("An unexpected error occurred. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link
            href={`/auth/signup?plan=${plan}`}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Swivel CRM</span>
            </div>
          </Link>
          <div className="text-sm text-gray-500">Step 2 of 3: Organization Setup</div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Set Up Your Organization</h1>
          <p className="text-gray-600">Create your aged care organization and admin account</p>
        </div>

        <form onSubmit={handleSignup} className="space-y-8">
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

          {/* Admin Account */}
          <Card className="border border-gray-200">
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle className="text-gray-900">Admin Account</CardTitle>
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
                <Label htmlFor="email" className="text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-gray-700">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="text-gray-700">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm your password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="mt-1"
                />
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
              disabled={isLoading}
              className="px-12 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>

            <p className="text-sm text-gray-500 mt-4">
              Selected Plan: <span className="font-medium capitalize">{plan}</span> • 14-day free trial
            </p>
          </div>
        </form>

        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-blue-600 hover:underline">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
