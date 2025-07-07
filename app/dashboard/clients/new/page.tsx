"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, User, Save, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    // Personal Information
    first_name: "",
    last_name: "",
    date_of_birth: "",
    phone: "",
    address: "",
    emergency_contact_name: "",
    emergency_contact_phone: "",

    // Health & Support Information
    medical_conditions: "",
    medications: "",
    support_goals: "",

    // Funding Information
    funding_type: "",
    sah_classification_level: "",
    plan_budget: "",
    plan_start_date: "",
    plan_end_date: "",

    // Support at Home Details
    sah_number: "",
    medicare_number: "",
    pension_type: "",
    myagedcare_number: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))

    // Auto-calculate budget based on S@H classification level
    if (field === "sah_classification_level" && value) {
      const level = Number.parseInt(value)
      const budgetMap: Record<number, number> = {
        1: 9000,
        2: 15600,
        3: 33800,
        4: 52000,
        5: 60840,
        6: 63648,
        7: 66456,
        8: 69264,
      }
      const suggestedBudget = budgetMap[level] || 0
      setFormData((prev) => ({ ...prev, plan_budget: suggestedBudget.toString() }))
    }
  }

  const validateForm = () => {
    if (!formData.first_name.trim()) return "First name is required"
    if (!formData.last_name.trim()) return "Last name is required"
    if (formData.phone && !formData.phone.match(/^(\+61|0)[2-9]\d{8}$/)) {
      return "Please enter a valid Australian phone number"
    }
    return null
  }

  const createClient = async () => {
    const validationError = validateForm()
    if (validationError) {
      alert(validationError)
      return
    }

    setLoading(true)
    try {
      // Get current user and organization
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("User not authenticated")
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) {
        throw new Error("Could not determine user organization")
      }

      // Convert textarea fields to arrays
      const medical_conditions = formData.medical_conditions
        ? formData.medical_conditions.split("\n").filter((item) => item.trim())
        : []

      const medications = formData.medications ? formData.medications.split("\n").filter((item) => item.trim()) : []

      const support_goals = formData.support_goals
        ? formData.support_goals.split("\n").filter((item) => item.trim())
        : []

      // Create client
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .insert({
          organization_id: profile.organization_id,
          first_name: formData.first_name.trim(),
          last_name: formData.last_name.trim(),
          date_of_birth: formData.date_of_birth || null,
          phone: formData.phone || null,
          address: formData.address || null,
          emergency_contact_name: formData.emergency_contact_name || null,
          emergency_contact_phone: formData.emergency_contact_phone || null,
          medical_conditions: medical_conditions.length > 0 ? medical_conditions : null,
          medications: medications.length > 0 ? medications : null,
          support_goals: support_goals.length > 0 ? support_goals : null,
          funding_type: formData.funding_type || null,
          sah_classification_level: formData.sah_classification_level
            ? Number.parseInt(formData.sah_classification_level)
            : null,
          plan_budget: formData.plan_budget ? Number.parseFloat(formData.plan_budget) : null,
          plan_start_date: formData.plan_start_date || null,
          plan_end_date: formData.plan_end_date || null,
          sah_number: formData.sah_number || null,
          medicare_number: formData.medicare_number || null,
          pension_type: formData.pension_type || null,
          myagedcare_number: formData.myagedcare_number || null,
          status: "prospect",
        })
        .select()
        .single()

      if (clientError) throw clientError

      // Redirect to the new client's detail page
      router.push(`/dashboard/clients/${clientData.id}`)
    } catch (error: any) {
      console.error("Error creating client:", error)
      alert(`Failed to create client: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/clients" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Add New Client</h1>
              <p className="text-gray-600 mt-1">
                Create a new client profile with their personal and support information
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="first_name">First Name *</Label>
                  <Input
                    id="first_name"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange("first_name", e.target.value)}
                    placeholder="Enter first name"
                  />
                </div>

                <div>
                  <Label htmlFor="last_name">Last Name *</Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange("last_name", e.target.value)}
                    placeholder="Enter last name"
                  />
                </div>

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
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                    placeholder="0412 345 678"
                  />
                  <p className="text-xs text-gray-500 mt-1">Australian format: 04XX XXX XXX or +61 4XX XXX XXX</p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => handleInputChange("address", e.target.value)}
                    placeholder="Enter full address"
                  />
                </div>

                <div>
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name}
                    onChange={(e) => handleInputChange("emergency_contact_name", e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>

                <div>
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone}
                    onChange={(e) => handleInputChange("emergency_contact_phone", e.target.value)}
                    placeholder="0412 345 678"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Health & Support Information */}
          <Card>
            <CardHeader>
              <CardTitle>Health & Support Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="medical_conditions">Medical Conditions</Label>
                <Textarea
                  id="medical_conditions"
                  value={formData.medical_conditions}
                  onChange={(e) => handleInputChange("medical_conditions", e.target.value)}
                  placeholder="List medical conditions (one per line)"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Enter each condition on a new line</p>
              </div>

              <div>
                <Label htmlFor="medications">Current Medications</Label>
                <Textarea
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => handleInputChange("medications", e.target.value)}
                  placeholder="List current medications (one per line)"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Enter each medication on a new line</p>
              </div>

              <div>
                <Label htmlFor="support_goals">Support Goals</Label>
                <Textarea
                  id="support_goals"
                  value={formData.support_goals}
                  onChange={(e) => handleInputChange("support_goals", e.target.value)}
                  placeholder="List support goals and objectives (one per line)"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">Enter each goal on a new line</p>
              </div>
            </CardContent>
          </Card>

          {/* Funding Information */}
          <Card>
            <CardHeader>
              <CardTitle>Funding Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="funding_type">Funding Type</Label>
                  <Select
                    value={formData.funding_type}
                    onValueChange={(value) => handleInputChange("funding_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select funding type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sah">Support at Home (S@H)</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                      <SelectItem value="aged_care">Aged Care</SelectItem>
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
                      <SelectItem value="1">Level 1 ($9,000)</SelectItem>
                      <SelectItem value="2">Level 2 ($15,600)</SelectItem>
                      <SelectItem value="3">Level 3 ($33,800)</SelectItem>
                      <SelectItem value="4">Level 4 ($52,000)</SelectItem>
                      <SelectItem value="5">Level 5 ($60,840)</SelectItem>
                      <SelectItem value="6">Level 6 ($63,648)</SelectItem>
                      <SelectItem value="7">Level 7 ($66,456)</SelectItem>
                      <SelectItem value="8">Level 8 ($69,264)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="plan_budget">Plan Budget (AUD)</Label>
                  <Input
                    id="plan_budget"
                    type="number"
                    step="0.01"
                    value={formData.plan_budget}
                    onChange={(e) => handleInputChange("plan_budget", e.target.value)}
                    placeholder="0.00"
                  />
                  <p className="text-xs text-gray-500 mt-1">Auto-calculated based on S@H level</p>
                </div>

                <div>
                  <Label htmlFor="pension_type">Pension Type</Label>
                  <Select
                    value={formData.pension_type}
                    onValueChange={(value) => handleInputChange("pension_type", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pension type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="age_pension">Age Pension</SelectItem>
                      <SelectItem value="disability_pension">Disability Support Pension</SelectItem>
                      <SelectItem value="carer_pension">Carer Pension</SelectItem>
                      <SelectItem value="veteran_pension">Veteran Pension</SelectItem>
                      <SelectItem value="none">No Pension</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="plan_start_date">Plan Start Date</Label>
                  <Input
                    id="plan_start_date"
                    type="date"
                    value={formData.plan_start_date}
                    onChange={(e) => handleInputChange("plan_start_date", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="plan_end_date">Plan End Date</Label>
                  <Input
                    id="plan_end_date"
                    type="date"
                    value={formData.plan_end_date}
                    onChange={(e) => handleInputChange("plan_end_date", e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="sah_number">S@H Number</Label>
                  <Input
                    id="sah_number"
                    value={formData.sah_number}
                    onChange={(e) => handleInputChange("sah_number", e.target.value)}
                    placeholder="Support at Home number"
                  />
                </div>

                <div>
                  <Label htmlFor="medicare_number">Medicare Number</Label>
                  <Input
                    id="medicare_number"
                    value={formData.medicare_number}
                    onChange={(e) => handleInputChange("medicare_number", e.target.value)}
                    placeholder="Medicare card number"
                  />
                </div>

                <div>
                  <Label htmlFor="myagedcare_number">My Aged Care Number</Label>
                  <Input
                    id="myagedcare_number"
                    value={formData.myagedcare_number}
                    onChange={(e) => handleInputChange("myagedcare_number", e.target.value)}
                    placeholder="My Aged Care reference number"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button variant="outline" asChild>
              <Link href="/dashboard/clients">Cancel</Link>
            </Button>
            <Button onClick={createClient} disabled={loading || !formData.first_name || !formData.last_name}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Create Client
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
