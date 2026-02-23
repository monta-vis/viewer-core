import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('renders children when open', () => {
    render(
      <Drawer isOpen onClose={() => {}}>
        <p>Drawer content</p>
      </Drawer>
    );
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('renders children when closed (panel stays in DOM for CSS transitions)', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}}>
        <p>Drawer content</p>
      </Drawer>
    );
    // Panel is always in DOM for CSS transitions
    expect(screen.getByText('Drawer content')).toBeInTheDocument();
  });

  it('hides panel off-screen when closed (translate class)', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} anchor="bottom">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-panel').className).toContain('translate-y-full');
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Drawer isOpen onClose={onClose}>
        <p>Content</p>
      </Drawer>
    );
    fireEvent.click(screen.getByTestId('drawer-backdrop'));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('applies correct anchor classes for top', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} anchor="top">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('top-0');
    expect(panel.className).toContain('-translate-y-full');
  });

  it('applies correct anchor classes for bottom', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} anchor="bottom">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('bottom-0');
    expect(panel.className).toContain('translate-y-full');
  });

  it('applies correct anchor classes for left', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} anchor="left">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('left-0');
    expect(panel.className).toContain('-translate-x-full');
  });

  it('applies correct anchor classes for right', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} anchor="right">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('right-0');
    expect(panel.className).toContain('translate-x-full');
  });

  it('forwards className to panel', () => {
    render(
      <Drawer isOpen onClose={() => {}} className="custom-class">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-panel').className).toContain('custom-class');
  });

  it('defaults to bottom anchor', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}}>
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('bottom-0');
    expect(panel.className).toContain('translate-y-full');
  });

  // ============================================
  // Inline mode tests
  // ============================================

  it('inline mode uses absolute positioning on panel', () => {
    render(
      <Drawer isOpen onClose={() => {}} inline anchor="bottom">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('absolute');
    expect(panel.className).not.toContain('fixed');
  });

  it('inline mode backdrop is still fixed', () => {
    render(
      <Drawer isOpen onClose={() => {}} inline>
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-backdrop').className).toContain('fixed');
  });

  it('inline mode panel does not have full-width edge classes', () => {
    render(
      <Drawer isOpen onClose={() => {}} inline anchor="top">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).not.toContain('left-0');
    expect(panel.className).not.toContain('right-0');
    expect(panel.className).not.toContain('h-full');
  });

  it('inline bottom panel has top-full positioning', () => {
    render(
      <Drawer isOpen onClose={() => {}} inline anchor="bottom">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-panel').className).toContain('top-full');
  });

  it('inline top panel has bottom-full positioning', () => {
    render(
      <Drawer isOpen onClose={() => {}} inline anchor="top">
        <p>Content</p>
      </Drawer>
    );
    expect(screen.getByTestId('drawer-panel').className).toContain('bottom-full');
  });

  it('inline closed panel has opacity-0 and pointer-events-none', () => {
    render(
      <Drawer isOpen={false} onClose={() => {}} inline anchor="bottom">
        <p>Content</p>
      </Drawer>
    );
    const panel = screen.getByTestId('drawer-panel');
    expect(panel.className).toContain('opacity-0');
    expect(panel.className).toContain('pointer-events-none');
  });

  // ============================================
  // Ref forwarding tests
  // ============================================

  it('forwards panelRef to panel element', () => {
    const panelRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <Drawer isOpen onClose={() => {}} panelRef={panelRef}>
        <p>Content</p>
      </Drawer>
    );
    expect(panelRef.current).toBe(screen.getByTestId('drawer-panel'));
  });

  it('forwards backdropRef to backdrop element', () => {
    const backdropRef = { current: null } as React.RefObject<HTMLDivElement | null>;
    render(
      <Drawer isOpen onClose={() => {}} backdropRef={backdropRef}>
        <p>Content</p>
      </Drawer>
    );
    expect(backdropRef.current).toBe(screen.getByTestId('drawer-backdrop'));
  });
});
