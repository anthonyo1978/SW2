"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, User, Heart, DollarSign, Loader2, AlertCircle, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function NewClientPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",
    medical_conditions: "",
    medications: "",
    support_goals: "",
    funding_type: "sah",
    sah_classification_level: "",
    medicare_number: "",
    pension_type: "",
    myagedcare_number: "",
    status: "prospect",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const calculateBudget = (level: number) => {
    const budgets = {
      1: 10950.84, // Annual budget for Level 1
      2: 15981.68,
      3: 21919.76,
      4: 28763.16,
      5: 36515.88,
      6: 45177.92,
      7: 54749.28,
      8: 65229.96,
    }
    return budgets[level as keyof typeof budgets] || 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validation
      if (!formData.first_name.trim() || !formData.last_name.trim()) {
        throw new Error("First name and last name are required")
      }

      // Prepare data for insertion
      const clientData = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        date_of_birth: formData.date_of_birth || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        emergency_contact_name: formData.emergency_contact_name.trim() || null,
        emergency_contact_phone: formData.emergency_contact_phone.trim() || null,
        medical_conditions: formData.medical_conditions
          ? formData.medical_conditions.split(",").map((s) => s.trim())
          : null,
        medications: formData.medications ? formData.medications.split(",").map((s) => s.trim()) : null,
        support_goals: formData.support_goals ? formData.support_goals.split(",").map((s) => s.trim()) : null,
        funding_type: formData.funding_type,
        sah_classification_level: formData.sah_classification_level
          ? Number.parseInt(formData.sah_classification_level)
          : null,
        plan_budget: formData.sah_classification_level
          ? calculateBudget(Number.parseInt(formData.sah_classification_level))
          : null,
        medicare_number: formData.medicare_number.trim() || null,
        pension_type: formData.pension_type.trim() || null,
        myagedcare_number: formData.myagedcare_number.trim() || null,
        status: formData.status,
      }

      console.log("Creating client with data:", clientData)

      const { data, error: insertError } = await supabase.from("clients").insert([clientData]).select().single()

      if (insertError) {
        console.error("Insert error:", insertError)
        throw insertError
      }

      console.log("Client created successfully:", data)

      // Show success message
      setSuccess(true)

      // Redirect after a brief delay
      setTimeout(() => {
        router.push("/dashboard/clients")
      }, 2000)
    } catch (err: any) {
      console.error("Error creating client:", err)
      setError(err.message || "Failed to create client")
    } finally {
      setIsLoading(false)
    }
  }

  // Show success state
  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Client Created Successfully!</h3>
            <p className="text-gray-500 mb-4">
              {formData.first_name} {formData.last_name} has been added to your client list.
            </p>
            <Button asChild>
              <Link href="/dashboard/clients">View All Clients</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const selectedLevel = formData.sah_classification_level ? Number.parseInt(formData.sah_classification_level) : null
  const estimatedBudget = selectedLevel ? calculateBudget(selectedLevel) : null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/clients" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
          <p className="text-gray-600 mt-1">Create a new participant profile and support plan</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <CardTitle>Personal Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.date_of_birth}
                    onChange={(e) => handleInputChange("date_of_birth", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., 02 9876 5432"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Home Address</Label>
                <Textarea
                  id="address"
                  placeholder="Full residential address"
                  value={formData.address}
                  onChange={(e) => handleInputChange("address", e.target.value)}
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                </div>
                <CardTitle>Emergency Contact</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="emergency_contact_name">Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    placeholder="Full name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    type="tel"
                    placeholder="Phone number"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                  <Heart className="w-5 h-5 text-green-600" />
                </div>
                <CardTitle>Health & Support Information</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  placeholder="Separate multiple conditions with commas"
                  value={formData.medical_conditions}
                  onChange={(e) => handleInputChange("medical_conditions", e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="medications">Current Medications</Label>
                <Textarea
                  id="medications"
                  placeholder="Separate multiple medications with commas"
                  value={formData.medications}
                  onChange={(e) => handleInputChange("medications", e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="support_goals">Support Goals</Label>
                <Textarea
                  id="support_goals"
                  placeholder="What are the client's main support objectives?"
                  value={formData.support_goals}
                  onChange={(e) => handleInputChange("support_goals", e.target.value)}
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Funding Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-yellow-600" />
                </div>
                <CardTitle>Funding & Classification</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="funding_type">Funding Type</Label>
                  <Select
                    value={formData.funding_type}
                    onValueChange={(value) => handleInputChange("funding_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sah">Support at Home (S@H)</SelectItem>
                      <SelectItem value="aged_care">My Aged Care</SelectItem>
                      <SelectItem value="private">Private Pay</SelectItem>
                      <SelectItem value="ndis">NDIS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="sah_classification_level">S@H Classification Level</Label>
                  <Select
                    value={formData.sah_classification_level}
                    onValueChange={(value) => handleInputChange("sah_classification_level", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Level 1 - Basic Support</SelectItem>
                      <SelectItem value="2">Level 2 - Low Support</SelectItem>
                      <SelectItem value="3">Level 3 - Intermediate Support</SelectItem>
                      <SelectItem value="4">Level 4 - High Support</SelectItem>
                      <SelectItem value="5">Level 5 - Intensive Support</SelectItem>
                      <SelectItem value="6">Level 6 - Extensive Support</SelectItem>
                      <SelectItem value="7">Level 7 - Comprehensive Support</SelectItem>
                      <SelectItem value="8">Level 8 - Complex Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {estimatedBudget && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-900">Estimated Annual Budget</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">${estimatedBudget.toLocaleString()}</div>
                  <p className="text-sm text-blue-700 mt-1">Based on S@H Level {selectedLevel} classification</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="medicare_number">Medicare Number</Label>
                  <Input
                    id="medicare_number"
                    placeholder="Medicare number"
                    value={formData.medicare_number}
                    onChange={(e) => handleInputChange("medicare_number", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="pension_type">Pension Type</Label>
                  <Input
                    id="pension_type"
                    placeholder="e.g., Age Pension"
                    value={formData.pension_type}
                    onChange={(e) => handleInputChange("pension_type", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="myagedcare_number">My Aged Care Number</Label>
                  <Input
                    id="myagedcare_number"
                    placeholder="My Aged Care ID"
                    value={formData.myagedcare_number}
                    onChange={(e) => handleInputChange("myagedcare_number", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle>Client Status</CardTitle>
              <CardDescription>Set the initial status for this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger className="w-full md:w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prospect">Prospect - Initial inquiry</SelectItem>
                    <SelectItem value="active">Active - Receiving services</SelectItem>
                    <SelectItem value="deactivated">Deactivated - No longer active</SelectItem>
                  </SelectContent>
                </Select>
                {formData.status === "active" && (
                  <p className="text-sm text-green-600 mt-2">
                    ✅ Setting to Active will automatically create funding buckets for this client
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Buttons */}
          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" asChild>
              <Link href="/dashboard/clients">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Client...
                </>
              ) : (
                "Create Client"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
