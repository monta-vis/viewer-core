import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Card, CardHeader, CardTitle, CardContent } from './Card'

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Card content</Card>)
    expect(screen.getByText('Card content')).toBeInTheDocument()
  })

  it('applies padding styles', () => {
    const { rerender, container } = render(<Card padding="none">Content</Card>)
    expect(container.firstChild).not.toHaveClass('p-4')

    rerender(<Card padding="sm">Content</Card>)
    expect(container.firstChild).toHaveClass('p-2')

    rerender(<Card padding="md">Content</Card>)
    expect(container.firstChild).toHaveClass('p-4')

    rerender(<Card padding="lg">Content</Card>)
    expect(container.firstChild).toHaveClass('p-6')
  })

  it('is clickable when interactive', async () => {
    const user = userEvent.setup()
    const handleClick = vi.fn()

    render(
      <Card interactive onClick={handleClick}>
        Interactive Card
      </Card>
    )

    await user.click(screen.getByText('Interactive Card'))
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('sets aria-selected when selected', () => {
    const { container } = render(<Card selected>Selected Card</Card>)
    expect(container.firstChild).toHaveAttribute('aria-selected', 'true')
  })

  it('applies selected styles', () => {
    const { container } = render(<Card selected>Selected</Card>)
    expect(container.firstChild).toHaveClass('bg-[var(--item-bg-selected)]')
    expect(container.firstChild).toHaveClass('ring-2')
  })
})

describe('CardHeader', () => {
  it('renders children', () => {
    render(<CardHeader>Header content</CardHeader>)
    expect(screen.getByText('Header content')).toBeInTheDocument()
  })
})

describe('CardTitle', () => {
  it('renders as h3', () => {
    render(<CardTitle>Title</CardTitle>)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Title')
  })
})

describe('CardContent', () => {
  it('renders children with muted text style', () => {
    render(<CardContent>Content</CardContent>)
    expect(screen.getByText('Content')).toHaveClass('text-[var(--color-text-muted)]')
  })
})
