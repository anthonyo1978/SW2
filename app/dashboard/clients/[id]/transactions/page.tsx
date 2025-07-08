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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
  Receipt,
  Plus,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Loader2,
  ArrowLeft,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Client {
  id: string
  first_name: string
  last_name: string
  status: string
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
  agreement_buckets: AgreementBucket[]
}

interface AgreementBucket {
  id: string
  template_name: string
  template_category: "draw_down" | "fill_up"
  template_funding_source: string
  custom_amount: number
  current_balance: number
  notes?: string
}

interface Transaction {
  id: string
  transaction_number: string
  transaction_date: string
  description: string
  service_id?: string
  service_description?: string
  unit_cost?: number
  quantity?: number
  amount: number
  transaction_type: "service_delivery" | "invoice_item"
  status: string
  created_at: string
  agreement_buckets: {
    template_name: string
  }
}

interface TransactionForm {
  service_agreement_id: string
  bucket_id: string
  transaction_type: "service_delivery" | "invoice_item"
  service_id: string
  service_description: string
  unit_cost: string
  quantity: string
  notes: string
}

export default function ClientTransactionsPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [serviceAgreements, setServiceAgreements] = useState<ServiceAgreement[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [creating, setCreating] = useState(false)
  const [formData, setFormData] = useState<TransactionForm>({
    service_agreement_id: "",
    bucket_id: "",
    transaction_type: "service_delivery",
    service_id: "",
    service_description: "",
    unit_cost: "",
    quantity: "1",
    notes: "",
  })

  useEffect(() => {
    if (params.id) {
      fetchData(params.id as string)
    }
  }, [params.id])

  const fetchData = async (clientId: string) => {
    try {
      setLoading(true)

      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, status")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch service agreements with buckets
      const { data: agreementsData, error: agreementsError } = await supabase
        .from("service_agreements")
        .select(`
          *,
          agreement_buckets (*)
        `)
        .eq("client_id", clientId)
        .eq("status", "current")
        .order("created_at", { ascending: false })

      if (agreementsError) {
        console.error("Error loading agreements:", agreementsError)
        setServiceAgreements([])
      } else {
        setServiceAgreements(agreementsData || [])
      }

      // Fetch transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("transactions")
        .select(`
          *,
          agreement_buckets!inner(template_name)
        `)
        .eq("client_id", clientId)
        .order("created_at", { ascending: false })

      if (transactionsError) {
        console.error("Error loading transactions:", transactionsError)
        setTransactions([])
      } else {
        setTransactions(transactionsData || [])
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: keyof TransactionForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculateAmount = () => {
    const unitCost = Number.parseFloat(formData.unit_cost) || 0
    const quantity = Number.parseFloat(formData.quantity) || 1
    return unitCost * quantity
  }

  const getSelectedBucket = () => {
    if (!formData.service_agreement_id || !formData.bucket_id) return null
    const agreement = serviceAgreements.find((a) => a.id === formData.service_agreement_id)
    return agreement?.agreement_buckets.find((b) => b.id === formData.bucket_id) || null
  }

  const canCreateTransaction = () => {
    const bucket = getSelectedBucket()
    if (!bucket) return false

    const amount = calculateAmount()
    if (amount <= 0) return false

    // For draw-down buckets, check if there's sufficient balance
    if (formData.transaction_type === "service_delivery" && bucket.template_category === "draw_down") {
      return bucket.current_balance >= amount
    }

    return true
  }

  const createTransaction = async () => {
    if (!client || !canCreateTransaction()) return

    setCreating(true)
    try {
      const amount = calculateAmount()

      const { error } = await supabase.from("transactions").insert({
        client_id: client.id,
        service_agreement_id: formData.service_agreement_id,
        bucket_id: formData.bucket_id,
        transaction_type: formData.transaction_type,
        service_id: formData.service_id || null,
        service_description: formData.service_description,
        unit_cost: Number.parseFloat(formData.unit_cost) || null,
        quantity: Number.parseFloat(formData.quantity) || 1,
        amount: amount,
        transaction_date: new Date().toISOString().split("T")[0],
        description: `${formData.service_description} (${formData.quantity} × ${formatCurrency(
          Number.parseFloat(formData.unit_cost) || 0,
        )})`,
        status: "completed",
        notes: formData.notes || null,
      })

      if (error) throw error

      // Reset form and close dialog
      setFormData({
        service_agreement_id: "",
        bucket_id: "",
        transaction_type: "service_delivery",
        service_id: "",
        service_description: "",
        unit_cost: "",
        quantity: "1",
        notes: "",
      })
      setShowCreateDialog(false)

      // Refresh data
      await fetchData(client.id)
    } catch (error: any) {
      console.error("Error creating transaction:", error)
      alert(`Failed to create transaction: ${error.message}`)
    } finally {
      setCreating(false)
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
      case "completed":
        return "bg-green-100 text-green-800"
      case "pending":
        return "bg-yellow-100 text-yellow-800"
      case "cancelled":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4" />
      case "pending":
        return <Clock className="w-4 h-4" />
      case "cancelled":
        return <AlertTriangle className="w-4 h-4" />
      default:
        return <Clock className="w-4 h-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading transaction data...</div>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Data</h3>
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
              <BreadcrumbLink asChild>
                <Link href={`/dashboard/clients/${client.id}`}>
                  {client.first_name} {client.last_name}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Transactions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>
              <p className="text-gray-600 mt-1">
                Manage transactions for {client.first_name} {client.last_name}
              </p>
            </div>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button disabled={serviceAgreements.length === 0}>
                <Plus className="w-4 h-4 mr-2" />
                Create Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Transaction</DialogTitle>
                <DialogDescription>
                  Create a new transaction to track service delivery or invoice items.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Service Agreement Selection */}
                <div className="space-y-2">
                  <Label htmlFor="service_agreement">Service Agreement *</Label>
                  <Select
                    value={formData.service_agreement_id}
                    onValueChange={(value) => {
                      handleInputChange("service_agreement_id", value)
                      handleInputChange("bucket_id", "") // Reset bucket selection
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select service agreement" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceAgreements.map((agreement) => (
                        <SelectItem key={agreement.id} value={agreement.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{agreement.name}</span>
                            <span className="text-sm text-gray-500 ml-2">
                              {formatCurrency(agreement.remaining_balance || 0)} remaining
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Funding Bucket Selection */}
                {formData.service_agreement_id && (
                  <div className="space-y-2">
                    <Label htmlFor="bucket">Funding Bucket *</Label>
                    <Select value={formData.bucket_id} onValueChange={(value) => handleInputChange("bucket_id", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select funding bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        {serviceAgreements
                          .find((a) => a.id === formData.service_agreement_id)
                          ?.agreement_buckets.map((bucket) => (
                            <SelectItem key={bucket.id} value={bucket.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{bucket.template_name}</span>
                                <span className="text-sm text-gray-500 ml-2">
                                  {formatCurrency(bucket.current_balance)} available
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Transaction Type */}
                <div className="space-y-2">
                  <Label htmlFor="transaction_type">Transaction Type *</Label>
                  <Select
                    value={formData.transaction_type}
                    onValueChange={(value: "service_delivery" | "invoice_item") =>
                      handleInputChange("transaction_type", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="service_delivery">
                        <div className="flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-red-600" />
                          Service Delivery (Draw Down)
                        </div>
                      </SelectItem>
                      <SelectItem value="invoice_item">
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-green-600" />
                          Invoice Item (Fill Up)
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Service Details */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="service_id">Service ID</Label>
                    <Input
                      id="service_id"
                      value={formData.service_id}
                      onChange={(e) => handleInputChange("service_id", e.target.value)}
                      placeholder="Optional service ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange("quantity", e.target.value)}
                      placeholder="1"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="service_description">Service Description *</Label>
                  <Input
                    id="service_description"
                    value={formData.service_description}
                    onChange={(e) => handleInputChange("service_description", e.target.value)}
                    placeholder="Describe the service provided"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_cost">Unit Cost (AUD) *</Label>
                  <Input
                    id="unit_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.unit_cost}
                    onChange={(e) => handleInputChange("unit_cost", e.target.value)}
                    placeholder="0.00"
                  />
                </div>

                {/* Amount Calculation */}
                {formData.unit_cost && formData.quantity && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-blue-900">Total Amount:</span>
                      <span className="text-xl font-bold text-blue-900">{formatCurrency(calculateAmount())}</span>
                    </div>
                  </div>
                )}

                {/* Balance Warning */}
                {formData.transaction_type === "service_delivery" && getSelectedBucket() && (
                  <div
                    className={`p-4 rounded-lg ${
                      canCreateTransaction() ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
                    } border`}
                  >
                    <div className="flex items-center gap-2">
                      {canCreateTransaction() ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <div>
                        <div className="font-medium">
                          Available Balance: {formatCurrency(getSelectedBucket()?.current_balance || 0)}
                        </div>
                        {!canCreateTransaction() && (
                          <div className="text-sm text-red-600">Insufficient funds for this transaction</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleInputChange("notes", e.target.value)}
                    placeholder="Optional notes about this transaction"
                    rows={3}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={createTransaction}
                  disabled={
                    creating ||
                    !formData.service_agreement_id ||
                    !formData.bucket_id ||
                    !formData.service_description ||
                    !formData.unit_cost ||
                    !canCreateTransaction()
                  }
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Receipt className="w-4 h-4 mr-2" />
                      Create Transaction
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Column - Service Agreements Overview */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Active Agreements
                </CardTitle>
              </CardHeader>
              <CardContent>
                {serviceAgreements.length === 0 ? (
                  <div className="text-center py-6">
                    <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <div className="text-sm text-gray-500">No active agreements</div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {serviceAgreements.map((agreement) => (
                      <div key={agreement.id} className="p-3 border rounded-lg">
                        <div className="font-medium text-sm">{agreement.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{agreement.agreement_number}</div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-600">Remaining</span>
                          <span className="font-medium text-green-600 text-sm">
                            {formatCurrency(agreement.remaining_balance || 0)}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{agreement.agreement_buckets.length} buckets</div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Transactions Table */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="w-5 h-5" />
                    Transaction History
                  </CardTitle>
                  <Badge variant="outline">{transactions.length} transactions</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {transactions.length === 0 ? (
                  <div className="text-center py-12">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
                    <p className="text-gray-500 mb-4">Create your first transaction to start tracking services.</p>
                    <Button onClick={() => setShowCreateDialog(true)} disabled={serviceAgreements.length === 0}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Transaction
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Transaction</TableHead>
                          <TableHead>Service</TableHead>
                          <TableHead>Bucket</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{transaction.transaction_number}</div>
                                {transaction.service_id && (
                                  <div className="text-sm text-gray-500">ID: {transaction.service_id}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {transaction.service_description || transaction.description}
                                </div>
                                {transaction.unit_cost && transaction.quantity && (
                                  <div className="text-sm text-gray-500">
                                    {transaction.quantity} × {formatCurrency(transaction.unit_cost)}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{transaction.agreement_buckets.template_name}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {transaction.transaction_type === "service_delivery" ? (
                                  <>
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                    <span className="text-sm text-red-600">Draw Down</span>
                                  </>
                                ) : (
                                  <>
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="text-sm text-green-600">Fill Up</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <div
                                className={`font-medium ${
                                  transaction.transaction_type === "service_delivery"
                                    ? "text-red-600"
                                    : "text-green-600"
                                }`}
                              >
                                {transaction.transaction_type === "service_delivery" ? "-" : "+"}
                                {formatCurrency(transaction.amount)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getStatusColor(transaction.status)} flex items-center gap-1 w-fit`}>
                                {getStatusIcon(transaction.status)}
                                {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {new Date(transaction.transaction_date).toLocaleDateString()}
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
      </div>
    </div>
  )
}
