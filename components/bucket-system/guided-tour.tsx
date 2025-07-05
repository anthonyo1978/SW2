"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Play, ArrowRight, CheckCircle, Zap, BarChart3, Settings, Target } from "lucide-react"
import Link from "next/link"

interface TourStep {
  id: string
  title: string
  description: string
  action: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  completed?: boolean
}

const tourSteps: TourStep[] = [
  {
    id: "understand-system",
    title: "Break Free from Rigid Funding",
    description:
      "See how the Bucket System lets you design your own funding logic instead of being locked into fixed government schemes",
    action: "Explore Buckets",
    href: "/dashboard/buckets",
    icon: Target,
  },
  {
    id: "design-templates",
    title: "Design Your Building Blocks",
    description:
      "Create flexible bucket templates that can power any service agreement - government, private, or hybrid funding models",
    action: "Build Templates",
    href: "/dashboard/buckets",
    icon: Zap,
  },
  {
    id: "configure-rules",
    title: "Set Your Own Rules",
    description: "Define custom spending rules, thresholds, and compliance logic that match your real-world contracts",
    action: "Configure Logic",
    href: "/dashboard/buckets",
    icon: Settings,
  },
  {
    id: "monitor-performance",
    title: "Monitor Any Contract Type",
    description:
      "Track performance across all your funding models with analytics that adapt to your custom bucket structures",
    action: "View Analytics",
    href: "/dashboard/bucket-analytics",
    icon: BarChart3,
  },
]

interface GuidedTourProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function GuidedTour({ open, onOpenChange }: GuidedTourProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<string[]>([])

  const handleStepComplete = (stepId: string) => {
    if (!completedSteps.includes(stepId)) {
      setCompletedSteps([...completedSteps, stepId])
    }
  }

  const nextStep = () => {
    if (currentStep < tourSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const currentTourStep = tourSteps[currentStep]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <Play className="w-5 h-5" />
              Bucket System: Build Your Own Funding Logic
            </DialogTitle>
            <Badge variant="outline">
              Step {currentStep + 1} of {tourSteps.length}
            </Badge>
          </div>
          <DialogDescription>
            Traditional systems lock you into fixed schemes. Discover how Swivel's Bucket System lets you design
            flexible financial building blocks for any contract.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / tourSteps.length) * 100}%` }}
            />
          </div>

          {/* Current Step */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <currentTourStep.icon className="w-5 h-5 text-blue-600" />
                </div>
                {currentTourStep.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">{currentTourStep.description}</p>
              <Button asChild className="w-full">
                <Link
                  href={currentTourStep.href}
                  onClick={() => {
                    handleStepComplete(currentTourStep.id)
                    onOpenChange(false)
                  }}
                >
                  {currentTourStep.action}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* All Steps Overview */}
          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Complete Tour Steps:</h4>
            {tourSteps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                  index === currentStep
                    ? "border-blue-200 bg-blue-50"
                    : completedSteps.includes(step.id)
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                }`}
              >
                <div className="flex-shrink-0">
                  {completedSteps.includes(step.id) ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{step.title}</div>
                  <div className="text-xs text-gray-600">{step.description}</div>
                </div>
                {index === currentStep && <Badge className="bg-blue-100 text-blue-800">Current</Badge>}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
            Previous
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Skip Tour
            </Button>
            {currentStep < tourSteps.length - 1 ? (
              <Button onClick={nextStep}>
                Next Step
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={() => onOpenChange(false)}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Tour
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function TourTrigger() {
  const [showTour, setShowTour] = useState(false)

  return (
    <>
      <Button
        onClick={() => setShowTour(true)}
        className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
      >
        <Play className="w-4 h-4 mr-2" />
        Quick Start Tour
      </Button>
      <GuidedTour open={showTour} onOpenChange={setShowTour} />
    </>
  )
}
