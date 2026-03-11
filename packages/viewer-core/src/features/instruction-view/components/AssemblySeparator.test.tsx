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

  it('renders image when imageUrl is provided', () => {
    render(
      <AssemblySeparator title="Motor Assembly" stepCount={2} imageUrl="https://example.com/img.png" />,
    );

    const img = screen.getByRole('img');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('https://example.com/img.png');
    expect(img.getAttribute('alt')).toBe('Motor Assembly');
  });

  it('does not render image when imageUrl is null', () => {
    render(
      <AssemblySeparator title="Motor Assembly" stepCount={2} imageUrl={null} />,
    );

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('does not render image when imageUrl is undefined', () => {
    render(
      <AssemblySeparator title="Motor Assembly" stepCount={2} />,
    );

    expect(screen.queryByRole('img')).toBeNull();
  });

  it('shows AssemblyIcon when no imageUrl', () => {
    const { container } = render(
      <AssemblySeparator title="Frame" stepCount={1} />,
    );

    // AssemblyIcon renders an svg
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('hides AssemblyIcon when imageUrl is provided', () => {
    const { container } = render(
      <AssemblySeparator title="Frame" stepCount={1} imageUrl="https://example.com/img.png" />,
    );

    // AssemblyIcon (svg) should not be present when image replaces it
    expect(container.querySelector('svg')).toBeNull();
  });

  it('opens image popup when thumbnail is clicked', () => {
    render(
      <AssemblySeparator title="Motor" stepCount={2} imageUrl="https://example.com/img.png" />,
    );

    // No dialog initially
    expect(screen.queryByRole('dialog')).toBeNull();

    // Click the thumbnail button
    fireEvent.click(screen.getByLabelText('Open assembly image'));

    // Dialog should appear with full-size image
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeTruthy();
    const imgs = dialog.querySelectorAll('img');
    expect(imgs.length).toBe(1);
    expect(imgs[0].getAttribute('src')).toBe('https://example.com/img.png');
  });

  it('closes image popup when close button is clicked', () => {
    render(
      <AssemblySeparator title="Motor" stepCount={2} imageUrl="https://example.com/img.png" />,
    );

    // Open the popup
    fireEvent.click(screen.getByLabelText('Open assembly image'));
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Click close button
    fireEvent.click(screen.getByLabelText('Close'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('closes image popup when backdrop is clicked', () => {
    render(
      <AssemblySeparator title="Motor" stepCount={2} imageUrl="https://example.com/img.png" />,
    );

    fireEvent.click(screen.getByLabelText('Open assembly image'));
    expect(screen.getByRole('dialog')).toBeTruthy();

    // Click the backdrop (the dialog element itself)
    fireEvent.click(screen.getByTestId('dialog-shell-backdrop'));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
