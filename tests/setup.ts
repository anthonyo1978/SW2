import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi, expect } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend expect matchers
expect.extend(matchers)

// Clean up after each test
afterEach(() => {
  cleanup()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(),
  }),
  usePathname: () => '/test-path',
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { organization_id: 'test-org-id' },
        error: null,
      }),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
    })),
  },
}))

// Suppress console warnings in tests
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeAll(() => {
  console.warn = (...args: any[]) => {
    // Allow specific warnings through
    if (args[0]?.includes('test-warning-you-want-to-see')) {
      originalConsoleWarn(...args)
    }
  }
  
  console.error = (...args: any[]) => {
    // Allow specific errors through
    if (args[0]?.includes('test-error-you-want-to-see')) {
      originalConsoleError(...args)
    }
  }
})

afterAll(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})