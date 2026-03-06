import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MediaEditDialog } from './MediaEditDialog';

describe('MediaEditDialog', () => {
  it('does not render when open is false', () => {
    render(
      <MediaEditDialog open={false} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders portal to document.body when open', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('renders backdrop with blur', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    const backdrop = document.querySelector('.backdrop-blur-sm');
    expect(backdrop).toBeInTheDocument();
  });

  it('renders children in the left panel', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>sidebar</div>}>
        <div>left content</div>
      </MediaEditDialog>,
    );
    expect(screen.getByText('left content')).toBeInTheDocument();
  });

  it('renders sidebar in the right panel', () => {
    render(
      <MediaEditDialog open={true} onClose={vi.fn()} sidebar={<div>right sidebar</div>}>
        <div>content</div>
      </MediaEditDialog>,
    );
    expect(screen.getByText('right sidebar')).toBeInTheDocument();
  });
});
