"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Save, Loader2, Home, Wrench, X } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export default function NewServicePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [organizationId, setOrganizationId] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [currentTag, setCurrentTag] = useState("")

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    service_code: "",
    base_cost: "",
    cost_currency: "AUD",
    unit: "hour",
    category: "",
    subcategory: "",
    allow_discount: true,
    can_be_cancelled: true,
    requires_approval: false,
    is_taxable: true,
    tax_rate: "10.00",
    has_variable_pricing: false,
    min_cost: "",
    max_cost: "",
    effective_from: "",
    effective_to: "",
    notes: "",
    is_active: true,
  })

  useEffect(() => {
    initializeData()
  }, [])

  const initializeData = async () => {
    try {
      // Get current user and their organization
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) {
        console.error("User not authenticated:", userError)
        return
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        console.error("Could not determine user organization:", profileError)
        return
      }

      setOrganizationId(profile.organization_id)
    } catch (error) {
      console.error("Error initializing:", error)
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    
    // Clear error when user starts typing
    if (error) setError("")
    
    // Handle variable pricing logic
    if (field === "has_variable_pricing" && !value) {
      setFormData(prev => ({ ...prev, min_cost: "", max_cost: "" }))
    }
  }

  const addTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()])
      setCurrentTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) return "Service name is required"
    if (!formData.base_cost || parseFloat(formData.base_cost) < 0) return "Valid base cost is required"
    if (!formData.unit) return "Unit is required"
    
    if (formData.has_variable_pricing) {
      if (!formData.min_cost || !formData.max_cost) return "Min and max costs are required for variable pricing"
      if (parseFloat(formData.min_cost) >= parseFloat(formData.max_cost)) return "Max cost must be greater than min cost"
    }
    
    if (formData.tax_rate && (parseFloat(formData.tax_rate) < 0 || parseFloat(formData.tax_rate) > 100)) {
      return "Tax rate must be between 0 and 100"
    }
    
    return null
  }

  const createService = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    if (!organizationId) {
      setError("Organization not found")
      return
    }

    setLoading(true)
    try {
      // Get current user for audit fields
      const { data: { user } } = await supabase.auth.getUser()
      
      const serviceData = {
        organization_id: organizationId,
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        service_code: formData.service_code.trim() || null,
        base_cost: parseFloat(formData.base_cost),
        cost_currency: formData.cost_currency,
        unit: formData.unit,
        category: formData.category.trim() || null,
        subcategory: formData.subcategory.trim() || null,
        allow_discount: formData.allow_discount,
        can_be_cancelled: formData.can_be_cancelled,
        requires_approval: formData.requires_approval,
        is_taxable: formData.is_taxable,
        tax_rate: formData.is_taxable ? parseFloat(formData.tax_rate) : null,
        has_variable_pricing: formData.has_variable_pricing,
        min_cost: formData.has_variable_pricing ? parseFloat(formData.min_cost) : null,
        max_cost: formData.has_variable_pricing ? parseFloat(formData.max_cost) : null,
        effective_from: formData.effective_from || null,
        effective_to: formData.effective_to || null,
        notes: formData.notes.trim() || null,
        tags: tags.length > 0 ? tags : null,
        is_active: formData.is_active,
        created_by: user?.id || null,
        updated_by: user?.id || null,
      }

      const { data, error } = await supabase
        .from("services")
        .insert(serviceData)
        .select()
        .single()

      if (error) throw error

      console.log("Service created:", data)
      
      // Show success message and redirect
      alert(`✅ Service "${formData.name}" created successfully!`)
      router.push("/dashboard/services")
      
    } catch (error: any) {
      console.error("Error creating service:", error)
      setError(`Failed to create service: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const serviceCategories = [
    "Core Supports",
    "Capacity Building", 
    "Capital Supports",
    "Consumables",
    "Transport",
    "Accommodation",
    "Administrative",
    "Assessment",
    "Other"
  ]

  const unitOptions = [
    { value: "each", label: "Each" },
    { value: "minute", label: "Per Minute" },
    { value: "hour", label: "Per Hour" },
    { value: "day", label: "Per Day" },
    { value: "week", label: "Per Week" },
    { value: "month", label: "Per Month" },
    { value: "year", label: "Per Year" },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <Link href="/dashboard/services">Services</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Service</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/services" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Services
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Service</h1>
              <p className="text-gray-600 mt-1">
                Add a new service to your catalog
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-8">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Basic Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="name">Service Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                    placeholder="e.g., Personal Care Support"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="service_code">Service Code</Label>
                  <Input
                    id="service_code"
                    value={formData.service_code}
                    onChange={(e) => handleInputChange("service_code", e.target.value)}
                    placeholder="e.g., PC001"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    placeholder="Describe what this service provides..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => handleInputChange("category", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceCategories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={(e) => handleInputChange("subcategory", e.target.value)}
                    placeholder="Optional subcategory"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pricing Information */}
          <Card>
            <CardHeader>
              <CardTitle>Pricing Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <Label htmlFor="base_cost">Base Cost * ({formData.cost_currency})</Label>
                  <Input
                    id="base_cost"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_cost}
                    onChange={(e) => handleInputChange("base_cost", e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="unit">Unit *</Label>
                  <Select value={formData.unit} onValueChange={(value) => handleInputChange("unit", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {unitOptions.map((unit) => (
                        <SelectItem key={unit.value} value={unit.value}>
                          {unit.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="cost_currency">Currency</Label>
                  <Select value={formData.cost_currency} onValueChange={(value) => handleInputChange("cost_currency", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                      <SelectItem value="USD">USD - US Dollar</SelectItem>
                      <SelectItem value="EUR">EUR - Euro</SelectItem>
                      <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Variable Pricing */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="has_variable_pricing"
                    checked={formData.has_variable_pricing}
                    onCheckedChange={(checked) => handleInputChange("has_variable_pricing", checked)}
                  />
                  <Label htmlFor="has_variable_pricing">Variable Pricing</Label>
                </div>

                {formData.has_variable_pricing && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                    <div>
                      <Label htmlFor="min_cost">Minimum Cost ({formData.cost_currency})</Label>
                      <Input
                        id="min_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.min_cost}
                        onChange={(e) => handleInputChange("min_cost", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="max_cost">Maximum Cost ({formData.cost_currency})</Label>
                      <Input
                        id="max_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.max_cost}
                        onChange={(e) => handleInputChange("max_cost", e.target.value)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Tax Information */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_taxable"
                    checked={formData.is_taxable}
                    onCheckedChange={(checked) => handleInputChange("is_taxable", checked)}
                  />
                  <Label htmlFor="is_taxable">Taxable Service</Label>
                </div>

                {formData.is_taxable && (
                  <div className="ml-6">
                    <Label htmlFor="tax_rate">Tax Rate (%)</Label>
                    <Input
                      id="tax_rate"
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.tax_rate}
                      onChange={(e) => handleInputChange("tax_rate", e.target.value)}
                      placeholder="10.00"
                      className="max-w-32"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Rules */}
          <Card>
            <CardHeader>
              <CardTitle>Service Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="allow_discount"
                    checked={formData.allow_discount}
                    onCheckedChange={(checked) => handleInputChange("allow_discount", checked)}
                  />
                  <Label htmlFor="allow_discount">Allow Discounts</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="can_be_cancelled"
                    checked={formData.can_be_cancelled}
                    onCheckedChange={(checked) => handleInputChange("can_be_cancelled", checked)}
                  />
                  <Label htmlFor="can_be_cancelled">Can Be Cancelled</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="requires_approval"
                    checked={formData.requires_approval}
                    onCheckedChange={(checked) => handleInputChange("requires_approval", checked)}
                  />
                  <Label htmlFor="requires_approval">Requires Approval</Label>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => handleInputChange("is_active", checked)}
                  />
                  <Label htmlFor="is_active">Active Service</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Information */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="effective_from">Effective From</Label>
                  <Input
                    id="effective_from"
                    type="date"
                    value={formData.effective_from}
                    onChange={(e) => handleInputChange("effective_from", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="effective_to">Effective To</Label>
                  <Input
                    id="effective_to"
                    type="date"
                    value={formData.effective_to}
                    onChange={(e) => handleInputChange("effective_to", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="tags">Tags</Label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      id="tags"
                      value={currentTag}
                      onChange={(e) => setCurrentTag(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Add a tag and press Enter"
                    />
                    <Button type="button" onClick={addTag} variant="outline">
                      Add
                    </Button>
                  </div>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="flex items-center gap-1">
                          {tag}
                          <X 
                            className="w-3 h-3 cursor-pointer hover:text-red-600" 
                            onClick={() => removeTag(tag)}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => handleInputChange("notes", e.target.value)}
                  placeholder="Any additional notes about this service..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={createService} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Create Service
            </Button>
            
            <Button variant="outline" onClick={() => router.push("/dashboard/services")}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}