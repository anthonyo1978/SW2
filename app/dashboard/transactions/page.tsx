"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Home,
  Search,
  Filter,
  Download,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Copy,
  FileText,
  Receipt,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { toast } from "@/hooks/use-toast"

interface Transaction {
  id: string
  transaction_number: string
  client_id: string
  agreement_id: string
  bucket_id?: string
  transaction_date: string
  description: string
  service_description?: string
  service_id?: string
  unit_cost?: number
  quantity?: number
  amount: number
  transaction_type: string
  status: string
  created_at: string
  client_name?: string
  agreement_name?: string
  bucket_name?: string
  remaining_balance?: number
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([])
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Filter states
  const [searchTerm, setSearchTerm] = useState("")
  const [clientFilter, setClientFilter] = useState("All clients")
  const [typeFilter, setTypeFilter] = useState("All types")
  const [statusFilter, setStatusFilter] = useState("All statuses")

  // Get unique values for filters
  const uniqueClients = Array.from(new Set(transactions.map((t) => t.client_name).filter(Boolean)))
  const uniqueTypes = Array.from(new Set(transactions.map((t) => t.transaction_type)))
  const uniqueStatuses = Array.from(new Set(transactions.map((t) => t.status)))

  useEffect(() => {
    loadTransactions()
  }, [])

  useEffect(() => {
    filterTransactions()
  }, [transactions, searchTerm, clientFilter, typeFilter, statusFilter])

  const loadTransactions = async () => {
    try {
      setLoading(true)
      setError("")

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

      // Try to load transactions with full details
      let transactionsData: any[] = []

      try {
        // First attempt: Full join with all related data
        const { data: fullData, error: fullError } = await supabase
          .from("transactions")
          .select(`
            *,
            clients!inner(id, first_name, last_name),
            service_agreements!inner(id, name, remaining_balance),
            agreement_buckets(id, template_name)
          `)
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })

        if (fullError) throw fullError
        transactionsData = fullData || []
      } catch (joinError) {
        console.warn("Full join failed, trying simpler approach:", joinError)

        // Fallback: Simple transaction query
        const { data: simpleData, error: simpleError } = await supabase
          .from("transactions")
          .select("*")
          .eq("organization_id", profile.organization_id)
          .order("created_at", { ascending: false })

        if (simpleError) throw simpleError
        transactionsData = simpleData || []

        // Enrich with client data separately
        if (transactionsData.length > 0) {
          const clientIds = [...new Set(transactionsData.map((t) => t.client_id).filter(Boolean))]
          if (clientIds.length > 0) {
            const { data: clientsData } = await supabase
              .from("clients")
              .select("id, first_name, last_name")
              .in("id", clientIds)

            const clientsMap = new Map(clientsData?.map((c) => [c.id, c]) || [])

            transactionsData = transactionsData.map((transaction) => {
              const client = clientsMap.get(transaction.client_id)
              return {
                ...transaction,
                clients: client ? [client] : [],
              }
            })
          }
        }
      }

      // Transform data to match our interface
      const transformedTransactions: Transaction[] = transactionsData.map((transaction: any) => {
        const client = transaction.clients?.[0] || transaction.clients
        const agreement = transaction.service_agreements?.[0] || transaction.service_agreements
        const bucket = transaction.agreement_buckets?.[0] || transaction.agreement_buckets

        return {
          id: transaction.id,
          transaction_number: transaction.transaction_number || `TXN:${transaction.id.slice(-7)}`,
          client_id: transaction.client_id,
          agreement_id: transaction.agreement_id,
          bucket_id: transaction.bucket_id,
          transaction_date: transaction.transaction_date,
          description: transaction.description,
          service_description: transaction.service_description,
          service_id: transaction.service_id,
          unit_cost: transaction.unit_cost,
          quantity: transaction.quantity,
          amount: transaction.amount,
          transaction_type: transaction.transaction_type,
          status: transaction.status,
          created_at: transaction.created_at,
          client_name: client ? `${client.first_name} ${client.last_name}` : "Unknown Client",
          agreement_name: agreement?.name || "Unknown Agreement",
          bucket_name: bucket?.template_name || null,
          remaining_balance: agreement?.remaining_balance || null,
        }
      })

