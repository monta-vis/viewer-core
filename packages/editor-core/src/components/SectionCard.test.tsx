import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SectionCard } from './SectionCard';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

afterEach(cleanup);

describe('SectionCard', () => {
  it('renders icon and title', () => {
    render(
      <SectionCard data-testid="test-card" icon={<span data-testid="icon">I</span>} title="My Section" />,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
    expect(screen.getByText('My Section')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <SectionCard data-testid="test-card" icon={<span>I</span>} title="Title">
        <p>Child content</p>
      </SectionCard>,
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('shows emptyText when no children', () => {
    render(
      <SectionCard data-testid="test-card" icon={<span>I</span>} title="Title" emptyText="Nothing here" />,
    );
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });

  it('renders addButton in the header', () => {
    render(
      <SectionCard
        data-testid="test-card"
        icon={<span>I</span>}
        title="Title"
        addButton={<button data-testid="add-btn">Add</button>}
      />,
    );
    expect(screen.getByTestId('add-btn')).toBeInTheDocument();
  });

  it('passes data-testid to the root element', () => {
    render(
      <SectionCard data-testid="my-section" icon={<span>I</span>} title="Title" />,
    );
    expect(screen.getByTestId('my-section')).toBeInTheDocument();
  });

  it('shows emptyText when children is undefined, not when children is provided', () => {
    const { rerender } = render(
      <SectionCard data-testid="test-card" icon={<span>I</span>} title="Title" emptyText="Empty">
        <p>Has content</p>
      </SectionCard>,
    );
    expect(screen.getByText('Has content')).toBeInTheDocument();
    expect(screen.queryByText('Empty')).not.toBeInTheDocument();

    rerender(
      <SectionCard data-testid="test-card" icon={<span>I</span>} title="Title" emptyText="Empty" />,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });
});
