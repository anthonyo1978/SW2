import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, Shield, TrendingUp, FileText, Users, Clock, DollarSign, Award } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Swivel CRM</span>
          </div>
          <nav className="hidden md:flex space-x-6">
            <Link href="#features" className="text-gray-600 hover:text-blue-600">
              Features
            </Link>
            <Link href="#pricing" className="text-gray-600 hover:text-blue-600">
              Pricing
            </Link>
            <Link href="#compliance" className="text-gray-600 hover:text-blue-600">
              Compliance
            </Link>
          </nav>
          <div className="flex space-x-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/signin">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Start Free Trial</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="flex justify-center mb-6">
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              🇦🇺 Built for Australian Aged Care Providers
            </Badge>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Streamline Your <span className="text-blue-600">Support at Home</span> Services
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Built for Australian aged care providers who need to stay compliant, manage budgets, and deliver quality
            care. Never exceed S@H budgets again.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="text-lg px-8 py-4" asChild>
              <Link href="/auth/signup">Start 14-Day Free Trial</Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-4 bg-transparent">
              Watch Demo
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>NDIS & My Aged Care compatible</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Australian compliance built-in</span>
            </div>
          </div>
        </div>
      </section>

      {/* Problem/Solution Section */}
      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Stop Losing Money on Budget Overruns</h2>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Excel spreadsheets can't track complex government funding streams</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Manual budget calculations lead to costly compliance violations</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>No real-time visibility into what you can actually spend</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0"></div>
                  <p>Audit preparation takes weeks of manual work</p>
                </div>
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold text-blue-600 mb-6">Our Revolutionary Two-Bucket System</h3>
              <div className="space-y-4 text-gray-600">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Draw-Down Buckets:</strong> Government pre-funded services with automatic compliance
                    protection
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Fill-Up Buckets:</strong> Client-funded extras billed after service delivery
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Real-Time Tracking:</strong> Know exactly what you can spend, when
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Audit-Ready:</strong> Complete compliance trail automatically generated
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Everything You Need for Aged Care Management</h2>
            <p className="text-xl text-gray-600">Purpose-built for Australian Support at Home providers</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <Shield className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Government Funding Compliance</CardTitle>
                <CardDescription>Never exceed S@H budgets again with automatic compliance protection</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• S@H classification-based budget calculation</li>
                  <li>• Real-time balance monitoring</li>
                  <li>• Automatic overspend prevention</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <TrendingUp className="w-10 h-10 text-green-600 mb-2" />
                <CardTitle>Two-Bucket Financial System</CardTitle>
                <CardDescription>Separate government and client funding streams automatically</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Draw-down buckets for pre-funded services</li>
                  <li>• Fill-up buckets for client contributions</li>
                  <li>• Automated bucket creation and management</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <Clock className="w-10 h-10 text-purple-600 mb-2" />
                <CardTitle>Real-Time Budget Tracking</CardTitle>
                <CardDescription>Know exactly what you can spend at any moment</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Live balance updates</li>
                  <li>• Visual budget indicators</li>
                  <li>• Spending alerts and warnings</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <FileText className="w-10 h-10 text-orange-600 mb-2" />
                <CardTitle>Audit-Ready Reports</CardTitle>
                <CardDescription>Compliance reporting and documentation built-in</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Complete transaction audit trails</li>
                  <li>• Government reporting templates</li>
                  <li>• Export capabilities for auditors</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <Users className="w-10 h-10 text-blue-600 mb-2" />
                <CardTitle>Client & Staff Management</CardTitle>
                <CardDescription>Complete participant and workforce management</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Client lifecycle tracking</li>
                  <li>• WWCC and qualification management</li>
                  <li>• Shift scheduling and logging</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader>
                <DollarSign className="w-10 h-10 text-green-600 mb-2" />
                <CardTitle>Automated Invoicing</CardTitle>
                <CardDescription>Generate accurate invoices from service delivery data</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li>• Service-based invoice generation</li>
                  <li>• GST calculation and compliance</li>
                  <li>• Payment tracking and reminders</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance Section */}
      <section id="compliance" className="py-16 px-4 bg-blue-50">
        <div className="container mx-auto max-w-4xl text-center">
          <Award className="w-16 h-16 text-blue-600 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Built for Australian Compliance</h2>
          <p className="text-lg text-gray-600 mb-8">
            Swivel CRM is designed specifically for Australian aged care regulations and requirements
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">Support at Home Ready</h3>
              <p className="text-sm text-gray-600">Fully compatible with upcoming S@H program changes</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">NDIS Compatible</h3>
              <p className="text-sm text-gray-600">Works seamlessly with NDIS funding and reporting</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">My Aged Care Integration</h3>
              <p className="text-sm text-gray-600">Direct integration with My Aged Care systems</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Start with a 14-day free trial. No credit card required.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <Card className="border-2 hover:border-blue-200 transition-colors">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Starter</CardTitle>
                <CardDescription>Perfect for small providers</CardDescription>
                <div className="text-3xl font-bold text-blue-600 mt-4">
                  $99<span className="text-lg text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Up to 50 clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>5 staff members</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Two-bucket system</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Basic reporting</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Email support</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" asChild>
                  <Link href="/auth/signup?plan=starter">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="border-2 border-blue-500 relative">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-500">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">Pro</CardTitle>
                <CardDescription>For growing organizations</CardDescription>
                <div className="text-3xl font-bold text-blue-600 mt-4">
                  $199<span className="text-lg text-gray-500">/month</span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Unlimited clients</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Unlimited staff</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Advanced bucket management</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Advanced reporting & analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <span>API access</span>
                  </li>
                </ul>
                <Button className="w-full mt-6" asChild>
                  <Link href="/auth/signup?plan=pro">Start Free Trial</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Transform Your Aged Care Management?</h2>
          <p className="text-xl mb-8 text-blue-100">
            Join Australian aged care providers who trust Swivel CRM for compliance and growth
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-4" asChild>
            <Link href="/auth/signup">Start Your Free Trial Today</Link>
          </Button>
          <p className="text-sm text-blue-200 mt-4">14-day free trial • No credit card required • Cancel anytime</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">S</span>
                </div>
                <span className="text-xl font-bold">Swivel CRM</span>
              </div>
              <p className="text-gray-400 text-sm">
                The complete aged care management solution for Australian Support at Home providers.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#features" className="hover:text-white">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#pricing" className="hover:text-white">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Demo
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    Help Center
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Contact Us
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Training
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <Link href="#" className="hover:text-white">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-white">
                    Terms
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 Swivel CRM. Built for Australian aged care providers.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
