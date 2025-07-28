"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Briefcase, Calendar, DollarSign, User, Loader2, Home, ToggleLeft, ToggleRight } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface Contract {
  id: string
  name: string
  contract_number?: string
  status: string
  start_date?: string
  end_date?: string
  total_value: number
  remaining_balance: number
  client_id: string
  clients: {
    first_name: string
    last_name: string
  }
  contract_boxes: { id: string }[]
  created_at: string
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [showAllContracts, setShowAllContracts] = useState(false) // false = Active only, true = All (Active + Draft)

  useEffect(() => {
    initializeAndFetchContracts()
  }, [])

  const initializeAndFetchContracts = async () => {
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
      await fetchContracts(profile.organization_id)
    } catch (error) {
      console.error("Error initializing:", error)
    }
  }

  const fetchContracts = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          clients (first_name, last_name),
          contract_boxes (id)
        `)
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Error fetching contracts:", error)
        return
      }

      setContracts(data || [])
    } catch (error) {
      console.error("Error fetching contracts:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "bg-gray-100 text-gray-800",
      active: "bg-green-100 text-green-800",
      completed: "bg-blue-100 text-blue-800",
      cancelled: "bg-red-100 text-red-800",
    }

    return (
      <Badge className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  // Filter contracts based on toggle state
  const getFilteredContracts = () => {
    if (showAllContracts) {
      // Show Active + Draft contracts
      return contracts.filter(c => c.status === 'active' || c.status === 'draft')
    } else {
      // Show only Active contracts (default)
      return contracts.filter(c => c.status === 'active')
    }
  }

  const filteredContracts = getFilteredContracts()

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading contracts...</p>
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
              <BreadcrumbPage>Contracts</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Contracts</h1>
              <p className="text-gray-600 mt-1">
                Manage client agreements and funding arrangements
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Toggle for Active vs All contracts */}
              <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-gray-200">
                <Label htmlFor="contract-filter" className="text-sm font-medium text-gray-700">
                  {showAllContracts ? 'All Contracts' : 'Active Only'}
                </Label>
                <Switch
                  id="contract-filter"
                  checked={showAllContracts}
                  onCheckedChange={setShowAllContracts}
                />
                <span className="text-xs text-gray-500">
                  {showAllContracts ? 'Active + Draft' : 'Operating Money'}
                </span>
              </div>
              <Button asChild>
                <Link href="/dashboard/contracts/new">
                  <Plus className="w-4 h-4 mr-2" />
                  New Contract
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {showAllContracts ? 'Filtered Contracts' : 'Active Contracts'}
              </CardTitle>
              <Briefcase className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredContracts.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                {showAllContracts ? 'Active + Draft' : 'Operating contracts'}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">All Contracts</CardTitle>
              <Briefcase className="w-4 h-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{contracts.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                Total in system
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {showAllContracts ? 'Combined Value' : 'Operating Value'}
              </CardTitle>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(filteredContracts.reduce((sum, c) => sum + c.total_value, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {showAllContracts ? 'Active + Draft total' : 'Active contracts only'}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {showAllContracts ? 'Combined Balance' : 'Operating Balance'}
              </CardTitle>
              <DollarSign className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(filteredContracts.reduce((sum, c) => sum + c.remaining_balance, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {showAllContracts ? 'Available funds total' : 'Operating funds only'}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contracts Table */}
        <Card>
          <CardHeader>
            <CardTitle>
              {showAllContracts ? 'All Contracts (Active + Draft)' : 'Active Contracts'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredContracts.length === 0 ? (
              <div className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {showAllContracts ? 'No active or draft contracts' : 'No active contracts'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {showAllContracts 
                    ? 'No contracts found matching the current filter.'
                    : 'No active contracts found. Create a contract and set it to active.'
                  }
                </p>
                <Button asChild>
                  <Link href="/dashboard/contracts/new">
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Contract
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Boxes</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => (
                      <TableRow key={contract.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Link
                            href={`/dashboard/contracts/${contract.id}`}
                            className="block hover:text-blue-600 transition-colors"
                          >
                            <div className="font-medium text-gray-900 hover:underline">
                              {contract.name}
                            </div>
                            {contract.contract_number && (
                              <div className="text-sm text-gray-500 mt-1">
                                #{contract.contract_number}
                              </div>
                            )}
                          </Link>
                        </TableCell>
                        
                        <TableCell>
                          <div className="flex items-center">
                            <User className="w-4 h-4 text-gray-400 mr-2" />
                            <span className="font-medium">
                              {contract.clients.first_name} {contract.clients.last_name}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell>{getStatusBadge(contract.status)}</TableCell>

                        <TableCell>
                          {contract.start_date && contract.end_date ? (
                            <div className="text-sm">
                              <div>{new Date(contract.start_date).toLocaleDateString()}</div>
                              <div className="text-gray-500">to {new Date(contract.end_date).toLocaleDateString()}</div>
                            </div>
                          ) : (
                            <span className="text-gray-400">Not set</span>
                          )}
                        </TableCell>

                        <TableCell>
                          <Badge variant="outline">
                            {contract.contract_boxes.length} boxes
                          </Badge>
                        </TableCell>

                        <TableCell>
                          <span className="font-medium">
                            {formatCurrency(contract.total_value)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="font-medium text-green-600">
                            {formatCurrency(contract.remaining_balance)}
                          </span>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {new Date(contract.created_at).toLocaleDateString()}
                          </div>
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