"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserPlus, Calendar, Clock, DollarSign, FileText, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface DashboardStats {
  totalClients: number
  activeClients: number
  prospectClients: number
  activeShifts: number
  todayShifts: number
  monthlyRevenue: number
  pendingInvoices: number
  completedVisits: number
}

interface MetricsGridProps {
  organizationId: string
}

export function MetricsGrid({ organizationId }: MetricsGridProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    activeClients: 0,
    prospectClients: 0,
    activeShifts: 0,
    todayShifts: 0,
    monthlyRevenue: 0,
    pendingInvoices: 0,
    completedVisits: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardStats()
  }, [organizationId])

  const fetchDashboardStats = async () => {
    try {
      // Get client stats
      const { data: clients } = await supabase.from("clients").select("status").eq("organization_id", organizationId)

      const totalClients = clients?.length || 0
      const activeClients = clients?.filter((c) => c.status === "active").length || 0
      const prospectClients = clients?.filter((c) => c.status === "prospect").length || 0

      // Get shift stats
      const today = new Date().toISOString().split("T")[0]
      const { data: shifts } = await supabase
        .from("shifts")
        .select("status, scheduled_start")
        .eq("organization_id", organizationId)

      const activeShifts = shifts?.filter((s) => s.status === "in_progress").length || 0
      const todayShifts = shifts?.filter((s) => s.scheduled_start.startsWith(today)).length || 0
      const completedVisits = shifts?.filter((s) => s.status === "completed").length || 0

      // Get financial stats (mock data for now)
      const monthlyRevenue = 45250.0
      const pendingInvoices = 8

      setStats({
        totalClients,
        activeClients,
        prospectClients,
        activeShifts,
        todayShifts,
        monthlyRevenue,
        pendingInvoices,
        completedVisits,
      })
    } catch (error) {
      console.error("Error fetching dashboard stats:", error)
    } finally {
      setLoading(false)
    }
  }

  const metrics = [
    {
      title: "Total Clients",
      value: stats.totalClients,
      description: "All participants in system",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Clients",
      value: stats.activeClients,
      description: `Billing: ${stats.activeClients} participants`,
      icon: UserCheck,
      color: "text-green-600",
      bgColor: "bg-green-50",
      badge: "Revenue Generating",
      badgeColor: "bg-green-100 text-green-800",
    },
    {
      title: "Prospects",
      value: stats.prospectClients,
      description: "Potential new clients",
      icon: UserPlus,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      badge: "Pipeline",
      badgeColor: "bg-blue-100 text-blue-800",
    },
  ]

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{metric.title}</CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <Icon className={`w-4 h-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">{metric.value}</div>
              <CardDescription className="text-sm">{metric.description}</CardDescription>
              {metric.badge && <Badge className={`mt-2 text-xs ${metric.badgeColor}`}>{metric.badge}</Badge>}
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
