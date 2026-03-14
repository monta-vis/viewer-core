import { describe, it, expect } from 'vitest';
import { resolveAllPartToolImageUrls } from './resolveAllPartToolImageUrls';

const makeJunction = (
  id: string,
  partToolId: string,
  videoFrameAreaId: string,
  isPreviewImage: boolean,
  order: number,
) => ({ [id]: { partToolId, videoFrameAreaId, isPreviewImage, order } });

describe('resolveAllPartToolImageUrls', () => {
  it('returns [] when no junctions for partToolId', () => {
    const result = resolveAllPartToolImageUrls('pt-1', 'folder', {});
    expect(result).toEqual([]);
  });

  it('returns single URL for one junction', () => {
    const junctions = makeJunction('j1', 'pt-1', 'vfa-1', false, 0);
    const result = resolveAllPartToolImageUrls('pt-1', 'folder', junctions);
    expect(result).toHaveLength(1);
    expect(result[0]).toContain('vfa-1');
  });

  it('returns multiple URLs sorted: preview first, then by order', () => {
    const junctions = {
      ...makeJunction('j1', 'pt-1', 'vfa-order2', false, 2),
      ...makeJunction('j2', 'pt-1', 'vfa-preview', true, 1),
      ...makeJunction('j3', 'pt-1', 'vfa-order0', false, 0),
      ...makeJunction('j4', 'other-pt', 'vfa-other', false, 0),
    };
    const result = resolveAllPartToolImageUrls('pt-1', 'folder', junctions);
    expect(result).toHaveLength(3);
    // Preview first
    expect(result[0]).toContain('vfa-preview');
    // Then by order
    expect(result[1]).toContain('vfa-order0');
    expect(result[2]).toContain('vfa-order2');
  });

  it('uses localPath fallback when no folderName (mweb)', () => {
    const junctions = makeJunction('j1', 'pt-1', 'vfa-1', false, 0);
    const videoFrameAreas = { 'vfa-1': { localPath: '/images/frame1.png' } };
    const result = resolveAllPartToolImageUrls('pt-1', undefined, junctions, false, videoFrameAreas);
    expect(result).toEqual(['/images/frame1.png']);
  });

  it('returns [] for mweb fallback when localPath is null', () => {
    const junctions = makeJunction('j1', 'pt-1', 'vfa-1', false, 0);
    const videoFrameAreas = { 'vfa-1': { localPath: null } };
    const result = resolveAllPartToolImageUrls('pt-1', undefined, junctions, false, videoFrameAreas);
    expect(result).toEqual([]);
  });

  it('builds mvis-media:// URLs when folderName present', () => {
    const junctions = makeJunction('j1', 'pt-1', 'vfa-1', false, 0);
    const result = resolveAllPartToolImageUrls('pt-1', 'my-project', junctions);
    expect(result[0]).toMatch(/^mvis-media:\/\/my-project\//);
  });
});
