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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ArrowLeft, FileText, Plus, TrendingDown, TrendingUp, Trash2, Save, Loader2, Copy, Edit } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Client {
  id: string
  first_name: string
  last_name: string
  status: string
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
}

interface ServiceAgreementBucket {
  id: string
  template_id: string
  template: BucketTemplate
  custom_amount?: number
  custom_name?: string
  notes?: string
}

interface ServiceAgreement {
  id: string
  client_id: string
  name: string
  description: string
  status: "draft" | "active" | "suspended" | "completed"
  start_date: string
  end_date?: string
  total_value: number
  buckets: ServiceAgreementBucket[]
  created_at: string
  updated_at: string
}

// Mock bucket templates - in real app, these would come from the database
const MOCK_BUCKET_TEMPLATES: BucketTemplate[] = [
  {
    id: "template-1",
    name: "Standard Government S@H",
    description: "Standard Support at Home government funding bucket with compliance monitoring",
    category: "draw_down",
    funding_source: "government",
    starting_amount: 50000,
    characteristics: [],
  },
  {
    id: "template-2",
    name: "Client Co-Payment Standard",
    description: "Standard client co-payment bucket with automatic invoicing at 80% capacity",
    category: "fill_up",
    funding_source: "client",
    credit_limit: 15000,
    characteristics: [],
  },
  {
    id: "template-3",
    name: "NDIS Core Supports",
    description: "NDIS funding bucket with quarterly reset and strict compliance monitoring",
    category: "draw_down",
    funding_source: "government",
    starting_amount: 75000,
    characteristics: [],
  },
  {
    id: "template-4",
    name: "Weekly Refresh Draw-Down",
    description: "Draw-down bucket that refreshes weekly - perfect for recurring service packages",
    category: "draw_down",
    funding_source: "government",
    starting_amount: 100,
    characteristics: [],
  },
]

