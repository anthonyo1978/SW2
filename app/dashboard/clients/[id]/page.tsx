"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Home,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Edit,
  Loader2,
  AlertTriangle,
  Briefcase,
  Plus,
  UserCheck,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface Client {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address: string
  date_of_birth: string
  status: string
  sah_classification_level: number
  avatar_url?: string
  created_at: string
  updated_at: string
}

interface Contract {
  id: string
  name: string
  contract_number?: string
  status: string
  start_date?: string
  end_date?: string
  total_value: number
  remaining_balance: number
  outstanding_invoice_amount?: number
  contract_boxes: { id: string }[]
  created_at: string
}

// UUID validation function
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function ClientDetailPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [converting, setConverting] = useState(false)

  useEffect(() => {
    const clientId = params.id as string

    // Skip processing if this is the "new" route - this page shouldn't handle it
    if (clientId === "new") {
      return
    }

    // Validate UUID format
    if (!isValidUUID(clientId)) {
      setError("Invalid client ID format")
      setLoading(false)
      return
    }

    fetchClientData(clientId)
  }, [params.id])

  const fetchClientData = async (clientId: string) => {
    try {
      setLoading(true)

      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch contracts for this client
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select(`
          *,
          contract_boxes (id)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

      if (contractsError) {
        console.error("Error loading contracts:", contractsError)
        setContracts([])
      } else {
        // For now, set outstanding invoice amount to 0 for all contracts
        // TODO: Implement proper outstanding invoice calculation once transaction data is available
        const contractsWithInvoiceAmounts = (contractsData || []).map(contract => ({
          ...contract,
          outstanding_invoice_amount: 0
        }))
        setContracts(contractsWithInvoiceAmounts)
      }
    } catch (err: any) {
      console.error("Error fetching client data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "current":
        return "bg-green-100 text-green-800"
      case "prospect":
        return "bg-blue-100 text-blue-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "expired":
        return "bg-red-100 text-red-800"
      case "inactive":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getContractStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getTotalContractValue = () => {
    return contracts.reduce((sum, contract) => sum + (contract.total_value || 0), 0)
  }

  const getTotalRemainingBalance = () => {
    return contracts.reduce((sum, contract) => sum + (contract.remaining_balance || 0), 0)
  }

  const getTotalOutstandingInvoiceAmount = () => {
    return contracts.reduce((sum, contract) => sum + (contract.outstanding_invoice_amount || 0), 0)
  }

  const getActiveContracts = () => {
    return contracts.filter((contract) => contract.status === "active")
  }

  const handleMoveToCurrent = async () => {
    if (!client || client.status !== 'prospect') return
    
    setConverting(true)
    try {
      const { error } = await supabase
        .from("clients")
        .update({ 
          status: "active",
          updated_at: new Date().toISOString()
        })
        .eq("id", client.id)

      if (error) throw error

      // Update local state
      setClient(prev => prev ? { ...prev, status: "active" } : null)
      
      alert(`🎉 ${client.first_name} ${client.last_name} is now an active client!`)
    } catch (err: any) {
      console.error("Error converting client to active:", err)
      alert(`Failed to move client to current: ${err.message}`)
    } finally {
      setConverting(false)
    }
  }

  // Don't render anything for the "new" route
  if (params.id === "new") {
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading client information...</div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Client</h3>
              <div className="text-gray-500 mb-4">{error || "Client not found"}</div>
              <Button asChild>
                <Link href="/dashboard/clients">Back to Clients</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
              <BreadcrumbLink asChild>
                <Link href="/dashboard/clients">Clients</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {client.first_name} {client.last_name}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={client.avatar_url || undefined} />
              <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                {client.first_name.charAt(0)}{client.last_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge className={getStatusColor(client.status)}>
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </Badge>
                {client.sah_classification_level && (
                  <span className="text-gray-500">SAH Level {client.sah_classification_level}</span>
                )}
                <span className="text-gray-500">Client since {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            {client.status === 'prospect' && (
              <Button 
                onClick={handleMoveToCurrent}
                disabled={converting}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {converting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Moving...
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Move to Current
                  </>
                )}
              </Button>
            )}
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clients/${client.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Client
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/contracts/new?client_id=${client.id}`}>
                <Plus className="w-4 h-4 mr-2" />
                Create Contract
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Client Information */}
          <div className="space-y-6">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium">{client.email || "Not provided"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{client.phone || "Not provided"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="font-medium">{client.address || "Not provided"}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <div className="text-sm text-gray-500">Date of Birth</div>
                    <div className="font-medium">
                      {client.date_of_birth ? new Date(client.date_of_birth).toLocaleDateString() : "Not provided"}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contract Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Contract Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Contracts</span>
                  <span className="font-semibold">{contracts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Contracts</span>
                  <span className="font-semibold">{getActiveContracts().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Allocated Value</span>
                  <span className="font-semibold">{formatCurrency(getTotalContractValue())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining Balance</span>
                  <span className="font-semibold text-green-600">{formatCurrency(getTotalRemainingBalance())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Invoice Amount</span>
                  <span className="font-semibold text-amber-600">{formatCurrency(getTotalOutstandingInvoiceAmount())}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Contracts */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Briefcase className="w-5 h-5" />
                    Contracts
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/contracts">
                      <Briefcase className="w-4 h-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {contracts.length === 0 ? (
                  <div className="text-center py-8">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Contracts</h3>
                    <p className="text-gray-500 mb-4">Create a contract to start managing client agreements.</p>
                    <Button asChild>
                      <Link href="/dashboard/contracts/new">
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Contract
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{contract.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              {contract.contract_number && (
                                <>
                                  <span className="font-mono">{contract.contract_number}</span>
                                  <span>•</span>
                                </>
                              )}
                              <span>{new Date(contract.created_at).toLocaleDateString()}</span>
                              {contract.start_date && contract.end_date && (
                                <>
                                  <span>•</span>
                                  <span>{new Date(contract.start_date).toLocaleDateString()}</span>
                                  <span>to</span>
                                  <span>{new Date(contract.end_date).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={getContractStatusColor(contract.status)}>
                            {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-6 text-sm">
                          <div>
                            <span className="text-gray-600">Total Allocated Value</span>
                            <div className="font-medium text-lg">{formatCurrency(contract.total_value)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Total Remaining Allocated Value</span>
                            <div className="font-medium text-lg text-green-600">
                              {formatCurrency(contract.remaining_balance || 0)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Outstanding Invoice Amount</span>
                            <div className="font-medium text-lg text-amber-600">
                              {formatCurrency(contract.outstanding_invoice_amount || 0)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t">
                          <Button size="sm" asChild>
                            <Link href={`/dashboard/contracts/${contract.id}`}>
                              <Briefcase className="w-3 h-3 mr-1" />
                              View Contract
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
