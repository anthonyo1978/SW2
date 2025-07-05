"use client"

import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, UserPlus, Calendar, FileText, BarChart3, Shield, DollarSign, Settings } from "lucide-react"

export function QuickActionsGrid() {
  const actions = [
    {
      title: "Manage Clients",
      description: "Add, edit, and manage participant information",
      icon: Users,
      href: "/dashboard/clients",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      primary: true,
    },
    {
      title: "Staff Management",
      description: "Invite team members and manage roles",
      icon: UserPlus,
      href: "/dashboard/staff",
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Scheduling",
      description: "Plan and manage service delivery",
      icon: Calendar,
      href: "/dashboard/scheduling",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Manage Buckets",
      description: "Configure funding buckets and characteristics",
      icon: DollarSign,
      href: "/dashboard/buckets",
      color: "text-green-600",
      bgColor: "bg-green-50",
      primary: true,
    },
    {
      title: "Invoicing",
      description: "Generate and manage client invoices",
      icon: FileText,
      href: "/dashboard/invoicing",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
    },
    {
      title: "Reports",
      description: "Analytics and compliance reporting",
      icon: BarChart3,
      href: "/dashboard/reports",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Compliance",
      description: "Audit preparation and documentation",
      icon: Shield,
      href: "/dashboard/compliance",
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      title: "Settings",
      description: "Organization and system settings",
      icon: Settings,
      href: "/dashboard/settings",
      color: "text-gray-600",
      bgColor: "bg-gray-50",
    },
  ]

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Quick Actions</h2>
        <p className="text-gray-600">Common tasks and management functions</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {actions.map((action, index) => {
          const Icon = action.icon
          return (
            <Card
              key={index}
              className={`hover:shadow-md transition-all cursor-pointer group ${
                action.primary ? "ring-2 ring-blue-100" : ""
              }`}
            >
              <Link href={action.href}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className={`p-2 rounded-lg ${action.bgColor} group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-5 h-5 ${action.color}`} />
                    </div>
                    {action.primary && <div className="w-2 h-2 bg-blue-500 rounded-full"></div>}
                  </div>
                  <CardTitle className="text-base font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {action.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-sm">{action.description}</CardDescription>
                </CardContent>
              </Link>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
