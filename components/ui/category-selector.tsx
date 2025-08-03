"use client"

import { useState, useEffect } from "react"
import { Plus, Check, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"

interface ServiceCategory {
  id: string
  name: string
  description?: string
  color: string
  sort_order: number
  is_active: boolean
}

interface CategorySelectorProps {
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  label?: string
  required?: boolean
}

export function CategorySelector({ 
  value, 
  onValueChange, 
  placeholder = "Select a category",
  label = "Category",
  required = false 
}: CategorySelectorProps) {
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddNew, setShowAddNew] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryDescription, setNewCategoryDescription] = useState("")
  const [newCategoryColor, setNewCategoryColor] = useState("#3B82F6")
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("service_categories")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true })

      if (error) {
        console.error("Error fetching categories:", error)
        return
      }

      setCategories(data || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    } finally {
      setLoading(false)
    }
  }

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) {
      setError("Category name is required")
      return
    }

    setCreating(true)
    setError("")

    try {
      const { data, error } = await supabase.rpc('create_service_category', {
        category_name: newCategoryName.trim(),
        category_description: newCategoryDescription.trim() || null,
        category_color: newCategoryColor
      })

      if (error) {
        throw new Error(error.message)
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Failed to create category')
      }

      // Add the new category to the list
      const newCategory = data.category
      setCategories(prev => [...prev, newCategory].sort((a, b) => 
        a.sort_order - b.sort_order || a.name.localeCompare(b.name)
      ))

      // Select the new category
      onValueChange(newCategory.name)

      // Reset form
      setNewCategoryName("")
      setNewCategoryDescription("")
      setNewCategoryColor("#3B82F6")
      setShowAddNew(false)

    } catch (error: any) {
      console.error("Error creating category:", error)
      setError(error.message || "Failed to create category")
    } finally {
      setCreating(false)
    }
  }

  const cancelAddNew = () => {
    setShowAddNew(false)
    setNewCategoryName("")
    setNewCategoryDescription("")
    setNewCategoryColor("#3B82F6")
    setError("")
  }

  const predefinedColors = [
    "#3B82F6", // Blue
    "#10B981", // Green
    "#8B5CF6", // Purple
    "#F59E0B", // Orange
    "#EF4444", // Red
    "#06B6D4", // Cyan
    "#84CC16", // Lime
    "#6B7280", // Gray
    "#EC4899", // Pink
    "#F97316", // Orange-red
  ]

  if (loading) {
    return (
      <div>
        <Label>{label} {required && "*"}</Label>
        <Select disabled>
          <SelectTrigger>
            <SelectValue placeholder="Loading categories..." />
          </SelectTrigger>
        </Select>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Label>{label} {required && "*"}</Label>
      
      {!showAddNew ? (
        <div className="space-y-2">
          <Select value={value} onValueChange={onValueChange}>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.name}>
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: category.color }}
                    />
                    {category.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowAddNew(true)}
            className="w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Category
          </Button>
        </div>
      ) : (
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Create New Category</h4>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={cancelAddNew}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <Label htmlFor="new-category-name">Category Name *</Label>
              <Input
                id="new-category-name"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g., Personal Care"
                maxLength={100}
              />
            </div>

            <div>
              <Label htmlFor="new-category-description">Description (Optional)</Label>
              <Input
                id="new-category-description"
                value={newCategoryDescription}
                onChange={(e) => setNewCategoryDescription(e.target.value)}
                placeholder="Brief description of this category"
                maxLength={200}
              />
            </div>

            <div>
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap mt-1">
                {predefinedColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      newCategoryColor === color 
                        ? 'border-gray-900 ring-2 ring-offset-2 ring-gray-300' 
                        : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setNewCategoryColor(color)}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={createNewCategory}
                disabled={creating || !newCategoryName.trim()}
                className="flex-1"
              >
                {creating ? (
                  <>Creating...</>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Create Category
                  </>
                )}
              </Button>
              
              <Button
                type="button"
                variant="outline"
                onClick={cancelAddNew}
                disabled={creating}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {value && (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>Selected:</span>
          <Badge 
            variant="outline" 
            className="flex items-center gap-1"
            style={{ 
              borderColor: categories.find(c => c.name === value)?.color,
              color: categories.find(c => c.name === value)?.color 
            }}
          >
            <div 
              className="w-2 h-2 rounded-full" 
              style={{ backgroundColor: categories.find(c => c.name === value)?.color }}
            />
            {value}
          </Badge>
        </div>
      )}
    </div>
  )
}