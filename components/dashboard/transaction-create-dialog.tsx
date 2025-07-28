import { useState } from "react"
import { Button } from "@/components/ui/button"
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
import { Receipt, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Loader2 } from "lucide-react"

interface AgreementBucket {
  id: string
  template_name: string
  template_category: "draw_down" | "fill_up"
  template_funding_source: string
  custom_amount: number
  current_balance: number
  notes?: string
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

interface Client {
  id: string
  first_name: string
  last_name: string
  status: string
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

interface TransactionCreateDialogProps {
  client: Client
  serviceAgreements: ServiceAgreement[]
  onCreated?: () => void
  trigger?: React.ReactNode
}

export function TransactionCreateDialog({ client, serviceAgreements, onCreated, trigger }: TransactionCreateDialogProps) {
  const [open, setOpen] = useState(false)
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
    if (formData.transaction_type === "service_delivery" && bucket.template_category === "draw_down") {
      return bucket.current_balance >= amount
    }
    return true
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  const createTransaction = async () => {
    if (!client || !canCreateTransaction()) return
    setCreating(true)
    try {
      const amount = calculateAmount()
      const { supabase } = await import("@/lib/supabase")
      
      // Get the user's organization_id
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("User not authenticated")
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()
      
      if (!profile?.organization_id) throw new Error("User organization not found")
      
      // Log the data we're trying to insert for debugging
      const transactionData = {
        organization_id: profile.organization_id,
        client_id: client.id,
        agreement_id: formData.service_agreement_id, // Use agreement_id, not service_agreement_id
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
        // Removed notes field as it doesn't exist in the database schema
      }
      
      console.log("Attempting to insert transaction:", transactionData)
      console.log("User ID:", user.id)
      console.log("Organization ID:", profile.organization_id)
      
      // Debug: Check current balances before creating transaction
      const selectedAgreement = serviceAgreements.find(a => a.id === formData.service_agreement_id)
      const selectedBucket = getSelectedBucket()
      
      console.log("Selected Service Agreement:", {
        id: selectedAgreement?.id,
        name: selectedAgreement?.name,
        total_value: selectedAgreement?.total_value,
        remaining_balance: selectedAgreement?.remaining_balance,
        status: selectedAgreement?.status
      })
      
      console.log("Selected Bucket:", {
        id: selectedBucket?.id,
        name: selectedBucket?.template_name,
        category: selectedBucket?.template_category,
        custom_amount: selectedBucket?.custom_amount,
        current_balance: selectedBucket?.current_balance
      })
      
      console.log("Transaction Amount:", amount)
      console.log("Can Create Transaction:", canCreateTransaction())
      
      const response = await supabase.from("transactions").insert(transactionData)
      
      console.log("Full Supabase response:", response)
      console.log("Response data:", response.data)
      console.log("Response error:", response.error)
      console.log("Response status:", response.status)
      console.log("Response statusText:", response.statusText)
      
      if (response.error) {
        console.error("Supabase error details:", response.error)
        console.error("Error code:", response.error.code)
        console.error("Error message:", response.error.message)
        console.error("Error details:", response.error.details)
        console.error("Error hint:", response.error.hint)
        throw response.error
      }
      
      console.log("Transaction created successfully:", response.data)
      
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
      setOpen(false)
      if (onCreated) onCreated()
    } catch (error: any) {
      console.error("Error creating transaction:", error)
      console.error("Error type:", typeof error)
      console.error("Error constructor:", error.constructor.name)
      console.error("Error message:", error.message)
      console.error("Error details:", error.details)
      console.error("Error hint:", error.hint)
      console.error("Error code:", error.code)
      console.error("Full error object:", JSON.stringify(error, null, 2))
      alert(`Failed to create transaction: ${error.message || 'Unknown error'}`)
    } finally {
      setCreating(false)
    }
  }

  // Only show 'current' service agreements
  const currentServiceAgreements = serviceAgreements.filter(a => a.status === "current")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || <Button>Create Transaction</Button>}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Transaction</DialogTitle>
          <DialogDescription>
            Create a new transaction to track service delivery (draw down) or invoice items (fill up).
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
                handleInputChange("bucket_id", "")
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select service agreement" />
              </SelectTrigger>
              <SelectContent>
                {currentServiceAgreements.map((agreement) => (
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
                  {currentServiceAgreements
                    .find((a) => a.id === formData.service_agreement_id)
                    ?.agreement_buckets.map((bucket) => (
                      <SelectItem key={bucket.id} value={bucket.id}>
                        <div className="flex items-center justify-between w-full">
                          <span className="flex items-center gap-2">
                            {bucket.template_category === "draw_down" ? (
                              <TrendingDown className="w-4 h-4 text-red-600" />
                            ) : (
                              <TrendingUp className="w-4 h-4 text-green-600" />
                            )}
                            {bucket.template_name}
                            <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${bucket.template_category === "draw_down" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                              {bucket.template_category === "draw_down" ? "Draw Down" : "Fill Up"}
                            </span>
                          </span>
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
          {/* Bucket Type Info/Warning */}
          {(() => {
            const bucket = getSelectedBucket()
            if (!bucket) return null
            if (bucket.template_category === "draw_down") {
              return (
                <div className={`p-4 rounded-lg ${canCreateTransaction() ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"} border flex items-center gap-2`}>
                  {canCreateTransaction() ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <div className="font-medium">
                      Available Balance: {formatCurrency(bucket.current_balance)}
                    </div>
                    {!canCreateTransaction() && (
                      <div className="text-sm text-red-600">Insufficient funds for this transaction</div>
                    )}
                    <div className="text-xs text-gray-500 mt-1">Draw Down: This will reduce the available balance.</div>
                  </div>
                </div>
              )
            } else {
              return (
                <div className="p-4 rounded-lg bg-blue-50 border-blue-200 border flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium">
                      Current Balance: {formatCurrency(bucket.current_balance)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">Fill Up: This will increase the available balance and will be invoiced later.</div>
                  </div>
                </div>
              )
            }
          })()}
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
          <Button variant="outline" onClick={() => setOpen(false)}>
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
  )
} 