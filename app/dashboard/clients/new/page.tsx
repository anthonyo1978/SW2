"use client"
import { useState, useEffect } from "react"
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
import { DatePicker } from "@/components/ui/date-picker"
import { AvatarSelector } from "@/components/ui/avatar-selector"

export default function NewClientPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [formData, setFormData] = useState<{ [key: string]: string }>({
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
          date_of_birth: dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : null,
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
          avatar_url: avatarUrl,
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

  const [formConfig, setFormConfig] = useState<any[]>([]);
  const [configLoading, setConfigLoading] = useState(true);

  // Default form configuration as fallback
  const defaultFormConfig = [
    {
      "section": "Personal Information",
      "enabled": true,
      "fields": [
        { "name": "first_name", "label": "First Name", "type": "text", "required": true },
        { "name": "last_name", "label": "Last Name", "type": "text", "required": true },
        { "name": "date_of_birth", "label": "Date of Birth", "type": "text" },
        { "name": "phone", "label": "Phone Number", "type": "text" },
        { "name": "address", "label": "Address", "type": "textarea" },
        { "name": "emergency_contact_name", "label": "Emergency Contact Name", "type": "text" },
        { "name": "emergency_contact_phone", "label": "Emergency Contact Phone", "type": "text" }
      ]
    },
    {
      "section": "Health & Support Information",
      "enabled": true,
      "fields": [
        { "name": "medical_conditions", "label": "Medical Conditions", "type": "textarea" },
        { "name": "medications", "label": "Medications", "type": "textarea" },
        { "name": "support_goals", "label": "Support Goals", "type": "textarea" }
      ]
    },
    {
      "section": "Funding Information",
      "enabled": true,
      "fields": [
        { "name": "funding_type", "label": "Funding Type", "type": "select", "options": ["NDIS", "Private", "Home Care Package", "Commonwealth Home Support Programme"] },
        { "name": "sah_classification_level", "label": "S@H Classification Level", "type": "select", "options": ["1", "2", "3", "4", "5", "6", "7", "8"] },
        { "name": "plan_budget", "label": "Plan Budget (AUD)", "type": "text" },
        { "name": "plan_start_date", "label": "Plan Start Date", "type": "text" },
        { "name": "plan_end_date", "label": "Plan End Date", "type": "text" }
      ]
    },
    {
      "section": "Support at Home Details",
      "enabled": true,
      "fields": [
        { "name": "sah_number", "label": "S@H Number", "type": "text" },
        { "name": "medicare_number", "label": "Medicare Number", "type": "text" },
        { "name": "pension_type", "label": "Pension Type", "type": "select", "options": ["Age Pension", "Disability Support Pension", "Carer Payment", "None"] },
        { "name": "myagedcare_number", "label": "My Aged Care Number", "type": "text" }
      ]
    }
  ];

  useEffect(() => {
    fetch('/api/form-config')
      .then(res => res.json())
      .then(data => {
        console.log("Form config API response:", data);
        if (Array.isArray(data) && data.length > 0) {
          setFormConfig(data);
        } else {
          console.log("Using default form configuration");
          setFormConfig(defaultFormConfig);
        }
        setConfigLoading(false);
      })
      .catch(error => {
        console.error("Error loading form config, using default:", error);
        setFormConfig(defaultFormConfig);
        setConfigLoading(false);
      });
  }, []);

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

        {configLoading ? (
          <div className="text-gray-500">Loading form configuration...</div>
        ) : (
          <div className="space-y-8">
            {/* Profile Picture Section */}
            <Card>
              <CardHeader>
                <CardTitle>Profile Picture</CardTitle>
              </CardHeader>
              <CardContent>
                <AvatarSelector
                  currentAvatar={avatarUrl}
                  onAvatarChange={setAvatarUrl}
                />
              </CardContent>
            </Card>

            {formConfig
              .filter((section: any) => section.enabled)
              .map((section: any) => (
                <Card key={section.section}>
                  <CardHeader>
                    <CardTitle>{section.section}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {section.fields
                        .filter((field: any) => !('enabled' in field) || field.enabled)
                        .map((field: any) => (
                          <div key={field.name}>
                            <Label htmlFor={field.name}>
                              {field.label}
                              {"required" in field && field.required && " *"}
                            </Label>
                            {field.name === "date_of_birth" ? (
                              <div className="mt-1">
                                <DatePicker
                                  date={dateOfBirth}
                                  onSelect={setDateOfBirth}
                                  placeholder="Select date of birth"
                                />
                              </div>
                            ) : field.type === "text" ? (
                              <Input
                                id={field.name}
                                value={formData[field.name] || ""}
                                onChange={e => handleInputChange(field.name, e.target.value)}
                                required={"required" in field ? field.required : false}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                              />
                            ) : field.type === "textarea" ? (
                              <Textarea
                                id={field.name}
                                value={formData[field.name] || ""}
                                onChange={e => handleInputChange(field.name, e.target.value)}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                              />
                            ) : field.type === "select" && "options" in field && Array.isArray(field.options) ? (
                              <Select
                                value={formData[field.name] || ""}
                                onValueChange={value => handleInputChange(field.name, value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder={`Select ${field.label.toLowerCase()}`} />
                                </SelectTrigger>
                                <SelectContent>
                                  {field.options.map((option: string) => (
                                    <SelectItem key={option} value={option}>
                                      {option}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : null}
                          </div>
                        ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            <Button onClick={createClient} disabled={loading} className="w-full">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Create Client
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
