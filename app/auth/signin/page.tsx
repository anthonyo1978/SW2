"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { supabase, getAuthCallbackUrl } from "@/lib/supabase"

export default function SignInPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [error, setError] = useState("")
  const [message, setMessage] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setMessage("")
    setIsLoading(true)

    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      })

      if (signInError) {
        // If email not confirmed, show resend option
        if (signInError.message.includes("email not confirmed") || signInError.message.includes("Email not confirmed")) {
          setError("Please check your email and click the confirmation link to verify your account.")
          return
        }
        throw signInError
      }

      if (data.session) {
        router.push("/dashboard")
      }
    } catch (err: any) {
      console.error("Sign in error:", err)
      setError(err.message || "An error occurred during sign in")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    if (!email.trim()) {
      setError("Please enter your email address first")
      return
    }

    setIsResending(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: {
          emailRedirectTo: getAuthCallbackUrl()
        }
      })

      if (error) {
        throw error
      }

      setMessage("Confirmation email sent! Please check your inbox and spam folder.")
    } catch (err: any) {
      console.error("Resend error:", err)
      setError(err.message || "Failed to resend confirmation email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-6">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to homepage</span>
          </Link>

          <div className="flex items-center justify-center space-x-2 mb-4">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">S</span>
            </div>
            <span className="text-2xl font-bold text-gray-900">Swivel CRM</span>
          </div>
        </div>

        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Welcome Back</CardTitle>
            <CardDescription>Sign in to your aged care management dashboard</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                  {(error.includes("confirmation") || error.includes("verify")) && (
                    <button
                      onClick={handleResendConfirmation}
                      disabled={isResending}
                      className="mt-2 text-blue-600 hover:text-blue-800 text-sm underline disabled:opacity-50"
                    >
                      {isResending ? "Sending..." : "Resend confirmation email"}
                    </button>
                  )}
                </div>
              )}

              {message && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-green-600 text-sm">{message}</p>
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-600">
                Don't have an account?{" "}
                <Link href="/auth/signup" className="text-blue-600 hover:underline font-medium">
                  Start your free trial
                </Link>
              </p>
            </div>

            <div className="text-center mt-4 space-y-2">
              <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline block">
                Forgot your password?
              </Link>
              
              <button
                onClick={handleResendConfirmation}
                disabled={isResending || !email.trim()}
                className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? "Sending..." : "Resend confirmation email"}
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
