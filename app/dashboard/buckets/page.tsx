"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  Plus,
  Settings,
  Trash2,
  TrendingDown,
  TrendingUp,
  Home,
  ChevronRight,
  Save,
  RefreshCw,
  Bell,
  Shield,
  Copy,
  Edit,
  AlertCircle,
} from "lucide-react"
import { createClient } from "@/lib/supabase"

interface BucketCharacteristic {
  id: string
  name: string
  type: "draw_down_only" | "fill_up_only" | "common"
  category: "behavior" | "alert" | "reset" | "compliance"
  enabled: boolean
  config: Record<string, any>
}

interface BucketTemplate {
  id: string
  organization_id: string
  name: string
  description: string
  category: "draw_down" | "fill_up"
  funding_source: string
  starting_amount?: number
  credit_limit?: number
  characteristics: BucketCharacteristic[]
  created_at: string
  updated_at: string
  is_active: boolean
}

// Predefined characteristics templates - these are the flexible building blocks users can choose from
const CHARACTERISTIC_TEMPLATES: Record<string, BucketCharacteristic[]> = {
  draw_down: [
    {
      id: "zero-behavior",
      name: "Zero Balance Behavior",
      type: "draw_down_only",
      category: "behavior",
      enabled: false,
      config: {
        action: "block_services",
        overdraft_limit: 0,
        fallback_bucket_id: null,
        notification_enabled: true,
      },
    },
    {
      id: "low-balance-warning",
      name: "Low Balance Warning",
      type: "draw_down_only",
      category: "alert",
      enabled: false,
      config: {
        threshold_percentage: 20,
        threshold_amount: 1000,
        notification_days_advance: 7,
        escalation_enabled: false,
      },
    },
  ],
  fill_up: [
    {
      id: "threshold-alerts",
      name: "Fill Level Alerts",
      type: "fill_up_only",
      category: "alert",
      enabled: false,
      config: {
        alert_levels: [25, 50, 75, 90],
        notification_enabled: true,
        auto_invoice: false,
        invoice_threshold: 80,
      },
    },
    {
      id: "capacity-management",
      name: "Capacity Management",
      type: "fill_up_only",
      category: "behavior",
      enabled: false,
      config: {
        max_capacity_action: "stop_accumulation",
        overflow_bucket_id: null,
        auto_invoice_at_capacity: true,
      },
    },
  ],
  common: [
    {
      id: "reset-timer",
      name: "Periodic Reset",
      type: "common",
      category: "reset",
      enabled: false,
      config: {
        reset_frequency: "quarterly",
        reset_day: 1,
        reset_to_amount: 0,
        carry_over_percentage: 0,
        notification_days_before: 14,
      },
    },
    {
      id: "compliance-monitoring",
      name: "Compliance Monitoring",
      type: "common",
      category: "compliance",
      enabled: false,
      config: {
        track_utilization: true,
        compliance_threshold: 95,
        audit_trail_enabled: true,
        monthly_reporting: true,
      },
    },
    {
      id: "rollover-policy",
      name: "Rollover Policy",
      type: "common",
      category: "reset",
      enabled: false,
      config: {
        rollover_type: "percentage",
        rollover_percentage: 100,
        rollover_amount: 0,
        max_rollover_periods: 4,
      },
    },
  ],
}

