"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase"
import { DashboardHeader } from "@/components/dashboard/dashboard-header"
import { MetricsGrid } from "@/components/dashboard/metrics-grid"
import { QuickActionsGrid } from "@/components/dashboard/quick-actions-grid"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { Loader2 } from "lucide-react"

interface User {
  id: string
  email: string
  full_name: string
  organization_id: string
  role: string
  trial_ends_at: string
  subscription_status: string
}

interface Organization {
  id: string
  name: string
  abn: string
  phone: string
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()

      if (sessionError || !session) {
        router.push("/auth/signin")
        return
      }

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single()

      if (profileError || !profile) {
        console.error("Profile error:", profileError)
        router.push("/auth/signin")
        return
      }

      // Get organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single()

      if (orgError || !org) {
        console.error("Organization error:", orgError)
        router.push("/auth/signin")
        return
      }

      setUser(profile)
      setOrganization(org)
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/auth/signin")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !organization) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} organization={organization} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.full_name.split(" ")[0]}</h1>
            <p className="text-gray-600">Here's what's happening with {organization.name} today</p>
          </div>

          {/* Metrics Grid */}
          <MetricsGrid organizationId={organization.id} />

          {/* Quick Actions */}
          <QuickActionsGrid />

          {/* Recent Activity */}
          <RecentActivity organizationId={organization.id} />
        </div>
      </main>
    </div>
  )
}
