"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Plus, Save, Loader2, X, Briefcase, Home, AlertTriangle } from "lucide-react"
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
  status: string
}

interface Contract {
  id: string
  name: string
  contract_number?: string
  description?: string
  status: string
  start_date?: string
  end_date?: string
  client_id: string
  clients: Client
}

interface BoxTemplate {
  id: string
  name: string
  box_type: 'fill_up' | 'draw_down' | 'hybrid'
  allocated_amount: number
  description: string
}

export default function EditContractPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string
  
  const [contract, setContract] = useState<Contract | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [clients, setClients] = useState<Client[]>([])

  // Form data
  const [formData, setFormData] = useState({
    description: "",
    client_id: "",
    start_date: "",
    end_date: "",
  })

  const [boxes, setBoxes] = useState<BoxTemplate[]>([])

  useEffect(() => {
    if (contractId) {
      fetchContractData()
    }
  }, [contractId])

  const fetchContractData = async () => {
    try {
      setLoading(true)

      // Fetch contract with client info
      const { data: contractData, error: contractError } = await supabase
        .from("contracts")
        .select(`
          *,
          clients (id, first_name, last_name, status)
        `)
        .eq("id", contractId)
        .single()

      if (contractError) throw contractError
      
      // Check if contract can be edited
      if (contractData.status !== 'draft') {
        setError(`Cannot edit contract: Only draft contracts can be edited (current status: ${contractData.status})`)
        setLoading(false)
        return
      }

      setContract(contractData)
      setFormData({
        description: contractData.description || "",
        client_id: contractData.client_id,
        start_date: contractData.start_date || "",
        end_date: contractData.end_date || "",
      })

      // Fetch contract boxes
      const { data: boxesData, error: boxesError } = await supabase
        .from("contract_boxes")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at")

      if (boxesError) throw boxesError
      setBoxes(boxesData || [])

      // Fetch all clients for the dropdown
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) throw new Error("User not authenticated")

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .single()

      if (profileError || !profile?.organization_id) throw new Error("Could not determine user organization")

      const { data: clientsData, error: clientsError } = await supabase
        .from("clients")
        .select("id, first_name, last_name, status")
        .eq("organization_id", profile.organization_id)
        .order("first_name")

      if (clientsError) throw clientsError
      setClients(clientsData || [])

    } catch (err: any) {
      console.error("Error fetching contract data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
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

  const saveContract = async () => {
    const validationError = validateForm()
    if (validationError) {
      alert(validationError)
      return
    }

    setSaving(true)
    try {
      console.log("Starting contract save...")
      console.log("Contract ID:", contractId)
      console.log("Form data:", formData)
      console.log("Boxes:", boxes)

      // Update contract
      const contractUpdate = {
        description: formData.description.trim() || null,
        client_id: formData.client_id,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        updated_at: new Date().toISOString()
      }
      
      console.log("Contract update payload:", contractUpdate)
      
      const { data: contractResult, error: contractError } = await supabase
        .from("contracts")
        .update(contractUpdate)
        .eq("id", contractId)
        .select()

      if (contractError) {
        console.error("Contract update error:", contractError)
        throw new Error(`Contract update failed: ${contractError.message || JSON.stringify(contractError)}`)
      }

      console.log("Contract updated successfully:", contractResult)

      // BETTER APPROACH: Update existing boxes instead of delete/recreate
      console.log("=== SMART BOX UPDATE APPROACH ===")
      
      // Get existing boxes
      const { data: existingBoxes, error: existingError } = await supabase
        .from("contract_boxes")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at")

      if (existingError) {
        console.error("Error fetching existing boxes:", existingError)
        throw new Error(`Failed to fetch existing boxes: ${existingError.message}`)
      }

      console.log("Existing boxes:", existingBoxes)
      console.log("New boxes from form:", boxes)

      // Generate unique names for new boxes
      const usedNames = new Set()
      const processedBoxes = boxes.map((box, index) => {
        let boxName = box.name ? box.name.trim() : ""
        
        if (!boxName) {
          if (box.box_type === 'draw_down') {
            boxName = 'Government Funding'
          } else if (box.box_type === 'fill_up') {
            boxName = 'To Be Invoiced'
          } else {
            boxName = 'Service Box'
          }
        }
        
        // Ensure name is unique
        let finalName = boxName
        let counter = 1
        while (usedNames.has(finalName)) {
          finalName = `${boxName} ${counter}`
          counter++
        }
        usedNames.add(finalName)
        
        return {
          ...box,
          name: finalName,
          description: box.description ? box.description.trim() || null : null,
          allocated_amount: box.allocated_amount || 0,
          current_balance: box.box_type === 'fill_up' ? (box.allocated_amount || 0) : 0,
        }
      })

      console.log("Processed boxes with unique names:", processedBoxes)

      // Update existing boxes or create new ones
      const operations = []
      
      for (let i = 0; i < Math.max(existingBoxes?.length || 0, processedBoxes.length); i++) {
        const existingBox = existingBoxes?.[i]
        const newBox = processedBoxes[i]
        
        if (existingBox && newBox) {
          // Update existing box
          console.log(`Updating box ${i + 1}: ${existingBox.id}`)
          operations.push(
            supabase
              .from("contract_boxes")
              .update({
                name: newBox.name,
                description: newBox.description,
                box_type: newBox.box_type,
                allocated_amount: newBox.allocated_amount,
                current_balance: newBox.current_balance,
                status: 'active',
                updated_at: new Date().toISOString()
              })
              .eq("id", existingBox.id)
          )
        } else if (newBox) {
          // Create new box
          console.log(`Creating new box ${i + 1}`)
          operations.push(
            supabase
              .from("contract_boxes")
              .insert({
                contract_id: contractId,
                name: newBox.name,
                description: newBox.description,
                box_type: newBox.box_type,
                allocated_amount: newBox.allocated_amount,
                current_balance: newBox.current_balance,
                status: 'active'
              })
          )
        } else if (existingBox) {
          // Delete extra box
          console.log(`Deleting extra box ${i + 1}: ${existingBox.id}`)
          operations.push(
            supabase
              .from("contract_boxes")
              .delete()
              .eq("id", existingBox.id)
          )
        }
      }

      // Execute all operations
      console.log(`Executing ${operations.length} box operations...`)
      const results = await Promise.all(operations)
      
      // Check for errors
      for (let i = 0; i < results.length; i++) {
        const { error } = results[i]
        if (error) {
          console.error(`Operation ${i + 1} failed:`, error)
          throw new Error(`Box operation failed: ${error.message || JSON.stringify(error)}`)
        }
      }

      console.log("All box operations completed successfully!")

      // Show success message
      alert("✅ Contract updated successfully!")
      
      // Redirect back to contract detail
      router.push(`/dashboard/contracts/${contractId}`)
    } catch (error: any) {
      console.error("Error saving contract:", error)
      alert(`Failed to save contract: ${error.message || 'Unknown error occurred'}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <div className="text-gray-600">Loading contract...</div>
        </div>
      </div>
    )
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-red-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Cannot Edit Contract</h3>
              <div className="text-gray-500 mb-4">{error}</div>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/dashboard/contracts">Back to Contracts</Link>
                </Button>
                {contractId && (
                  <Button asChild>
                    <Link href={`/dashboard/contracts/${contractId}`}>View Contract</Link>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              <BreadcrumbLink asChild>
                <Link href={`/dashboard/contracts/${contractId}`}>{contract.name}</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header */}
        <div className="mb-8">
          <Link href={`/dashboard/contracts/${contractId}`} className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Contract
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Edit Contract</h1>
              <div className="flex items-center gap-3 mt-2">
                <p className="text-gray-600">{contract.name}</p>
                <Badge className="bg-blue-100 text-blue-800">Draft</Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Contract Details */}
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
                      {contract.name}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
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
                          <Badge className={client.status === 'active' ? 'ml-2 bg-green-100 text-green-800' : 'ml-2 bg-orange-100 text-orange-800'}>
                            {client.status}
                          </Badge>
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
            <Button onClick={saveContract} disabled={saving} className="flex-1">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
            
            <Button variant="outline" onClick={() => router.push(`/dashboard/contracts/${contractId}`)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}