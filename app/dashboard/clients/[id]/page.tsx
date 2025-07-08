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
  DollarSign,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Receipt,
  Edit,
  Loader2,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

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
  created_at: string
  updated_at: string
}

interface ServiceAgreement {
  id: string
  agreement_number: string
  name: string
  status: string
  total_value: number
  remaining_balance: number
  start_date: string
  end_date?: string
  agreement_buckets: any[]
}

interface RecentTransaction {
  id: string
  transaction_number: string
  transaction_date: string
  description: string
  service_description?: string
  amount: number
  transaction_type: string
  status: string
  bucket_name?: string
}

// UUID validation function
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function ClientDetailPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [serviceAgreements, setServiceAgreements] = useState<ServiceAgreement[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

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

      // Fetch service agreements
      const { data: agreementsData, error: agreementsError } = await supabase
        .from("service_agreements")
        .select(`
          *,
          agreement_buckets (*)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

      if (agreementsError) {
        console.error("Error loading agreements:", agreementsError)
        setServiceAgreements([])
      } else {
        setServiceAgreements(agreementsData || [])
      }

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          *,
          agreement_buckets!inner(template_name)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })
        .limit(5)

      if (transactionsError) {
        console.error("Error loading transactions:", transactionsError)
        setRecentTransactions([])
      } else {
        const formattedTransactions =
          transactionsData?.map((t: any) => ({
            ...t,
            bucket_name: t.agreement_buckets?.template_name,
          })) || []
        setRecentTransactions(formattedTransactions)
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

  const getTotalAgreementValue = () => {
    return serviceAgreements.reduce((sum, agreement) => sum + agreement.total_value, 0)
  }

  const getTotalRemainingBalance = () => {
    return serviceAgreements.reduce((sum, agreement) => sum + (agreement.remaining_balance || 0), 0)
  }

  const getActiveAgreements = () => {
    return serviceAgreements.filter((agreement) => agreement.status === "current")
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
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-blue-600" />
            </div>
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
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clients/${client.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Client
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                <FileText className="w-4 h-4 mr-2" />
                Service Agreements
              </Link>
            </Button>
            <Button asChild>
              <Link href={`/dashboard/clients/${client.id}/transactions`}>
                <Receipt className="w-4 h-4 mr-2" />
                Create Transaction
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

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Agreement Value</span>
                  <span className="font-semibold">{formatCurrency(getTotalAgreementValue())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Remaining Balance</span>
                  <span className="font-semibold text-green-600">{formatCurrency(getTotalRemainingBalance())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Agreements</span>
                  <span className="font-semibold">{getActiveAgreements().length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recent Transactions</span>
                  <span className="font-semibold">{recentTransactions.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Service Agreements and Transactions */}
          <div className="lg:col-span-2 space-y-6">
            {/* Service Agreements */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Service Agreements
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                      <FileText className="w-4 h-4 mr-2" />
                      Manage
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {serviceAgreements.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Agreements</h3>
                    <p className="text-gray-500 mb-4">Create a service agreement to start managing funding.</p>
                    <Button asChild>
                      <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                        <FileText className="w-4 h-4 mr-2" />
                        Create Service Agreement
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceAgreements.map((agreement) => (
                      <div key={agreement.id} className="p-4 border rounded-lg bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-medium">{agreement.name}</h4>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                              <span className="font-mono">{agreement.agreement_number}</span>
                              <span>•</span>
                              <span>{new Date(agreement.start_date).toLocaleDateString()}</span>
                              {agreement.end_date && (
                                <>
                                  <span>to</span>
                                  <span>{new Date(agreement.end_date).toLocaleDateString()}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge className={getStatusColor(agreement.status)}>
                            {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Total Value</span>
                            <div className="font-medium">{formatCurrency(agreement.total_value)}</div>
                          </div>
                          <div>
                            <span className="text-gray-600">Remaining</span>
                            <div className="font-medium text-green-600">
                              {formatCurrency(agreement.remaining_balance || 0)}
                            </div>
                          </div>
                          <div>
                            <span className="text-gray-600">Buckets</span>
                            <div className="font-medium">{agreement.agreement_buckets?.length || 0}</div>
                          </div>
                        </div>

                        {agreement.status === "current" && (
                          <div className="mt-3 pt-3 border-t">
                            <Button size="sm" asChild>
                              <Link href={`/dashboard/clients/${client.id}/transactions`}>
                                <Receipt className="w-3 h-3 mr-1" />
                                Create Transaction
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Recent Transactions
                  </CardTitle>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/transactions">
                      <Receipt className="w-4 h-4 mr-2" />
                      View All
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
                    <p className="text-gray-500 mb-4">Create your first transaction to start tracking services.</p>
                    <Button asChild disabled={getActiveAgreements().length === 0}>
                      <Link href={`/dashboard/clients/${client.id}/transactions`}>
                        <Receipt className="w-4 h-4 mr-2" />
                        Create Transaction
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentTransactions.map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-full ${
                              transaction.transaction_type === "service_delivery"
                                ? "bg-red-100 text-red-600"
                                : "bg-green-100 text-green-600"
                            }`}
                          >
                            {transaction.transaction_type === "service_delivery" ? (
                              <TrendingDown className="w-4 h-4" />
                            ) : (
                              <TrendingUp className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">
                              {transaction.service_description || transaction.description}
                            </div>
                            <div className="text-sm text-gray-500">
                              {transaction.bucket_name} • {new Date(transaction.transaction_date).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`font-semibold ${
                              transaction.transaction_type === "service_delivery" ? "text-red-600" : "text-green-600"
                            }`}
                          >
                            {transaction.transaction_type === "service_delivery" ? "-" : "+"}
                            {formatCurrency(transaction.amount)}
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              transaction.status === "completed"
                                ? "bg-green-50 text-green-700"
                                : "bg-yellow-50 text-yellow-700"
                            }`}
                          >
                            {transaction.status}
                          </Badge>
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
