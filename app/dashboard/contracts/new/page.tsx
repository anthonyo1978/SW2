"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Save, Loader2, X, Briefcase, Home } from "lucide-react"
import { supabase } from "@/lib/supabase"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

interface Client {
  id: string
  first_name: string
  last_name: string
}

interface BoxTemplate {
  id: string
  name: string
  box_type: 'fill_up' | 'draw_down' | 'hybrid'
  allocated_amount: number
  description: string
}

export default function NewContractPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [organizationId, setOrganizationId] = useState<string | null>(null)

  // Form data
  const [formData, setFormData] = useState({
    description: "",
    client_id: "",
    start_date: "",
    end_date: "",
  })
  
  const [contractId, setContractId] = useState<string>("")

  // Box templates - starting simple
  const [boxes, setBoxes] = useState<BoxTemplate[]>([
    {
      id: "1",
      name: "",  // Empty name to trigger placeholder behavior
      box_type: 'draw_down',
      allocated_amount: 0,
      description: "Costs for services delivered to client"
    },
    {
      id: "2", 
      name: "",  // Empty name to trigger placeholder behavior
      box_type: 'fill_up',
      allocated_amount: 0,
      description: "Government NDIS funding allocation"
    },
    {
      id: "3",
      name: "Private Services",
      box_type: 'hybrid',
      allocated_amount: 0,
      description: "Private services that can both receive and spend funds"
    }
  ])

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
      await fetchClients(profile.organization_id)
    } catch (error) {
      console.error("Error initializing:", error)
    }
  }

  const generateContractId = async (orgId: string) => {
    try {
      // Get the count of existing contracts for this organization
      const { count, error } = await supabase
        .from("contracts")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", orgId)

      if (error) {
        console.error("Error counting contracts:", error)
        return "CT-000001"
      }

      // Generate next ID (count + 1, padded to 6 digits)
      const nextNumber = (count || 0) + 1
      const contractId = `CT-${nextNumber.toString().padStart(6, '0')}`
      setContractId(contractId)
      return contractId
    } catch (error) {
      console.error("Error generating contract ID:", error)
      return "CT-000001"
    }
  }

  const fetchClients = async (orgId: string) => {
    try {
      const { data, error } = await supabase
        .from("clients")
        .select("id, first_name, last_name")
        .eq("organization_id", orgId)
        .order("first_name")

      if (error) {
        console.error("Error fetching clients:", error)
        return
      }

      setClients(data || [])

      // Generate contract ID
      await generateContractId(orgId)

      // Pre-fill client if client_id is provided in URL
      const clientIdParam = searchParams.get('client_id')
      if (clientIdParam && data?.some(client => client.id === clientIdParam)) {
        setFormData(prev => ({ 
          ...prev, 
          client_id: clientIdParam
        }))
      }
    } catch (error) {
      console.error("Error fetching clients:", error)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleBoxChange = (boxId: string, field: string, value: any) => {
    setBoxes(prev => prev.map(box => 
      box.id === boxId ? { ...box, [field]: value } : box
    ))
  }

  const setDateRange = (months: number) => {
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    
    const endDate = new Date(today)
    endDate.setMonth(endDate.getMonth() + months)
    const endDateStr = endDate.toISOString().split('T')[0]
    
    setFormData(prev => ({
      ...prev,
      start_date: startDate,
      end_date: endDateStr
    }))
  }

  const addBox = () => {
    const newBox: BoxTemplate = {
      id: Date.now().toString(),
      name: "",
      box_type: 'hybrid',
      allocated_amount: 0,
      description: ""
    }
    setBoxes(prev => [...prev, newBox])
  }

  const removeBox = (boxId: string) => {
    setBoxes(prev => prev.filter(box => box.id !== boxId))
  }

  // Helper function for box type styling
  const getBoxTypeStyle = (boxType: 'fill_up' | 'draw_down' | 'hybrid') => {
    switch (boxType) {
      case 'draw_down':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          badge: 'bg-green-100 text-green-800'
        }
      case 'fill_up':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200', 
          text: 'text-red-800',
          badge: 'bg-red-100 text-red-800'
        }
      case 'hybrid':
        return {
          bg: 'bg-gradient-to-r from-purple-50 to-pink-50',
          border: 'border-purple-200',
          text: 'text-purple-800',
          badge: 'bg-gradient-to-r from-purple-100 to-pink-100 text-purple-800'
        }
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800', 
          badge: 'bg-gray-100 text-gray-800'
        }
    }
  }

  const validateForm = () => {
    if (!contractId) return "Contract ID not generated"
    if (!formData.client_id) return "Please select a client"
    if (boxes.length === 0) return "At least one box is required"
    
    for (const box of boxes) {
      // Allow empty names for draw_down and fill_up boxes (they'll use placeholders)
      if (!box.name.trim() && box.box_type !== 'draw_down' && box.box_type !== 'fill_up') {
        return "All boxes must have names"
      }
    }
    
    return null
  }

  const createContract = async () => {
    const validationError = validateForm()
    if (validationError) {
      alert(validationError)
      return
    }

    if (!organizationId) {
      alert("Organization not found")
      return
    }

    setLoading(true)
    try {
      console.log("Starting contract creation...")
      console.log("Organization ID:", organizationId)
      console.log("Form data:", formData)
      console.log("Boxes:", boxes)

      // Calculate total value from fill_up and hybrid boxes
      const totalValue = boxes
        .filter(box => box.box_type === 'fill_up' || box.box_type === 'hybrid')
        .reduce((sum, box) => sum + (box.allocated_amount || 0), 0)

      console.log("Contract ID:", contractId)
      console.log("Total value:", totalValue)

      // Create contract
      const contractPayload = {
        organization_id: organizationId,
        client_id: formData.client_id,
        name: contractId, // Use contract ID as the name
        description: formData.description.trim() || null,
        contract_number: contractId,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        status: 'draft',
        total_value: totalValue,
        remaining_balance: totalValue,
      }

      console.log("Contract payload:", contractPayload)

      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .insert(contractPayload)
        .select()
        .single()

      if (contractError) {
        console.error("Contract creation error:", contractError)
        throw contractError
      }

      console.log("Contract created:", contractData)

      // Create boxes with guaranteed unique names
      const usedNames = new Set()
      const boxInserts = boxes.map((box, index) => {
        let boxName = box.name.trim()
        
        if (!boxName) {
          // Generate base default names
          if (box.box_type === 'draw_down') {
            boxName = 'Government Funding'
          } else if (box.box_type === 'fill_up') {
            boxName = 'To Be Invoiced'
          } else {
            boxName = 'Service Box'
          }
        }
        
        // Ensure name is unique by adding suffix if needed
        let finalName = boxName
        let counter = 1
        while (usedNames.has(finalName)) {
          finalName = `${boxName} ${counter}`
          counter++
        }
        usedNames.add(finalName)
        
        console.log(`Box ${index + 1}: "${box.name.trim()}" -> "${finalName}" (type: ${box.box_type})`)
        
        return {
          contract_id: contractData.id,
          name: finalName,
          description: box.description.trim() || null,
          box_type: box.box_type,
          allocated_amount: box.allocated_amount || 0,
          current_balance: box.box_type === 'fill_up' ? (box.allocated_amount || 0) : 0,
          status: 'active'
        }
      })
      
      console.log("Final box names:", boxInserts.map(b => b.name))

      const { data: createdBoxes, error: boxError } = await supabase
        .from("contract_boxes")
        .insert(boxInserts)
        .select()

      if (boxError) {
        console.error("Error creating boxes:", boxError)
        throw boxError
      }

      console.log("Contract created successfully:", contractData.id)
      console.log("Boxes created:", createdBoxes?.length || 0)

      // Show success message and redirect to contracts list
      alert(`✅ Contract "${contractId}" created successfully with ${createdBoxes?.length || 0} boxes!`)
      
      // Redirect to contracts listing page  
      router.push("/dashboard/contracts")
    } catch (error: any) {
      console.error("Error creating contract:", error)
      alert(`Failed to create contract: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

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
                <Link href="/dashboard/contracts">Contracts</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>New Contract</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/contracts" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contracts
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Create New Contract</h1>
              <p className="text-gray-600 mt-1">
                Set up a new client agreement with funding boxes
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Basic Contract Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label>Contract ID</Label>
                  <div className="flex items-center h-10 px-3 py-2 bg-gray-50 border border-gray-200 rounded-md">
                    <span className="font-mono text-lg font-semibold text-blue-600">
                      {contractId || "Generating..."}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Auto-generated unique identifier</p>
                </div>

                <div>
                  <Label htmlFor="client_id">Client *</Label>
                  <Select value={formData.client_id} onValueChange={(value) => handleInputChange("client_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.first_name} {client.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label>Contract Duration</Label>
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(1)}>
                        1 Month
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(3)}>
                        3 Months
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(6)}>
                        6 Months
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(12)}>
                        1 Year
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setDateRange(24)}>
                        2 Years
                      </Button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="start_date" className="text-sm">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={formData.start_date}
                          onChange={(e) => handleInputChange("start_date", e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="end_date" className="text-sm">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={formData.end_date}
                          onChange={(e) => handleInputChange("end_date", e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange("description", e.target.value)}
                  placeholder="Optional description of the contract terms and conditions"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Contract Boxes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Contract Boxes</CardTitle>
                <Button onClick={addBox} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Box
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {boxes.map((box, index) => {
                const style = getBoxTypeStyle(box.box_type)
                return (
                  <div key={box.id} className={`border rounded-lg p-4 ${style.bg} ${style.border}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <h4 className={`font-medium ${style.text}`}>Box {index + 1}</h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${style.badge}`}>
                          {box.box_type === 'draw_down' ? 'Draw Down' : 
                           box.box_type === 'fill_up' ? 'Fill Up' : 'Hybrid'}
                        </span>
                      </div>
                      {boxes.length > 1 && (
                        <Button 
                          onClick={() => removeBox(box.id)} 
                          variant="ghost" 
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Box Name *</Label>
                      <Input
                        value={box.name}
                        onChange={(e) => handleBoxChange(box.id, "name", e.target.value)}
                        placeholder={
                          box.box_type === 'draw_down' ? "Government Funding" :
                          box.box_type === 'fill_up' ? "To Be Invoiced" :
                          "Service or Payment"
                        }
                        className={
                          box.name === "" && (box.box_type === 'draw_down' || box.box_type === 'fill_up')
                            ? "text-gray-400 placeholder:text-gray-400" 
                            : ""
                        }
                      />
                    </div>

                    <div>
                      <Label>Box Type *</Label>
                      <Select 
                        value={box.box_type} 
                        onValueChange={(value) => handleBoxChange(box.id, "box_type", value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fill_up">Fill Up (Receives funds)</SelectItem>
                          <SelectItem value="draw_down">Draw Down (Spends funds)</SelectItem>
                          <SelectItem value="hybrid">Hybrid (Both)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Allocated Amount ($)</Label>
                      <Input
                        type="number"
                        value={box.allocated_amount === 0 ? "" : box.allocated_amount}
                        onChange={(e) => {
                          const value = e.target.value
                          handleBoxChange(box.id, "allocated_amount", value === "" ? 0 : parseFloat(value) || 0)
                        }}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                      />
                    </div>

                    <div>
                      <Label>Description</Label>
                      <Input
                        value={box.description}
                        onChange={(e) => handleBoxChange(box.id, "description", e.target.value)}
                        placeholder="Purpose of this box"
                      />
                    </div>
                  </div>
                </div>
              )
            })}

              {boxes.length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-gray-300 rounded-lg">
                  <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">No boxes added yet</p>
                  <Button onClick={addBox} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Box
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Contract Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-7 gap-4">
                <div>
                  <div className="text-sm text-gray-500">Total Boxes</div>
                  <div className="text-2xl font-bold">{boxes.length}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Fill Up Boxes</div>
                  <div className="text-2xl font-bold text-red-600">
                    {boxes.filter(b => b.box_type === 'fill_up').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Draw Down Boxes</div>
                  <div className="text-2xl font-bold text-green-600">
                    {boxes.filter(b => b.box_type === 'draw_down').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Hybrid Boxes</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {boxes.filter(b => b.box_type === 'hybrid').length}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Total Contract Value</div>
                  <div className="text-2xl font-bold">
                    ${boxes
                      .reduce((sum, b) => sum + (b.allocated_amount || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Funding Sources</div>
                  <div className="text-lg font-bold text-red-600">
                    ${boxes
                      .filter(b => b.box_type === 'fill_up')
                      .reduce((sum, b) => sum + (b.allocated_amount || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-500">Service Costs</div>
                  <div className="text-lg font-bold text-green-600">
                    ${boxes
                      .filter(b => b.box_type === 'draw_down')
                      .reduce((sum, b) => sum + (b.allocated_amount || 0), 0)
                      .toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-4">
            <Button onClick={createContract} disabled={loading} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Create Contract
            </Button>
            
            <Button variant="outline" onClick={() => router.push("/dashboard/contracts")}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}