export default function BucketsPage() {
  // Start with empty templates - users build their own
  const [bucketTemplates, setBucketTemplates] = useState<BucketTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedTemplate, setSelectedTemplate] = useState<BucketTemplate | null>(null)
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [isCreatingNew, setIsCreatingNew] = useState(false)
  const [activeTab, setActiveTab] = useState("draw_down")

  useEffect(() => {
    loadBucketTemplates()
  }, [])

  const loadBucketTemplates = async () => {
    try {
      setError(null)
      const supabase = createClient()

      // First check if user is authenticated
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("User not authenticated")
        return
      }

      const { data, error } = await supabase
        .from("bucket_templates")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Database error:", error)
        setError(`Failed to load templates: ${error.message}`)
        return
      }

      // Parse characteristics JSON and ensure proper structure
      const templatesWithParsedCharacteristics =
        data?.map((template) => ({
          ...template,
          characteristics: Array.isArray(template.characteristics) ? template.characteristics : [],
        })) || []

      setBucketTemplates(templatesWithParsedCharacteristics)
    } catch (error) {
      console.error("Error loading bucket templates:", error)
      setError("Failed to load bucket templates")
    } finally {
      setLoading(false)
    }
  }

  const createNewTemplate = (category: "draw_down" | "fill_up") => {
    const newTemplate: BucketTemplate = {
      id: `template-${Date.now()}`,
      organization_id: "", // Will be set by the backend
      name: `New ${category === "draw_down" ? "Draw-Down" : "Fill-Up"} Bucket`,
      description: "",
      category,
      funding_source: category === "draw_down" ? "government" : "client",
      starting_amount: category === "draw_down" ? 10000 : undefined,
      credit_limit: category === "fill_up" ? 5000 : undefined,
      // Provide all available characteristics as building blocks - all disabled by default
      characteristics: [
        ...(category === "draw_down" ? CHARACTERISTIC_TEMPLATES.draw_down : CHARACTERISTIC_TEMPLATES.fill_up),
        ...CHARACTERISTIC_TEMPLATES.common,
      ],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    }
    setSelectedTemplate(newTemplate)
    setIsCreatingNew(true)
    setShowTemplateDialog(true)
  }

  const editTemplate = (template: BucketTemplate) => {
    setSelectedTemplate({ ...template })
    setIsCreatingNew(false)
    setShowTemplateDialog(true)
  }

  const duplicateTemplate = async (template: BucketTemplate) => {
    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      // Get current user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("User not authenticated")
        return
      }

      const duplicated = {
        name: `${template.name} (Copy)`,
        description: template.description,
        category: template.category,
        funding_source: template.funding_source,
        starting_amount: template.starting_amount,
        credit_limit: template.credit_limit,
        characteristics: template.characteristics,
        is_active: template.is_active,
      }

      const { error } = await supabase.from("bucket_templates").insert([duplicated])

      if (error) {
        console.error("Database error:", error)
        setError(`Failed to duplicate template: ${error.message}`)
        return
      }

      await loadBucketTemplates()
    } catch (error) {
      console.error("Error duplicating template:", error)
      setError("Failed to duplicate template")
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      const { error } = await supabase.from("bucket_templates").delete().eq("id", templateId)

      if (error) {
        console.error("Database error:", error)
        setError(`Failed to delete template: ${error.message}`)
        return
      }

      await loadBucketTemplates()
    } catch (error) {
      console.error("Error deleting template:", error)
      setError("Failed to delete template")
    } finally {
      setSaving(false)
    }
  }

  const saveTemplate = async () => {
    if (!selectedTemplate) return

    try {
      setSaving(true)
      setError(null)
      const supabase = createClient()

      // Get current user's organization
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        setError("User not authenticated")
        return
      }

      // Get user's organization ID from their profile
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        console.error("Profile error:", profileError)
        setError("Could not determine user organization")
        return
      }

      const templateData = {
        name: selectedTemplate.name,
        description: selectedTemplate.description,
        category: selectedTemplate.category,
        funding_source: selectedTemplate.funding_source,
        starting_amount: selectedTemplate.starting_amount,
        credit_limit: selectedTemplate.credit_limit,
        characteristics: selectedTemplate.characteristics,
        is_active: selectedTemplate.is_active,
        organization_id: profile.organization_id, // Explicitly set the organization_id
      }

      if (isCreatingNew) {
        const { error } = await supabase.from("bucket_templates").insert([templateData])

        if (error) {
          console.error("Database error:", error)
          setError(`Failed to create template: ${error.message}`)
          return
        }
      } else {
        const { error } = await supabase.from("bucket_templates").update(templateData).eq("id", selectedTemplate.id)

        if (error) {
          console.error("Database error:", error)
          setError(`Failed to update template: ${error.message}`)
          return
        }
      }

      await loadBucketTemplates()
      setShowTemplateDialog(false)
      setSelectedTemplate(null)
    } catch (error) {
      console.error("Error saving template:", error)
      setError("Failed to save template")
    } finally {
      setSaving(false)
    }
  }

  const updateTemplateCharacteristic = (characteristicId: string, updates: Partial<BucketCharacteristic>) => {
    if (!selectedTemplate) return

    setSelectedTemplate({
      ...selectedTemplate,
      characteristics: selectedTemplate.characteristics.map((char) =>
        char.id === characteristicId ? { ...char, ...updates } : char,
      ),
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  const getCharacteristicIcon = (category: string) => {
    switch (category) {
      case "behavior":
        return Settings
      case "alert":
        return Bell
      case "reset":
        return RefreshCw
      case "compliance":
        return Shield
      default:
        return Settings
    }
  }

  const getCharacteristicColor = (category: string) => {
    switch (category) {
      case "behavior":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "alert":
        return "bg-orange-100 text-orange-800 border-orange-200"
      case "reset":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "compliance":
        return "bg-green-100 text-green-800 border-green-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const drawDownTemplates = bucketTemplates.filter((t) => t.category === "draw_down")
  const fillUpTemplates = bucketTemplates.filter((t) => t.category === "fill_up")

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading bucket templates...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setError(null)} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="flex items-center hover:text-gray-700 transition-colors">
            <Home className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Bucket System</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">The Bucket System</h1>
            <p className="text-gray-600 mt-1 max-w-2xl">
              Build your own funding logic. Design flexible financial building blocks that power any service agreement —
              government draw-downs, client reimbursements, or blended funding models.
            </p>
            <div className="mt-3">
              <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                Design your own rules. Build your own structures. Power any contract.
              </Badge>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => createNewTemplate("draw_down")} disabled={saving}>
              <TrendingDown className="w-4 h-4 mr-2" />
              New Draw-Down
            </Button>
            <Button variant="outline" onClick={() => createNewTemplate("fill_up")} disabled={saving}>
              <TrendingUp className="w-4 h-4 mr-2" />
              New Fill-Up
            </Button>
          </div>
        </div>

        {/* Flexible Building Blocks Overview */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Break Free from Rigid Funding Schemes</h2>
            <p className="text-gray-600 max-w-3xl mx-auto">
              Traditional systems lock you into fixed government models. Swivel's Bucket System lets you create flexible
              financial building blocks that adapt to any funding arrangement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-green-200 bg-green-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-100 rounded-full -mr-10 -mt-10 opacity-50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <TrendingDown className="w-5 h-5" />
                  Draw-Down Buckets
                </CardTitle>
                <p className="text-green-700 text-sm">
                  Start funded, spend down to zero. Perfect for government allocations, grants, and pre-paid service
                  packages.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Government NDIS & Aged Care packages</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Insurance claim allocations</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Pre-paid service contracts</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-green-700">
                    <div className="w-2 h-2 bg-green-500 rounded-full" />
                    <span>Grant-funded programs</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-green-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-green-800">Your Templates</span>
                    <Badge variant="outline" className="text-green-700 border-green-300">
                      {drawDownTemplates.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-100 rounded-full -mr-10 -mt-10 opacity-50" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-800">
                  <TrendingUp className="w-5 h-5" />
                  Fill-Up Buckets
                </CardTitle>
                <p className="text-blue-700 text-sm">
                  Start at zero, accumulate charges. Ideal for private billing, co-payments, and fee-for-service
                  arrangements.
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Client co-payment accumulation</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Private pay service billing</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Equipment rental charges</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-blue-700">
                    <div className="w-2 h-2 bg-blue-500 rounded-full" />
                    <span>Additional service fees</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-blue-800">Your Templates</span>
                    <Badge variant="outline" className="text-blue-700 border-blue-300">
                      {fillUpTemplates.length}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Power Any Contract Section */}
          <div className="mt-6 p-6 bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Power Any Contract Structure</h3>
              <p className="text-gray-600 mb-4 max-w-2xl mx-auto">
                Combine draw-down and fill-up buckets to create sophisticated funding arrangements that match your
                real-world contracts.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Hybrid Government + Private</Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Multi-Source Funding</Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Complex Billing Rules</Badge>
                <Badge className="bg-purple-100 text-purple-800 border-purple-200">Custom Compliance Logic</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Bucket Templates */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="draw_down" className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Draw-Down Buckets ({drawDownTemplates.length})
            </TabsTrigger>
            <TabsTrigger value="fill_up" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Fill-Up Buckets ({fillUpTemplates.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw_down" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Draw-Down Bucket Templates</h3>
              <Button onClick={() => createNewTemplate("draw_down")} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {drawDownTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingDown className="w-4 h-4 text-green-600" />
                          {template.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                      <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Starting Amount</span>
                        <div className="font-medium">{formatCurrency(template.starting_amount || 0)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Funding Source</span>
                        <div className="font-medium capitalize">{template.funding_source}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 text-sm">Active Characteristics</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.characteristics
                          ?.filter((c) => c.enabled)
                          .slice(0, 3)
                          .map((char) => {
                            const CharIcon = getCharacteristicIcon(char.category)
                            return (
                              <div
                                key={char.id}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getCharacteristicColor(
                                  char.category,
                                )}`}
                              >
                                <CharIcon className="w-3 h-3" />
                                <span className="truncate max-w-16">{char.name.split(" ")[0]}</span>
                              </div>
                            )
                          })}
                        {(template.characteristics?.filter((c) => c.enabled).length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(template.characteristics?.filter((c) => c.enabled).length || 0) - 3}
                          </Badge>
                        )}
                        {(template.characteristics?.filter((c) => c.enabled).length || 0) === 0 && (
                          <span className="text-xs text-gray-400 italic">No characteristics enabled</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editTemplate(template)}
                        className="flex-1"
                        disabled={saving}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateTemplate(template)} disabled={saving}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={saving}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {drawDownTemplates.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <TrendingDown className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Draw-Down Templates Yet</h3>
                  <p className="text-gray-500 mb-4 max-w-md mx-auto">
                    Create your first draw-down bucket template. Design your own funding logic with flexible
                    characteristics that match your specific needs.
                  </p>
                  <Button onClick={() => createNewTemplate("draw_down")} disabled={saving}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Template
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="fill_up" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Fill-Up Bucket Templates</h3>
              <Button onClick={() => createNewTemplate("fill_up")} disabled={saving}>
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fillUpTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-blue-600" />
                          {template.name}
                        </CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{template.description}</p>
                      </div>
                      <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                        {template.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-gray-500">Credit Limit</span>
                        <div className="font-medium">{formatCurrency(template.credit_limit || 0)}</div>
                      </div>
                      <div>
                        <span className="text-gray-500">Funding Source</span>
                        <div className="font-medium capitalize">{template.funding_source}</div>
                      </div>
                    </div>

                    <div>
                      <span className="text-gray-500 text-sm">Active Characteristics</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {template.characteristics
                          ?.filter((c) => c.enabled)
                          .slice(0, 3)
                          .map((char) => {
                            const CharIcon = getCharacteristicIcon(char.category)
                            return (
                              <div
                                key={char.id}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${getCharacteristicColor(
                                  char.category,
                                )}`}
                              >
                                <CharIcon className="w-3 h-3" />
                                <span className="truncate max-w-16">{char.name.split(" ")[0]}</span>
                              </div>
                            )
                          })}
                        {(template.characteristics?.filter((c) => c.enabled).length || 0) > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{(template.characteristics?.filter((c) => c.enabled).length || 0) - 3}
                          </Badge>
                        )}
                        {(template.characteristics?.filter((c) => c.enabled).length || 0) === 0 && (
                          <span className="text-xs text-gray-400 italic">No characteristics enabled</span>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => editTemplate(template)}
                        className="flex-1"
                        disabled={saving}
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => duplicateTemplate(template)} disabled={saving}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600 hover:text-red-700"
                        disabled={saving}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {fillUpTemplates.length === 0 && (
                <div className="col-span-full text-center py-12">
                  <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Fill-Up Templates Yet</h3>
                  <p className="text-gray-500 mb-4 max-w-md mx-auto">
                    Create your first fill-up bucket template. Build custom billing logic with flexible characteristics
                    that fit your business model.
                  </p>
                  <Button onClick={() => createNewTemplate("fill_up")} disabled={saving}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Template
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Template Configuration Dialog */}
        <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTemplate?.category === "draw_down" ? (
                  <TrendingDown className="w-5 h-5 text-green-600" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                )}
                {isCreatingNew ? "Create" : "Edit"}{" "}
                {selectedTemplate?.category === "draw_down" ? "Draw-Down" : "Fill-Up"} Bucket Template
              </DialogTitle>
              <DialogDescription>
                Configure the properties and characteristics for this bucket template. Choose which characteristics to
                enable and customize their behavior.
              </DialogDescription>
            </DialogHeader>

            {selectedTemplate && (
              <Tabs defaultValue="general" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="general">General Settings</TabsTrigger>
                  <TabsTrigger value="characteristics">Characteristics</TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Template Name</Label>
                      <Input
                        id="name"
                        value={selectedTemplate.name}
                        onChange={(e) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            name: e.target.value,
                          })
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="funding_source">Funding Source</Label>
                      <Select
                        value={selectedTemplate.funding_source}
                        onValueChange={(value) =>
                          setSelectedTemplate({
                            ...selectedTemplate,
                            funding_source: value,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="government">Government</SelectItem>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="insurance">Insurance</SelectItem>
                          <SelectItem value="grant">Grant</SelectItem>
                          <SelectItem value="ndis">NDIS</SelectItem>
                          <SelectItem value="private">Private</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={selectedTemplate.description}
                      onChange={(e) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          description: e.target.value,
                        })
                      }
                      placeholder="Describe the purpose and usage of this bucket template..."
                      className="min-h-20"
                    />
                  </div>

                  <div>
                    <Label htmlFor="amount">
                      {selectedTemplate.category === "draw_down"
                        ? "Default Starting Amount (AUD)"
                        : "Default Credit Limit (AUD)"}
                    </Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={
                        selectedTemplate.category === "draw_down"
                          ? selectedTemplate.starting_amount || ""
                          : selectedTemplate.credit_limit || ""
                      }
                      onChange={(e) => {
                        const value = Number.parseFloat(e.target.value) || 0
                        setSelectedTemplate({
                          ...selectedTemplate,
                          ...(selectedTemplate.category === "draw_down"
                            ? { starting_amount: value }
                            : { credit_limit: value }),
                        })
                      }}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={selectedTemplate.is_active}
                      onCheckedChange={(checked) =>
                        setSelectedTemplate({
                          ...selectedTemplate,
                          is_active: checked,
                        })
                      }
                    />
                    <Label htmlFor="is_active">Active Template</Label>
                  </div>
                </TabsContent>

                <TabsContent value="characteristics" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">Bucket Characteristics</h4>
                      <p className="text-sm text-gray-500">Choose which characteristics to enable for this template</p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedTemplate.characteristics?.filter((c) => c.enabled).length || 0} Active
                    </Badge>
                  </div>

                  <div className="space-y-4">
                    {selectedTemplate.characteristics?.map((characteristic) => {
                      const CharIcon = getCharacteristicIcon(characteristic.category)
                      const isApplicable =
                        characteristic.type === "common" ||
                        (selectedTemplate.category === "draw_down" && characteristic.type === "draw_down_only") ||
                        (selectedTemplate.category === "fill_up" && characteristic.type === "fill_up_only")

                      if (!isApplicable) return null

                      return (
                        <Card key={characteristic.id} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${getCharacteristicColor(characteristic.category)}`}>
                                <CharIcon className="w-4 h-4" />
                              </div>
                              <div>
                                <h5 className="font-medium text-sm">{characteristic.name}</h5>
                                <div className="flex items-center gap-2 mt-1">
                                  <Badge variant="outline" className="text-xs">
                                    {characteristic.category}
                                  </Badge>
                                  {characteristic.type !== "common" && (
                                    <Badge variant="outline" className="text-xs">
                                      {characteristic.type.replace("_", " ")}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Switch
                              checked={characteristic.enabled}
                              onCheckedChange={(enabled) =>
                                updateTemplateCharacteristic(characteristic.id, { enabled })
                              }
                            />
                          </div>

                          {characteristic.enabled && (
                            <div className="ml-12 space-y-3 pt-3 border-t border-gray-200">
                              {/* Zero Balance Behavior Configuration */}
                              {characteristic.id === "zero-behavior" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Action when zero</Label>
                                    <Select
                                      value={characteristic.config.action}
                                      onValueChange={(value) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, action: value },
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="block_services">Block Services</SelectItem>
                                        <SelectItem value="allow_overdraft">Allow Overdraft</SelectItem>
                                        <SelectItem value="switch_bucket">Switch to Fallback</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {characteristic.config.action === "allow_overdraft" && (
                                    <div>
                                      <Label className="text-xs">Overdraft Limit</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={characteristic.config.overdraft_limit}
                                        onChange={(e) =>
                                          updateTemplateCharacteristic(characteristic.id, {
                                            config: {
                                              ...characteristic.config,
                                              overdraft_limit: Number.parseFloat(e.target.value),
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Low Balance Warning Configuration */}
                              {characteristic.id === "low-balance-warning" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Threshold Percentage</Label>
                                    <Input
                                      type="number"
                                      className="h-8"
                                      value={characteristic.config.threshold_percentage}
                                      onChange={(e) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: {
                                            ...characteristic.config,
                                            threshold_percentage: Number.parseInt(e.target.value),
                                          },
                                        })
                                      }
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs">Threshold Amount</Label>
                                    <Input
                                      type="number"
                                      className="h-8"
                                      value={characteristic.config.threshold_amount}
                                      onChange={(e) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: {
                                            ...characteristic.config,
                                            threshold_amount: Number.parseFloat(e.target.value),
                                          },
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Fill Level Alerts Configuration */}
                              {characteristic.id === "threshold-alerts" && (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs">Alert Levels (%)</Label>
                                    <Input
                                      className="h-8"
                                      placeholder="25, 50, 75, 90"
                                      value={characteristic.config.alert_levels?.join(", ") || ""}
                                      onChange={(e) => {
                                        const levels = e.target.value
                                          .split(",")
                                          .map((v) => Number.parseInt(v.trim()))
                                          .filter((v) => !Number.isNaN(v))
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, alert_levels: levels },
                                        })
                                      }}
                                    />
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={characteristic.config.auto_invoice}
                                      onCheckedChange={(checked) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, auto_invoice: checked },
                                        })
                                      }
                                    />
                                    <Label className="text-xs">Auto-generate invoice at threshold</Label>
                                  </div>
                                  {characteristic.config.auto_invoice && (
                                    <div>
                                      <Label className="text-xs">Invoice Threshold (%)</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={characteristic.config.invoice_threshold}
                                        onChange={(e) =>
                                          updateTemplateCharacteristic(characteristic.id, {
                                            config: {
                                              ...characteristic.config,
                                              invoice_threshold: Number.parseInt(e.target.value),
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Capacity Management Configuration */}
                              {characteristic.id === "capacity-management" && (
                                <div className="space-y-3">
                                  <div>
                                    <Label className="text-xs">Max Capacity Action</Label>
                                    <Select
                                      value={characteristic.config.max_capacity_action}
                                      onValueChange={(value) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, max_capacity_action: value },
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="stop_accumulation">Stop Accumulation</SelectItem>
                                        <SelectItem value="overflow_to_bucket">Overflow to Bucket</SelectItem>
                                        <SelectItem value="create_invoice">Create Invoice</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={characteristic.config.auto_invoice_at_capacity}
                                      onCheckedChange={(checked) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, auto_invoice_at_capacity: checked },
                                        })
                                      }
                                    />
                                    <Label className="text-xs">Auto-invoice at capacity</Label>
                                  </div>
                                </div>
                              )}

                              {/* Periodic Reset Configuration */}
                              {characteristic.id === "reset-timer" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Reset Frequency</Label>
                                    <Select
                                      value={characteristic.config.reset_frequency}
                                      onValueChange={(value) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, reset_frequency: value },
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="monthly">Monthly</SelectItem>
                                        <SelectItem value="quarterly">Quarterly</SelectItem>
                                        <SelectItem value="annually">Annually</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <div>
                                    <Label className="text-xs">Carry Over %</Label>
                                    <Input
                                      type="number"
                                      className="h-8"
                                      value={characteristic.config.carry_over_percentage}
                                      onChange={(e) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: {
                                            ...characteristic.config,
                                            carry_over_percentage: Number.parseInt(e.target.value),
                                          },
                                        })
                                      }
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Rollover Policy Configuration */}
                              {characteristic.id === "rollover-policy" && (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <Label className="text-xs">Rollover Type</Label>
                                    <Select
                                      value={characteristic.config.rollover_type}
                                      onValueChange={(value) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, rollover_type: value },
                                        })
                                      }
                                    >
                                      <SelectTrigger className="h-8">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="percentage">Percentage</SelectItem>
                                        <SelectItem value="fixed_amount">Fixed Amount</SelectItem>
                                        <SelectItem value="none">None</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {characteristic.config.rollover_type === "percentage" && (
                                    <div>
                                      <Label className="text-xs">Rollover Percentage</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={characteristic.config.rollover_percentage}
                                        onChange={(e) =>
                                          updateTemplateCharacteristic(characteristic.id, {
                                            config: {
                                              ...characteristic.config,
                                              rollover_percentage: Number.parseInt(e.target.value),
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                  {characteristic.config.rollover_type === "fixed_amount" && (
                                    <div>
                                      <Label className="text-xs">Rollover Amount</Label>
                                      <Input
                                        type="number"
                                        className="h-8"
                                        value={characteristic.config.rollover_amount}
                                        onChange={(e) =>
                                          updateTemplateCharacteristic(characteristic.id, {
                                            config: {
                                              ...characteristic.config,
                                              rollover_amount: Number.parseFloat(e.target.value),
                                            },
                                          })
                                        }
                                      />
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Compliance Monitoring Configuration */}
                              {characteristic.id === "compliance-monitoring" && (
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={characteristic.config.track_utilization}
                                      onCheckedChange={(checked) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, track_utilization: checked },
                                        })
                                      }
                                    />
                                    <Label className="text-xs">Track utilization rates</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={characteristic.config.audit_trail_enabled}
                                      onCheckedChange={(checked) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, audit_trail_enabled: checked },
                                        })
                                      }
                                    />
                                    <Label className="text-xs">Enable audit trail</Label>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Switch
                                      checked={characteristic.config.monthly_reporting}
                                      onCheckedChange={(checked) =>
                                        updateTemplateCharacteristic(characteristic.id, {
                                          config: { ...characteristic.config, monthly_reporting: checked },
                                        })
                                      }
                                    />
                                    <Label className="text-xs">Generate monthly reports</Label>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      )
                    })}
                  </div>
                </TabsContent>
              </Tabs>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={saveTemplate} disabled={saving}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? "Saving..." : isCreatingNew ? "Create Template" : "Save Changes"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
