"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Home,
  Users,
  CreditCard,
  Briefcase,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronDown,
  Wrench,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Profile {
  id: string
  full_name?: string
  email?: string
  organization_id: string
  organizations?: {
    name: string
  }
}

export function DashboardHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notifications, setNotifications] = useState(3)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) {
        console.log("No authenticated user found")
        return
      }

      console.log("Fetching profile for user:", userData.user.id)

      const { data: profileData, error } = await supabase
        .from("profiles")
        .select(`
          id,
          full_name,
          organization_id,
          organizations (
            name
          )
        `)
        .eq("id", userData.user.id)
        .single()

      if (error) {
        console.error("Error fetching profile:", error)
        // Fallback to user email if profile fetch fails
        setProfile({
          id: userData.user.id,
          email: userData.user.email,
          full_name: userData.user.email?.split("@")[0] || "User",
          organization_id: "",
        })
        return
      }

      console.log("Profile data:", profileData)

      // Add email from auth user if not in profile
      const enrichedProfile = {
        ...profileData,
        email: userData.user.email,
      }

      setProfile(enrichedProfile)
    } catch (error: any) {
      console.error("Error fetching profile:", error)
      // Fallback profile
      const { data: userData } = await supabase.auth.getUser()
      if (userData.user) {
        setProfile({
          id: userData.user.id,
          email: userData.user.email,
          full_name: userData.user.email?.split("@")[0] || "User",
          organization_id: "",
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push("/auth/signin")
    } catch (error: any) {
      console.error("Error signing out:", error)
    }
  }

  const getDisplayName = () => {
    if (profile?.full_name) {
      return profile.full_name
    }
    if (profile?.email) {
      return profile.email.split("@")[0]
    }
    return "User"
  }

  const getInitials = () => {
    const name = getDisplayName()
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const navigationItems = [
    {
      name: "Dashboard",
      href: "/dashboard",
      icon: Home,
      current: pathname === "/dashboard",
    },
    {
      name: "Clients",
      href: "/dashboard/clients",
      icon: Users,
      current: pathname.startsWith("/dashboard/clients"),
    },
    {
      name: "Contracts",
      href: "/dashboard/contracts",
      icon: Briefcase,
      current: pathname.startsWith("/dashboard/contracts"),
    },
    {
      name: "Services",
      href: "/dashboard/services",
      icon: Wrench,
      current: pathname.startsWith("/dashboard/services"),
    },
    {
      name: "Transactions",
      href: "/dashboard/transactions",
      icon: CreditCard,
      current: pathname.startsWith("/dashboard/transactions"),
    },
    {
      name: "Analytics",
      href: "/dashboard/bucket-analytics",
      icon: BarChart3,
      current: pathname.startsWith("/dashboard/bucket-analytics"),
    },
    // Add Config navigation item
    {
      name: "Config",
      href: "/dashboard/config",
      icon: Settings,
      current: pathname.startsWith("/dashboard/config"),
    },
  ]

  if (loading) {
    return (
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="hidden md:flex space-x-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-8 w-20 bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
              <div className="h-8 w-24 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </header>
    )
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Swivel CRM</span>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-1">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link key={item.name} href={item.href}>
                    <Button
                      variant={item.current ? "default" : "ghost"}
                      size="sm"
                      className={`flex items-center gap-2 ${
                        item.current
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Button>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Button variant="ghost" size="sm" className="relative">
              <Bell className="w-5 h-5" />
              {notifications > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs bg-red-500">
                  {notifications}
                </Badge>
              )}
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white text-sm">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium text-gray-900">{getDisplayName()}</div>
                    <div className="text-xs text-gray-500">{profile?.organizations?.name || "Loading..."}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div className="font-medium">{getDisplayName()}</div>
                    <div className="text-xs text-gray-500 font-normal">{profile?.email || "Loading..."}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t">
              {navigationItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center px-3 py-2 rounded-md text-base font-medium ${
                      item.current ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5 mr-3" />
                    {item.name}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
