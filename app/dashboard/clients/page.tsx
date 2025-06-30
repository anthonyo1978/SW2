"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import {
  Users,
  Plus,
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Phone,
  MapPin,
  Calendar,
  Loader2,
  ChevronRight,
  Home,
  Sparkles,
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
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [converting, setConverting] = useState<string | null>(null)

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

  const handleConvertToActive = async (clientId: string, clientName: string) => {
    setConverting(clientId)
    try {
      const { error } = await supabase.from("clients").update({ status: "active" }).eq("id", clientId)

      if (error) {
        console.error("Error converting client:", error)
        alert("Failed to convert client. Please try again.")
        return
      }

      // Update local state
      setClients(clients.map((client) => (client.id === clientId ? { ...client, status: "active" as const } : client)))

      alert(`🎉 ${clientName} is now an active client!\n\nFunding buckets have been automatically created.`)
    } catch (error) {
      console.error("Error converting client:", error)
      alert("Failed to convert client. Please try again.")
    } finally {
      setConverting(null)
    }
  }

  const filteredClients = clients.filter(
    (client) =>
      `${client.first_name} ${client.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.address?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const getStatusBadge = (status: string) => {
    const variants = {
      prospect: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      deactivated: "bg-gray-100 text-gray-800",
    }
    return (
      <Badge className={`${variants[status as keyof typeof variants]} text-sm`}>
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
    return <Badge className={`${colors[level as keyof typeof colors]} text-xs`}>L{level}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading clients...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="flex items-center hover:text-gray-700 transition-colors">
            <Home className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Clients</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <div className="text-gray-600 mt-1">Manage your client relationships and service delivery</div>
          </div>
          <Button asChild>
            <Link href="/dashboard/clients/new">
              <Plus className="w-4 h-4 mr-2" />
              Add Client
            </Link>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">{clients.length}</div>
                  <div className="text-gray-600 text-sm">Total Clients</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Users className="w-6 h-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {clients.filter((c) => c.status === "active").length}
                  </div>
                  <div className="text-gray-600 text-sm">Active Clients</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Users className="w-6 h-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {clients.filter((c) => c.status === "prospect").length}
                  </div>
                  <div className="text-gray-600 text-sm">Prospects</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Calendar className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <div className="text-2xl font-bold text-gray-900">
                    {
                      clients.filter((c) => {
                        const createdDate = new Date(c.created_at)
                        const thirtyDaysAgo = new Date()
                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
                        return createdDate >= thirtyDaysAgo
                      }).length
                    }
                  </div>
                  <div className="text-gray-600 text-sm">New This Month</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search clients by name, phone, or address..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Clients Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Client Directory
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredClients.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {searchTerm ? "No clients found" : "No clients yet"}
                </h3>
                <div className="text-gray-500 mb-4">
                  {searchTerm ? "Try adjusting your search terms" : "Get started by adding your first client"}
                </div>
                {!searchTerm && (
                  <Button asChild>
                    <Link href="/dashboard/clients/new">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Your First Client
                    </Link>
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Funding</TableHead>
                    <TableHead>S@H Level</TableHead>
                    <TableHead>Budget</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-gray-50">
                      <TableCell>
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="block hover:text-blue-600 transition-colors"
                        >
                          <div className="font-medium text-gray-900 hover:underline">
                            {client.first_name} {client.last_name}
                          </div>
                          {client.address && (
                            <div className="flex items-center text-sm text-gray-500 mt-1">
                              <MapPin className="w-3 h-3 mr-1" />
                              {client.address.length > 30 ? `${client.address.substring(0, 30)}...` : client.address}
                            </div>
                          )}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {client.phone && (
                          <div className="flex items-center text-sm text-gray-600">
                            <Phone className="w-3 h-3 mr-1" />
                            {client.phone}
                          </div>
                        )}
                        {client.date_of_birth && (
                          <div className="flex items-center text-sm text-gray-500 mt-1">
                            <Calendar className="w-3 h-3 mr-1" />
                            Age:{" "}
                            {Math.floor(
                              (Date.now() - new Date(client.date_of_birth).getTime()) / (365.25 * 24 * 60 * 60 * 1000),
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(client.status)}</TableCell>
                      <TableCell>
                        <div className="text-sm capitalize">
                          {client.funding_type?.replace("_", " ") || "Not specified"}
                        </div>
                      </TableCell>
                      <TableCell>{getSahLevelBadge(client.sah_classification_level)}</TableCell>
                      <TableCell>
                        {client.plan_budget ? (
                          <div className="font-medium text-green-600">${client.plan_budget.toLocaleString()}</div>
                        ) : (
                          <div className="text-gray-400 text-sm">Not set</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">{new Date(client.created_at).toLocaleDateString()}</div>
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
                            {client.status === "prospect" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    handleConvertToActive(client.id, `${client.first_name} ${client.last_name}`)
                                  }
                                  disabled={converting === client.id}
                                  className="text-green-600 focus:text-green-600"
                                >
                                  {converting === client.id ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                      Converting...
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles className="w-4 h-4 mr-2" />
                                      Convert to Active
                                    </>
                                  )}
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Client
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
