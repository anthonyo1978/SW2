"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  FileText,
  Heart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Plus,
  DollarSign,
  Activity,
  Users,
  Target,
  Loader2,
  ExternalLink,
  TrendingDown,
  TrendingUp,
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
  status: "lead" | "prospect" | "active" | "inactive"
  emergency_contact_name?: string
  emergency_contact_phone?: string
  medical_conditions?: string
  medications?: string
  allergies?: string
  mobility_notes?: string
  care_preferences?: string
  created_at: string
  updated_at: string
}

interface ServiceAgreement {
  id: string
  agreement_number: string
  name: string
  description: string
  status: "draft" | "current" | "expired"
  start_date: string
  end_date?: string
  total_value: number
  buckets: ServiceAgreementBucket[]
  has_been_current: boolean
  created_at: string
  updated_at: string
  allocated_amount?: number
  spent_amount?: number
  remaining_balance?: number
}

interface ServiceAgreementBucket {
  id: string
  template_name: string
  template_category: "draw_down" | "fill_up"
  template_funding_source: string
  custom_amount?: number
  custom_name?: string
  notes?: string
}

// UUID validation function
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [serviceAgreements, setServiceAgreements] = useState<ServiceAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Client>>({})

  useEffect(() => {
    const clientId = params.id as string

    // Check if the ID is "new" and redirect to the new client page
    if (clientId === "new") {
      router.replace("/dashboard/clients/new")
      return
    }

    // Validate UUID format
    if (!isValidUUID(clientId)) {
      setError("Invalid client ID format")
      setLoading(false)
      return
    }

    fetchClientData(clientId)
  }, [params.id, router])

  const fetchClientData = async (clientId: string) => {
    try {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)
      setEditForm(clientData)

      // Fetch service agreements with buckets
      const { data: agreementsData, error: agreementsError } = await supabase
        .from("service_agreements")
        .select(`
          *,
          agreement_buckets (*)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

      if (agreementsError) {
        console.error("Error fetching agreements:", agreementsError)
        // Don't throw error for agreements - just log it
        setServiceAgreements([])
      } else {
        // Transform the data to match our interface
        const transformedAgreements: ServiceAgreement[] = (agreementsData || []).map((agreement: any) => ({
          ...agreement,
          buckets: agreement.agreement_buckets || [],
        }))
        setServiceAgreements(transformedAgreements)
      }
    } catch (err: any) {
      console.error("Error fetching client data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateClient = async () => {
    if (!client) return

    try {
      const { error } = await supabase
        .from("clients")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          email: editForm.email,
          phone: editForm.phone,
          address: editForm.address,
          date_of_birth: editForm.date_of_birth,
          emergency_contact_name: editForm.emergency_contact_name,
          emergency_contact_phone: editForm.emergency_contact_phone,
          medical_conditions: editForm.medical_conditions,
          medications: editForm.medications,
          allergies: editForm.allergies,
          mobility_notes: editForm.mobility_notes,
          care_preferences: editForm.care_preferences,
        })
        .eq("id", client.id)

      if (error) throw error

      setClient({ ...client, ...editForm } as Client)
      setShowEditDialog(false)
    } catch (error: any) {
      console.error("Error updating client:", error)
      alert(`Failed to update client: ${error.message}`)
    }
  }

  const convertToActive = async () => {
    if (!client) return

    try {
      const { error } = await supabase.from("clients").update({ status: "active" }).eq("id", client.id)

      if (error) throw error

      setClient({ ...client, status: "active" })
    } catch (error: any) {
      console.error("Error converting client to active:", error)
      alert(`Failed to convert client to active: ${error.message}`)
    }
  }

  const deleteClient = async () => {
    if (!client) return

    try {
      const { error } = await supabase.from("clients").delete().eq("id", client.id)

      if (error) throw error

      router.push("/dashboard/clients")
    } catch (error: any) {
      console.error("Error deleting client:", error)
      alert(`Failed to delete client: ${error.message}`)
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
      case "prospect":
        return "bg-blue-100 text-blue-800"
      case "lead":
        return "bg-yellow-100 text-yellow-800"
      case "inactive":
        return "bg-gray-100 text-gray-800"
      case "current":
        return "bg-green-100 text-green-800"
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "expired":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getAgreementStatusIcon = (status: string) => {
    switch (status) {
      case "current":
        return <CheckCircle className="w-4 h-4" />
      case "draft":
        return <Clock className="w-4 h-4" />
      case "expired":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  const getAgreementSummary = (agreement: ServiceAgreement) => {
    const drawDownBuckets = agreement.buckets.filter((b) => b.template_category === "draw_down")
    const fillUpBuckets = agreement.buckets.filter((b) => b.template_category === "fill_up")

    const fundingSources = agreement.buckets.reduce(
      (acc, bucket) => {
        const source = bucket.template_funding_source
        const amount = bucket.custom_amount || 0
        acc[source] = (acc[source] || 0) + amount
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalBuckets: agreement.buckets.length,
      drawDownCount: drawDownBuckets.length,
      fillUpCount: fillUpBuckets.length,
      fundingSources,
      drawDownTotal: drawDownBuckets.reduce((sum, b) => sum + (b.custom_amount || 0), 0),
      fillUpTotal: fillUpBuckets.reduce((sum, b) => sum + (b.custom_amount || 0), 0),
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading client details...</div>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 text-red-300 mx-auto mb-4" />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/clients" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <Badge className={getStatusColor(client.status)}>
                  {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                </Badge>
                <span className="text-gray-500">Client since {new Date(client.created_at).toLocaleDateString()}</span>
              </div>
            </div>

            <div className="flex gap-2">
              {client.status !== "active" && (
                <Button onClick={convertToActive} className="bg-green-600 hover:bg-green-700">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Convert to Active
                </Button>
              )}
              <Button variant="outline" onClick={() => setShowEditDialog(true)}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Client
              </Button>
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700 bg-transparent"
                onClick={() => setShowDeleteDialog(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Personal & Health Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                </div>

                {/* Emergency Contact */}
                {(client.emergency_contact_name || client.emergency_contact_phone) && (
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-2">Emergency Contact</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {client.emergency_contact_name && (
                        <div>
                          <div className="text-sm text-gray-500">Name</div>
                          <div className="font-medium">{client.emergency_contact_name}</div>
                        </div>
                      )}
                      {client.emergency_contact_phone && (
                        <div>
                          <div className="text-sm text-gray-500">Phone</div>
                          <div className="font-medium">{client.emergency_contact_phone}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  Health Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.medical_conditions && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Medical Conditions</div>
                    <div className="font-medium">{client.medical_conditions}</div>
                  </div>
                )}
                {client.medications && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Current Medications</div>
                    <div className="font-medium">{client.medications}</div>
                  </div>
                )}
                {client.allergies && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Allergies</div>
                    <div className="font-medium text-red-600">{client.allergies}</div>
                  </div>
                )}
                {client.mobility_notes && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Mobility Notes</div>
                    <div className="font-medium">{client.mobility_notes}</div>
                  </div>
                )}
                {client.care_preferences && (
                  <div>
                    <div className="text-sm text-gray-500 mb-1">Care Preferences</div>
                    <div className="font-medium">{client.care_preferences}</div>
                  </div>
                )}
                {!client.medical_conditions &&
                  !client.medications &&
                  !client.allergies &&
                  !client.mobility_notes &&
                  !client.care_preferences && (
                    <div className="text-center py-6 text-gray-500">
                      <Heart className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      No health information provided
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Service Agreements Section */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Service Agreements
                  </CardTitle>
                  <Button asChild size="sm" disabled={client.status !== "active"}>
                    <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                      <Plus className="w-4 h-4 mr-1" />
                      Manage Agreements
                    </Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {serviceAgreements.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Agreements</h3>
                    <p className="text-gray-500 mb-4">
                      {client.status !== "active"
                        ? "Convert this client to Active status to create service agreements"
                        : "Create service agreements using bucket templates as building blocks"}
                    </p>
                    <Button asChild disabled={client.status !== "active"}>
                      <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create First Agreement
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Agreements Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-5 h-5 text-green-600" />
                          <div>
                            <div className="text-2xl font-bold text-green-600">
                              {serviceAgreements.filter((a) => a.status === "current").length}
                            </div>
                            <div className="text-sm text-green-700">Current Agreements</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                          <div>
                            <div className="text-2xl font-bold text-blue-600">
                              {formatCurrency(
                                serviceAgreements
                                  .filter((a) => a.status === "current")
                                  .reduce((sum, a) => sum + (a.allocated_amount || a.total_value || 0), 0),
                              )}
                            </div>
                            <div className="text-sm text-blue-700">Total Allocated</div>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center gap-2">
                          <Activity className="w-5 h-5 text-gray-600" />
                          <div>
                            <div className="text-2xl font-bold text-gray-600">
                              {serviceAgreements.reduce((sum, a) => sum + a.buckets.length, 0)}
                            </div>
                            <div className="text-sm text-gray-700">Total Buckets</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Service Agreements List */}
                    <div>
                      <h4 className="font-medium text-gray-900 mb-3">All Agreements</h4>
                      <div className="space-y-3">
                        {serviceAgreements.map((agreement) => {
                          const summary = getAgreementSummary(agreement)
                          const allocatedAmount = agreement.allocated_amount || agreement.total_value || 0
                          const spentAmount = agreement.spent_amount || 0
                          const remainingBalance = agreement.remaining_balance || allocatedAmount - spentAmount
                          const usagePercentage = allocatedAmount > 0 ? (spentAmount / allocatedAmount) * 100 : 0

                          return (
                            <Link
                              key={agreement.id}
                              href={`/dashboard/clients/${client.id}/service-agreement`}
                              className="block"
                            >
                              <div className="p-6 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 cursor-pointer group">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-2">
                                      <FileText className="w-5 h-5 text-blue-600" />
                                      <div>
                                        <div className="font-semibold text-lg group-hover:text-blue-600 transition-colors">
                                          {agreement.name}
                                        </div>
                                        <div className="text-sm text-gray-500 space-x-2">
                                          <span className="font-mono">{agreement.agreement_number}</span>
                                          <span>•</span>
                                          <span>{summary.totalBuckets} buckets</span>
                                          <span>•</span>
                                          <span>{new Date(agreement.start_date).toLocaleDateString()}</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <Badge className={`${getStatusColor(agreement.status)} flex items-center gap-1`}>
                                      {getAgreementStatusIcon(agreement.status)}
                                      {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                                    </Badge>
                                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" />
                                  </div>
                                </div>

                                {/* Financial Overview */}
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                                    <div className="text-lg font-bold text-blue-600">
                                      {formatCurrency(allocatedAmount)}
                                    </div>
                                    <div className="text-xs text-blue-700">Allocated</div>
                                  </div>
                                  <div className="text-center p-3 bg-red-50 rounded-lg">
                                    <div className="text-lg font-bold text-red-600">{formatCurrency(spentAmount)}</div>
                                    <div className="text-xs text-red-700">Spent</div>
                                  </div>
                                  <div className="text-center p-3 bg-green-50 rounded-lg">
                                    <div className="text-lg font-bold text-green-600">
                                      {formatCurrency(remainingBalance)}
                                    </div>
                                    <div className="text-xs text-green-700">Remaining</div>
                                  </div>
                                </div>

                                {/* Usage Progress Bar */}
                                <div className="mb-4">
                                  <div className="flex justify-between text-sm mb-2">
                                    <span className="text-gray-600">Usage Progress</span>
                                    <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all duration-300 ${
                                        usagePercentage > 90
                                          ? "bg-red-500"
                                          : usagePercentage > 75
                                            ? "bg-yellow-500"
                                            : "bg-green-500"
                                      }`}
                                      style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                                    />
                                  </div>
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Spent: {formatCurrency(spentAmount)}</span>
                                    <span>Remaining: {formatCurrency(remainingBalance)}</span>
                                  </div>
                                </div>

                                {/* Bucket Summary */}
                                <div className="flex items-center justify-between text-sm">
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                      <TrendingDown className="w-4 h-4 text-green-600" />
                                      <span className="text-gray-600">{summary.drawDownCount} Draw-Down</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <TrendingUp className="w-4 h-4 text-blue-600" />
                                      <span className="text-gray-600">{summary.fillUpCount} Fill-Up</span>
                                    </div>
                                  </div>
                                  <div className="text-gray-500">Click to manage →</div>
                                </div>
                              </div>
                            </Link>
                          )
                        })}
                      </div>

                      <div className="mt-4 text-center">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                            <FileText className="w-4 h-4 mr-2" />
                            Manage All Agreements
                          </Link>
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Quick Actions & Status */}
          <div className="space-y-6">
            {/* Client Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  Client Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Current Status</span>
                    <Badge className={getStatusColor(client.status)}>
                      {client.status.charAt(0).toUpperCase() + client.status.slice(1)}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Active Agreements</span>
                    <span className="font-semibold">
                      {serviceAgreements.filter((a) => a.status === "current").length}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Total Agreement Value</span>
                    <span className="font-semibold">
                      {formatCurrency(
                        serviceAgreements
                          .filter((a) => a.status === "current")
                          .reduce((sum, a) => sum + a.total_value, 0),
                      )}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-purple-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href={`/dashboard/clients/${client.id}/service-agreement`}>
                    <FileText className="w-4 h-4 mr-2" />
                    Manage Service Agreements
                  </Link>
                </Button>
                <Button asChild className="w-full justify-start bg-transparent" variant="outline">
                  <Link href={`/dashboard/clients/${client.id}/buckets`}>
                    <Activity className="w-4 h-4 mr-2" />
                    View Client Buckets
                  </Link>
                </Button>
                <Button
                  className="w-full justify-start bg-transparent"
                  variant="outline"
                  onClick={() => setShowEditDialog(true)}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Client Details
                </Button>
                {client.status !== "active" && (
                  <Button onClick={convertToActive} className="w-full bg-green-600 hover:bg-green-700">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Convert to Active
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Client Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Client Details</DialogTitle>
              <DialogDescription>Update the client's personal and health information.</DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Personal Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={editForm.first_name || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, first_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={editForm.last_name || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, last_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={editForm.email || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={editForm.phone || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={editForm.address || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="date_of_birth">Date of Birth</Label>
                    <Input
                      id="date_of_birth"
                      type="date"
                      value={editForm.date_of_birth || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, date_of_birth: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Emergency Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="emergency_contact_name">Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={editForm.emergency_contact_name || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, emergency_contact_name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      value={editForm.emergency_contact_phone || ""}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, emergency_contact_phone: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              {/* Health Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">Health Information</h3>
                <div>
                  <Label htmlFor="medical_conditions">Medical Conditions</Label>
                  <Textarea
                    id="medical_conditions"
                    value={editForm.medical_conditions || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, medical_conditions: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="medications">Current Medications</Label>
                  <Textarea
                    id="medications"
                    value={editForm.medications || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, medications: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={editForm.allergies || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, allergies: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="mobility_notes">Mobility Notes</Label>
                  <Textarea
                    id="mobility_notes"
                    value={editForm.mobility_notes || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, mobility_notes: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div>
                  <Label htmlFor="care_preferences">Care Preferences</Label>
                  <Textarea
                    id="care_preferences"
                    value={editForm.care_preferences || ""}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, care_preferences: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                Cancel
              </Button>
              <Button onClick={updateClient} disabled={!editForm.first_name || !editForm.last_name}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Client Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Client</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this client? This action cannot be undone and will remove all associated
                data including service agreements and buckets.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={deleteClient} className="bg-red-600 hover:bg-red-700">
                Delete Client
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