export default function ServiceAgreementPage() {
  const params = useParams()
  const [client, setClient] = useState<Client | null>(null)
  const [agreements, setAgreements] = useState<ServiceAgreement[]>([])
  const [bucketTemplates] = useState<BucketTemplate[]>(MOCK_BUCKET_TEMPLATES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Agreement creation state
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBucketDialog, setShowBucketDialog] = useState(false)
  const [selectedAgreement, setSelectedAgreement] = useState<ServiceAgreement | null>(null)
  const [newAgreement, setNewAgreement] = useState({
    name: "",
    description: "",
    start_date: "",
    end_date: "",
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
      // Fetch client info
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, status")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError
      setClient(clientData)

      // Mock service agreements - in real app, these would come from database
      const mockAgreements: ServiceAgreement[] = [
        {
          id: "agreement-1",
          client_id: clientId,
          name: "Standard Care Package",
          description: "Comprehensive care package with government funding and client co-payment",
          status: "active",
          start_date: "2024-01-01",
          end_date: "2024-12-31",
          total_value: 130000,
          buckets: [
            {
              id: "bucket-1",
              template_id: "template-1",
              template: MOCK_BUCKET_TEMPLATES[0],
              custom_amount: 50000,
            },
            {
              id: "bucket-2",
              template_id: "template-2",
              template: MOCK_BUCKET_TEMPLATES[1],
              custom_amount: 15000,
            },
            {
              id: "bucket-3",
              template_id: "template-3",
              template: MOCK_BUCKET_TEMPLATES[2],
              custom_amount: 65000,
            },
          ],
          created_at: "2024-01-01",
          updated_at: "2024-01-01",
        },
      ]

      setAgreements(mockAgreements)
    } catch (err: any) {
      console.error("Error fetching data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createAgreement = () => {
    const agreement: ServiceAgreement = {
      id: `agreement-${Date.now()}`,
      client_id: params.id as string,
      name: newAgreement.name,
      description: newAgreement.description,
      status: "draft",
      start_date: newAgreement.start_date,
      end_date: newAgreement.end_date || undefined,
      total_value: 0,
      buckets: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    setAgreements((prev) => [...prev, agreement])
    setSelectedAgreement(agreement)
    setNewAgreement({ name: "", description: "", start_date: "", end_date: "" })
    setShowCreateDialog(false)
  }

  const addBucketToAgreement = () => {
    if (!selectedAgreement || !selectedTemplate) return

    const newBucket: ServiceAgreementBucket = {
      id: `bucket-${Date.now()}`,
      template_id: selectedTemplate.id,
      template: selectedTemplate,
      custom_amount: bucketConfig.custom_amount ? Number.parseFloat(bucketConfig.custom_amount) : undefined,
      custom_name: bucketConfig.custom_name || undefined,
      notes: bucketConfig.notes || undefined,
    }

    const updatedAgreement = {
      ...selectedAgreement,
      buckets: [...selectedAgreement.buckets, newBucket],
      total_value:
        selectedAgreement.buckets.reduce((sum, bucket) => {
          const amount = bucket.custom_amount || bucket.template.starting_amount || bucket.template.credit_limit || 0
          return sum + amount
        }, 0) + (newBucket.custom_amount || newBucket.template.starting_amount || newBucket.template.credit_limit || 0),
    }

    setAgreements((prev) => prev.map((a) => (a.id === selectedAgreement.id ? updatedAgreement : a)))
    setSelectedAgreement(updatedAgreement)

    // Reset form
    setBucketConfig({ custom_name: "", custom_amount: "", notes: "" })
    setSelectedTemplate(null)
    setShowBucketDialog(false)
  }

  const removeBucketFromAgreement = (bucketId: string) => {
    if (!selectedAgreement) return

    const updatedBuckets = selectedAgreement.buckets.filter((b) => b.id !== bucketId)
    const updatedAgreement = {
      ...selectedAgreement,
      buckets: updatedBuckets,
      total_value: updatedBuckets.reduce((sum, bucket) => {
        const amount = bucket.custom_amount || bucket.template.starting_amount || bucket.template.credit_limit || 0
        return sum + amount
      }, 0),
    }

    setAgreements((prev) => prev.map((a) => (a.id === selectedAgreement.id ? updatedAgreement : a)))
    setSelectedAgreement(updatedAgreement)
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
      case "draft":
        return "bg-gray-100 text-gray-800"
      case "suspended":
        return "bg-yellow-100 text-yellow-800"
      case "completed":
        return "bg-blue-100 text-blue-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

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
                Create and manage service agreements using your bucket templates as building blocks
              </p>
            </div>

            <Button onClick={() => setShowCreateDialog(true)}>
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

        {/* Agreements List */}
        {agreements.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Service Agreements</h3>
              <p className="text-gray-500 mb-4">
                Create your first service agreement using bucket templates as building blocks
              </p>
              <Button onClick={() => setShowCreateDialog(true)} disabled={client.status !== "active"}>
                <Plus className="w-4 h-4 mr-2" />
                Create Agreement
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {agreements.map((agreement) => (
              <Card key={agreement.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        {agreement.name}
                      </CardTitle>
                      <p className="text-gray-600 mt-1">{agreement.description}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <Badge className={getStatusColor(agreement.status)}>
                          {agreement.status.charAt(0).toUpperCase() + agreement.status.slice(1)}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {new Date(agreement.start_date).toLocaleDateString()}
                          {agreement.end_date && ` - ${new Date(agreement.end_date).toLocaleDateString()}`}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(agreement.total_value)}</div>
                      <div className="text-sm text-gray-500">{agreement.buckets.length} buckets</div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent>
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
                                  bucket.template.category === "draw_down"
                                    ? "bg-green-100 text-green-600"
                                    : "bg-blue-100 text-blue-600"
                                }`}
                              >
                                {bucket.template.category === "draw_down" ? (
                                  <TrendingDown className="w-4 h-4" />
                                ) : (
                                  <TrendingUp className="w-4 h-4" />
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-sm">{bucket.custom_name || bucket.template.name}</div>
                                <div className="text-xs text-gray-500 capitalize">
                                  {bucket.template.funding_source} • {bucket.template.category.replace("_", "-")}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="font-semibold text-sm">
                                  {formatCurrency(
                                    bucket.custom_amount ||
                                      bucket.template.starting_amount ||
                                      bucket.template.credit_limit ||
                                      0,
                                  )}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => removeBucketFromAgreement(bucket.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Agreement Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedAgreement(agreement)
                        setShowBucketDialog(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Bucket
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit Agreement
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="w-4 h-4 mr-1" />
                      Duplicate
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                Create a new service agreement container. You'll add bucket templates as building blocks next.
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
              <Button onClick={createAgreement} disabled={!newAgreement.name || !newAgreement.start_date}>
                <Save className="w-4 h-4 mr-2" />
                Create Agreement
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
                <div className="grid grid-cols-1 gap-2 mt-2 max-h-60 overflow-y-auto">
                  {bucketTemplates.map((template) => (
                    <div
                      key={template.id}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedTemplate?.id === template.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setSelectedTemplate(template)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-2 rounded-lg ${
                            template.category === "draw_down"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {template.category === "draw_down" ? (
                            <TrendingDown className="w-4 h-4" />
                          ) : (
                            <TrendingUp className="w-4 h-4" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-gray-500">{template.description}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {template.category.replace("_", "-")}
                            </Badge>
                            <Badge variant="outline" className="text-xs capitalize">
                              {template.funding_source}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-sm">
                            {formatCurrency(template.starting_amount || template.credit_limit || 0)}
                          </div>
                          <div className="text-xs text-gray-500">default</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Configuration */}
              {selectedTemplate && (
                <div className="space-y-3 pt-4 border-t">
                  <h4 className="font-medium">Configure This Bucket</h4>

                  <div>
                    <Label htmlFor="custom_name">Custom Name (optional)</Label>
                    <Input
                      id="custom_name"
                      placeholder={selectedTemplate.name}
                      value={bucketConfig.custom_name}
                      onChange={(e) => setBucketConfig((prev) => ({ ...prev, custom_name: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="custom_amount">
                      Custom Amount (default:{" "}
                      {formatCurrency(selectedTemplate.starting_amount || selectedTemplate.credit_limit || 0)})
                    </Label>
                    <Input
                      id="custom_amount"
                      type="number"
                      step="0.01"
                      placeholder={(selectedTemplate.starting_amount || selectedTemplate.credit_limit || 0).toString()}
                      value={bucketConfig.custom_amount}
                      onChange={(e) => setBucketConfig((prev) => ({ ...prev, custom_amount: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any specific notes for this bucket instance..."
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
                <Plus className="w-4 h-4 mr-2" />
                Add Bucket
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
