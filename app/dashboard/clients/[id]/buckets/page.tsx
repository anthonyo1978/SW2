"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  ArrowLeft,
  DollarSign,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Plus,
  Minus,
  Clock,
  Shield,
  Loader2,
  Eye,
  RefreshCw,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Client {
  id: string
  first_name: string
  last_name: string
  status: string
  sah_classification_level: number
}

interface BucketDefinition {
  id: string
  bucket_code: string
  bucket_name: string
  bucket_category: "draw_down" | "fill_up"
  funding_source: string
}

interface ClientBucket {
  id: string
  bucket_definition_id: string
  current_balance: number
  available_balance: number
  credit_limit: number
  period_start: string
  period_end: string
  status: string
  bucket_definition: BucketDefinition
}

interface BucketTransaction {
  id: string
  transaction_type: "credit" | "debit"
  amount: number
  balance_after: number
  description: string
  reference_type: string
  processed_at: string
}

export default function ClientBucketsPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [buckets, setBuckets] = useState<ClientBucket[]>([])
  const [transactions, setTransactions] = useState<BucketTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [transactionLoading, setTransactionLoading] = useState(false)
  const [error, setError] = useState("")

  // Transaction dialog state
  const [showTransactionDialog, setShowTransactionDialog] = useState(false)
  const [selectedBucket, setSelectedBucket] = useState<ClientBucket | null>(null)
  const [transactionForm, setTransactionForm] = useState({
    type: "debit" as "credit" | "debit",
    amount: "",
    description: "",
    reference_type: "manual_adjustment",
  })

  useEffect(() => {
    if (params.id) {
      fetchClientAndBuckets(params.id as string)
    }
  }, [params.id])

  const fetchClientAndBuckets = async (clientId: string) => {
    try {
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, status, sah_classification_level")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Fetch client buckets with definitions
      const { data: bucketsData, error: bucketsError } = await supabase
        .from("client_buckets")
        .select(`
          *,
          bucket_definition:bucket_definitions(*)
        `)
        .eq("client_id", clientId)
        .order("bucket_definition(display_order)")

      if (bucketsError) throw bucketsError
      setBuckets(bucketsData || [])

      // Fetch recent transactions
      const { data: transactionsData, error: transactionsError } = await supabase
        .from("bucket_transactions")
        .select("*")
        .in(
          "client_bucket_id",
          (bucketsData || []).map((b) => b.id),
        )
        .order("processed_at", { ascending: false })
        .limit(20)

      if (transactionsError) throw transactionsError
      setTransactions(transactionsData || [])
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTransaction = async () => {
    if (!selectedBucket || !transactionForm.amount || !transactionForm.description) {
      alert("Please fill in all required fields")
      return
    }

    setTransactionLoading(true)
    try {
      const { error } = await supabase.rpc("create_bucket_transaction", {
        p_client_id: params.id,
        p_bucket_code: selectedBucket.bucket_definition.bucket_code,
        p_amount: Number.parseFloat(transactionForm.amount),
        p_transaction_type: transactionForm.type,
        p_description: transactionForm.description,
        p_source_type: transactionForm.reference_type,
      })

      if (error) throw error

      // Refresh data
      await fetchClientAndBuckets(params.id as string)

      // Reset form and close dialog
      setTransactionForm({
        type: "debit",
        amount: "",
        description: "",
        reference_type: "manual_adjustment",
      })
      setShowTransactionDialog(false)
      setSelectedBucket(null)

      alert("Transaction created successfully!")
    } catch (err: any) {
      console.error("Error creating transaction:", err)
      alert(`Failed to create transaction: ${err.message}`)
    } finally {
      setTransactionLoading(false)
    }
  }

  const getBucketStatusColor = (bucket: ClientBucket) => {
    if (bucket.bucket_definition.bucket_category === "draw_down") {
      const usagePercent = ((bucket.credit_limit - bucket.current_balance) / bucket.credit_limit) * 100
      if (usagePercent >= 90) return "text-red-600 bg-red-50 border-red-200"
      if (usagePercent >= 75) return "text-orange-600 bg-orange-50 border-orange-200"
      return "text-green-600 bg-green-50 border-green-200"
    }
    return "text-blue-600 bg-blue-50 border-blue-200"
  }

  const getBucketIcon = (bucket: ClientBucket) => {
    return bucket.bucket_definition.bucket_category === "draw_down" ? TrendingDown : TrendingUp
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  const getUsagePercentage = (bucket: ClientBucket) => {
    if (bucket.bucket_definition.bucket_category === "draw_down") {
      return ((bucket.credit_limit - bucket.current_balance) / bucket.credit_limit) * 100
    }
    return 0 // Fill-up buckets don't have usage limits
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading bucket information...</div>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Buckets</h3>
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
              <h1 className="text-3xl font-bold text-gray-900">Funding Buckets</h1>
              <p className="text-gray-600 mt-1">Manage {client.first_name}'s funding streams and budget compliance</p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => fetchClientAndBuckets(params.id as string)} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Client not active warning */}
        {client.status !== "active" && (
          <div className="mb-6">
            <Card className="border-yellow-200 bg-yellow-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium text-yellow-900">Client Not Active</h3>
                    <p className="text-yellow-700 text-sm mt-1">
                      This client must be converted to Active status to enable bucket management and transactions.
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

        {/* No buckets message */}
        {buckets.length === 0 && client.status === "active" && (
          <div className="mb-6">
            <Card>
              <CardContent className="text-center py-12">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Buckets Found</h3>
                <p className="text-gray-500 mb-4">
                  Buckets should have been created automatically when this client became active.
                </p>
                <Button onClick={() => fetchClientAndBuckets(params.id as string)}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Buckets Grid */}
        {buckets.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {buckets.map((bucket) => {
              const Icon = getBucketIcon(bucket)
              const usagePercent = getUsagePercentage(bucket)

              return (
                <Card key={bucket.id} className={`border-2 ${getBucketStatusColor(bucket)}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${getBucketStatusColor(bucket).replace("text-", "bg-").replace("bg-", "bg-").replace("-600", "-100")}`}
                        >
                          <Icon className={`w-5 h-5 ${getBucketStatusColor(bucket).split(" ")[0]}`} />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{bucket.bucket_definition.bucket_name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {bucket.bucket_definition.bucket_category === "draw_down" ? "Draw-Down" : "Fill-Up"}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {bucket.bucket_definition.funding_source}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      {bucket.bucket_definition.bucket_category === "draw_down" && (
                        <div className="text-right">
                          {usagePercent >= 90 && (
                            <div className="flex items-center gap-1 text-red-600 text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Critical</span>
                            </div>
                          )}
                          {usagePercent >= 75 && usagePercent < 90 && (
                            <div className="flex items-center gap-1 text-orange-600 text-sm">
                              <AlertTriangle className="w-4 h-4" />
                              <span>Warning</span>
                            </div>
                          )}
                          {usagePercent < 75 && (
                            <div className="flex items-center gap-1 text-green-600 text-sm">
                              <CheckCircle className="w-4 h-4" />
                              <span>Healthy</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Balance Information */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Current Balance</div>
                        <div className="text-2xl font-bold text-gray-900">{formatCurrency(bucket.current_balance)}</div>
                      </div>

                      {bucket.bucket_definition.bucket_category === "draw_down" && (
                        <div>
                          <div className="text-sm text-gray-500">Credit Limit</div>
                          <div className="text-lg font-semibold text-gray-700">
                            {formatCurrency(bucket.credit_limit)}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Usage Progress (Draw-down buckets only) */}
                    {bucket.bucket_definition.bucket_category === "draw_down" && (
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-500">Budget Used</span>
                          <span className="font-medium">{usagePercent.toFixed(1)}%</span>
                        </div>
                        <Progress
                          value={usagePercent}
                          className="h-2"
                          // @ts-ignore - Progress component styling
                          style={{
                            "--progress-background":
                              usagePercent >= 90 ? "#fee2e2" : usagePercent >= 75 ? "#fef3c7" : "#f0fdf4",
                            "--progress-foreground":
                              usagePercent >= 90 ? "#dc2626" : usagePercent >= 75 ? "#d97706" : "#16a34a",
                          }}
                        />
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>Used: {formatCurrency(bucket.credit_limit - bucket.current_balance)}</span>
                          <span>Remaining: {formatCurrency(bucket.current_balance)}</span>
                        </div>
                      </div>
                    )}

                    {/* Period Information (Draw-down buckets) */}
                    {bucket.period_start && bucket.period_end && (
                      <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center gap-1 mb-1">
                          <Clock className="w-4 h-4" />
                          <span className="font-medium">Budget Period</span>
                        </div>
                        <div>
                          {new Date(bucket.period_start).toLocaleDateString()} -{" "}
                          {new Date(bucket.period_end).toLocaleDateString()}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBucket(bucket)
                          setTransactionForm((prev) => ({ ...prev, type: "debit" }))
                          setShowTransactionDialog(true)
                        }}
                        disabled={client.status !== "active"}
                      >
                        <Minus className="w-4 h-4 mr-1" />
                        Debit
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBucket(bucket)
                          setTransactionForm((prev) => ({ ...prev, type: "credit" }))
                          setShowTransactionDialog(true)
                        }}
                        disabled={client.status !== "active"}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Credit
                      </Button>

                      <Button size="sm" variant="ghost">
                        <Eye className="w-4 h-4 mr-1" />
                        History
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Recent Transactions */}
        {transactions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 10).map((transaction) => {
                  const bucket = buckets.find((b) => b.id === transaction.client_bucket_id)
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-full ${
                            transaction.transaction_type === "credit"
                              ? "bg-green-100 text-green-600"
                              : "bg-red-100 text-red-600"
                          }`}
                        >
                          {transaction.transaction_type === "credit" ? (
                            <Plus className="w-4 h-4" />
                          ) : (
                            <Minus className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{transaction.description}</div>
                          <div className="text-sm text-gray-500">
                            {bucket?.bucket_definition.bucket_name} •{" "}
                            {new Date(transaction.processed_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-semibold ${
                            transaction.transaction_type === "credit" ? "text-green-600" : "text-red-600"
                          }`}
                        >
                          {transaction.transaction_type === "credit" ? "+" : "-"}
                          {formatCurrency(transaction.amount)}
                        </div>
                        <div className="text-sm text-gray-500">
                          Balance: {formatCurrency(transaction.balance_after)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transaction Dialog */}
        <Dialog open={showTransactionDialog} onOpenChange={setShowTransactionDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {transactionForm.type === "credit" ? (
                  <Plus className="w-5 h-5 text-green-600" />
                ) : (
                  <Minus className="w-5 h-5 text-red-600" />
                )}
                {transactionForm.type === "credit" ? "Add Funds" : "Record Expense"}
              </DialogTitle>
              <DialogDescription>
                {selectedBucket && (
                  <>
                    {transactionForm.type === "credit" ? "Add funds to" : "Record an expense from"}{" "}
                    {selectedBucket.bucket_definition.bucket_name}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Bucket Info */}
              {selectedBucket && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900">
                    {selectedBucket.bucket_definition.bucket_name}
                  </div>
                  <div className="text-sm text-gray-600">
                    Current Balance: {formatCurrency(selectedBucket.current_balance)}
                  </div>
                  {selectedBucket.bucket_definition.bucket_category === "draw_down" && (
                    <div className="text-sm text-gray-600">
                      Available: {formatCurrency(selectedBucket.current_balance)} of{" "}
                      {formatCurrency(selectedBucket.credit_limit)}
                    </div>
                  )}
                </div>
              )}

              {/* Amount */}
              <div>
                <Label htmlFor="amount">Amount (AUD) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Describe this transaction..."
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm((prev) => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              {/* Reference Type */}
              <div>
                <Label htmlFor="reference_type">Transaction Type</Label>
                <Select
                  value={transactionForm.reference_type}
                  onValueChange={(value) => setTransactionForm((prev) => ({ ...prev, reference_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_adjustment">Manual Adjustment</SelectItem>
                    <SelectItem value="service_transaction">Service Delivery</SelectItem>
                    <SelectItem value="government_allocation">Government Allocation</SelectItem>
                    <SelectItem value="client_payment">Client Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compliance Warning */}
              {selectedBucket &&
                transactionForm.type === "debit" &&
                transactionForm.amount &&
                selectedBucket.bucket_definition.bucket_category === "draw_down" &&
                selectedBucket.current_balance - Number.parseFloat(transactionForm.amount) < 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-800">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">Compliance Warning</span>
                    </div>
                    <p className="text-red-700 text-sm mt-1">
                      This transaction would exceed the available budget. Draw-down buckets cannot go negative.
                    </p>
                  </div>
                )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTransactionDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateTransaction}
                disabled={
                  transactionLoading ||
                  !transactionForm.amount ||
                  !transactionForm.description ||
                  (selectedBucket &&
                    transactionForm.type === "debit" &&
                    selectedBucket.bucket_definition.bucket_category === "draw_down" &&
                    selectedBucket.current_balance - Number.parseFloat(transactionForm.amount || "0") < 0)
                }
                className={transactionForm.type === "credit" ? "bg-green-600 hover:bg-green-700" : ""}
              >
                {transactionLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>{transactionForm.type === "credit" ? "Add Funds" : "Record Expense"}</>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
