"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  FileText,
  Plus,
  TrendingDown,
  TrendingUp,
  Trash2,
  Save,
  Loader2,
  Copy,
  Edit,
  CheckCircle,
  Clock,
  AlertTriangle,
  FileCheck,
  DollarSign,
  Activity,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Client {
  id: string
  first_name: string
  last_name: string
  status: string
}

interface Organization {
  id: string
  name: string
  address: string
  phone: string
  email: string
}

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
}

interface ServiceAgreementBucket {
  id: string
  bucket_template_id?: string
  template_name: string
  template_category: "draw_down" | "fill_up"
  template_funding_source: string
  custom_amount?: number
  custom_name?: string
  notes?: string
}

interface ServiceAgreement {
  id: string
  agreement_number: string
  client_id: string
  name: string
  description: string
  status: "draft" | "current" | "expired"
  start_date: string
  end_date?: string
  total_value: number
  allocated_amount: number
  spent_amount: number
  remaining_balance: number
  buckets: ServiceAgreementBucket[]
  has_been_current: boolean
  created_at: string
  updated_at: string
}

interface Transaction {
  id: string
  transaction_date: string
  description: string
  amount: number
  transaction_type: string
  status: string
  service_description?: string
  service_id?: string
  unit_cost?: number
  quantity?: number
  total_amount?: number
  bucket_id?: string
  bucket_name?: string
  created_at: string
}

