import { describe, it, expect } from 'vitest';
import { resolvePartToolImageUrl } from './resolvePartToolImageUrl';

describe('resolvePartToolImageUrl', () => {
  it('resolves via VFA junction localPath (mweb context)', () => {
    const result = resolvePartToolImageUrl(
      'pt-1',
      undefined,
      {
        'j-1': { partToolId: 'pt-1', videoFrameAreaId: 'vfa-1', isPreviewImage: true, order: 1 },
      },
      false,
      {
        'vfa-1': { localPath: './media/frames/vfa-1/image.png' },
      },
    );
    expect(result).toBe('./media/frames/vfa-1/image.png');
  });

  it('resolves via buildMediaUrl in Electron context', () => {
    const result = resolvePartToolImageUrl(
      'pt-1',
      'my-project',
      {
        'j-1': { partToolId: 'pt-1', videoFrameAreaId: 'vfa-1', isPreviewImage: false, order: 1 },
      },
    );
    // buildMediaUrl returns mvis-media://my-project/media/frames/vfa-1/image
    expect(result).toContain('my-project');
    expect(result).toContain('media/frames/vfa-1/image');
  });

  it('returns null when no junctions exist for partToolId', () => {
    const result = resolvePartToolImageUrl(
      'pt-1',
      undefined,
      {},
    );
    expect(result).toBeNull();
  });

  it('prefers preview images over non-preview', () => {
    const result = resolvePartToolImageUrl(
      'pt-1',
      undefined,
      {
        'j-1': { partToolId: 'pt-1', videoFrameAreaId: 'vfa-regular', isPreviewImage: false, order: 1 },
        'j-2': { partToolId: 'pt-1', videoFrameAreaId: 'vfa-preview', isPreviewImage: true, order: 2 },
      },
      false,
      {
        'vfa-regular': { localPath: './media/frames/vfa-regular/image.jpg' },
        'vfa-preview': { localPath: './media/frames/vfa-preview/image.png' },
      },
    );
    expect(result).toBe('./media/frames/vfa-preview/image.png');
  });
});
