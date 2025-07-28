"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, ArrowLeft, Mail } from "lucide-react"

export default function AuthErrorPage() {
  const [errorDetails, setErrorDetails] = useState<{
    error?: string
    errorCode?: string
    errorDescription?: string
  }>({})

  useEffect(() => {
    // Parse URL fragment for error details
    if (typeof window !== 'undefined') {
      const fragment = window.location.hash.substring(1)
      const params = new URLSearchParams(fragment)
      
      setErrorDetails({
        error: params.get('error') || undefined,
        errorCode: params.get('error_code') || undefined,
        errorDescription: params.get('error_description') || undefined,
      })
    }
  }, [])
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl">Authentication Error</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {errorDetails.errorCode === 'otp_expired' ? (
            <>
              <p className="text-amber-600 font-medium">
                Your email verification link has expired.
              </p>
              <p className="text-gray-600 text-sm">
                Email verification links expire after 24 hours for security. Please request a new one.
              </p>
              
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/signin" className="flex items-center justify-center gap-2">
                    <Mail className="w-4 h-4" />
                    Resend Verification Email
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
              
              <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded">
                <p><strong>Steps:</strong></p>
                <p>1. Click "Resend Verification Email"</p>
                <p>2. Enter your email address</p>
                <p>3. Click the resend button</p>
                <p>4. Check your email for a fresh link</p>
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                There was an issue with your authentication. This could be due to an expired link or invalid token.
              </p>
              
              {errorDetails.errorDescription && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-red-700 text-sm">
                    {decodeURIComponent(errorDetails.errorDescription)}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <Button asChild className="w-full">
                  <Link href="/auth/signin">
                    Try Signing In Again
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link href="/" className="flex items-center justify-center gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Back to Home
                  </Link>
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 mt-4">
                If you continue to have issues, please contact support.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}