"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, User, Save, Loader2, AlertTriangle, UserX, UserCheck, RotateCcw } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { DatePicker } from "@/components/ui/date-picker"
import { AvatarSelector } from "@/components/ui/avatar-selector"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function EditClientPage() {
  const router = useRouter()
  const params = useParams()
  const clientId = params.id as string

  const [loading, setLoading] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [error, setError] = useState("")
  const [client, setClient] = useState<any>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(undefined)
  const [statusChanging, setStatusChanging] = useState(false)
  
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
    loadClient()
    loadFormConfig()
  }, [clientId])

  const loadClient = async () => {
    try {
      setPageLoading(true)
      
      const { data: clientData, error: clientError } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId)
        .single()

      if (clientError) throw clientError

      setClient(clientData)

      // Set avatar URL
      setAvatarUrl(clientData.avatar_url || null)

      // Set date of birth
      if (clientData.date_of_birth) {
        setDateOfBirth(new Date(clientData.date_of_birth))
      }

      // Populate form data with existing client data
      const populatedData: { [key: string]: string } = {}
      
      // Convert all fields to strings for form inputs
      Object.keys(formData).forEach(key => {
        const value = clientData[key]
        if (value !== null && value !== undefined) {
          if (Array.isArray(value)) {
            // Convert arrays to newline-separated strings for textareas
            populatedData[key] = value.join('\n')
          } else {
            populatedData[key] = value.toString()
          }
        } else {
          populatedData[key] = ""
        }
      })

      setFormData(populatedData)

    } catch (err: any) {
      console.error('Error loading client:', err)
      setError(`Failed to load client: ${err.message}`)
    } finally {
      setPageLoading(false)
    }
  }

  const loadFormConfig = () => {
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
  }

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

  const updateClient = async () => {
    const validationError = validateForm()
    if (validationError) {
      setError(validationError)
      return
    }

    setLoading(true)
    setError("")
    
    try {
      // Convert textarea fields to arrays
      const medical_conditions = formData.medical_conditions
        ? formData.medical_conditions.split("\n").filter((item) => item.trim())
        : []

      const medications = formData.medications ? formData.medications.split("\n").filter((item) => item.trim()) : []

      const support_goals = formData.support_goals
        ? formData.support_goals.split("\n").filter((item) => item.trim())
        : []

      // Update client
      const { error: clientError } = await supabase
        .from("clients")
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq("id", clientId)

      if (clientError) throw clientError

      // Redirect back to client detail page
      router.push(`/dashboard/clients/${clientId}`)
    } catch (error: any) {
      console.error("Error updating client:", error)
      setError(`Failed to update client: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!client) return
    
    setStatusChanging(true)
    try {
      const { error } = await supabase
        .from("clients")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", clientId)

      if (error) throw error

      // Update local client state
      setClient(prev => ({ ...prev, status: newStatus }))
      
      const statusMessages = {
        active: `✅ ${client.first_name} ${client.last_name} is now an active client!`,
        prospect: `🔄 ${client.first_name} ${client.last_name} has been moved back to prospect status.`,
        deactivated: `⏸️ ${client.first_name} ${client.last_name} has been deactivated.`
      }
      
      alert(statusMessages[newStatus as keyof typeof statusMessages] || `Status updated to ${newStatus}`)
    } catch (err: any) {
      console.error("Error updating client status:", err)
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setStatusChanging(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800"
      case "prospect":
        return "bg-blue-100 text-blue-800"
      case "deactivated":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (pageLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading client...</p>
        </div>
      </div>
    )
  }

  if (error && !client) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">{error}</div>
          <Link href="/dashboard/clients" className="text-blue-600 hover:underline">
            Back to Clients
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/dashboard/clients/${clientId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Client Details
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Edit Client: {client?.first_name} {client?.last_name}
              </h1>
              <p className="text-gray-600 mt-1">
                Update client information and support details
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-600">{error}</p>
          </div>
        )}

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
                              <DatePicker
                                date={dateOfBirth}
                                onSelect={setDateOfBirth}
                                placeholder="Select date of birth"
                              />
                            ) : field.type === "text" ? (
                              <Input
                                id={field.name}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                required={"required" in field ? field.required : false}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                              />
                            ) : field.type === "textarea" ? (
                              <Textarea
                                id={field.name}
                                value={formData[field.name] || ""}
                                onChange={(e) => handleInputChange(field.name, e.target.value)}
                                placeholder={`Enter ${field.label.toLowerCase()}`}
                                rows={3}
                              />
                            ) : field.type === "select" && "options" in field && Array.isArray(field.options) ? (
                              <Select
                                value={formData[field.name] || ""}
                                onValueChange={(value) => handleInputChange(field.name, value)}
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
            
            {/* Client Status Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Client Status Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">Current Status</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(client?.status || 'prospect')}`}>
                        {client?.status?.charAt(0).toUpperCase() + client?.status?.slice(1) || 'Prospect'}
                      </span>
                      <span className="text-sm text-gray-500">
                        {client?.status === 'active' && 'Receiving active support and services'}
                        {client?.status === 'prospect' && 'Potential client, not yet receiving services'}
                        {client?.status === 'deactivated' && 'No longer receiving services'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Move to Active */}
                  {client?.status === 'prospect' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          disabled={statusChanging}
                          className="justify-start h-auto p-4 border-green-200 hover:bg-green-50"
                        >
                          <div className="flex items-start gap-3">
                            <UserCheck className="w-5 h-5 text-green-600 mt-0.5" />
                            <div className="text-left">
                              <div className="font-medium text-green-700">Move to Active</div>
                              <div className="text-xs text-green-600 mt-1">Client will receive active support</div>
                            </div>
                          </div>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Move Client to Active Status?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {client?.first_name} {client?.last_name} will be moved from prospect to active status. 
                            This means they will be receiving active support and services.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleStatusChange('active')} className="bg-green-600 hover:bg-green-700">
                            Move to Active
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Move to Deactivated */}
                  {client?.status === 'active' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          disabled={statusChanging}
                          className="justify-start h-auto p-4 border-red-200 hover:bg-red-50"
                        >
                          <div className="flex items-start gap-3">
                            <UserX className="w-5 h-5 text-red-600 mt-0.5" />
                            <div className="text-left">
                              <div className="font-medium text-red-700">Move to Deactivated</div>
                              <div className="text-xs text-red-600 mt-1">Client will no longer receive services</div>
                            </div>
                          </div>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Deactivate Client?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {client?.first_name} {client?.last_name} will be deactivated and will no longer receive active support and services. 
                            This action can be reversed later if needed.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleStatusChange('deactivated')} className="bg-red-600 hover:bg-red-700">
                            Deactivate Client
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}

                  {/* Move back to Prospect */}
                  {client?.status === 'deactivated' && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          disabled={statusChanging}
                          className="justify-start h-auto p-4 border-blue-200 hover:bg-blue-50"
                        >
                          <div className="flex items-start gap-3">
                            <RotateCcw className="w-5 h-5 text-blue-600 mt-0.5" />
                            <div className="text-left">
                              <div className="font-medium text-blue-700">Move to Prospect</div>
                              <div className="text-xs text-blue-600 mt-1">Reset to prospect status</div>
                            </div>
                          </div>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Move Client to Prospect Status?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {client?.first_name} {client?.last_name} will be moved from deactivated back to prospect status. 
                            This will allow them to be considered for services again.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleStatusChange('prospect')} className="bg-blue-600 hover:bg-blue-700">
                            Move to Prospect
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {statusChanging && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Updating client status...
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex gap-4">
              <Button onClick={updateClient} disabled={loading} className="flex-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Update Client
              </Button>
              
              <Button variant="outline" onClick={() => router.push(`/dashboard/clients/${clientId}`)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}