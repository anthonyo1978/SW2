"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Users,
  UserPlus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Calendar,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Client {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  phone: string
  address: string
  status: "prospect" | "active" | "deactivated"
  funding_type: string
  sah_classification_level: number
  plan_budget: number
  created_at: string
}

export default function ClientsPage() {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase.from("clients").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching clients:", error)
        return
      }

      setClients(data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      prospect: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      deactivated: "bg-gray-100 text-gray-800",
    }
    return (
      <Badge className={`${variants[status as keyof typeof variants]} text-xs`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getSahLevelBadge = (level: number) => {
    if (!level) return null
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-green-100 text-green-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-yellow-100 text-yellow-800",
      5: "bg-orange-100 text-orange-800",
      6: "bg-orange-100 text-orange-800",
      7: "bg-red-100 text-red-800",
      8: "bg-red-100 text-red-800",
    }
    return <Badge className={`${colors[level as keyof typeof colors]} text-xs`}>Level {level}</Badge>
  }

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.includes(searchTerm) ||
      client.address?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === "all" || client.status === statusFilter

    return matchesSearch && matchesStatus
  })

  const stats = {
    total: clients.length,
    active: clients.filter((c) => c.status === "active").length,
    prospects: clients.filter((c) => c.status === "prospect").length,
    deactivated: clients.filter((c) => c.status === "deactivated").length,
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="h-96 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
            <p className="text-gray-600 mt-1">Manage your participants and their support plans</p>
          </div>
          <Button asChild>
            <Link href="/dashboard/clients/new">
              <UserPlus className="w-4 h-4 mr-2" />
              Add New Client
            </Link>
          </Button>
        </div>

        {/* Breadcrumb Navigation */}
        <div className="mb-6">
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              <li>
                <Link href="/dashboard" className="text-gray-500 hover:text-gray-700">
                  Dashboard
                </Link>
              </li>
              <li>
                <span className="text-gray-400">/</span>
              </li>
              <li>
                <span className="text-gray-900 font-medium">Clients</span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Active Clients</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-gray-500">Revenue generating</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Prospects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.prospects}</div>
              <p className="text-xs text-gray-500">In pipeline</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Deactivated</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.deactivated}</div>
              <p className="text-xs text-gray-500">No longer active</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-2" />
                      Status: {statusFilter === "all" ? "All" : statusFilter}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => setStatusFilter("all")}>All Statuses</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("active")}>Active Only</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("prospect")}>Prospects Only</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setStatusFilter("deactivated")}>Deactivated Only</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Clients ({filteredClients.length})
            </CardTitle>
            <CardDescription>Manage your client base and their support arrangements</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {clients.length === 0 ? "No clients yet" : "No clients match your search"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {clients.length === 0
                    ? "Get started by adding your first client to the system"
                    : "Try adjusting your search terms or filters"}
                </p>
                {clients.length === 0 && (
                  <Button asChild>
                    <Link href="/dashboard/clients/new">
                      <UserPlus className="w-4 h-4 mr-2" />
                      Add Your First Client
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>S@H Level</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead>Added</TableHead>
                      <TableHead className="w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client) => (
                      <TableRow key={client.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div>
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className="font-medium text-gray-900 hover:text-blue-600 hover:underline cursor-pointer"
                            >
                              {client.first_name} {client.last_name}
                            </Link>
                            {client.date_of_birth && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Born {new Date(client.date_of_birth).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="space-y-1">
                            {client.phone && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {client.phone}
                              </div>
                            )}
                            {client.address && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {client.address.length > 30 ? `${client.address.substring(0, 30)}...` : client.address}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(client.status)}</TableCell>

                        <TableCell>{getSahLevelBadge(client.sah_classification_level)}</TableCell>

                        <TableCell>
                          {client.plan_budget ? (
                            <div className="text-sm">
                              <div className="font-medium">${client.plan_budget.toLocaleString()}</div>
                              <div className="text-gray-500">Annual</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {new Date(client.created_at).toLocaleDateString()}
                          </div>
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
                                <Link href={`/dashboard/clients/${client.id}`}>
                                  <Eye className="w-4 h-4 mr-2" />
                                  View Details
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/dashboard/clients/${client.id}/edit`}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Edit Client
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="w-4 h-4 mr-2" />
                                Deactivate
                              </DropdownMenuItem>
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
