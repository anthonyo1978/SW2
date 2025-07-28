"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, CheckCircle, Loader2 } from "lucide-react"
import { supabase, getAuthCallbackUrl } from "@/lib/supabase"

export default function VerifyEmailPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const isManual = searchParams.get("manual") === "true"
  
  const [isResending, setIsResending] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const handleResendEmail = async () => {
    if (!email) {
      setError("No email address available for resending")
      return
    }

    setIsResending(true)
    setError("")
    setMessage("")

    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: getAuthCallbackUrl()
        }
      })

      if (error) {
        throw error
      }

      setMessage("Verification email resent! Please check your inbox and spam folder.")
    } catch (err: any) {
      console.error("Resend error:", err)
      setError(err.message || "Failed to resend verification email")
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Mail className="w-8 h-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Check Your Email</CardTitle>
          <CardDescription>We've sent a verification link to your email address</CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {email && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Verification email sent to:</p>
              <p className="font-medium text-gray-900">{email}</p>
            </div>
          )}

          <div className="space-y-3 text-sm text-gray-600">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
              <p>Click the verification link in your email</p>
            </div>
            {isManual ? (
              <>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>Your organization will be created automatically after verification</p>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>You'll be redirected to your dashboard to start your free trial</p>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                <p>You'll be redirected to complete your setup</p>
              </div>
            )}
          </div>

          {/* Success/Error Messages */}
          {message && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-green-600 text-sm">{message}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500 mb-3">Didn't receive the email? Check your spam folder or</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResendEmail}
              disabled={isResending || !email}
            >
              {isResending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Resend Verification Email"
              )}
            </Button>
          </div>

          <div className="pt-4">
            <Link href="/" className="text-sm text-blue-600 hover:underline">
              ← Back to homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
