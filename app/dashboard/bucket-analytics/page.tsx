"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Area,
  AreaChart,
} from "recharts"
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  Target,
  Home,
  ChevronRight,
  Download,
  RefreshCw,
  Filter,
  Eye,
  BarChart3,
} from "lucide-react"

interface BucketAnalytics {
  totalBalance: number
  totalAllocated: number
  utilizationRate: number
  complianceScore: number
  riskBuckets: number
  healthyBuckets: number
}

interface ForecastData {
  month: string
  projected: number
  actual: number
  budget: number
}

interface BucketPerformance {
  name: string
  category: string
  balance: number
  allocated: number
  utilization: number
  trend: "up" | "down" | "stable"
  riskLevel: "low" | "medium" | "high"
}

export default function BucketAnalyticsPage() {
  const [analytics, setAnalytics] = useState<BucketAnalytics>({
    totalBalance: 2450000,
    totalAllocated: 3200000,
    utilizationRate: 76.5,
    complianceScore: 94,
    riskBuckets: 3,
    healthyBuckets: 47,
  })

  const [timeRange, setTimeRange] = useState("3months")
  const [selectedMetric, setSelectedMetric] = useState("utilization")

  // Sample forecast data
  const forecastData: ForecastData[] = [
    { month: "Jan", projected: 280000, actual: 275000, budget: 300000 },
    { month: "Feb", projected: 290000, actual: 285000, budget: 300000 },
    { month: "Mar", projected: 310000, actual: 295000, budget: 300000 },
    { month: "Apr", projected: 295000, actual: 0, budget: 300000 },
    { month: "May", projected: 285000, actual: 0, budget: 300000 },
    { month: "Jun", projected: 275000, actual: 0, budget: 300000 },
  ]

  // Sample bucket performance data
  const bucketPerformance: BucketPerformance[] = [
    {
      name: "Government S@H Level 4",
      category: "draw_down",
      balance: 45000,
      allocated: 60000,
      utilization: 75,
      trend: "up",
      riskLevel: "medium",
    },
    {
      name: "Client Co-Payment",
      category: "fill_up",
      balance: 12000,
      allocated: 15000,
      utilization: 80,
      trend: "stable",
      riskLevel: "low",
    },
    {
      name: "Transport Allowance",
      category: "draw_down",
      balance: 2000,
      allocated: 8000,
      utilization: 75,
      trend: "down",
      riskLevel: "high",
    },
  ]

  // Sample utilization by service type
  const serviceUtilization = [
    { name: "Personal Care", value: 35, color: "#10b981" },
    { name: "Nursing", value: 25, color: "#3b82f6" },
    { name: "Transport", value: 20, color: "#f59e0b" },
    { name: "Social Support", value: 15, color: "#8b5cf6" },
    { name: "Other", value: 5, color: "#6b7280" },
  ]

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: "AUD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high":
        return "text-red-600 bg-red-50 border-red-200"
      case "medium":
        return "text-orange-600 bg-orange-50 border-orange-200"
      default:
        return "text-green-600 bg-green-50 border-green-200"
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4 text-green-600" />
      case "down":
        return <TrendingDown className="w-4 h-4 text-red-600" />
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-6">
          <Link href="/dashboard" className="flex items-center hover:text-gray-700 transition-colors">
            <Home className="w-4 h-4 mr-1" />
            Dashboard
          </Link>
          <ChevronRight className="w-4 h-4" />
          <Link href="/dashboard/buckets" className="hover:text-gray-700 transition-colors">
            Bucket Management
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-gray-900 font-medium">Analytics</span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Bucket Analytics</h1>
            <p className="text-gray-600 mt-1">Financial insights and compliance monitoring</p>
          </div>

          <div className="flex gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>

            <Button>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{formatCurrency(analytics.totalBalance)}</div>
                  <div className="text-gray-600 text-sm">Available Balance</div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center gap-2 text-sm">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-green-600">+5.2%</span>
                  <span className="text-gray-500">vs last month</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.utilizationRate}%</div>
                  <div className="text-gray-600 text-sm">Utilization Rate</div>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <Progress value={analytics.utilizationRate} className="h-2" />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>Target: 75%</span>
                  <span>Optimal Range</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.complianceScore}%</div>
                  <div className="text-gray-600 text-sm">Compliance Score</div>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <Badge className="bg-green-100 text-green-800">Excellent</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{analytics.riskBuckets}</div>
                  <div className="text-gray-600 text-sm">Risk Buckets</div>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="text-sm text-gray-600">{analytics.healthyBuckets} healthy buckets</div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Forecast Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Budget Forecast & Utilization
                </CardTitle>
                <Select value={selectedMetric} onValueChange={setSelectedMetric}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="utilization">Utilization</SelectItem>
                    <SelectItem value="balance">Balance</SelectItem>
                    <SelectItem value="spending">Spending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={forecastData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${value / 1000}k`} />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), ""]}
                    labelFormatter={(label) => `Month: ${label}`}
                  />
                  <Area type="monotone" dataKey="budget" stackId="1" stroke="#e5e7eb" fill="#f3f4f6" name="Budget" />
                  <Area
                    type="monotone"
                    dataKey="projected"
                    stackId="2"
                    stroke="#3b82f6"
                    fill="#dbeafe"
                    name="Projected"
                  />
                  <Area type="monotone" dataKey="actual" stackId="3" stroke="#10b981" fill="#d1fae5" name="Actual" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Service Utilization */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Service Utilization
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={serviceUtilization}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {serviceUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value}%`, "Utilization"]} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {serviceUtilization.map((item) => (
                  <div key={item.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bucket Performance Table */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Bucket Performance Analysis
              </CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Filter className="w-4 h-4 mr-2" />
                  Filter
                </Button>
                <Button variant="outline" size="sm">
                  <Eye className="w-4 h-4 mr-2" />
                  View Details
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bucketPerformance.map((bucket, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{bucket.name}</h4>
                        <Badge
                          variant="outline"
                          className={
                            bucket.category === "draw_down"
                              ? "bg-green-50 text-green-700 border-green-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }
                        >
                          {bucket.category === "draw_down" ? "Draw-Down" : "Fill-Up"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Balance</div>
                        <div className="font-semibold">{formatCurrency(bucket.balance)}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Allocated</div>
                        <div className="font-semibold">{formatCurrency(bucket.allocated)}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(bucket.trend)}
                        <Badge className={getRiskColor(bucket.riskLevel)} variant="outline">
                          {bucket.riskLevel}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Utilization</span>
                      <span className="font-medium">{bucket.utilization}%</span>
                    </div>
                    <Progress value={bucket.utilization} className="h-2" />
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>Used: {formatCurrency(bucket.allocated - bucket.balance)}</span>
                      <span>Remaining: {formatCurrency(bucket.balance)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Alerts */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Compliance Alerts & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">High Risk: Transport Allowance</h4>
                  <p className="text-red-700 text-sm mt-1">
                    This bucket is at 95% utilization with 2 months remaining in the period. Consider reallocating funds
                    or reducing transport services.
                  </p>
                  <Button size="sm" className="mt-2 bg-red-600 hover:bg-red-700">
                    Take Action
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-orange-900">Warning: Government S@H Level 4</h4>
                  <p className="text-orange-700 text-sm mt-1">
                    Utilization is trending above target. Monitor closely to avoid overspending.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                    Monitor
                  </Button>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-green-900">Optimization Opportunity</h4>
                  <p className="text-green-700 text-sm mt-1">
                    Client Co-Payment bucket has surplus funds that could be reallocated to enhance service delivery.
                  </p>
                  <Button size="sm" variant="outline" className="mt-2 bg-transparent">
                    Optimize
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
