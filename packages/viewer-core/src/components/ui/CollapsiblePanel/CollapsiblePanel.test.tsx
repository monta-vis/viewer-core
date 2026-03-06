import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { CollapsiblePanel } from './CollapsiblePanel'

afterEach(() => { cleanup(); });

describe('CollapsiblePanel', () => {
  it('renders children when open', () => {
    render(
      <CollapsiblePanel isOpen>
        <p>Panel content</p>
      </CollapsiblePanel>
    )
    expect(screen.getByText('Panel content')).toBeInTheDocument()
  })

  it('renders children in DOM when closed (for animation)', () => {
    render(
      <CollapsiblePanel isOpen={false}>
        <p>Hidden content</p>
      </CollapsiblePanel>
    )
    // Content is in DOM but visually hidden via grid-rows-[0fr] + overflow-hidden
    expect(screen.getByText('Hidden content')).toBeInTheDocument()
  })

  it('uses grid-rows-[0fr] when closed', () => {
    const { container } = render(
      <CollapsiblePanel isOpen={false}>
        <p>Content</p>
      </CollapsiblePanel>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('grid-rows-[0fr]')
    expect(wrapper).not.toHaveClass('grid-rows-[1fr]')
  })

  it('uses grid-rows-[1fr] when open', () => {
    const { container } = render(
      <CollapsiblePanel isOpen>
        <p>Content</p>
      </CollapsiblePanel>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('grid-rows-[1fr]')
    expect(wrapper).not.toHaveClass('grid-rows-[0fr]')
  })

  it('inner container has overflow-hidden and min-h-0', () => {
    const { container } = render(
      <CollapsiblePanel isOpen>
        <p>Content</p>
      </CollapsiblePanel>
    )
    const inner = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(inner).toHaveClass('overflow-hidden')
    expect(inner).toHaveClass('min-h-0')
  })

  it('applies className to wrapper', () => {
    const { container } = render(
      <CollapsiblePanel isOpen className="bg-red-500">
        <p>Content</p>
      </CollapsiblePanel>
    )
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('bg-red-500')
  })

  it('applies maxHeight as inline style on inner container', () => {
    const { container } = render(
      <CollapsiblePanel isOpen maxHeight="50vh">
        <p>Content</p>
      </CollapsiblePanel>
    )
    const inner = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(inner.style.maxHeight).toBe('50vh')
  })

  it('does not set maxHeight when not provided', () => {
    const { container } = render(
      <CollapsiblePanel isOpen>
        <p>Content</p>
      </CollapsiblePanel>
    )
    const inner = (container.firstChild as HTMLElement).firstChild as HTMLElement
    expect(inner.style.maxHeight).toBe('')
  })
})
