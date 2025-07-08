"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
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
  Plus,
  Save,
  ArrowLeft,
  Trash2,
  DollarSign,
  FileText,
  TrendingDown,
  TrendingUp,
  Home,
  ChevronRight,
  Edit,
  Calculator,
} from "lucide-react"
import { createClient } from "@/lib/supabase"

interface BucketTemplate {
  id: string
  name: string
  description: string
  category: "draw_down" | "fill_up"
  funding_source: string
  starting_amount?: number
  credit_limit?: number
  characteristics: any[]
  is_active: boolean
  created_at: string
  organization_id: string
}

interface FundingBucket {
  id: string
  template_id: string
  template_name: string
  category: "draw_down" | "fill_up"
  funding_source: string
  starting_amount?: number
  credit_limit?: number
  current_balance?: number
  characteristics: any[]
  custom_amount?: number
  custom_name?: string
  notes?: string
}

interface ServiceAgreement {
  id?: string
  client_name: string
  agreement_name: string
  agreement_number: string
  start_date: string
  end_date: string
  funding_model: "single_bucket" | "multi_bucket"
  allocation_type: "sum_of_buckets" | "fixed_allocation"
  allocated_amount?: number
  primary_contact: string
  notes: string
  funding_buckets: FundingBucket[]
  status: "draft" | "current" | "expired"
}

interface ExistingServiceAgreement {
  id: string
  agreement_number: string
  name: string
  description?: string
  status: "draft" | "current" | "expired"
  start_date: string
  end_date?: string
  total_value: number
  allocation_type?: "sum_of_buckets" | "fixed_allocation"
  allocated_amount?: number
  funding_model?: "single_bucket" | "multi_bucket"
  primary_contact?: string
  notes?: string
  agreement_buckets: any[]
  has_been_current: boolean
  created_at: string
  updated_at: string
}

