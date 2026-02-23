import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColorSwatch } from './ColorSwatch'

describe('ColorSwatch', () => {
  it('renders with the specified color', () => {
    render(<ColorSwatch color="#ff0000" aria-label="Red" />)
    const button = screen.getByRole('radio', { name: 'Red' })
    expect(button).toHaveStyle({ backgroundColor: '#ff0000' })
  })

  it('shows checkmark when selected', () => {
    const { container } = render(
      <ColorSwatch color="#00ff00" selected aria-label="Green" />
    )
    const checkIcon = container.querySelector('svg')
    expect(checkIcon).toBeInTheDocument()
  })

  it('does not show checkmark when not selected', () => {
    const { container } = render(
      <ColorSwatch color="#0000ff" aria-label="Blue" />
    )
    const checkIcon = container.querySelector('svg')
    expect(checkIcon).not.toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<ColorSwatch color="#ffff00" aria-label="Yellow" onClick={handleClick} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Yellow' }))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('has correct aria attributes when selected', () => {
    render(<ColorSwatch color="#ff00ff" selected aria-label="Magenta" />)
    const button = screen.getByRole('radio', { name: 'Magenta' })
    expect(button).toHaveAttribute('aria-checked', 'true')
  })

  it('has correct aria attributes when not selected', () => {
    render(<ColorSwatch color="#00ffff" aria-label="Cyan" />)
    const button = screen.getByRole('radio', { name: 'Cyan' })
    expect(button).toHaveAttribute('aria-checked', 'false')
  })

  it('applies size classes correctly', () => {
    const { rerender } = render(
      <ColorSwatch color="#000" size="sm" aria-label="Small" />
    )
    expect(screen.getByRole('radio')).toHaveClass('h-6', 'w-6')

    rerender(<ColorSwatch color="#000" size="md" aria-label="Medium" />)
    expect(screen.getByRole('radio')).toHaveClass('h-8', 'w-8')

    rerender(<ColorSwatch color="#000" size="lg" aria-label="Large" />)
    expect(screen.getByRole('radio')).toHaveClass('h-10', 'w-10')
  })

  it('is disabled when disabled prop is true', () => {
    render(<ColorSwatch color="#888" disabled aria-label="Disabled" />)
    expect(screen.getByRole('radio')).toBeDisabled()
  })
})
