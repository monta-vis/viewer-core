import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { AssemblySeparator } from './AssemblySeparator';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string, opts?: Record<string, unknown>) => {
      if (opts?.count !== undefined) return `${opts.count} ${fallback?.replace('{{count}} ', '') ?? key}`;
      return fallback ?? key;
    },
  }),
}));

afterEach(() => cleanup());

describe('AssemblySeparator', () => {
  it('renders title and step count', () => {
    render(
      <AssemblySeparator title="Main Frame" stepCount={3} />,
    );

    expect(screen.getByText('Main Frame')).toBeTruthy();
    expect(screen.getByText('3 Steps')).toBeTruthy();
  });

  it('shows both parts and tools segments when both > 0', () => {
    render(
      <AssemblySeparator
        title="Main Frame"
        stepCount={3}
        partCount={5}
        toolCount={3}
        onPartToolClick={() => {}}
      />,
    );

    expect(screen.getByText('×5')).toBeTruthy();
    expect(screen.getByText('×3')).toBeTruthy();
  });

  it('shows only parts segment when toolCount is 0', () => {
    render(
      <AssemblySeparator
        title="Side Panel"
        stepCount={2}
        partCount={5}
        toolCount={0}
        onPartToolClick={() => {}}
      />,
    );

    expect(screen.getByText('×5')).toBeTruthy();
    expect(screen.queryByText('×0')).toBeNull();
  });

  it('shows only tools segment when partCount is 0', () => {
    render(
      <AssemblySeparator
        title="Side Panel"
        stepCount={2}
        partCount={0}
        toolCount={3}
        onPartToolClick={() => {}}
      />,
    );

    expect(screen.getByText('×3')).toBeTruthy();
    expect(screen.queryByText('×0')).toBeNull();
  });

  it('hides pill when both counts are 0', () => {
    render(
      <AssemblySeparator
        title="Side Panel"
        stepCount={2}
        partCount={0}
        toolCount={0}
        onPartToolClick={() => {}}
      />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('hides pill when both counts are undefined', () => {
    render(
      <AssemblySeparator title="Side Panel" stepCount={2} />,
    );

    expect(screen.queryByRole('button')).toBeNull();
  });

  it('calls onPartToolClick when pill is clicked', () => {
    const handleClick = vi.fn();
    render(
      <AssemblySeparator
        title="Base"
        stepCount={1}
        partCount={5}
        toolCount={3}
        onPartToolClick={handleClick}
      />,
    );

    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('has role="separator" with accessible label', () => {
    const { container } = render(
      <AssemblySeparator title="Assembly X" stepCount={4} />,
    );

    const separator = container.querySelector('[role="separator"]');
    expect(separator).not.toBeNull();
    expect(separator?.getAttribute('aria-label')).toContain('Assembly X');
  });

  it('has accessible aria-label on pill with both counts', () => {
    render(
      <AssemblySeparator
        title="Frame"
        stepCount={1}
        partCount={3}
        toolCount={5}
        onPartToolClick={() => {}}
      />,
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('3 Parts, 5 Tools');
  });

  it('has accessible aria-label on pill with only parts', () => {
    render(
      <AssemblySeparator
        title="Frame"
        stepCount={1}
        partCount={3}
        toolCount={0}
        onPartToolClick={() => {}}
      />,
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('3 Parts');
  });

  it('has accessible aria-label on pill with only tools', () => {
    render(
      <AssemblySeparator
        title="Frame"
        stepCount={1}
        partCount={0}
        toolCount={7}
        onPartToolClick={() => {}}
      />,
    );

    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toBe('7 Tools');
  });
});
