"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Plus,
  Wrench,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  Loader2,
  Home,
  Filter,
  DollarSign,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface Service {
  id: string
  name: string
  description?: string
  service_code?: string
  base_cost: number
  cost_currency: string
  unit: string
  category?: string
  subcategory?: string
  status: 'draft' | 'active' | 'inactive' | 'archived'
  is_active: boolean
  allow_discount: boolean
  can_be_cancelled: boolean
  requires_approval: boolean
  is_taxable: boolean
  tax_rate: number
  has_variable_pricing: boolean
  min_cost?: number
  max_cost?: number
  tags?: string[]
  created_at: string
  updated_at: string
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [activating, setActivating] = useState<string | null>(null)

  useEffect(() => {
    initializeAndFetchServices()
  }, [])

  const initializeAndFetchServices = async () => {
    try {
      // Get current user and their organization
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error("User not authenticated:", userError)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        console.error("Could not determine user organization:", profileError)
        return
      }

      setOrganizationId(profile.organization_id)
      await fetchServices(profile.organization_id)
    } catch (error) {
      console.error("Error initializing:", error)
    }
  }

  const fetchServices = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", orgId)
        .order("name")

      if (error) {
        console.error("Error fetching services:", error)
        
        // Check if it's a table not found error
        if (error.message?.includes('relation "services" does not exist')) {
          console.error("Services table does not exist. Please run the database migration scripts.")
        }
        
        return
      }

      setServices(data || [])
    } catch (error) {
      console.error("Error fetching services:", error)
    } finally {
      setLoading(false)
    }
  }

  const getServiceStatusBadge = (service: Service, isPrimary: boolean = false) => {
    if (isPrimary) {
      // Primary status badge
      const statusVariants = {
        draft: { class: "bg-gray-100 text-gray-800", label: "Draft" },
        active: { class: "bg-green-100 text-green-800", label: "Active" },
        inactive: { class: "bg-red-100 text-red-800", label: "Inactive" },
        archived: { class: "bg-gray-100 text-gray-600", label: "Archived" }
      }
      
      const variant = statusVariants[service.status] || statusVariants.draft
      return <Badge className={variant.class}>{variant.label}</Badge>
    }
    
    // Secondary badges for other attributes
    const badges = []
    
    if (service.has_variable_pricing) {
      badges.push(<Badge key="variable" variant="outline" className="bg-blue-50 text-blue-700">Variable Pricing</Badge>)
    }
    
    if (service.requires_approval) {
      badges.push(<Badge key="approval" variant="outline" className="bg-yellow-50 text-yellow-700">Requires Approval</Badge>)
    }
    
    if (!service.allow_discount) {
      badges.push(<Badge key="no-discount" variant="outline" className="bg-red-50 text-red-700">No Discount</Badge>)
    }

    return badges
  }

  const handleStatusTransition = async (serviceId: string, newStatus: string) => {
    setActivating(serviceId)
    try {
      const { data, error } = await supabase.rpc('transition_service_status', {
        service_id: serviceId,
        new_status: newStatus
      })

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Status transition failed')
      }

      // Update local state
      setServices(services.map(service => 
        service.id === serviceId 
          ? { ...service, status: newStatus as any, is_active: newStatus === 'active' }
          : service
      ))

      alert(`✅ Service status updated to ${newStatus}!`)
    } catch (error: any) {
      console.error('Error updating service status:', error)
      alert(`Failed to update status: ${error.message}`)
    } finally {
      setActivating(null)
    }
  }

  const getUnitDisplay = (unit: string) => {
    const unitMap = {
      each: "Each",
      minute: "per Minute", 
      hour: "per Hour",
      day: "per Day",
      week: "per Week", 
      month: "per Month",
      year: "per Year"
    }
    return unitMap[unit as keyof typeof unitMap] || unit
  }

  const formatCurrency = (amount: number, currency: string = "AUD") => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency,
    }).format(amount)
  }

  const getPriceDisplay = (service: Service) => {
    if (service.has_variable_pricing && service.min_cost && service.max_cost) {
      return `${formatCurrency(service.min_cost)} - ${formatCurrency(service.max_cost)}`
    }
    return formatCurrency(service.base_cost)
  }

  const filteredServices = services.filter((service) => {
    const matchesSearch = 
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.service_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.category?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesCategory = categoryFilter === "all" || service.category === categoryFilter
    const matchesStatus = statusFilter === "all" || service.status === statusFilter

    return matchesSearch && matchesCategory && matchesStatus
  })

  const uniqueCategories = Array.from(new Set(services.map(s => s.category).filter(Boolean)))
  const statusCounts = {
    all: services.length,
    draft: services.filter(s => s.status === 'draft').length,
    active: services.filter(s => s.status === 'active').length,
    inactive: services.filter(s => s.status === 'inactive').length,
    archived: services.filter(s => s.status === 'archived').length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading services...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Dashboard
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Services</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Services</h1>
              <p className="text-gray-600 mt-1">
                Manage your service catalog and pricing
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import Services
              </Button>
              <Button asChild>
                <Link href="/dashboard/services/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Services</CardTitle>
              <Wrench className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{services.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Services</CardTitle>
              <Wrench className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statusCounts.active}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {statusCounts.draft} in draft
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
              <Filter className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueCategories.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Avg. Price</CardTitle>
              <DollarSign className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  services.length > 0 
                    ? services.reduce((sum, s) => sum + s.base_cost, 0) / services.length 
                    : 0
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search services by name, description, code, or category..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Categories</option>
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status ({statusCounts.all})</option>
                <option value="draft">Draft ({statusCounts.draft})</option>
                <option value="active">Active ({statusCounts.active})</option>
                <option value="inactive">Inactive ({statusCounts.inactive})</option>
                <option value="archived">Archived ({statusCounts.archived})</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Services Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wrench className="w-5 h-5" />
              Services Catalog ({filteredServices.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredServices.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm || categoryFilter !== "all" ? "No services found" : "No services yet"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {searchTerm || categoryFilter !== "all" 
                    ? "Try adjusting your search terms or filters" 
                    : "Get started by adding your first service"}
                </p>
                {!searchTerm && categoryFilter === "all" && (
                  <Button asChild>
                    <Link href="/dashboard/services/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Service
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service) => (
                      <TableRow key={service.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <div className="font-medium text-gray-900">{service.name}</div>
                            {service.description && (
                              <div className="text-sm text-gray-500 mt-1 max-w-xs truncate">
                                {service.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        
                        <TableCell>
                          {service.category && (
                            <Badge variant="outline">{service.category}</Badge>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="font-medium">
                            {getPriceDisplay(service)}
                          </div>
                        </TableCell>

                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {getUnitDisplay(service.unit)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {getServiceStatusBadge(service, true)}
                            <div className="flex flex-wrap gap-1">
                              {getServiceStatusBadge(service, false)}
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          {service.service_code && (
                            <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                              {service.service_code}
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/services/${service.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/services/${service.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Service
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              
                              {/* Status Transitions */}
                              {service.status === 'draft' && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusTransition(service.id, 'active')}
                                  disabled={activating === service.id}
                                  className="text-green-600 focus:text-green-600"
                                >
                                  {activating === service.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Eye className="w-4 h-4 mr-2" />
                                  )}
                                  Activate Service
                                </DropdownMenuItem>
                              )}
                              
                              {service.status === 'active' && (
                                <DropdownMenuItem 
                                  onClick={() => handleStatusTransition(service.id, 'inactive')}
                                  disabled={activating === service.id}
                                  className="text-orange-600 focus:text-orange-600"
                                >
                                  {activating === service.id ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                  ) : (
                                    <Eye className="w-4 h-4 mr-2" />
                                  )}
                                  Deactivate Service
                                </DropdownMenuItem>
                              )}
                              
                              {service.status === 'inactive' && (
                                <>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusTransition(service.id, 'active')}
                                    disabled={activating === service.id}
                                    className="text-green-600 focus:text-green-600"
                                  >
                                    {activating === service.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Eye className="w-4 h-4 mr-2" />
                                    )}
                                    Reactivate Service
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleStatusTransition(service.id, 'archived')}
                                    disabled={activating === service.id}
                                    className="text-gray-600 focus:text-gray-600"
                                  >
                                    {activating === service.id ? (
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    ) : (
                                      <Eye className="w-4 h-4 mr-2" />
                                    )}
                                    Archive Service
                                  </DropdownMenuItem>
                                </>
                              )}
                              
                              {service.status !== 'archived' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete Service
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}