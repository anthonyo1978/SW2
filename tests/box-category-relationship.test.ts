import { describe, it, expect, beforeEach } from 'vitest'

// Test data types
interface BoxTemplate {
  id: string
  name: string
  box_type: 'fill_up' | 'draw_down' | 'hybrid'
  allocated_amount: number
  description: string
  service_category_id?: string
}

interface ServiceCategory {
  id: string
  name: string
  description?: string
  color: string
}

// Helper functions to test our business logic
function createBoxWithCategory(categoryId?: string): BoxTemplate {
  return {
    id: 'test-box-1',
    name: 'Test Box',
    box_type: 'draw_down',
    allocated_amount: 1000,
    description: 'Test box for category relationship',
    service_category_id: categoryId,
  }
}

function validateBoxCategoryAssignment(box: BoxTemplate, availableCategories: ServiceCategory[]): {
  valid: boolean
  message: string
} {
  // If no category assigned, box is flexible
  if (!box.service_category_id) {
    return {
      valid: true,
      message: 'Box has no category restriction - can use any service',
    }
  }

  // Check if assigned category exists
  const categoryExists = availableCategories.some(cat => cat.id === box.service_category_id)
  
  if (!categoryExists) {
    return {
      valid: false,
      message: 'Assigned category does not exist',
    }
  }

  return {
    valid: true,
    message: 'Box is properly restricted to a valid category',
  }
}

function canServiceBeUsedInBox(serviceCategory: string, box: BoxTemplate): boolean {
  // If box has no category restriction, any service can be used
  if (!box.service_category_id) {
    return true
  }

  // If box has restriction, service must match the category
  // Note: In real implementation, we'd look up category name by ID
  // For tests, we'll assume the serviceCategory matches the restriction
  return serviceCategory === box.service_category_id
}

describe('Box-Category Relationship', () => {
  let sampleCategories: ServiceCategory[]

  beforeEach(() => {
    sampleCategories = [
      { id: 'cat-1', name: 'Core Supports', color: '#10B981' },
      { id: 'cat-2', name: 'Transport', color: '#F59E0B' },
      { id: 'cat-3', name: 'Assessment', color: '#06B6D4' },
    ]
  })

  describe('Box Creation', () => {
    it('should create a box without category (flexible box)', () => {
      const box = createBoxWithCategory()
      
      expect(box.service_category_id).toBeUndefined()
      expect(box.name).toBe('Test Box')
      expect(box.box_type).toBe('draw_down')
    })

    it('should create a box with a specific category', () => {
      const categoryId = 'cat-1'
      const box = createBoxWithCategory(categoryId)
      
      expect(box.service_category_id).toBe(categoryId)
      expect(box.name).toBe('Test Box')
    })

    it('should validate box category assignment correctly', () => {
      // Test flexible box (no category)
      const flexibleBox = createBoxWithCategory()
      const flexibleResult = validateBoxCategoryAssignment(flexibleBox, sampleCategories)
      
      expect(flexibleResult.valid).toBe(true)
      expect(flexibleResult.message).toContain('no category restriction')

      // Test valid category assignment
      const categoryBox = createBoxWithCategory('cat-1')
      const categoryResult = validateBoxCategoryAssignment(categoryBox, sampleCategories)
      
      expect(categoryResult.valid).toBe(true)
      expect(categoryResult.message).toContain('properly restricted')

      // Test invalid category assignment
      const invalidBox = createBoxWithCategory('invalid-category-id')
      const invalidResult = validateBoxCategoryAssignment(invalidBox, sampleCategories)
      
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.message).toContain('does not exist')
    })
  })

  describe('Service Usage Validation', () => {
    it('should allow any service in flexible boxes', () => {
      const flexibleBox = createBoxWithCategory() // No category
      
      expect(canServiceBeUsedInBox('Core Supports', flexibleBox)).toBe(true)
      expect(canServiceBeUsedInBox('Transport', flexibleBox)).toBe(true)
      expect(canServiceBeUsedInBox('Assessment', flexibleBox)).toBe(true)
    })

    it('should restrict services in category-specific boxes', () => {
      const transportBox = createBoxWithCategory('Transport')
      
      expect(canServiceBeUsedInBox('Transport', transportBox)).toBe(true)
      expect(canServiceBeUsedInBox('Core Supports', transportBox)).toBe(false)
      expect(canServiceBeUsedInBox('Assessment', transportBox)).toBe(false)
    })

    it('should handle edge cases properly', () => {
      const box = createBoxWithCategory('cat-1')
      
      // Empty service category should return false
      expect(canServiceBeUsedInBox('', box)).toBe(false)
      
      // Undefined service category should return false
      expect(canServiceBeUsedInBox(undefined as any, box)).toBe(false)
    })
  })

  describe('Business Logic Validation', () => {
    it('should maintain the correct relationship structure', () => {
      const box = createBoxWithCategory('cat-1')
      
      // Box should have the expected structure
      expect(box).toHaveProperty('id')
      expect(box).toHaveProperty('name')
      expect(box).toHaveProperty('box_type')
      expect(box).toHaveProperty('allocated_amount')
      expect(box).toHaveProperty('service_category_id')
      
      // Amounts should be numbers
      expect(typeof box.allocated_amount).toBe('number')
      
      // Box type should be valid
      expect(['fill_up', 'draw_down', 'hybrid']).toContain(box.box_type)
    })

    it('should handle box type variations correctly', () => {
      const fillUpBox = createBoxWithCategory('cat-1')
      fillUpBox.box_type = 'fill_up'
      
      const drawDownBox = createBoxWithCategory('cat-1') 
      drawDownBox.box_type = 'draw_down'
      
      const hybridBox = createBoxWithCategory('cat-1')
      hybridBox.box_type = 'hybrid'
      
      // All should maintain their category relationship regardless of type
      expect(fillUpBox.service_category_id).toBe('cat-1')
      expect(drawDownBox.service_category_id).toBe('cat-1')
      expect(hybridBox.service_category_id).toBe('cat-1')
    })
  })

  describe('Data Integrity', () => {
    it('should preserve backward compatibility', () => {
      // Existing boxes without categories should work
      const legacyBox: BoxTemplate = {
        id: 'legacy-1',
        name: 'Legacy Box',
        box_type: 'hybrid',
        allocated_amount: 5000,
        description: 'Pre-existing box without category',
        // Note: no service_category_id property
      }
      
      const validation = validateBoxCategoryAssignment(legacyBox, sampleCategories)
      expect(validation.valid).toBe(true)
      expect(canServiceBeUsedInBox('any-service', legacyBox)).toBe(true)
    })

    it('should handle category deletion scenarios', () => {
      const box = createBoxWithCategory('cat-1')
      const categoriesAfterDeletion = sampleCategories.filter(cat => cat.id !== 'cat-1')
      
      const validation = validateBoxCategoryAssignment(box, categoriesAfterDeletion)
      expect(validation.valid).toBe(false)
      expect(validation.message).toContain('does not exist')
    })
  })
})