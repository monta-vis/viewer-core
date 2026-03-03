import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

afterEach(() => cleanup());

describe('Tooltip', () => {
  it('renders children correctly', () => {
    render(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
  });

  it('tooltip text is hidden by default', () => {
    render(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('shows tooltip text on hover', () => {
    render(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole('button', { name: 'Click me' }).parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Help text');
  });

  it('hides tooltip text on mouse leave', () => {
    render(
      <Tooltip content="Help text">
        <button>Click me</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole('button', { name: 'Click me' }).parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    fireEvent.mouseLeave(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('positions tooltip at top by default', () => {
    render(
      <Tooltip content="Help text">
        <span>Target</span>
      </Tooltip>,
    );
    const wrapper = screen.getByText('Target').parentElement!;
    fireEvent.mouseEnter(wrapper);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toContain('bottom-full');
  });

  it('positions tooltip at bottom when position="bottom"', () => {
    render(
      <Tooltip content="Help text" position="bottom">
        <span>Target</span>
      </Tooltip>,
    );
    const wrapper = screen.getByText('Target').parentElement!;
    fireEvent.mouseEnter(wrapper);
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip.className).toContain('top-full');
  });

  it('does not render tooltip when content is empty string', () => {
    render(
      <Tooltip content="">
        <button>Click me</button>
      </Tooltip>,
    );
    const wrapper = screen.getByRole('button', { name: 'Click me' }).parentElement!;
    fireEvent.mouseEnter(wrapper);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });
});
