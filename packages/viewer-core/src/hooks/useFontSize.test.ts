import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFontSize, type FontSize } from './useFontSize';

describe('useFontSize', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('font-size-small', 'font-size-large');
  });

  it('returns default "medium" when no localStorage', () => {
    const { result } = renderHook(() => useFontSize());
    expect(result.current.fontSize).toBe('medium');
  });

  it('reads stored value from localStorage', () => {
    localStorage.setItem('montavis-font-size', 'large');
    const { result } = renderHook(() => useFontSize());
    expect(result.current.fontSize).toBe('large');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem('montavis-font-size', 'huge');
    const { result } = renderHook(() => useFontSize());
    expect(result.current.fontSize).toBe('medium');
  });

  it('setFontSize updates state and localStorage', () => {
    const { result } = renderHook(() => useFontSize());

    act(() => {
      result.current.setFontSize('small');
    });

    expect(result.current.fontSize).toBe('small');
    expect(localStorage.getItem('montavis-font-size')).toBe('small');
  });

  it('applies CSS class to <html> element for small', () => {
    const { result } = renderHook(() => useFontSize());

    act(() => {
      result.current.setFontSize('small');
    });

    expect(document.documentElement.classList.contains('font-size-small')).toBe(true);
  });

  it('applies CSS class to <html> element for large', () => {
    const { result } = renderHook(() => useFontSize());

    act(() => {
      result.current.setFontSize('large');
    });

    expect(document.documentElement.classList.contains('font-size-large')).toBe(true);
  });

  it('does not apply CSS class for medium (default)', () => {
    const { result } = renderHook(() => useFontSize());

    expect(document.documentElement.classList.contains('font-size-small')).toBe(false);
    expect(document.documentElement.classList.contains('font-size-large')).toBe(false);
  });

  it('removes previous class when changing size', () => {
    const { result } = renderHook(() => useFontSize());

    act(() => {
      result.current.setFontSize('small');
    });
    expect(document.documentElement.classList.contains('font-size-small')).toBe(true);

    act(() => {
      result.current.setFontSize('large');
    });
    expect(document.documentElement.classList.contains('font-size-small')).toBe(false);
    expect(document.documentElement.classList.contains('font-size-large')).toBe(true);
  });
});
