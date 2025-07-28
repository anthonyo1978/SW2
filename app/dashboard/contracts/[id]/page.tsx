"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  Home,
  Briefcase,
  User,
  Calendar,
  DollarSign,
  Edit,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowUpDown,
  Loader2,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Contract {
  id: string
  name: string
  contract_number?: string
  description?: string
  status: string
  start_date?: string
  end_date?: string
  total_value: number
  remaining_balance: number
  client_id: string
  clients: {
    first_name: string
    last_name: string
    avatar_url?: string
    status: string
  }
  created_at: string
  updated_at: string
}

interface ContractBox {
  id: string
  name: string
  description?: string
  box_type: 'fill_up' | 'draw_down' | 'hybrid'
  allocated_amount: number
  current_balance: number
  spent_amount: number
  status: string
}

export default function ContractDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contractId = params.id as string

  const [contract, setContract] = useState<Contract | null>(null)
  const [boxes, setBoxes] = useState<ContractBox[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState("")

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
          clients (first_name, last_name, avatar_url, status)
        `)
        .eq("id", contractId)
        .single()

      if (contractError) throw contractError
      setContract(contractData)

      // Fetch contract boxes
      const { data: boxesData, error: boxesError } = await supabase
        .from("contract_boxes")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at")

      if (boxesError) throw boxesError
      setBoxes(boxesData || [])

    } catch (err: any) {
      console.error("Error fetching contract data:", err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateContractStatus = async (newStatus: string) => {
    if (!contract) return

    // Business Rule: Contract can only be set to 'active' if client is 'active'
    if (newStatus === 'active' && contract.clients.status !== 'active') {
      alert(`Cannot activate contract: Client must be Active (currently ${contract.clients.status}). Please update the client status first.`)
      return
    }

    setUpdating(true)
    try {
      const { error } = await supabase
        .from("contracts")
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq("id", contractId)

      if (error) throw error

      setContract(prev => prev ? { ...prev, status: newStatus } : null)
    } catch (err: any) {
      console.error("Error updating contract status:", err)
      alert(`Failed to update status: ${err.message}`)
    } finally {
      setUpdating(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: { class: "bg-gray-100 text-gray-800", icon: Clock },
      active: { class: "bg-green-100 text-green-800", icon: CheckCircle },
      expired: { class: "bg-red-100 text-red-800", icon: XCircle },
      cancelled: { class: "bg-red-100 text-red-800", icon: XCircle },
    }

    const variant = variants[status as keyof typeof variants] || variants.draft
    const Icon = variant.icon

    return (
      <Badge className={`${variant.class} flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getBoxTypeIcon = (type: string) => {
    switch (type) {
      case 'fill_up':
        return <ArrowUpCircle className="w-5 h-5 text-green-600" />
      case 'draw_down':
        return <ArrowDownCircle className="w-5 h-5 text-red-600" />
      case 'hybrid':
        return <ArrowUpDown className="w-5 h-5 text-blue-600" />
      default:
        return <Briefcase className="w-5 h-5 text-gray-600" />
    }
  }

  const getBoxTypeColor = (type: string) => {
    switch (type) {
      case 'fill_up':
        return "bg-green-50 border-green-200"
      case 'draw_down':
        return "bg-red-50 border-red-200"
      case 'hybrid':
        return "bg-blue-50 border-blue-200"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
    }).format(amount)
  }

  // Calculate Total Allocated Value (sum of Draw Down box allocations)
  const getTotalAllocatedValue = () => {
    return boxes
      .filter(box => box.box_type === 'draw_down')
      .reduce((sum, box) => sum + box.allocated_amount, 0)
  }

  // Calculate Remaining Balance based on business logic
  const getRemainingBalance = () => {
    // Start with Total Allocated Value
    const totalAllocated = getTotalAllocatedValue()
    
    // Subtract spent amounts from Draw Down boxes
    const spentFromDrawDown = boxes
      .filter(box => box.box_type === 'draw_down')
      .reduce((sum, box) => sum + box.spent_amount, 0)
    
    // Subtract outstanding debt from Fill Up boxes (what client owes)
    const outstandingDebt = boxes
      .filter(box => box.box_type === 'fill_up')
      .reduce((sum, box) => sum + box.current_balance, 0)
    
    // Add current balances from Hybrid boxes
    const hybridBalances = boxes
      .filter(box => box.box_type === 'hybrid')
      .reduce((sum, box) => sum + box.current_balance, 0)
    
    return totalAllocated - spentFromDrawDown - outstandingDebt + hybridBalances
  }

  const getUtilizationPercentage = (box: ContractBox) => {
    if (box.allocated_amount === 0) return 0
    return Math.round((box.spent_amount / box.allocated_amount) * 100)
  }

  const getUtilizationColor = (percentage: number) => {
    if (percentage < 70) return "bg-green-500"
    if (percentage < 90) return "bg-yellow-500"
    return "bg-red-500"
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading contract...</p>
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
              <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Contract</h3>
              <div className="text-gray-500 mb-4">{error || "Contract not found"}</div>
              <Button asChild>
                <Link href="/dashboard/contracts">Back to Contracts</Link>
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
              <BreadcrumbPage>{contract.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Contract Overview Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left side - Contract info */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Briefcase className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{contract.name}</h1>
                <div className="flex items-center gap-4 mb-3">
                  {getStatusBadge(contract.status)}
                  {contract.contract_number && (
                    <span className="text-gray-500 font-mono text-sm">#{contract.contract_number}</span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="w-4 h-4" />
                  <span className="font-medium">
                    {contract.clients.first_name} {contract.clients.last_name}
                  </span>
                  <Badge 
                    className={
                      contract.clients.status === 'active' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-orange-100 text-orange-800'
                    }
                  >
                    {contract.clients.status.charAt(0).toUpperCase() + contract.clients.status.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Right side - Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Status:</span>
                  <Select 
                    value={contract.status} 
                    onValueChange={updateContractStatus}
                    disabled={updating}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem 
                        value="active"
                        disabled={contract.clients.status !== 'active'}
                      >
                        Active
                        {contract.clients.status !== 'active' && " (Client must be Active)"}
                      </SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {contract.clients.status !== 'active' && (
                  <div className="text-xs text-orange-600 max-w-48">
                    ⚠️ Contract can only be activated when client is Active
                  </div>
                )}
              </div>
              <Button 
                variant="outline"
                disabled={contract.status !== 'draft'}
                asChild={contract.status === 'draft'}
              >
                {contract.status === 'draft' ? (
                  <Link href={`/dashboard/contracts/${contractId}/edit`}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Contract
                  </Link>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Contract (Draft Only)
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Contract description */}
          {contract.description && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-gray-700">{contract.description}</p>
            </div>
          )}
        </div>

        {/* Contract Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Allocated Value</CardTitle>
              <DollarSign className="w-4 h-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(getTotalAllocatedValue())}</div>
              <div className="text-xs text-gray-500 mt-1">Original funding budget</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Remaining Balance</CardTitle>
              <TrendingUp className="w-4 h-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(getRemainingBalance())}
              </div>
              <div className="text-xs text-gray-500 mt-1">Available to spend</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Boxes</CardTitle>
              <Briefcase className="w-4 h-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{boxes.length}</div>
              <div className="text-xs text-gray-500 mt-1">
                <div>{boxes.filter(b => b.box_type === 'fill_up').length} Fill-up (debt)</div>
                <div>{boxes.filter(b => b.box_type === 'draw_down').length} Draw-down (budget)</div>
                <div>{boxes.filter(b => b.box_type === 'hybrid').length} Hybrid (flexible)</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Duration</CardTitle>
              <Calendar className="w-4 h-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              {contract.start_date && contract.end_date ? (
                <div>
                  <div className="text-lg font-bold">
                    {Math.ceil((new Date(contract.end_date).getTime() - new Date(contract.start_date).getTime()) / (1000 * 60 * 60 * 24))} days
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(contract.start_date).toLocaleDateString()} - {new Date(contract.end_date).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <div className="text-lg text-gray-400">Not set</div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Contract Boxes */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Contract Boxes</h2>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Box
            </Button>
          </div>

          {boxes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No boxes found</h3>
                <p className="text-gray-500 mb-4">This contract doesn't have any boxes yet.</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add First Box
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {boxes.map((box) => {
                const utilizationPercentage = getUtilizationPercentage(box)
                return (
                  <Card key={box.id} className={`${getBoxTypeColor(box.box_type)} border-2`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {getBoxTypeIcon(box.box_type)}
                          <div>
                            <CardTitle className="text-lg">{box.name}</CardTitle>
                            {box.description && (
                              <p className="text-sm text-gray-600 mt-1">{box.description}</p>
                            )}
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {box.box_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Financial Summary */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-sm text-gray-600">Allocated</div>
                            <div className="text-lg font-bold">{formatCurrency(box.allocated_amount)}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-600">Current Balance</div>
                            <div className="text-lg font-bold text-green-600">
                              {formatCurrency(box.current_balance)}
                            </div>
                          </div>
                        </div>

                        {/* Utilization Bar */}
                        {box.allocated_amount > 0 && (
                          <div>
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Utilization</span>
                              <span>{utilizationPercentage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${getUtilizationColor(utilizationPercentage)}`}
                                style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-white bg-opacity-50 rounded p-2">
                            <div className="text-xs text-gray-600">Spent</div>
                            <div className="font-semibold text-sm">{formatCurrency(box.spent_amount)}</div>
                          </div>
                          <div className="bg-white bg-opacity-50 rounded p-2">
                            <div className="text-xs text-gray-600">Remaining</div>
                            <div className="font-semibold text-sm">
                              {formatCurrency(box.allocated_amount - box.spent_amount)}
                            </div>
                          </div>
                          <div className="bg-white bg-opacity-50 rounded p-2">
                            <div className="text-xs text-gray-600">Status</div>
                            <div className="font-semibold text-sm capitalize">{box.status}</div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Activity Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>Transaction history will appear here</p>
              <p className="text-sm">Coming soon: Record and view all contract transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}