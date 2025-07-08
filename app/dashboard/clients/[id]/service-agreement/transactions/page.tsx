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
  ArrowLeft,
  Home,
  Receipt,
  Plus,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
  DollarSign,
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
  bucket_name: string
  created_at: string
}

interface TransactionForm {
  service_agreement_id: string
  bucket_id: string
  transaction_type: "service_delivery" | "invoice_item"
  service_id: string
  service_description: string
  unit_cost: number
  quantity: number
  notes: string
}

export default function TransactionsPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [serviceAgreements, setServiceAgreements] = useState<ServiceAgreement[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState<TransactionForm>({
    service_agreement_id: "",
    bucket_id: "",
    transaction_type: "service_delivery",
    service_id: "",
    service_description: "",
    unit_cost: 0,
    quantity: 1,
    notes: "",
  })

  useEffect(() => {
    if (params.id) {
      fetchData(params.id as string)
    }
  }, [params.id])

  const fetchData = async (clientId: string) => {
    try {
      // Fetch client
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

      if (agreementsError) throw agreementsError
      setServiceAgreements(agreementsData || [])

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
        const formattedTransactions =
          transactionsData?.map((t: any) => ({
            ...t,
            bucket_name: t.agreement_buckets?.template_name,
          })) || []
        setTransactions(formattedTransactions)
      }
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getSelectedAgreement = () => {
    return serviceAgreements.find((a) => a.id === form.service_agreement_id)
  }

  const getSelectedBucket = () => {
    const agreement = getSelectedAgreement()
    return agreement?.agreement_buckets.find((b) => b.id === form.bucket_id)
  }

  const calculateAmount = () => {
    return form.unit_cost * form.quantity
  }

  const canCreateTransaction = () => {
    const bucket = getSelectedBucket()
    if (!bucket) return false

    const amount = calculateAmount()
    if (form.transaction_type === "service_delivery" && bucket.template_category === "draw_down") {
      return bucket.current_balance >= amount
    }

    return amount > 0
  }

  const createTransaction = async () => {
    if (!client || !canCreateTransaction()) return

    setSaving(true)
    try {
      const bucket = getSelectedBucket()
      if (!bucket) throw new Error("Bucket not found")

      const amount = calculateAmount()

      // Generate transaction number
      const transactionNumber = `TXN-${Date.now()}`

      const transactionData = {
        client_id: client.id,
        service_agreement_id: form.service_agreement_id,
        bucket_id: form.bucket_id,
        transaction_number: transactionNumber,
        transaction_date: new Date().toISOString().split("T")[0],
        transaction_type: form.transaction_type,
        service_id: form.service_id || null,
        service_description: form.service_description,
        unit_cost: form.unit_cost,
        quantity: form.quantity,
        amount: amount,
        description: `${form.service_description} (${form.quantity} × $${form.unit_cost})`,
        notes: form.notes || null,
        status: "completed",
      }

      const { error } = await supabase.from("transactions").insert([transactionData])

      if (error) throw error

      // Reset form and close dialog
      setForm({
        service_agreement_id: "",
        bucket_id: "",
        transaction_type: "service_delivery",
        service_id: "",
        service_description: "",
        unit_cost: 0,
        quantity: 1,
        notes: "",
      })
      setShowCreateDialog(false)

      // Refresh data
      await fetchData(client.id)
    } catch (err: any) {
      console.error("Error creating transaction:", err)
      alert(`Failed to create transaction: ${err.message}`)
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link
              href={`/dashboard/clients/${client.id}`}
              className="inline-flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Client
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>
              <div className="text-gray-600 mt-1">
                Create and manage transactions for {client.first_name} {client.last_name}
              </div>
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
                  Create a transaction to record service delivery or invoice items for this client.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6">
                {/* Service Agreement Selection */}
                <div className="space-y-2">
                  <Label htmlFor="service_agreement">Service Agreement *</Label>
                  <Select
                    value={form.service_agreement_id}
                    onValueChange={(value) => {
                      setForm((prev) => ({ ...prev, service_agreement_id: value, bucket_id: "" }))
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service agreement" />
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

                {/* Bucket Selection */}
                {form.service_agreement_id && (
                  <div className="space-y-2">
                    <Label htmlFor="bucket">Funding Bucket *</Label>
                    <Select
                      value={form.bucket_id}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, bucket_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a funding bucket" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSelectedAgreement()?.agreement_buckets.map((bucket) => (
                          <SelectItem key={bucket.id} value={bucket.id}>
                            <div className="flex items-center justify-between w-full">
                              <div className="flex items-center gap-2">
                                <span>{bucket.template_name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {bucket.template_category === "draw_down" ? "Draw-Down" : "Fill-Up"}
                                </Badge>
                              </div>
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
                    value={form.transaction_type}
                    onValueChange={(value: "service_delivery" | "invoice_item") =>
                      setForm((prev) => ({ ...prev, transaction_type: value }))
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
                      value={form.service_id}
                      onChange={(e) => setForm((prev) => ({ ...prev, service_id: e.target.value }))}
                      placeholder="e.g., SVC-001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="service_description">Service Description *</Label>
                    <Input
                      id="service_description"
                      value={form.service_description}
                      onChange={(e) => setForm((prev) => ({ ...prev, service_description: e.target.value }))}
                      placeholder="e.g., Personal Care Support"
                      required
                    />
                  </div>
                </div>

                {/* Cost and Quantity */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="unit_cost">Unit Cost *</Label>
                    <Input
                      id="unit_cost"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.unit_cost}
                      onChange={(e) =>
                        setForm((prev) => ({ ...prev, unit_cost: Number.parseFloat(e.target.value) || 0 }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      value={form.quantity}
                      onChange={(e) => setForm((prev) => ({ ...prev, quantity: Number.parseInt(e.target.value) || 1 }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Total Amount</Label>
                    <div className="h-10 px-3 py-2 bg-gray-50 border rounded-md flex items-center font-medium">
                      {formatCurrency(calculateAmount())}
                    </div>
                  </div>
                </div>

                {/* Balance Check */}
                {form.bucket_id && form.transaction_type === "service_delivery" && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 text-blue-800 mb-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-medium">Balance Check</span>
                    </div>
                    <div className="text-sm text-blue-700">
                      <div className="flex justify-between">
                        <span>Available Balance:</span>
                        <span className="font-medium">{formatCurrency(getSelectedBucket()?.current_balance || 0)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Transaction Amount:</span>
                        <span className="font-medium">{formatCurrency(calculateAmount())}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-1 mt-1">
                        <span>Remaining After:</span>
                        <span className="font-medium">
                          {formatCurrency((getSelectedBucket()?.current_balance || 0) - calculateAmount())}
                        </span>
                      </div>
                    </div>
                    {!canCreateTransaction() && (
                      <div className="flex items-center gap-2 text-red-600 mt-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="text-sm">Insufficient funds for this transaction</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Additional notes about this transaction..."
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
                    saving ||
                    !form.service_agreement_id ||
                    !form.bucket_id ||
                    !form.service_description ||
                    !canCreateTransaction()
                  }
                >
                  {saving ? (
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

        {/* Service Agreements Overview */}
        {serviceAgreements.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {serviceAgreements.map((agreement) => (
              <Card key={agreement.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{agreement.name}</CardTitle>
                    <Badge className="bg-green-100 text-green-800">Current</Badge>
                  </div>
                  <div className="text-sm text-gray-500 font-mono">{agreement.agreement_number}</div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total Value</span>
                      <span className="font-medium">{formatCurrency(agreement.total_value)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(agreement.remaining_balance || 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Buckets</span>
                      <span className="font-medium">{agreement.agreement_buckets.length}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Transactions Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Transaction History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-12">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Transactions Yet</h3>
                <div className="text-gray-500 mb-4">
                  {serviceAgreements.length === 0
                    ? "Create a service agreement first to start recording transactions"
                    : "Create your first transaction to start tracking service delivery"}
                </div>
                {serviceAgreements.length > 0 && (
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create First Transaction
                  </Button>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Bucket</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium font-mono text-sm">{transaction.transaction_number}</div>
                          <div className="text-sm text-gray-500">{transaction.description}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{transaction.service_description}</div>
                          {transaction.service_id && (
                            <div className="text-sm text-gray-500">ID: {transaction.service_id}</div>
                          )}
                          {transaction.unit_cost && transaction.quantity && (
                            <div className="text-sm text-gray-500">
                              {transaction.quantity} × {formatCurrency(transaction.unit_cost)}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{transaction.bucket_name}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {transaction.transaction_type === "service_delivery" ? (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-600" />
                              <span className="text-red-600">Service Delivery</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-600" />
                              <span className="text-green-600">Invoice Item</span>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div
                          className={`font-semibold ${
                            transaction.transaction_type === "service_delivery" ? "text-red-600" : "text-green-600"
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
                        <div className="text-sm">{new Date(transaction.transaction_date).toLocaleDateString()}</div>
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
