"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, ArrowLeft } from "lucide-react"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPlan = searchParams.get("plan")
  const [selectedPlan, setSelectedPlan] = useState(preselectedPlan || "starter")

  const handleContinue = () => {
    router.push(`/auth/signup/organization?plan=${selectedPlan}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2 text-gray-600 hover:text-gray-900">
            <ArrowLeft className="w-4 h-4" />
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-gray-900">Swivel CRM</span>
            </div>
          </Link>
          <div className="text-sm text-gray-500">Step 1 of 3: Choose Your Plan</div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-xl text-gray-600">Start with a 14-day free trial. No credit card required.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Starter Plan */}
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-lg ${
              selectedPlan === "starter"
                ? "border-blue-500 ring-2 ring-blue-200 shadow-lg"
                : "border-gray-200 hover:border-blue-200"
            }`}
            onClick={() => setSelectedPlan("starter")}
          >
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-900">Starter</CardTitle>
              <CardDescription className="text-gray-600">Perfect for small providers</CardDescription>
              <div className="text-3xl font-bold text-blue-600 mt-4">
                $99<span className="text-lg text-gray-500 font-normal">/month</span>
              </div>
              <div className="text-sm text-gray-500">After 14-day free trial</div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Up to 50 clients</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">5 staff members</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Two-bucket financial system</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Basic compliance reporting</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Email support</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Pro Plan */}
          <Card
            className={`border-2 cursor-pointer transition-all hover:shadow-lg relative ${
              selectedPlan === "pro"
                ? "border-blue-500 ring-2 ring-blue-200 shadow-lg"
                : "border-gray-200 hover:border-blue-200"
            }`}
            onClick={() => setSelectedPlan("pro")}
          >
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
              <Badge className="bg-blue-500 text-white border-0">Most Popular</Badge>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl text-gray-900">Pro</CardTitle>
              <CardDescription className="text-gray-600">For growing organizations</CardDescription>
              <div className="text-3xl font-bold text-blue-600 mt-4">
                $199<span className="text-lg text-gray-500 font-normal">/month</span>
              </div>
              <div className="text-sm text-gray-500">After 14-day free trial</div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited clients</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Unlimited staff</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Advanced bucket management</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Advanced reporting & analytics</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-gray-700">API access</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Button
            size="lg"
            onClick={handleContinue}
            className="px-12 py-3 text-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            Continue with {selectedPlan === "starter" ? "Starter" : "Pro"} Plan
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            You can change or cancel your plan anytime during the trial period
          </p>
        </div>

        {/* Additional Info */}
        <div className="mt-16 text-center">
          <div className="bg-white rounded-lg border border-gray-200 p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Why Choose Swivel CRM?</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <p className="font-medium text-gray-900">Australian Compliance</p>
                <p className="text-gray-600">Built for S@H regulations</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <p className="font-medium text-gray-900">Two-Bucket System</p>
                <p className="text-gray-600">Never exceed budgets</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <p className="font-medium text-gray-900">Audit Ready</p>
                <p className="text-gray-600">Complete documentation</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
