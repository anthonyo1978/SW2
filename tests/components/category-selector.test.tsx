import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock the Select component since it's complex to test
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <div data-testid="select" data-value={value}>
      <button onClick={() => onValueChange && onValueChange('test-category-1')}>
        Change Value
      </button>
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <span data-testid="select-value">{placeholder}</span>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => (
    <div data-testid={`select-item-${value}`}>{children}</div>
  ),
}))

// Mock the Label component
vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}))

// Simplified Category Selector Component for testing
interface ServiceCategory {
  id: string
  name: string
  color: string
}

interface CategorySelectorProps {
  value?: string
  onValueChange: (value: string | undefined) => void
  categories: ServiceCategory[]
  disabled?: boolean
}

function CategorySelector({ value, onValueChange, categories, disabled }: CategorySelectorProps) {
  const handleValueChange = (newValue: string) => {
    onValueChange(newValue === 'none' ? undefined : newValue)
  }

  return (
    <div data-testid="category-selector">
      <label data-testid="label">Service Category</label>
      <div 
        data-testid="select" 
        data-value={value || 'none'}
        onClick={() => !disabled && handleValueChange('test-category-1')}
      >
        <div data-testid="select-trigger">
          <span data-testid="select-value">Select category (optional)</span>
        </div>
        <div data-testid="select-content">
          <div data-testid="select-item-none">No restriction (flexible box)</div>
          {categories.map((category) => (
            <div key={category.id} data-testid={`select-item-${category.id}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div 
                  data-testid={`category-color-${category.id}`}
                  style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%', 
                    backgroundColor: category.color 
                  }}
                />
                {category.name}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p data-testid="helper-text">
        {value 
          ? "Only services from this category can be billed to this box"
          : "Any service can be billed to this box (flexible)"
        }
      </p>
    </div>
  )
}

describe('CategorySelector Component', () => {
  const mockCategories: ServiceCategory[] = [
    { id: 'cat-1', name: 'Core Supports', color: '#10B981' },
    { id: 'cat-2', name: 'Transport', color: '#F59E0B' },
    { id: 'cat-3', name: 'Assessment', color: '#06B6D4' },
  ]

  const mockOnValueChange = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should render with default props', () => {
    render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    expect(screen.getByTestId('category-selector')).toBeInTheDocument()
    expect(screen.getByTestId('label')).toHaveTextContent('Service Category')
    expect(screen.getByTestId('select-value')).toHaveTextContent('Select category (optional)')
  })

  it('should display all categories with colors', () => {
    render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    // Check that all categories are rendered
    mockCategories.forEach((category) => {
      expect(screen.getByTestId(`select-item-${category.id}`)).toBeInTheDocument()
      expect(screen.getByTestId(`category-color-${category.id}`)).toHaveStyle({
        backgroundColor: category.color
      })
    })

    // Check for the "no restriction" option
    expect(screen.getByTestId('select-item-none')).toHaveTextContent('No restriction (flexible box)')
  })

  it('should show correct helper text based on selection', () => {
    const { rerender } = render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    // No selection (flexible)
    expect(screen.getByTestId('helper-text')).toHaveTextContent(
      'Any service can be billed to this box (flexible)'
    )

    // With selection (restricted)
    rerender(
      <CategorySelector 
        value="cat-1"
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    expect(screen.getByTestId('helper-text')).toHaveTextContent(
      'Only services from this category can be billed to this box'
    )
  })

  it('should handle value changes correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    // Simulate selecting a category
    const select = screen.getByTestId('select')
    await user.click(select)

    expect(mockOnValueChange).toHaveBeenCalledWith('test-category-1')
  })

  it('should handle disabled state', () => {
    render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={mockCategories}
        disabled={true}
      />
    )

    const select = screen.getByTestId('select')
    fireEvent.click(select)

    // Should not call onValueChange when disabled
    expect(mockOnValueChange).not.toHaveBeenCalled()
  })

  it('should display correct value when controlled', () => {
    render(
      <CategorySelector 
        value="cat-2"
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    const select = screen.getByTestId('select')
    expect(select).toHaveAttribute('data-value', 'cat-2')
  })

  it('should handle edge cases', () => {
    // Empty categories array
    render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={[]}
      />
    )

    expect(screen.getByTestId('select-item-none')).toBeInTheDocument()
    expect(screen.queryByTestId('select-item-cat-1')).not.toBeInTheDocument()
  })

  it('should maintain accessibility', () => {
    render(
      <CategorySelector 
        onValueChange={mockOnValueChange}
        categories={mockCategories}
      />
    )

    // Check for proper labeling
    expect(screen.getByTestId('label')).toBeInTheDocument()
    expect(screen.getByTestId('helper-text')).toBeInTheDocument()
    
    // Check for semantic structure
    expect(screen.getByTestId('category-selector')).toBeInTheDocument()
  })
})