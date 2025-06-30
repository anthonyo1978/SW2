"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, User, MapPin, CheckCircle, AlertCircle, Calendar } from "lucide-react"

interface ActivityItem {
  id: string
  client_name: string
  support_worker: string
  service: string
  status: "completed" | "in_progress" | "scheduled" | "cancelled"
  scheduled_start: string
  location?: string
  notes?: string
}

interface RecentActivityProps {
  organizationId: string
}

export function RecentActivity({ organizationId }: RecentActivityProps) {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentActivity()
  }, [organizationId])

  const fetchRecentActivity = async () => {
    try {
      // For now, we'll use mock data since we don't have real shifts yet
      // In production, this would query the shifts table with joins
      const mockActivities: ActivityItem[] = [
        {
          id: "1",
          client_name: "Sarah Johnson",
          support_worker: "Emma Thompson",
          service: "Personal Care",
          status: "completed",
          scheduled_start: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          location: "Client Home",
          notes: "All activities completed successfully",
        },
        {
          id: "2",
          client_name: "Robert Chen",
          support_worker: "Michael Davis",
          service: "Domestic Assistance",
          status: "in_progress",
          scheduled_start: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          location: "Client Home",
        },
        {
          id: "3",
          client_name: "Margaret Wilson",
          support_worker: "Lisa Anderson",
          service: "Social Support",
          status: "scheduled",
          scheduled_start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
          location: "Community Center",
        },
        {
          id: "4",
          client_name: "James Mitchell",
          support_worker: "Sarah Brown",
          service: "Transport",
          status: "completed",
          scheduled_start: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
          location: "Medical Appointment",
          notes: "Appointment attended successfully",
        },
        {
          id: "5",
          client_name: "Helen Garcia",
          support_worker: "David Wilson",
          service: "Personal Care",
          status: "scheduled",
          scheduled_start: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
          location: "Client Home",
        },
      ]

      setActivities(mockActivities)
    } catch (error) {
      console.error("Error fetching recent activity:", error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case "in_progress":
        return <Clock className="w-4 h-4 text-blue-500" />
      case "scheduled":
        return <Calendar className="w-4 h-4 text-purple-500" />
      case "cancelled":
        return <AlertCircle className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: "bg-green-100 text-green-800",
      in_progress: "bg-blue-100 text-blue-800",
      scheduled: "bg-purple-100 text-purple-800",
      cancelled: "bg-red-100 text-red-800",
    }

    return <Badge className={`text-xs ${variants[status as keyof typeof variants]}`}>{status.replace("_", " ")}</Badge>
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 0) {
      const futureMinutes = Math.abs(diffInMinutes)
      if (futureMinutes < 60) {
        return `in ${futureMinutes}m`
      } else {
        return `in ${Math.floor(futureMinutes / 60)}h`
      }
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-4 animate-pulse">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest service delivery updates</CardDescription>
        </div>
        <Button variant="outline" size="sm" asChild>
          <a href="/dashboard/scheduling">View All</a>
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start space-x-4 p-3 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-shrink-0 mt-1">{getStatusIcon(activity.status)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium text-gray-900 truncate">{activity.client_name}</p>
                  {getStatusBadge(activity.status)}
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-1">
                  <User className="w-3 h-3 mr-1" />
                  <span className="mr-3">{activity.support_worker}</span>
                  <span className="font-medium">{activity.service}</span>
                </div>

                <div className="flex items-center text-xs text-gray-500">
                  <Clock className="w-3 h-3 mr-1" />
                  <span className="mr-3">{formatTime(activity.scheduled_start)}</span>
                  {activity.location && (
                    <>
                      <MapPin className="w-3 h-3 mr-1" />
                      <span>{activity.location}</span>
                    </>
                  )}
                </div>

                {activity.notes && <p className="text-xs text-gray-600 mt-1 italic">{activity.notes}</p>}
              </div>
            </div>
          ))}
        </div>

        {activities.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity to display</p>
            <p className="text-sm">Activity will appear here as shifts are scheduled and completed</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
