"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Upload, User, Camera } from "lucide-react"
import { cn } from "@/lib/utils"

interface AvatarSelectorProps {
  currentAvatar?: string | null
  onAvatarChange?: (avatarUrl: string | null) => void
  className?: string
}

// Predefined avatar options
const DEFAULT_AVATARS = [
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1494790108755-2616b2e79140?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
]

export function AvatarSelector({ currentAvatar, onAvatarChange, className }: AvatarSelectorProps) {
  const [showOptions, setShowOptions] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("File size must be less than 5MB")
        return
      }

      if (!file.type.startsWith('image/')) {
        alert("Please select an image file")
        return
      }

      const reader = new FileReader()
      reader.onload = (e) => {
        const result = e.target?.result as string
        setUploadedImage(result)
        onAvatarChange?.(result)
        setShowOptions(false)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleAvatarSelect = (avatarUrl: string) => {
    onAvatarChange?.(avatarUrl)
    setShowOptions(false)
  }

  const handleRemoveAvatar = () => {
    setUploadedImage(null)
    onAvatarChange?.(null)
    setShowOptions(false)
  }

  const displayAvatar = uploadedImage || currentAvatar

  return (
    <div className={cn("space-y-4", className)}>
      {/* Current Avatar Display */}
      <div className="flex items-center gap-4">
        <Avatar className="w-20 h-20">
          <AvatarImage src={displayAvatar || undefined} />
          <AvatarFallback className="bg-gray-200">
            <User className="w-8 h-8 text-gray-400" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex flex-col gap-2">
          <Button 
            type="button"
            variant="outline" 
            size="sm"
            onClick={() => setShowOptions(!showOptions)}
          >
            <Camera className="w-4 h-4 mr-2" />
            {displayAvatar ? "Change Photo" : "Add Photo"}
          </Button>
          
          {displayAvatar && (
            <Button 
              type="button"
              variant="ghost" 
              size="sm"
              onClick={handleRemoveAvatar}
              className="text-red-600 hover:text-red-700"
            >
              Remove Photo
            </Button>
          )}
        </div>
      </div>

      {/* Avatar Selection Options */}
      {showOptions && (
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* Upload Option */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Custom Photo
              </Button>
              <p className="text-xs text-gray-500 mt-1">
                Maximum file size: 5MB. Supported formats: JPG, PNG, GIF
              </p>
            </div>

            {/* Preset Avatars */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">Or choose from preset avatars:</p>
              <div className="grid grid-cols-4 gap-3">
                {DEFAULT_AVATARS.map((avatarUrl, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleAvatarSelect(avatarUrl)}
                    className={cn(
                      "relative rounded-full ring-2 ring-transparent hover:ring-blue-500 transition-all",
                      currentAvatar === avatarUrl && "ring-blue-500"
                    )}
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={avatarUrl} />
                      <AvatarFallback>
                        <User className="w-6 h-6" />
                      </AvatarFallback>
                    </Avatar>
                  </button>
                ))}
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowOptions(false)}
              className="w-full"
            >
              Cancel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}