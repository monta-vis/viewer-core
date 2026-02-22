import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IconButton } from './IconButton'

const TestIcon = () => <svg data-testid="test-icon" />

describe('IconButton', () => {
  it('renders with icon and aria-label', () => {
    render(<IconButton icon={<TestIcon />} aria-label="Test button" />)
    expect(screen.getByRole('button', { name: 'Test button' })).toBeInTheDocument()
    expect(screen.getByTestId('test-icon')).toBeInTheDocument()
  })

  it('calls onClick when clicked', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(<IconButton icon={<TestIcon />} aria-label="Click me" onClick={handleClick} />)
    await user.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('applies variant styles', () => {
    const { rerender } = render(
      <IconButton icon={<TestIcon />} aria-label="Primary" variant="primary" />
    )
    expect(screen.getByRole('button')).toHaveClass('bg-[var(--item-accent-bg)]')

    rerender(<IconButton icon={<TestIcon />} aria-label="Ghost" variant="ghost" />)
    expect(screen.getByRole('button')).toHaveClass('bg-transparent')

    rerender(<IconButton icon={<TestIcon />} aria-label="Danger" variant="danger" />)
    expect(screen.getByRole('button')).toHaveClass('text-[var(--color-error)]')
  })

  it('applies size styles', () => {
    // All sizes must meet WCAG 2.5.5 minimum touch target (44px = 2.75rem = h-11)
    const { rerender } = render(
      <IconButton icon={<TestIcon />} aria-label="Small" size="sm" />
    )
    expect(screen.getByRole('button')).toHaveClass('h-11', 'w-11')

    rerender(<IconButton icon={<TestIcon />} aria-label="Medium" size="md" />)
    expect(screen.getByRole('button')).toHaveClass('h-11', 'w-11')

    rerender(<IconButton icon={<TestIcon />} aria-label="Large" size="lg" />)
    expect(screen.getByRole('button')).toHaveClass('h-12', 'w-12')
  })

  it('sets aria-pressed when selected', () => {
    render(<IconButton icon={<TestIcon />} aria-label="Selected" selected />)
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true')
  })

  it('applies selected styles for primary variant', () => {
    render(
      <IconButton icon={<TestIcon />} aria-label="Selected primary" variant="primary" selected />
    )
    expect(screen.getByRole('button')).toHaveClass('!bg-[var(--item-accent-bg-selected)]')
  })

  it('applies selected styles for default variant', () => {
    render(<IconButton icon={<TestIcon />} aria-label="Selected default" selected />)
    expect(screen.getByRole('button')).toHaveClass('!bg-[var(--item-bg-selected)]')
  })

  it('can be disabled', () => {
    render(<IconButton icon={<TestIcon />} aria-label="Disabled" disabled />)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <IconButton icon={<TestIcon />} aria-label="Disabled" onClick={handleClick} disabled />
    )
    await user.click(screen.getByRole('button'))

    expect(handleClick).not.toHaveBeenCalled()
  })
})