      setTransactions(transformedTransactions)
      console.log(`Loaded ${transformedTransactions.length} transactions`)
    } catch (err: any) {
      console.error("Error loading transactions:", err)
      setError(`Could not load client data: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const filterTransactions = () => {
    let filtered = transactions

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.transaction_number?.toLowerCase().includes(search) ||
          t.description?.toLowerCase().includes(search) ||
          t.service_description?.toLowerCase().includes(search) ||
          t.client_name?.toLowerCase().includes(search) ||
          t.agreement_name?.toLowerCase().includes(search) ||
          t.service_id?.toLowerCase().includes(search),
      )
    }

    if (clientFilter !== "All clients") {
      filtered = filtered.filter((t) => t.client_name === clientFilter)
    }

    if (typeFilter !== "All types") {
      filtered = filtered.filter((t) => t.transaction_type === typeFilter)
    }

    if (statusFilter !== "All statuses") {
      filtered = filtered.filter((t) => t.status === statusFilter)
    }

    setFilteredTransactions(filtered)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTransactions(new Set(filteredTransactions.map((t) => t.id)))
    } else {
      setSelectedTransactions(new Set())
    }
  }

  const handleSelectTransaction = (transactionId: string, checked: boolean) => {
    const newSelected = new Set(selectedTransactions)
    if (checked) {
      newSelected.add(transactionId)
    } else {
      newSelected.delete(transactionId)
    }
    setSelectedTransactions(newSelected)
  }

  const getSelectedTransactions = () => {
    return filteredTransactions.filter((t) => selectedTransactions.has(t.id))
  }

  const exportToCSV = (data: Transaction[], filename: string) => {
    const headers = [
      "Transaction Number",
      "Date",
      "Client",
      "Agreement",
      "Service Description",
      "Service ID",
      "Type",
      "Amount",
      "Status",
      "Remaining Balance",
    ]

    const csvContent = [
      headers.join(","),
      ...data.map((t) =>
        [
          t.transaction_number,
          new Date(t.transaction_date).toLocaleDateString(),
          `"${t.client_name}"`,
          `"${t.agreement_name}"`,
          `"${t.service_description || t.description}"`,
          t.service_id || "",
          t.transaction_type,
          t.amount,
          t.status,
          t.remaining_balance || "",
        ].join(","),
      ),
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportSelected = () => {
    const selected = getSelectedTransactions()
    if (selected.length === 0) {
      toast({
        title: "No transactions selected",
        description: "Please select transactions to export",
        variant: "destructive",
      })
      return
    }

    exportToCSV(selected, `transactions_export_${new Date().toISOString().split("T")[0]}.csv`)
    toast({
      title: "Export completed",
      description: `Exported ${selected.length} transactions`,
    })
  }

  const handleProdaClaim = () => {
    const selected = getSelectedTransactions()
    const drawdowns = selected.filter(
      (t) => t.transaction_type === "drawdown" || t.transaction_type === "service_delivery",
    )

    if (drawdowns.length === 0) {
      toast({
        title: "No drawdown transactions selected",
        description: "Please select drawdown/service delivery transactions for Proda claim",
        variant: "destructive",
      })
      return
    }

    exportToCSV(drawdowns, `proda_claim_${new Date().toISOString().split("T")[0]}.csv`)
    toast({
      title: "Proda claim export completed",
      description: `Exported ${drawdowns.length} drawdown transactions`,
    })
  }

  const handleInvoice = () => {
    const selected = getSelectedTransactions()
    if (selected.length === 0) {
      toast({
        title: "No transactions selected",
        description: "Please select transactions to generate invoice",
        variant: "destructive",
      })
      return
    }

    const total = selected.reduce((sum, t) => sum + t.amount, 0)

    // Add totals row to the data
    const invoiceData = [
      ...selected,
      {
        ...selected[0], // Use first transaction as template
        transaction_number: "TOTAL",
        service_description: "Total Amount",
        amount: total,
        client_name: "",
        agreement_name: "",
        transaction_type: "",
        status: "",
      } as Transaction,
    ]

    exportToCSV(invoiceData, `invoice_${new Date().toISOString().split("T")[0]}.csv`)
    toast({
      title: "Invoice generated",
      description: `Generated invoice for ${selected.length} transactions (Total: $${total.toFixed(2)})`,
    })
  }

  const copyTransactionNumber = (transactionNumber: string) => {
    navigator.clipboard.writeText(transactionNumber)
    toast({
      title: "Copied",
      description: `Transaction number ${transactionNumber} copied to clipboard`,
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "drawdown":
      case "service_delivery":
        return <TrendingDown className="w-4 h-4 text-red-600" />
      case "invoice":
      case "refund":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      default:
        return <FileText className="w-4 h-4 text-gray-600" />
    }
  }

  const isAllSelected = filteredTransactions.length > 0 && selectedTransactions.size === filteredTransactions.length
  const isIndeterminate = selectedTransactions.size > 0 && selectedTransactions.size < filteredTransactions.length

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading transactions...</div>
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
              <BreadcrumbPage>Transactions</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Transaction Management</h1>
              <p className="text-gray-600 mt-1">Central financial command center for all client transactions</p>
            </div>
            <Button onClick={loadTransactions} variant="outline">
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900">Error Loading Transactions</h3>
                  <p className="text-red-700 text-sm mt-1">{error}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    id="search"
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="client-filter">Client</Label>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={clientFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All clients">All clients</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="type-filter">Type</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={typeFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All types">All types</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="status-filter">Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder={statusFilter} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All statuses">All statuses</SelectItem>
                    {uniqueStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("")
                    setClientFilter("All clients")
                    setTypeFilter("All types")
                    setStatusFilter("All statuses")
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Actions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {selectedTransactions.size > 0 ? (
                  <span className="font-medium">
                    {selectedTransactions.size} of {filteredTransactions.length} transactions selected
                  </span>
                ) : (
                  <span>
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportSelected} disabled={selectedTransactions.size === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export Selected
                </Button>
                <Button variant="outline" onClick={handleProdaClaim} disabled={selectedTransactions.size === 0}>
                  <FileText className="w-4 h-4 mr-2" />
                  Proda Claim
                </Button>
                <Button variant="outline" onClick={handleInvoice} disabled={selectedTransactions.size === 0}>
                  <Receipt className="w-4 h-4 mr-2" />
                  Invoice
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={handleSelectAll}
                        ref={(el) => {
                          if (el) el.indeterminate = isIndeterminate
                        }}
                      />
                    </TableHead>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Service Agreement</TableHead>
                    <TableHead>Service</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center py-12">
                        <div className="text-gray-500">
                          {transactions.length === 0 ? "No transactions found" : "No transactions match your filters"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTransactions.map((transaction) => (
                      <TableRow key={transaction.id} className="hover:bg-gray-50">
                        <TableCell>
                          <Checkbox
                            checked={selectedTransactions.has(transaction.id)}
                            onCheckedChange={(checked) => handleSelectTransaction(transaction.id, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell>
                          <button
                            onClick={() => copyTransactionNumber(transaction.transaction_number)}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-mono text-sm"
                          >
                            {transaction.transaction_number}
                            <Copy className="w-3 h-3" />
                          </button>
                        </TableCell>
                        <TableCell>{new Date(transaction.transaction_date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{transaction.client_name}</TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={transaction.agreement_name}>
                            {transaction.agreement_name}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium text-sm">
                              {transaction.service_description || transaction.description}
                            </div>
                            {transaction.service_id && (
                              <div className="text-xs text-gray-500">ID: {transaction.service_id}</div>
                            )}
                            {transaction.quantity && transaction.quantity > 1 && (
                              <div className="text-xs text-gray-500">Qty: {transaction.quantity}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTransactionIcon(transaction.transaction_type)}
                            <span className="capitalize text-sm">{transaction.transaction_type.replace("_", " ")}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
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
                          {transaction.unit_cost && (
                            <div className="text-xs text-gray-500">
                              {formatCurrency(transaction.unit_cost)} × {transaction.quantity || 1}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              transaction.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : transaction.status === "pending"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.remaining_balance !== null && (
                            <div className="font-medium text-green-600">
                              {formatCurrency(transaction.remaining_balance)}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
