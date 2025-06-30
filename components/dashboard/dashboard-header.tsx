"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Bell, Settings, LogOut, Menu } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Organization {
  id: string
  name: string
  abn: string
  phone: string
}

interface DashboardHeaderProps {
  user: any
  organization: Organization
}

export function DashboardHeader({ user, organization }: DashboardHeaderProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    await supabase.auth.signOut()
    router.push("/")
  }

  const isTrialActive = user.subscription_status === "trial"
  const trialEndsAt = new Date(user.trial_ends_at)
  const daysLeft = Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Organization */}
          <div className="flex items-center space-x-4">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <div>
                <span className="text-xl font-bold text-gray-900">Swivel CRM</span>
                <p className="text-sm text-gray-500 hidden sm:block">{organization.name}</p>
              </div>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-6">
            <Link href="/dashboard" className="text-gray-900 hover:text-blue-600 font-medium">
              Dashboard
            </Link>
            <Link href="/dashboard/clients" className="text-gray-600 hover:text-blue-600">
              Clients
            </Link>
            <Link href="/dashboard/staff" className="text-gray-600 hover:text-blue-600">
              Staff
            </Link>
            <Link href="/dashboard/scheduling" className="text-gray-600 hover:text-blue-600">
              Scheduling
            </Link>
            <Link href="/dashboard/buckets" className="text-gray-600 hover:text-blue-600">
              Buckets
            </Link>
            <Link href="/dashboard/reports" className="text-gray-600 hover:text-blue-600">
              Reports
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Trial Status */}
            {isTrialActive && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-200">
                Trial: {daysLeft} days left
              </Badge>
            )}

            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <span className="hidden sm:block">{user.full_name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user.full_name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                    <Badge variant="secondary" className="mt-1 text-xs">
                      {user.role}
                    </Badge>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/dashboard/organization">
                    <Settings className="w-4 h-4 mr-2" />
                    Organization
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} disabled={isLoading}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <Button variant="ghost" size="sm" className="md:hidden">
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