export default function ServiceAgreementPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([])
  const [bucketTemplates, setBucketTemplates] = useState<BucketTemplate[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Agreement creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBucketDialog, setShowBucketDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showMakeCurrentDialog, setShowMakeCurrentDialog] = useState(false)
  const [showContractDialog, setShowContractDialog] = useState(false)
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [selectedAgreement, setSelectedAgreement] = useState<ServiceAgreement | null>(null)
  const [agreementToDelete, setAgreementToDelete] = useState<ServiceAgreement | null>(null)
  const [newAgreement, setNewAgreement] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
    allocated_amount: "",
  })

  // Transaction state
  const [transactionForm, setTransactionForm] = useState({
    transaction_type: "drawdown" as "drawdown" | "invoice",
    bucket_id: "",
    service_description: "",
    service_id: "",
    unit_cost: "",
    quantity: "1",
    description: "",
  })

  // Bucket selection state
  const [selectedTemplate, setSelectedTemplate] = useState<BucketTemplate | null>(null)
  const [bucketConfig, setBucketConfig] = useState({
    custom_name: "",
    custom_amount: "",
    notes: "",
  })

  useEffect(() => {
    if (params.id) {
      fetchClientAndAgreements(params.id as string)
    }
  }, [params.id])

  const fetchClientAndAgreements = async (clientId: string) => {
    try {
      // Get current user and organization
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("User not authenticated")

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        throw new Error("Could not determine user organization")
      }

      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, status")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch organization info
      const { data: orgData, error: orgError } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .single()

      if (orgError) throw orgError
      setOrganization(orgData)

      // Fetch bucket templates for this organization
      const { data: templatesData, error: templatesError } = await supabase
        .from("bucket_templates")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true)
        .order("name")

      if (templatesError) {
        console.error("Error fetching bucket templates:", templatesError)
        setBucketTemplates([])
      } else {
        setBucketTemplates(templatesData || [])
      }

      // Fetch service agreements with buckets and balance information
      const { data: agreementsData, error: agreementsError } = await supabase
        .from("service_agreements")
        .select(`
          *,
          agreement_buckets (*)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

      if (agreementsError) throw agreementsError

      // Transform the data to match our interface
      const transformedAgreements: ServiceAgreement[] = (agreementsData || []).map((agreement: any) => ({
        ...agreement,
        allocated_amount: agreement.allocated_amount || agreement.total_value || 0,
        spent_amount: agreement.spent_amount || 0,
        remaining_balance: agreement.remaining_balance || agreement.total_value || 0,
        buckets: agreement.agreement_buckets || [],
      }))

      setAgreements(transformedAgreements)

      // Fetch recent transactions for current agreements
      if (transformedAgreements.length > 0) {
        const currentAgreements = transformedAgreements.filter((a) => a.status === "current")
        if (currentAgreements.length > 0) {
          const { data: transactionsData } = await supabase
            .from("transactions")
            .select(`
              *,
              agreement_buckets!left(template_name)
            `)
            .in(
              "agreement_id",
              currentAgreements.map((a) => a.id),
            )
            .order("created_at", { ascending: false })
            .limit(10)

          const enrichedTransactions = (transactionsData || []).map((transaction) => ({
            ...transaction,
            bucket_name: transaction.agreement_buckets?.template_name || null,
          }))

          setRecentTransactions(enrichedTransactions)
        }
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateAgreementNumber = async () => {
    if (!organization) return "AGR-2024-001"

    const year = new Date().getFullYear()

    // Get existing agreement numbers for this year and organization
    const { data: existingAgreements, error } = await supabase
      .from("service_agreements")
      .select("agreement_number")
      .eq("organization_id", organization.id)
      .like("agreement_number", `AGR-${year}-%`)

    if (error) {
      console.error("Error fetching existing agreements:", error)
      return `AGR-${year}-001`
    }

    const existingNumbers = (existingAgreements || [])
      .map((a: any) => a.agreement_number)
      .map((num: string) => {
        const parts = num.split("-")
        return parts.length === 3 ? Number.parseInt(parts[2]) : 0
      })
      .filter((num: number) => !isNaN(num))

    const nextNumber = existingNumbers.length > 0 ? Math.max(...existingNumbers) + 1 : 1
    return `AGR-${year}-${nextNumber.toString().padStart(3, "0")}`
  }

  const createAgreement = async () => {
    if (!client || !organization) return

    try {
      const agreementNumber = await generateAgreementNumber()
      const allocatedAmount = Number.parseFloat(newAgreement.allocated_amount) || 0

      const { data: agreementData, error: agreementError } = await supabase
        .from("service_agreements")
        .insert({
          organization_id: organization.id,
          client_id: client.id,
          agreement_number: agreementNumber,
          name: newAgreement.name,
          description: newAgreement.description,
          start_date: newAgreement.start_date,
          end_date: newAgreement.end_date || null,
          status: "draft",
          has_been_current: false,
          total_value: allocatedAmount,
          allocated_amount: allocatedAmount,
          spent_amount: 0,
          remaining_balance: allocatedAmount,
        })
        .select()
        .single()

      if (agreementError) throw agreementError

      const newAgreementWithBuckets: ServiceAgreement = {
        ...agreementData,
        buckets: [],
      }

      setAgreements((prev) => [newAgreementWithBuckets, ...prev])
      setSelectedAgreement(newAgreementWithBuckets)
      setNewAgreement({ name: "", description: "", start_date: "", end_date: "", allocated_amount: "" })
      setShowCreateDialog(false)
    } catch (error: any) {
      console.error("Error creating agreement:", error)
      alert(`Failed to create agreement: ${error.message}`)
    }
  }

  const createTransaction = async () => {
    if (!selectedAgreement || !transactionForm.service_description || !transactionForm.unit_cost) {
      alert("Please fill in all required fields")
      return
    }

    const unitCost = Number.parseFloat(transactionForm.unit_cost)
    const quantity = Number.parseInt(transactionForm.quantity) || 1
    const totalAmount = unitCost * quantity

    // Validate transaction
    if (transactionForm.transaction_type === "drawdown" && totalAmount > selectedAgreement.remaining_balance) {
      alert(`Insufficient balance! Available: $${selectedAgreement.remaining_balance.toFixed(2)}`)
      return
    }

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser()
      if (userError || !userData.user) {
        console.error("User authentication error:", userError)
        throw new Error("User not authenticated")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", userData.user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        console.error("Profile error:", profileError)
        throw new Error("Organization not found")
      }

      const transactionData = {
        organization_id: profile.organization_id,
        client_id: selectedAgreement.client_id,
        agreement_id: selectedAgreement.id,
        bucket_id: transactionForm.bucket_id || null,
        transaction_date: new Date().toISOString().split("T")[0],
        description: transactionForm.description || transactionForm.service_description,
        service_description: transactionForm.service_description,
        service_id: transactionForm.service_id || null,
        unit_cost: unitCost,
        quantity: quantity,
        amount: totalAmount,
        transaction_type: transactionForm.transaction_type,
        status: "completed",
        created_by: userData.user.id,
      }

      console.log("Creating transaction with data:", transactionData)

      const { data: insertedTransaction, error: insertError } = await supabase
        .from("transactions")
        .insert(transactionData)
        .select()
        .single()

      if (insertError) {
        console.error("Transaction insert error:", insertError)
        throw insertError
      }

      console.log("Transaction created successfully:", insertedTransaction)

      // Reset form and refresh data
      setTransactionForm({
        transaction_type: "drawdown",
        bucket_id: "",
        service_description: "",
        service_id: "",
        unit_cost: "",
        quantity: "1",
        description: "",
      })
      setShowTransactionDialog(false)

      // Refresh agreements to get updated balances
      await fetchClientAndAgreements(params.id as string)

      alert("Transaction created successfully!")
    } catch (error: any) {
      console.error("Error creating transaction:", error)
      const errorMessage = error?.message || error?.details || "Unknown error occurred"
      alert(`Failed to create transaction: ${errorMessage}`)
    }
  }

  const addBucketToAgreement = async () => {
    if (!selectedAgreement || !selectedTemplate || !organization) return

    try {
      const { data: bucketData, error: bucketError } = await supabase
        .from("agreement_buckets")
        .insert({
          organization_id: organization.id,
          agreement_id: selectedAgreement.id,
          bucket_template_id: selectedTemplate.id,
          template_name: selectedTemplate.name,
          template_category: selectedTemplate.category,
          template_funding_source: selectedTemplate.funding_source,
          custom_name: bucketConfig.custom_name || null,
          custom_amount: bucketConfig.custom_amount
            ? Number.parseFloat(bucketConfig.custom_amount)
            : selectedTemplate.starting_amount || selectedTemplate.credit_limit || 0,
          notes: bucketConfig.notes || null,
        })
        .select()
        .single()

      if (bucketError) throw bucketError

      // Update local state
      const updatedAgreement = {
        ...selectedAgreement,
        buckets: [...selectedAgreement.buckets, bucketData],
      }

      setAgreements((prev) => prev.map((a) => (a.id === selectedAgreement.id ? updatedAgreement : a)))
      setSelectedAgreement(updatedAgreement)

      // Reset form
      setBucketConfig({ custom_name: "", custom_amount: "", notes: "" })
      setSelectedTemplate(null)
      setShowBucketDialog(false)

      // Refresh to get updated total_value from trigger
      setTimeout(() => {
        fetchClientAndAgreements(params.id as string)
      }, 500)
    } catch (error: any) {
      console.error("Error adding bucket:", error)
      alert(`Failed to add bucket: ${error.message}`)
    }
  }

  const removeBucketFromAgreement = async (bucketId: string) => {
    if (!selectedAgreement) return

    try {
      const { error } = await supabase.from("agreement_buckets").delete().eq("id", bucketId)

      if (error) throw error

      // Update local state
      const updatedBuckets = selectedAgreement.buckets.filter((b) => b.id !== bucketId)
      const updatedAgreement = {
        ...selectedAgreement,
        buckets: updatedBuckets,
      }

      setAgreements((prev) => prev.map((a) => (a.id === selectedAgreement.id ? updatedAgreement : a)))
      setSelectedAgreement(updatedAgreement)

      // Refresh to get updated total_value from trigger
      setTimeout(() => {
        fetchClientAndAgreements(params.id as string)
      }, 500)
    } catch (error: any) {
      console.error("Error removing bucket:", error)
      alert(`Failed to remove bucket: ${error.message}`)
    }
  }

  const makeAgreementCurrent = async () => {
    if (!selectedAgreement) return

    try {
      // First, set any existing current agreements to expired
      const { error: expireError } = await supabase
        .from("service_agreements")
        .update({ status: "expired" })
        .eq("client_id", selectedAgreement.client_id)
        .eq("status", "current")

      if (expireError) throw expireError

      // Then make this agreement current
      const { error } = await supabase
        .from("service_agreements")
        .update({
          status: "current",
          has_been_current: true,
        })
        .eq("id", selectedAgreement.id)

      if (error) throw error

      const updatedAgreement = {
        ...selectedAgreement,
        status: "current" as const,
        has_been_current: true,
      }

      setAgreements((prev) => prev.map((a) => (a.id === selectedAgreement.id ? updatedAgreement : a)))
      setSelectedAgreement(updatedAgreement)
      setShowMakeCurrentDialog(false)
    } catch (error: any) {
      console.error("Error making agreement current:", error)
      alert(`Failed to make agreement current: ${error.message}`)
    }
  }

  const makeAgreementDraft = async () => {
    if (!selectedAgreement) return

    try {
      const { error } = await supabase
        .from("service_agreements")
        .update({ status: "draft" })
        .eq("id", selectedAgreement.id)

      if (error) throw error

      const updatedAgreement = {
        ...selectedAgreement,
        status: "draft" as const,
      }

      setAgreements((prev) => prev.map((a) => (a.id === selectedAgreement.id ? updatedAgreement : a)))
      setSelectedAgreement(updatedAgreement)
    } catch (error: any) {
      console.error("Error making agreement draft:", error)
      alert(`Failed to make agreement draft: ${error.message}`)
    }
  }

  const deleteAgreement = async () => {
    if (!agreementToDelete) return

    try {
      const { error } = await supabase.from("service_agreements").delete().eq("id", agreementToDelete.id)

      if (error) throw error

      setAgreements((prev) => prev.filter((a) => a.id !== agreementToDelete.id))
      setAgreementToDelete(null)
      setShowDeleteDialog(false)

      // Clear selected agreement if it was the one being deleted
      if (selectedAgreement?.id === agreementToDelete.id) {
        setSelectedAgreement(null)
      }
    } catch (error: any) {
      console.error("Error deleting agreement:", error)
      alert(`Failed to delete agreement: ${error.message}`)
    }
  }

  const duplicateAgreement = async (agreement: ServiceAgreement) => {
    if (!organization) return

    try {
      const agreementNumber = await generateAgreementNumber()

      // Create new agreement
      const { data: newAgreementData, error: agreementError } = await supabase
        .from("service_agreements")
        .insert({
          organization_id: organization.id,
          client_id: agreement.client_id,
          agreement_number: agreementNumber,
          name: `${agreement.name} (Copy)`,
          description: agreement.description,
          start_date: new Date().toISOString().split("T")[0], // Today's date
          end_date: null,
          status: "draft",
          has_been_current: false,
          total_value: agreement.total_value,
          allocated_amount: agreement.allocated_amount,
          spent_amount: 0,
          remaining_balance: agreement.allocated_amount,
        })
        .select()
        .single()

      if (agreementError) throw agreementError

      // Copy all buckets
      if (agreement.buckets.length > 0) {
        const bucketsToInsert = agreement.buckets.map((bucket) => ({
          organization_id: organization.id,
          agreement_id: newAgreementData.id,
          bucket_template_id: bucket.bucket_template_id,
          template_name: bucket.template_name,
          template_category: bucket.template_category,
          template_funding_source: bucket.template_funding_source,
          custom_name: bucket.custom_name,
          custom_amount: bucket.custom_amount,
          notes: bucket.notes,
        }))

        const { error: bucketsError } = await supabase.from("agreement_buckets").insert(bucketsToInsert)

        if (bucketsError) throw bucketsError
      }

      // Refresh data to show the new agreement
      await fetchClientAndAgreements(params.id as string)
    } catch (error: any) {
      console.error("Error duplicating agreement:", error)
      alert(`Failed to duplicate agreement: ${error.message}`)
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

  const getAvailableBuckets = () => {
    if (!selectedAgreement) return []

    const targetCategory = transactionForm.transaction_type === "drawdown" ? "draw_down" : "fill_up"
    return selectedAgreement.buckets.filter((bucket) => bucket.template_category === targetCategory)
  }

  const calculateTotal = () => {
    const unitCost = Number.parseFloat(transactionForm.unit_cost) || 0
    const quantity = Number.parseInt(transactionForm.quantity) || 1
    return unitCost * quantity
  }

  const generateContractDocument = (agreement: ServiceAgreement) => {
    const summary = getAgreementSummary(agreement)
    const today = new Date().toLocaleDateString()

    return `
SERVICE AGREEMENT CONTRACT

Agreement Number: ${agreement.agreement_number}
Date: ${today}

PARTIES:
Provider: ${organization?.name || "Organization Name"}
Address: ${organization?.address || "Organization Address"}
Phone: ${organization?.phone || "Organization Phone"}
Email: ${organization?.email || "Organization Email"}

Client: ${client?.first_name} ${client?.last_name}

AGREEMENT DETAILS:
Agreement Name: ${agreement.name}
Description: ${agreement.description}
Start Date: ${new Date(agreement.start_date).toLocaleDateString()}
End Date: ${agreement.end_date ? new Date(agreement.end_date).toLocaleDateString() : "Ongoing"}
Total Agreement Value: ${formatCurrency(agreement.total_value)}
Allocated Amount: ${formatCurrency(agreement.allocated_amount)}

FUNDING STRUCTURE:
${Object.entries(summary.fundingSources)
  .map(([source, amount]) => `${source.charAt(0).toUpperCase() + source.slice(1)} Funding: ${formatCurrency(amount)}`)
  .join("\n")}

BUCKET BREAKDOWN:
Draw-Down Buckets: ${summary.drawDownCount} (Total: ${formatCurrency(summary.drawDownTotal)})
Fill-Up Buckets: ${summary.fillUpCount} (Total: ${formatCurrency(summary.fillUpTotal)})

BUCKET DETAILS:
${agreement.buckets
  .map(
    (bucket) => `
- ${bucket.custom_name || bucket.template_name}
  Type: ${bucket.template_category.replace("_", "-")} | Source: ${bucket.template_funding_source}
  Amount: ${formatCurrency(bucket.custom_amount || 0)}
  ${bucket.notes ? `Notes: ${bucket.notes}` : ""}
`,
  )
  .join("")}

This agreement outlines the service delivery framework and funding arrangements between the parties.

Generated on: ${today}
    `.trim()
  }

  const downloadContract = (agreement: ServiceAgreement) => {
    const contractText = generateContractDocument(agreement)
    const blob = new Blob([contractText], { type: "text/plain" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${agreement.agreement_number}_Service_Agreement.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
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

  const getStatusIcon = (status: string) => {
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

  const getUsagePercentage = (agreement: ServiceAgreement) => {
    if (agreement.allocated_amount === 0) return 0
    return (agreement.spent_amount / agreement.allocated_amount) * 100
  }

  const isAgreementExpired = (agreement: ServiceAgreement) => {
    if (!agreement.end_date) return false
    return new Date() > new Date(agreement.end_date)
  }

  // Update expired agreements
  useEffect(() => {
    const updateExpiredAgreements = async () => {
      const expiredAgreements = agreements.filter(
        (agreement) => agreement.status === "current" && isAgreementExpired(agreement),
      )

      if (expiredAgreements.length > 0) {
        try {
          const { error } = await supabase
            .from("service_agreements")
            .update({ status: "expired" })
            .in(
              "id",
              expiredAgreements.map((a) => a.id),
            )

          if (!error) {
            setAgreements((prev) =>
              prev.map((agreement) => {
                if (agreement.status === "current" && isAgreementExpired(agreement)) {
                  return { ...agreement, status: "expired" as const }
                }
                return agreement
              }),
            )
          }
        } catch (error) {
          console.error("Error updating expired agreements:", error)
        }
      }
    }

    updateExpiredAgreements()
    // Check for expired agreements every minute
    const interval = setInterval(updateExpiredAgreements, 60000)
    return () => clearInterval(interval)
  }, [agreements])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading service agreements...</div>
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
              <FileText className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Service Agreements</h3>
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
        {/* Header */}
        <div className="mb-8">
          <Link
            href={`/dashboard/clients/${client.id}`}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to {client.first_name} {client.last_name}
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Service Agreements</h1>
              <p className="text-gray-600 mt-1">
                Create and manage service agreements with funding allocation and transaction tracking
              </p>
            </div>

            <Button onClick={() => setShowCreateDialog(true)} disabled={client.status !== "active"}>
              <Plus className="w-4 h-4 mr-2" />
              New Agreement
            </Button>
          </div>
        </div>

        {/* Client not active warning */}
        {client.status !== "active" && (
          <div className="mb-6">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <FileText className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Client Not Active</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      This client must be converted to Active status to create service agreements.
                    </p>
                    <Button asChild className="mt-3" size="sm">
                      <Link href={`/dashboard/clients/${client.id}`}>Convert to Active</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* No bucket templates warning */}
        {bucketTemplates.length === 0 && (
          <div className="mb-6">
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-blue-900">No Bucket Templates</h3>
                    <p className="text-blue-700 text-sm mt-1">
                      You need to create bucket templates before you can build service agreements. Bucket templates are
                      the building blocks for your funding structures.
                    </p>
                    <Button asChild className="mt-3" size="sm">
                      <Link href="/dashboard/buckets">Create Bucket Templates</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Agreements List */}
        {agreements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Agreements</h3>
              <p className="text-gray-500 mb-4">
                Create your first service agreement with funding allocation and transaction tracking
              </p>
              <Button onClick={() => setShowCreateDialog(true)} disabled={client.status !== "active"}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agreement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {agreements.map((agreement) => {
              const summary = getAgreementSummary(agreement)
              const canDelete = agreement.status === "draft" && !agreement.has_been_current
              const usagePercentage = getUsagePercentage(agreement)

              return (
                <Card key={agreement.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <FileText className="w-5 h-5 text-blue-600" />
                          {agreement.name}
                          <Badge className="text-xs font-mono">{agreement.agreement_number}</Badge>
                        </CardTitle>
                        <p className="text-gray-600 mt-1">{agreement.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <Badge className={`${getStatusColor(agreement.status)} flex items-center gap-1`}>
                            {getStatusIcon(agreement.status)}
                            {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            {new Date(agreement.start_date).toLocaleDateString()}
                            {agreement.end_date && ` - ${new Date(agreement.end_date).toLocaleDateString()}`}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-green-600">
                          {formatCurrency(agreement.allocated_amount)}
                        </div>
                        <div className="text-sm text-gray-500">allocated</div>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent>
                    {/* Balance Information */}
                    <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Funding Status</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                        <div>
                          <div className="text-gray-500">Allocated</div>
                          <div className="font-semibold text-lg">{formatCurrency(agreement.allocated_amount)}</div>
                        </div>
                        <div>
                          <div className="text-gray-500">Spent</div>
                          <div className="font-semibold text-lg text-red-600">
                            {formatCurrency(agreement.spent_amount)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">Remaining</div>
                          <div className="font-semibold text-lg text-green-600">
                            {formatCurrency(agreement.remaining_balance)}
                          </div>
                        </div>
                      </div>

                      {/* Usage Progress */}
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Usage</span>
                          <span className="font-medium">{usagePercentage.toFixed(1)}%</span>
                        </div>
                        <Progress value={usagePercentage} className="h-2" />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Spent: {formatCurrency(agreement.spent_amount)}</span>
                          <span>Remaining: {formatCurrency(agreement.remaining_balance)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Agreement Summary */}
                    {agreement.buckets.length > 0 && (
                      <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-medium text-gray-900 mb-3">Agreement Summary</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <div className="text-gray-500">Total Buckets</div>
                            <div className="font-semibold">{summary.totalBuckets}</div>
                          </div>
                          <div>
                            <div className="text-gray-500">Draw-Down</div>
                            <div className="font-semibold text-green-600">
                              {summary.drawDownCount} ({formatCurrency(summary.drawDownTotal)})
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Fill-Up</div>
                            <div className="font-semibold text-blue-600">
                              {summary.fillUpCount} ({formatCurrency(summary.fillUpTotal)})
                            </div>
                          </div>
                          <div>
                            <div className="text-gray-500">Funding Sources</div>
                            <div className="font-semibold">
                              {Object.keys(summary.fundingSources)
                                .map((source) => source.charAt(0).toUpperCase() + source.slice(1))
                                .join(", ")}
                            </div>
                          </div>
                        </div>

                        {Object.keys(summary.fundingSources).length > 1 && (
                          <div className="mt-3 pt-3 border-t">
                            <div className="text-sm text-gray-600">Funding Breakdown:</div>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {Object.entries(summary.fundingSources).map(([source, amount]) => (
                                <Badge key={source} variant="outline" className="text-xs">
                                  {source.charAt(0).toUpperCase() + source.slice(1)}: {formatCurrency(amount)}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Buckets in Agreement */}
                    <div className="space-y-3 mb-4">
                      <h4 className="font-medium text-gray-900">Funding Buckets</h4>
                      {agreement.buckets.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                          <p className="text-gray-500 mb-2">No buckets added yet</p>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAgreement(agreement)
                              setShowBucketDialog(true)
                            }}
                            disabled={agreement.status !== "draft" || bucketTemplates.length === 0}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add First Bucket
                          </Button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {agreement.buckets.map((bucket) => (
                            <div
                              key={bucket.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`p-2 rounded-lg ${
                                    bucket.template_category === "draw_down"
                                      ? "bg-green-100 text-green-600"
                                      : "bg-blue-100 text-blue-600"
                                  }`}
                                >
                                  {bucket.template_category === "draw_down" ? (
                                    <TrendingDown className="w-4 h-4" />
                                  ) : (
                                    <TrendingUp className="w-4 h-4" />
                                  )}
                                </div>
                                <div>
                                  <div className="font-medium text-sm">
                                    {bucket.custom_name || bucket.template_name}
                                  </div>
                                  <div className="text-xs text-gray-500 capitalize">
                                    {bucket.template_funding_source} • {bucket.template_category.replace("_", "-")}
                                  </div>
                                  {bucket.notes && <div className="text-xs text-gray-400 mt-1">{bucket.notes}</div>}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="font-semibold text-sm">
                                    {formatCurrency(bucket.custom_amount || 0)}
                                  </div>
                                </div>
                                {agreement.status === "draft" && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => removeBucketFromAgreement(bucket.id)}
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
                    </div>

                    {/* Agreement Actions */}
                    <div className="flex gap-2 pt-4 border-t">
                      {agreement.status === "draft" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAgreement(agreement)
                              setShowBucketDialog(true)
                            }}
                            disabled={bucketTemplates.length === 0}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Bucket
                          </Button>

                          {agreement.buckets.length > 0 && (
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => {
                                setSelectedAgreement(agreement)
                                setShowMakeCurrentDialog(true)
                              }}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Make Current
                            </Button>
                          )}

                          {canDelete && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700 bg-transparent"
                              onClick={() => {
                                setAgreementToDelete(agreement)
                                setShowDeleteDialog(true)
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          )}
                        </>
                      )}

                      {agreement.status === "current" && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAgreement(agreement)
                              setShowTransactionDialog(true)
                            }}
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            New Transaction
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAgreement(agreement)
                              makeAgreementDraft()
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit (Back to Draft)
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedAgreement(agreement)
                              setShowContractDialog(true)
                            }}
                          >
                            <FileCheck className="w-4 h-4 mr-1" />
                            View Contract
                          </Button>
                        </>
                      )}

                      <Button size="sm" variant="outline" onClick={() => duplicateAgreement(agreement)}>
                        <Copy className="w-4 h-4 mr-1" />
                        Duplicate
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Recent Transactions */}
        {recentTransactions.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recentTransactions.slice(0, 5).map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-full ${
                          transaction.transaction_type === "drawdown" ||
                          transaction.transaction_type === "service_delivery"
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-600"
                        }`}
                      >
                        {transaction.transaction_type === "drawdown" ||
                        transaction.transaction_type === "service_delivery" ? (
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
                          {transaction.transaction_type.charAt(0).toUpperCase() + transaction.transaction_type.slice(1)}
                          {transaction.bucket_name && ` • ${transaction.bucket_name}`}
                          {transaction.service_id && ` • ID: ${transaction.service_id}`}
                          {transaction.quantity && transaction.quantity > 1 && ` • Qty: ${transaction.quantity}`}
                        </div>
                        <div className="text-xs text-gray-400">{new Date(transaction.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`font-semibold ${
                          transaction.transaction_type === "drawdown" ||
                          transaction.transaction_type === "service_delivery"
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {transaction.transaction_type === "drawdown" ||
                        transaction.transaction_type === "service_delivery"
                          ? "-"
                          : "+"}
                        {formatCurrency(transaction.amount)}
                      </div>
                      {transaction.unit_cost && transaction.quantity && (
                        <div className="text-xs text-gray-500">
                          {formatCurrency(transaction.unit_cost)} × {transaction.quantity}
                        </div>
                      )}
                      <div className="text-sm text-gray-500 capitalize">{transaction.status}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Create Agreement Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Create Service Agreement
              </DialogTitle>
              <DialogDescription>
                Create a new service agreement with funding allocation. You'll add bucket templates as building blocks
                next.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="agreement_name">Agreement Name *</Label>
                <Input
                  id="agreement_name"
                  placeholder="e.g., Standard Care Package"
                  value={newAgreement.name}
                  onChange={(e) => setNewAgreement((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="agreement_description">Description</Label>
                <Textarea
                  id="agreement_description"
                  placeholder="Describe this service agreement..."
                  value={newAgreement.description}
                  onChange={(e) => setNewAgreement((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="allocated_amount">Allocated Amount *</Label>
                <Input
                  id="allocated_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={newAgreement.allocated_amount}
                  onChange={(e) => setNewAgreement((prev) => ({ ...prev, allocated_amount: e.target.value }))}
                />
                <p className="text-sm text-gray-500 mt-1">Total funding allocated for this agreement</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="start_date">Start Date *</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={newAgreement.start_date}
                    onChange={(e) => setNewAgreement((prev) => ({ ...prev, start_date: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={newAgreement.end_date}
                    onChange={(e) => setNewAgreement((prev) => ({ ...prev, end_date: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={createAgreement}
                disabled={!newAgreement.name || !newAgreement.start_date || !newAgreement.allocated_amount}
              >
                <Save className="w-4 h-4 mr-2" />
                Create Agreement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Transaction Dialog */}
        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-blue-600" />
                New Transaction
              </DialogTitle>
              <DialogDescription>Create a transaction for {selectedAgreement?.name}</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Agreement Info */}
              {selectedAgreement && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900">{selectedAgreement.name}</div>
                  <div className="text-sm text-gray-600">
                    Available Balance: {formatCurrency(selectedAgreement.remaining_balance)}
                  </div>
                </div>
              )}

              {/* Transaction Type */}
              <div>
                <Label htmlFor="transaction_type">Transaction Type *</Label>
                <Select
                  value={transactionForm.transaction_type}
                  onValueChange={(value: "drawdown" | "invoice") =>
                    setTransactionForm((prev) => ({ ...prev, transaction_type: value, bucket_id: "" }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="drawdown">
                      <div className="flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-red-600" />
                        Draw Down (Service Delivery)
                      </div>
                    </SelectItem>
                    <SelectItem value="invoice">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        Invoice (Add Funds)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Bucket Selection */}
              <div>
                <Label htmlFor="bucket_id">Bucket *</Label>
                <Select
                  value={transactionForm.bucket_id}
                  onValueChange={(value) => setTransactionForm((prev) => ({ ...prev, bucket_id: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a bucket" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableBuckets().map((bucket) => (
                      <SelectItem key={bucket.id} value={bucket.id}>
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-3 h-3 rounded-full ${
                              bucket.template_category === "draw_down" ? "bg-green-500" : "bg-blue-500"
                            }`}
                          />
                          {bucket.custom_name || bucket.template_name}
                          <span className="text-sm text-gray-500">({formatCurrency(bucket.custom_amount || 0)})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getAvailableBuckets().length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No {transactionForm.transaction_type === "drawdown" ? "draw-down" : "fill-up"} buckets available
                  </p>
                )}
              </div>

              {/* Service Description */}
              <div>
                <Label htmlFor="service_description">Service Description *</Label>
                <Input
                  id="service_description"
                  placeholder="e.g., Personal Care Support, Transport Service"
                  value={transactionForm.service_description}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, service_description: e.target.value }))}
                />
              </div>

              {/* Service ID */}
              <div>
                <Label htmlFor="service_id">Service ID</Label>
                <Input
                  id="service_id"
                  placeholder="e.g., SVC-001, TRANS-123"
                  value={transactionForm.service_id}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, service_id: e.target.value }))}
                />
              </div>

              {/* Unit Cost and Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="unit_cost">Unit Cost (AUD) *</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={transactionForm.unit_cost}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, unit_cost: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    value={transactionForm.quantity}
                    onChange={(e) => setTransactionForm((prev) => ({ ...prev, quantity: e.target.value }))}
                  />
                </div>
              </div>

              {/* Total (Calculated) */}
              <div>
                <Label>Total Amount</Label>
                <div className="text-2xl font-bold text-green-600 py-2">{formatCurrency(calculateTotal())}</div>
                {selectedAgreement &&
                  transactionForm.transaction_type === "drawdown" &&
                  calculateTotal() > selectedAgreement.remaining_balance && (
                    <p className="text-sm text-red-600">
                      Amount exceeds available balance of {formatCurrency(selectedAgreement.remaining_balance)}
                    </p>
                  )}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Additional Notes</Label>
                <Textarea
                  id="description"
                  placeholder="Any additional notes about this transaction..."
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={createTransaction}
                disabled={
                  !transactionForm.service_description ||
                  !transactionForm.unit_cost ||
                  getAvailableBuckets().length === 0 ||
                  (selectedAgreement &&
                    transactionForm.transaction_type === "drawdown" &&
                    calculateTotal() > selectedAgreement.remaining_balance)
                }
              >
                <Save className="w-4 h-4 mr-2" />
                Create Transaction
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Bucket Dialog */}
        <Dialog open={showBucketDialog} onOpenChange={setShowBucketDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-blue-600" />
                Add Bucket to Agreement
              </DialogTitle>
              <DialogDescription>
                Select a bucket template and configure it for this service agreement
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Template Selection */}
              <div>
                <Label>Select Bucket Template</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {bucketTemplates.map((template) => (
                    <Card
                      key={template.id}
                      className={`cursor-pointer hover:shadow-md transition-shadow ${
                        selectedTemplate?.id === template.id ? "border-2 border-blue-500" : ""
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <CardHeader>
                        <CardTitle className="text-sm font-medium">{template.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="text-sm text-gray-600">
                        {template.description}
                        <div className="mt-2">
                          <Badge variant="secondary">{template.category.replace("_", "-")}</Badge>
                          <Badge variant="outline" className="ml-2">
                            {template.funding_source}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {bucketTemplates.length === 0 && (
                  <p className="text-sm text-amber-600 mt-1">
                    No bucket templates available. Create them in the{" "}
                    <Link href="/dashboard/buckets" className="underline">
                      Bucket Templates
                    </Link>{" "}
                    section.
                  </p>
                )}
              </div>

              {/* Configuration */}
              {selectedTemplate && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Bucket Configuration</h3>

                  <div>
                    <Label htmlFor="custom_name">Custom Bucket Name</Label>
                    <Input
                      id="custom_name"
                      placeholder={`e.g., ${selectedTemplate.name} - Custom`}
                      value={bucketConfig.custom_name}
                      onChange={(e) => setBucketConfig((prev) => ({ ...prev, custom_name: e.target.value }))}
                    />
                    <p className="text-sm text-gray-500 mt-1">Customize the bucket name for this agreement</p>
                  </div>

                  <div>
                    <Label htmlFor="custom_amount">Custom Amount</Label>
                    <Input
                      id="custom_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder={selectedTemplate.starting_amount || selectedTemplate.credit_limit || "0.00"}
                      value={bucketConfig.custom_amount}
                      onChange={(e) => setBucketConfig((prev) => ({ ...prev, custom_amount: e.target.value }))}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      Override the default amount for this bucket (leave blank for default)
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any additional notes about this bucket..."
                      value={bucketConfig.notes}
                      onChange={(e) => setBucketConfig((prev) => ({ ...prev, notes: e.target.value }))}
                      rows={2}
                    />
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBucketDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addBucketToAgreement} disabled={!selectedTemplate}>
                <Save className="w-4 h-4 mr-2" />
                Add Bucket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Agreement Dialog */}
        <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-600" />
                Delete Service Agreement
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this service agreement? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="text-center py-6">
              <p className="text-gray-600">
                Deleting agreement: <strong>{agreementToDelete?.name}</strong>
              </p>
              <p className="text-gray-500 mt-2">This will permanently remove the agreement and all associated data.</p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteAgreement}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Agreement
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Make Current Dialog */}
        <Dialog open={showMakeCurrentDialog} onOpenChange={setShowMakeCurrentDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                Make Agreement Current
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to make this agreement current? This will expire any other current agreements for
                this client.
              </DialogDescription>
            </DialogHeader>

            <div className="text-center py-6">
              <p className="text-gray-600">
                Making agreement: <strong>{selectedAgreement?.name}</strong> current.
              </p>
              <p className="text-gray-500 mt-2">
                This will automatically expire any other current agreements for this client.
              </p>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowMakeCurrentDialog(false)}>
                Cancel
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={makeAgreementCurrent}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Make Current
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Contract Dialog */}
        <Dialog open={showContractDialog} onOpenChange={setShowContractDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-blue-600" />
                Service Agreement Contract
              </DialogTitle>
              <DialogDescription>View and download the service agreement contract.</DialogDescription>
            </DialogHeader>

            <div className="whitespace-pre-wrap font-mono text-sm p-4 bg-gray-50 rounded-lg">
              {selectedAgreement && generateContractDocument(selectedAgreement)}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowContractDialog(false)}>
                Close
              </Button>
              {selectedAgreement && (
                <Button onClick={() => downloadContract(selectedAgreement)}>
                  <Save className="w-4 h-4 mr-2" />
                  Download Contract
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
