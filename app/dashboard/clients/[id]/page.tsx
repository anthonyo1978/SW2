"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, User, Phone, MapPin, Calendar, Heart, DollarSign, Edit, Loader2 } from "lucide-react"
import { supabase } from "@/lib/supabase"

interface Client {
  id: string
  first_name: string
  last_name: string
  date_of_birth: string
  phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
  medical_conditions: string[]
  medications: string[]
  support_goals: string[]
  status: "prospect" | "active" | "deactivated"
  funding_type: string
  sah_classification_level: number
  plan_budget: number
  medicare_number: string
  pension_type: string
  myagedcare_number: string
  created_at: string
}

export default function ClientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [client, setClient] = useState<Client | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (params.id) {
      fetchClient(params.id as string)
    }
  }, [params.id])

  const fetchClient = async (clientId: string) => {
    try {
      const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).single()

      if (error) {
        console.error("Error fetching client:", error)
        setError("Client not found")
        return
      }

      setClient(data)
    } catch (error) {
      console.error("Error fetching client:", error)
      setError("Failed to load client")
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      prospect: "bg-blue-100 text-blue-800",
      active: "bg-green-100 text-green-800",
      deactivated: "bg-gray-100 text-gray-800",
    }
    return (
      <Badge className={`${variants[status as keyof typeof variants]} text-sm`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const getSahLevelBadge = (level: number) => {
    if (!level) return null
    const colors = {
      1: "bg-green-100 text-green-800",
      2: "bg-green-100 text-green-800",
      3: "bg-yellow-100 text-yellow-800",
      4: "bg-yellow-100 text-yellow-800",
      5: "bg-orange-100 text-orange-800",
      6: "bg-orange-100 text-orange-800",
      7: "bg-red-100 text-red-800",
      8: "bg-red-100 text-red-800",
    }
    return <Badge className={`${colors[level as keyof typeof colors]} text-sm`}>Level {level}</Badge>
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading client details...</p>
        </div>
      </div>
    )
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-8">
            <Link href="/dashboard/clients" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Clients
            </Link>
          </div>

          <Card>
            <CardContent className="text-center py-12">
              <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Client Not Found</h3>
              <p className="text-gray-500 mb-4">
                The client you're looking for doesn't exist or you don't have permission to view it.
              </p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/dashboard/clients" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Link>

          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {client.first_name} {client.last_name}
              </h1>
              <div className="flex items-center gap-4 mt-2">
                {getStatusBadge(client.status)}
                {getSahLevelBadge(client.sah_classification_level)}
              </div>
            </div>

            <Button asChild>
              <Link href={`/dashboard/clients/${client.id}/edit`}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Client
              </Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-blue-600" />
                  <CardTitle>Personal Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Full Name</Label>
                    <p className="font-medium">
                      {client.first_name} {client.last_name}
                    </p>
                  </div>
                  {client.date_of_birth && (
                    <div>
                      <Label>Date of Birth</Label>
                      <p className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {new Date(client.date_of_birth).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {client.phone && (
                    <div>
                      <Label>Phone Number</Label>
                      <p className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {client.phone}
                      </p>
                    </div>
                  )}
                  {client.address && (
                    <div>
                      <Label>Address</Label>
                      <p className="flex items-start gap-1">
                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                        {client.address}
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Health Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-red-600" />
                  <CardTitle>Health & Support Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {client.medical_conditions && client.medical_conditions.length > 0 && (
                  <div>
                    <Label>Medical Conditions</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {client.medical_conditions.map((condition, index) => (
                        <Badge key={index} variant="outline" className="bg-red-50 text-red-700 border-red-200">
                          {condition}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {client.medications && client.medications.length > 0 && (
                  <div>
                    <Label>Current Medications</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {client.medications.map((medication, index) => (
                        <Badge key={index} variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {medication}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {client.support_goals && client.support_goals.length > 0 && (
                  <div>
                    <Label>Support Goals</Label>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {client.support_goals.map((goal, index) => (
                        <Badge key={index} variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          {goal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Emergency Contact */}
            {(client.emergency_contact_name || client.emergency_contact_phone) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Emergency Contact</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {client.emergency_contact_name && (
                    <div>
                      <Label>Name</Label>
                      <p className="font-medium">{client.emergency_contact_name}</p>
                    </div>
                  )}
                  {client.emergency_contact_phone && (
                    <div>
                      <Label>Phone</Label>
                      <p className="flex items-center gap-1">
                        <Phone className="w-4 h-4 text-gray-400" />
                        {client.emergency_contact_phone}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Funding Information */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <CardTitle className="text-lg">Funding Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Funding Type</Label>
                  <p className="font-medium capitalize">{client.funding_type?.replace("_", " ")}</p>
                </div>

                {client.sah_classification_level && (
                  <div>
                    <Label>S@H Classification</Label>
                    <p className="font-medium">Level {client.sah_classification_level}</p>
                  </div>
                )}

                {client.plan_budget && (
                  <div>
                    <Label>Annual Budget</Label>
                    <p className="text-lg font-bold text-green-600">${client.plan_budget.toLocaleString()}</p>
                  </div>
                )}

                {client.medicare_number && (
                  <div>
                    <Label>Medicare Number</Label>
                    <p className="font-medium">{client.medicare_number}</p>
                  </div>
                )}

                {client.myagedcare_number && (
                  <div>
                    <Label>My Aged Care Number</Label>
                    <p className="font-medium">{client.myagedcare_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label>Client Since</Label>
                  <p className="font-medium">{new Date(client.created_at).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <div className="mt-1">{getStatusBadge(client.status)}</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-sm font-medium text-gray-500 mb-1">{children}</div>
}
