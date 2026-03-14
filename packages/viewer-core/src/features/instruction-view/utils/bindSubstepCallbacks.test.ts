import { describe, it, expect, vi } from 'vitest';
import { bindSubstepCallbacks } from './bindSubstepCallbacks';
import type { ExtendedSubstepEditCallbacks } from './bindSubstepCallbacks';

describe('bindSubstepCallbacks', () => {
  const substepId = 'substep-123';

  it('injects substepId into onAddDescription', () => {
    const onAddDescription = vi.fn();
    const extended: ExtendedSubstepEditCallbacks = { onAddDescription };

    const bound = bindSubstepCallbacks(extended, substepId);
    bound.onAddDescription!('Hello');

    expect(onAddDescription).toHaveBeenCalledWith('Hello', substepId);
  });

  it('injects substepId into onAddNote between safetyIconCategory and sourceIconId', () => {
    const onAddNote = vi.fn();
    const extended: ExtendedSubstepEditCallbacks = { onAddNote };

    const bound = bindSubstepCallbacks(extended, substepId);
    bound.onAddNote!('text', 'icon-1', 'warning' as never, 'source-1');

    expect(onAddNote).toHaveBeenCalledWith('text', 'icon-1', 'warning', substepId, 'source-1');
  });

  it('passes through callbacks without substepId unchanged', () => {
    const onUpdatePartTool = vi.fn();
    const onUpdateSubstepPartToolAmount = vi.fn();
    const extended: ExtendedSubstepEditCallbacks = {
      onUpdatePartTool,
      onUpdateSubstepPartToolAmount,
    };

    const bound = bindSubstepCallbacks(extended, substepId);
    bound.onUpdatePartTool!('pt-1', { name: 'Wrench' } as never);
    bound.onUpdateSubstepPartToolAmount!('spt-1', 5);

    expect(onUpdatePartTool).toHaveBeenCalledWith('pt-1', { name: 'Wrench' });
    expect(onUpdateSubstepPartToolAmount).toHaveBeenCalledWith('spt-1', 5);
  });

  it('injects substepId into onDeleteImage (no-arg → substepId)', () => {
    const onDeleteImage = vi.fn();
    const extended: ExtendedSubstepEditCallbacks = { onDeleteImage };

    const bound = bindSubstepCallbacks(extended, substepId);
    bound.onDeleteImage!();

    expect(onDeleteImage).toHaveBeenCalledWith(substepId);
  });

  it('injects substepId into onSaveDescription', () => {
    const onSaveDescription = vi.fn();
    const extended: ExtendedSubstepEditCallbacks = { onSaveDescription };

    const bound = bindSubstepCallbacks(extended, substepId);
    bound.onSaveDescription!('desc-1', 'updated text');

    expect(onSaveDescription).toHaveBeenCalledWith('desc-1', 'updated text', substepId);
  });

  it('injects substepId into onSaveNote', () => {
    const onSaveNote = vi.fn();
    const extended: ExtendedSubstepEditCallbacks = { onSaveNote };

    const bound = bindSubstepCallbacks(extended, substepId);
    bound.onSaveNote!('note-1', 'text', 'icon-1', 'warning' as never, 'source-1');

    expect(onSaveNote).toHaveBeenCalledWith('note-1', 'text', 'icon-1', 'warning', substepId, 'source-1');
  });

  it('returns undefined callbacks for undefined extended callbacks', () => {
    const extended: ExtendedSubstepEditCallbacks = {};
    const bound = bindSubstepCallbacks(extended, substepId);

    expect(bound.onAddDescription).toBeUndefined();
    expect(bound.onDeleteImage).toBeUndefined();
  });
});