export default function ServiceAgreementPage() {
  const params = useParams()
  const router = useRouter()
  const clientId = params.id as string

  const [client, setClient] = useState<any>(null)
  const [userOrgId, setUserOrgId] = useState<string | null>(null)
  const [bucketTemplates, setBucketTemplates] = useState<BucketTemplate[]>([])
  const [existingAgreements, setExistingAgreements] = useState<ExistingServiceAgreement[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showBucketDialog, setShowBucketDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showDeleteAgreementDialog, setShowDeleteAgreementDialog] = useState(false)
  const [bucketToDelete, setBucketToDelete] = useState<string | null>(null)
  const [agreementToDelete, setAgreementToDelete] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<string>("")
  const [customAmount, setCustomAmount] = useState<string>("")
  const [editingAgreement, setEditingAgreement] = useState<string | null>(null)

  const [serviceAgreement, setServiceAgreement] = useState<ServiceAgreement>({
    client_name: "",
    agreement_name: "",
    agreement_number: "",
    start_date: "",
    end_date: "",
    funding_model: "single_bucket",
    allocation_type: "sum_of_buckets",
    allocated_amount: undefined,
    primary_contact: "",
    notes: "",
    funding_buckets: [],
    status: "draft",
  })

  useEffect(() => {
    loadData()
  }, [clientId])

  const loadData = async () => {
    try {
      const supabase = createClient()

      // Get current user and their organization
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError) throw userError

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError) throw profileError

      setUserOrgId(profile.organization_id)

      // Load client data
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError

      // Verify client belongs to user's organization
      if (clientData.organization_id !== profile.organization_id) {
        throw new Error("Access denied: Client does not belong to your organization")
      }

      // Load existing service agreements
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
        setExistingAgreements([])
      } else {
        setExistingAgreements(agreementsData || [])
      }

      // Load bucket templates - only active ones created by user's organization
      const { data: templatesData, error: templatesError } = await supabase
        .from("bucket_templates")
        .select("*")
        .eq("is_active", true)
        .order("name")

      if (templatesError) throw templatesError

      // Filter out any default templates that might still exist
      const userTemplates =
        templatesData?.filter(
          (template) =>
            ![
              "NDIS Core Supports",
              "NDIS Capacity Building",
              "Private Pay Services",
              "Government Subsidy",
              "NDIS Plan Management",
              "Emergency Support Fund",
              "Respite Care Credit",
            ].includes(template.name),
        ) || []

      setClient(clientData)
      setBucketTemplates(userTemplates)
      setServiceAgreement((prev) => ({
        ...prev,
        client_name: `${clientData.first_name} ${clientData.last_name}`,
        agreement_number: `SA-${Date.now()}`,
      }))
    } catch (error) {
      console.error("Error loading data:", error)
      alert(`Error loading data: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const editExistingAgreement = (agreement: ExistingServiceAgreement) => {
    // Convert existing agreement to editable format
    const editableAgreement: ServiceAgreement = {
      id: agreement.id,
      client_name: `${client?.first_name} ${client?.last_name}`,
      agreement_name: agreement.name,
      agreement_number: agreement.agreement_number,
      start_date: agreement.start_date,
      end_date: agreement.end_date || "",
      funding_model: agreement.funding_model || "single_bucket",
      allocation_type: agreement.allocation_type || "sum_of_buckets",
      allocated_amount: agreement.allocated_amount,
      primary_contact: agreement.primary_contact || "",
      notes: agreement.notes || agreement.description || "",
      status: agreement.status,
      funding_buckets: agreement.agreement_buckets.map((bucket: any) => ({
        id: bucket.id,
        template_id: bucket.bucket_template_id || "",
        template_name: bucket.template_name,
        category: bucket.template_category,
        funding_source: bucket.template_funding_source,
        custom_amount: bucket.custom_amount,
        custom_name: bucket.custom_name,
        notes: bucket.notes,
        characteristics: [],
      })),
    }

    setServiceAgreement(editableAgreement)
    setEditingAgreement(agreement.id)
  }

  const deleteServiceAgreement = async (agreementId: string) => {
    try {
      setSaving(true)
      const supabase = createClient()

      const { error } = await supabase.from("service_agreements").delete().eq("id", agreementId)

      if (error) throw error

      // Reload agreements
      await loadData()
      setShowDeleteAgreementDialog(false)
      setAgreementToDelete(null)
    } catch (error) {
      console.error("Error deleting service agreement:", error)
      alert("Failed to delete service agreement")
    } finally {
      setSaving(false)
    }
  }

  const addFundingBucket = () => {
    if (!selectedTemplate) return

    const template = bucketTemplates.find((t) => t.id === selectedTemplate)
    if (!template) return

    const amount = customAmount
      ? Number.parseFloat(customAmount)
      : template.category === "draw_down"
        ? template.starting_amount
        : template.credit_limit

    const newBucket: FundingBucket = {
      id: `bucket-${Date.now()}`,
      template_id: template.id,
      template_name: template.name,
      category: template.category,
      funding_source: template.funding_source,
      custom_amount: amount,
      ...(template.category === "draw_down"
        ? { starting_amount: amount, current_balance: amount }
        : { credit_limit: amount, current_balance: 0 }),
      characteristics: template.characteristics,
    }

    setServiceAgreement((prev) => ({
      ...prev,
      funding_buckets: [...prev.funding_buckets, newBucket],
    }))

    setShowBucketDialog(false)
    setSelectedTemplate("")
    setCustomAmount("")
  }

  const removeFundingBucket = (bucketId: string) => {
    setServiceAgreement((prev) => ({
      ...prev,
      funding_buckets: prev.funding_buckets.filter((b) => b.id !== bucketId),
    }))
    setShowDeleteDialog(false)
    setBucketToDelete(null)
  }

  const calculateTotalValue = () => {
    if (serviceAgreement.allocation_type === "fixed_allocation") {
      return serviceAgreement.allocated_amount || 0
    }
    return serviceAgreement.funding_buckets.reduce((sum, bucket) => sum + (bucket.custom_amount || 0), 0)
  }

  const validateDate = (dateString: string): string | null => {
    if (!dateString || dateString.trim() === "") {
      return null
    }

    // Check if it's a valid date format
    const date = new Date(dateString)
    if (isNaN(date.getTime())) {
      return null
    }

    // Return in YYYY-MM-DD format
    return dateString
  }

  const saveServiceAgreement = async () => {
    try {
      setSaving(true)
      const supabase = createClient()

      // Validate required fields
      if (!serviceAgreement.agreement_name.trim()) {
        alert("Agreement name is required")
        return
      }

      if (!serviceAgreement.agreement_number.trim()) {
        alert("Agreement number is required")
        return
      }

      if (!serviceAgreement.start_date.trim()) {
        alert("Start date is required")
        return
      }

      if (!userOrgId) {
        alert("Unable to determine your organization. Please refresh and try again.")
        return
      }

      // Validate dates
      const startDate = validateDate(serviceAgreement.start_date)
      const endDate = validateDate(serviceAgreement.end_date)

      if (!startDate) {
        alert("Please enter a valid start date")
        return
      }

      // Create a minimal agreement data object with organization_id
      const coreAgreementData: any = {
        client_id: clientId,
        organization_id: userOrgId, // This is crucial for RLS
        agreement_number: serviceAgreement.agreement_number.trim(),
        name: serviceAgreement.agreement_name.trim(),
        status: serviceAgreement.status,
        start_date: startDate,
        total_value: calculateTotalValue(),
      }

      // Add end_date only if it's valid
      if (endDate) {
        coreAgreementData.end_date = endDate
      }

      // Add description field (this might be the actual field name instead of notes)
      if (serviceAgreement.notes.trim()) {
        coreAgreementData.description = serviceAgreement.notes.trim()
      }

      console.log("Saving with core data:", coreAgreementData)

      let agreementId: string

      if (editingAgreement) {
        // Update existing agreement with core fields only
        const { error } = await supabase.from("service_agreements").update(coreAgreementData).eq("id", editingAgreement)

        if (error) {
          console.error("Update error:", error)
          throw error
        }
        agreementId = editingAgreement

        // Delete existing buckets
        await supabase.from("agreement_buckets").delete().eq("agreement_id", editingAgreement)
      } else {
        // Create new agreement with core fields only
        const { data, error } = await supabase.from("service_agreements").insert([coreAgreementData]).select().single()

        if (error) {
          console.error("Insert error:", error)
          throw error
        }
        agreementId = data.id
      }

      // Now try to update with extended fields one by one (only if they have values)
      const extendedUpdates: any = {}

      if (serviceAgreement.funding_model && serviceAgreement.funding_model !== "single_bucket") {
        extendedUpdates.funding_model = serviceAgreement.funding_model
      }

      if (serviceAgreement.allocation_type && serviceAgreement.allocation_type !== "sum_of_buckets") {
        extendedUpdates.allocation_type = serviceAgreement.allocation_type
      }

      if (serviceAgreement.allocation_type === "fixed_allocation" && serviceAgreement.allocated_amount) {
        extendedUpdates.allocated_amount = serviceAgreement.allocated_amount
      }

      if (serviceAgreement.primary_contact && serviceAgreement.primary_contact.trim()) {
        extendedUpdates.primary_contact = serviceAgreement.primary_contact.trim()
      }

      // Try to add notes field separately
      if (serviceAgreement.notes.trim()) {
        extendedUpdates.notes = serviceAgreement.notes.trim()
      }

      // Apply extended updates if any exist
      if (Object.keys(extendedUpdates).length > 0) {
        console.log("Attempting to update extended fields:", extendedUpdates)

        const { error: extendedError } = await supabase
          .from("service_agreements")
          .update(extendedUpdates)
          .eq("id", agreementId)

        if (extendedError) {
          console.warn("Some extended fields failed to update:", extendedError.message)
          // Continue without extended fields - this is not a fatal error
        }
      }

      // Insert buckets with organization_id
      if (serviceAgreement.funding_buckets.length > 0) {
        const bucketsData = serviceAgreement.funding_buckets.map((bucket) => ({
          agreement_id: agreementId,
          organization_id: userOrgId, // Add organization_id for RLS
          bucket_template_id: bucket.template_id,
          template_name: bucket.template_name,
          template_category: bucket.category,
          template_funding_source: bucket.funding_source,
          custom_amount: bucket.custom_amount || 0,
          custom_name: bucket.custom_name || null,
          notes: bucket.notes || null,
        }))

        const { error: bucketsError } = await supabase.from("agreement_buckets").insert(bucketsData)

        if (bucketsError) {
          console.error("Buckets error:", bucketsError)
          throw bucketsError
        }
      }

      // Success - redirect back to client page
      router.push(`/dashboard/clients/${clientId}`)
    } catch (error) {
      console.error("Error saving service agreement:", error)
      alert(`Failed to save service agreement: ${error.message}`)
    } finally {
      setSaving(false)
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading service agreement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="flex items-center hover:text-gray-700 transition-colors">
            <Home className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/dashboard/clients" className="hover:text-gray-700 transition-colors">
            Clients
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href={`/dashboard/clients/${clientId}`} className="hover:text-gray-700 transition-colors">
            {client?.first_name} {client?.last_name}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Service Agreements</span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Service Agreements</h1>
              <p className="text-gray-600">
                Manage funding arrangements for {client?.first_name} {client?.last_name}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column - Existing Agreements */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Existing Service Agreements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {existingAgreements.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Agreements</h3>
                    <p className="text-gray-500 mb-4">
                      Create your first service agreement using the form on the right.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {existingAgreements.map((agreement) => (
                      <div
                        key={agreement.id}
                        className="p-4 border rounded-lg bg-white hover:shadow-sm transition-shadow"
                      >
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

                        <div className="flex items-center justify-between text-sm mb-3">
                          <span className="text-gray-600">Total Value:</span>
                          <span className="font-medium">{formatCurrency(agreement.total_value)}</span>
                        </div>

                        {agreement.allocation_type && (
                          <div className="flex items-center justify-between text-sm mb-3">
                            <span className="text-gray-600">Allocation Type:</span>
                            <Badge variant="outline" className="text-xs">
                              {agreement.allocation_type === "sum_of_buckets" ? "Sum of Buckets" : "Fixed Allocation"}
                            </Badge>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-sm mb-4">
                          <span className="text-gray-600">Buckets:</span>
                          <span className="font-medium">{agreement.agreement_buckets?.length || 0}</span>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => editExistingAgreement(agreement)}
                            className="flex-1"
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          {agreement.status === "draft" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setAgreementToDelete(agreement.id)
                                setShowDeleteAgreementDialog(true)
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Create/Edit Agreement Form */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {editingAgreement ? "Edit" : "Create"} Service Agreement
                  </CardTitle>
                  {editingAgreement && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEditingAgreement(null)
                        setServiceAgreement({
                          client_name: `${client?.first_name} ${client?.last_name}`,
                          agreement_name: "",
                          agreement_number: `SA-${Date.now()}`,
                          start_date: "",
                          end_date: "",
                          funding_model: "single_bucket",
                          allocation_type: "sum_of_buckets",
                          allocated_amount: undefined,
                          primary_contact: "",
                          notes: "",
                          funding_buckets: [],
                          status: "draft",
                        })
                      }}
                    >
                      Create New Instead
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="client_name">Client Name</Label>
                    <Input id="client_name" value={serviceAgreement.client_name} disabled className="bg-gray-50" />
                  </div>
                  <div>
                    <Label htmlFor="agreement_name">Agreement Name *</Label>
                    <Input
                      id="agreement_name"
                      value={serviceAgreement.agreement_name}
                      onChange={(e) =>
                        setServiceAgreement((prev) => ({
                          ...prev,
                          agreement_name: e.target.value,
                        }))
                      }
                      placeholder="e.g., Standard Support Package 2024"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="agreement_number">Agreement Number *</Label>
                    <Input
                      id="agreement_number"
                      value={serviceAgreement.agreement_number}
                      onChange={(e) =>
                        setServiceAgreement((prev) => ({
                          ...prev,
                          agreement_number: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={serviceAgreement.status}
                      onValueChange={(value: "draft" | "current" | "expired") =>
                        setServiceAgreement((prev) => ({
                          ...prev,
                          status: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Start Date *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={serviceAgreement.start_date}
                      onChange={(e) =>
                        setServiceAgreement((prev) => ({
                          ...prev,
                          start_date: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">End Date</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={serviceAgreement.end_date}
                      onChange={(e) =>
                        setServiceAgreement((prev) => ({
                          ...prev,
                          end_date: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="primary_contact">Primary Contact</Label>
                  <Input
                    id="primary_contact"
                    value={serviceAgreement.primary_contact}
                    onChange={(e) =>
                      setServiceAgreement((prev) => ({
                        ...prev,
                        primary_contact: e.target.value,
                      }))
                    }
                    placeholder="Contact person for this agreement"
                  />
                </div>

                {/* Funding Model */}
                <div>
                  <Label>Funding Model</Label>
                  <RadioGroup
                    value={serviceAgreement.funding_model}
                    onValueChange={(value: "single_bucket" | "multi_bucket") =>
                      setServiceAgreement((prev) => ({
                        ...prev,
                        funding_model: value,
                      }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="single_bucket" id="single_bucket" />
                      <Label htmlFor="single_bucket" className="text-sm">
                        Single Funding Bucket
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="multi_bucket" id="multi_bucket" />
                      <Label htmlFor="multi_bucket" className="text-sm">
                        Multiple Funding Buckets
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Allocation Type */}
                <div>
                  <Label>Allocation Type</Label>
                  <RadioGroup
                    value={serviceAgreement.allocation_type}
                    onValueChange={(value: "sum_of_buckets" | "fixed_allocation") =>
                      setServiceAgreement((prev) => ({
                        ...prev,
                        allocation_type: value,
                      }))
                    }
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sum_of_buckets" id="sum_of_buckets" />
                      <Label htmlFor="sum_of_buckets" className="text-sm">
                        <div>
                          <div className="font-medium">Sum of Buckets</div>
                          <div className="text-xs text-gray-500">Total value calculated from bucket amounts</div>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="fixed_allocation" id="fixed_allocation" />
                      <Label htmlFor="fixed_allocation" className="text-sm">
                        <div>
                          <div className="font-medium">Fixed Allocation</div>
                          <div className="text-xs text-gray-500">Set a fixed total amount regardless of buckets</div>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Fixed Allocation Amount */}
                {serviceAgreement.allocation_type === "fixed_allocation" && (
                  <div>
                    <Label htmlFor="allocated_amount">Allocated Amount (AUD)</Label>
                    <Input
                      id="allocated_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={serviceAgreement.allocated_amount || ""}
                      onChange={(e) =>
                        setServiceAgreement((prev) => ({
                          ...prev,
                          allocated_amount: Number.parseFloat(e.target.value) || 0,
                        }))
                      }
                      placeholder="Enter fixed allocation amount"
                    />
                  </div>
                )}

                {/* Total Value Display */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Calculator className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Total Agreement Value</span>
                    </div>
                    <div className="text-xl font-bold text-blue-900">{formatCurrency(calculateTotalValue())}</div>
                  </div>
                  <div className="text-sm text-blue-700 mt-1">
                    {serviceAgreement.allocation_type === "fixed_allocation"
                      ? "Fixed allocation amount"
                      : `Calculated from ${serviceAgreement.funding_buckets.length} bucket(s)`}
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={serviceAgreement.notes}
                    onChange={(e) =>
                      setServiceAgreement((prev) => ({
                        ...prev,
                        notes: e.target.value,
                      }))
                    }
                    placeholder="Additional notes about this service agreement..."
                    className="min-h-20"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Funding Buckets */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5" />
                    Funding Buckets
                  </CardTitle>
                  <Button onClick={() => setShowBucketDialog(true)} disabled={bucketTemplates.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Bucket
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {bucketTemplates.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Bucket Templates Available</h3>
                    <p className="text-gray-500 mb-4">
                      You need to create bucket templates first before you can add funding buckets.
                    </p>
                    <Link href="/dashboard/buckets">
                      <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Bucket Templates
                      </Button>
                    </Link>
                  </div>
                ) : serviceAgreement.funding_buckets.length === 0 ? (
                  <div className="text-center py-8">
                    <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Funding Buckets Added</h3>
                    <p className="text-gray-500 mb-4">Add funding buckets to define how services will be funded.</p>
                    <Button onClick={() => setShowBucketDialog(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Bucket
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceAgreement.funding_buckets.map((bucket) => (
                      <div key={bucket.id} className="flex items-center justify-between p-4 border rounded-lg bg-white">
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-blue-100">
                            {bucket.category === "draw_down" ? (
                              <TrendingDown className="w-5 h-5 text-blue-600" />
                            ) : (
                              <TrendingUp className="w-5 h-5 text-blue-600" />
                            )}
                          </div>
                          <div>
                            <h4 className="font-medium">{bucket.template_name}</h4>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span className="capitalize">{bucket.funding_source}</span>
                              <span>{formatCurrency(bucket.custom_amount || 0)}</span>
                              <Badge variant="outline" className="text-xs">
                                {bucket.category === "draw_down" ? "Draw-Down" : "Fill-Up"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setBucketToDelete(bucket.id)
                            setShowDeleteDialog(true)
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button onClick={saveServiceAgreement} disabled={saving} size="lg">
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : editingAgreement ? "Update Agreement" : "Create Agreement"}
              </Button>
            </div>
          </div>
        </div>

        {/* Add Bucket Dialog */}
        <Dialog open={showBucketDialog} onOpenChange={setShowBucketDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Funding Bucket</DialogTitle>
              <DialogDescription>Select a bucket template and configure the funding amount</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="template">Bucket Template</Label>
                <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bucket template" />
                  </SelectTrigger>
                  <SelectContent>
                    {bucketTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        <div className="flex items-center gap-2">
                          {template.category === "draw_down" ? (
                            <TrendingDown className="w-4 h-4 text-green-600" />
                          ) : (
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                          )}
                          <span>{template.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {template.funding_source}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedTemplate && (
                <div>
                  <Label htmlFor="amount">
                    {bucketTemplates.find((t) => t.id === selectedTemplate)?.category === "draw_down"
                      ? "Starting Amount (AUD)"
                      : "Credit Limit (AUD)"}
                  </Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={customAmount}
                    onChange={(e) => setCustomAmount(e.target.value)}
                    placeholder={
                      bucketTemplates.find((t) => t.id === selectedTemplate)?.category === "draw_down"
                        ? `Default: ${formatCurrency(bucketTemplates.find((t) => t.id === selectedTemplate)?.starting_amount || 0)}`
                        : `Default: ${formatCurrency(bucketTemplates.find((t) => t.id === selectedTemplate)?.credit_limit || 0)}`
                    }
                  />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBucketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addFundingBucket} disabled={!selectedTemplate}>
                Add Bucket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Bucket Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remove Funding Bucket</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to remove this funding bucket from the service agreement?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => bucketToDelete && removeFundingBucket(bucketToDelete)}
                className="bg-red-600 hover:bg-red-700"
              >
                Remove Bucket
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Delete Agreement Confirmation Dialog */}
        <AlertDialog open={showDeleteAgreementDialog} onOpenChange={setShowDeleteAgreementDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service Agreement</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this service agreement? This action cannot be undone and will remove all
                associated buckets and data.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => agreementToDelete && deleteServiceAgreement(agreementToDelete)}
                className="bg-red-600 hover:bg-red-700"
                disabled={saving}
              >
                {saving ? "Deleting..." : "Delete Agreement"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
