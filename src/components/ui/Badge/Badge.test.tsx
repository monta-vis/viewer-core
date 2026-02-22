import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Badge, NumberBadge } from './Badge'

const TestIcon = () => <svg data-testid="test-icon" />

describe('Badge', () => {
  it('renders with children', () => {
    render(<Badge>Status</Badge>)
    expect(screen.getByText('Status')).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<Badge variant="default">Default</Badge>)
    expect(screen.getByText('Default')).toHaveClass('bg-[var(--color-bg-surface)]')

    rerender(<Badge variant="primary">Primary</Badge>)
    expect(screen.getByText('Primary')).toHaveClass('text-[var(--color-secondary)]')

    rerender(<Badge variant="accent">Accent</Badge>)
    expect(screen.getByText('Accent')).toHaveClass('text-[var(--color-accent)]')

    rerender(<Badge variant="error">Error</Badge>)
    expect(screen.getByText('Error')).toHaveClass('text-[var(--color-error)]')
  })

  it('applies size styles', () => {
    const { rerender } = render(<Badge size="sm">Small</Badge>)
    expect(screen.getByText('Small')).toHaveClass('h-5', 'text-xs')

    rerender(<Badge size="md">Medium</Badge>)
    expect(screen.getByText('Medium')).toHaveClass('h-6', 'text-sm')
  })

  it('renders with icon', () => {
    render(<Badge icon={<TestIcon />}>With Icon</Badge>)
    expect(screen.getByText('With Icon')).toBeInTheDocument()
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<Badge className="custom-class">Custom</Badge>)
    expect(screen.getByText('Custom')).toHaveClass('custom-class')
  })
})

describe('NumberBadge', () => {
  it('renders with number value', () => {
    render(<NumberBadge value={5} />)
    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('applies variant styles', () => {
    const { rerender } = render(<NumberBadge value={3} variant="primary" />)
    expect(screen.getByText('3')).toHaveClass('text-[var(--color-secondary)]')

    rerender(<NumberBadge value={3} variant="error" />)
    expect(screen.getByText('3')).toHaveClass('text-[var(--color-error)]')
  })

  it('renders larger numbers', () => {
    render(<NumberBadge value={99} />)
    expect(screen.getByText('99')).toBeInTheDocument()
  })

  it('applies custom className', () => {
    render(<NumberBadge value={1} className="custom-class" />)
    expect(screen.getByText('1')).toHaveClass('custom-class')
  })
})
