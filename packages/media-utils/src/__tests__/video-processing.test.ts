import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import {
  isFullFrameViewport,
  interpolateViewportAtFrame,
  buildViewportSegments,
  computeCropValues,
  buildCropExpr,
  buildSectionCutArgsWithViewport,
  computeViewportHash,
  getDefaultViewportNormalized,
  filterKeyframesForSection,
  buildVideoCutArgs,
  buildFrameExtractArgs,
  processVideoSection,
  processFrameExtract,
  buildFullVideoArgs,
  readVideoMetadata,
  type ViewportKeyframeDB,
} from '../video-processing.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function kf(
  frame: number,
  x: number,
  y: number,
  w: number,
  h: number,
  interp: 'hold' | 'linear' | null = null,
): ViewportKeyframeDB {
  return { frame_number: frame, x, y, width: w, height: h, interpolation: interp };
}

// Pixel-square helper: on 1920×1080, height = width * (1920/1080)
const SQ_H = 0.5 * (1920 / 1080); // ≈0.8889

// ═══════════════════════════════════════════════════════════════════════════
// Ported from creator's viewportProcess.test.ts
// ═══════════════════════════════════════════════════════════════════════════

// ─── isFullFrameViewport ───

describe('isFullFrameViewport', () => {
  it('returns true for empty array', () => {
    expect(isFullFrameViewport([])).toBe(true);
  });

  it('returns true for all {0,0,1,1} keyframes', () => {
    expect(isFullFrameViewport([kf(0, 0, 0, 1, 1), kf(100, 0, 0, 1, 1)])).toBe(true);
  });

  it('returns false when any keyframe differs', () => {
    expect(isFullFrameViewport([kf(0, 0, 0, 1, 1), kf(100, 0.1, 0, 0.8, 0.8)])).toBe(false);
  });
});

// ─── interpolateViewportAtFrame ───

describe('interpolateViewportAtFrame', () => {
  it('single keyframe returns its values', () => {
    const result = interpolateViewportAtFrame(50, [kf(10, 0.2, 0.3, 0.5, 0.5)]);
    expect(result).toEqual({ x: 0.2, y: 0.3, width: 0.5, height: 0.5 });
  });

  it('before first keyframe returns first', () => {
    const result = interpolateViewportAtFrame(5, [
      kf(10, 0.2, 0.3, 0.5, 0.5),
      kf(100, 0.4, 0.4, 0.3, 0.3),
    ]);
    expect(result).toEqual({ x: 0.2, y: 0.3, width: 0.5, height: 0.5 });
  });

  it('after last keyframe returns last', () => {
    const result = interpolateViewportAtFrame(200, [
      kf(10, 0.2, 0.3, 0.5, 0.5),
      kf(100, 0.4, 0.4, 0.3, 0.3),
    ]);
    expect(result).toEqual({ x: 0.4, y: 0.4, width: 0.3, height: 0.3 });
  });

  it('between hold keyframes returns from-values', () => {
    const result = interpolateViewportAtFrame(50, [
      kf(10, 0.2, 0.3, 0.5, 0.5),
      kf(100, 0.4, 0.4, 0.3, 0.3, 'hold'),
    ]);
    expect(result).toEqual({ x: 0.2, y: 0.3, width: 0.5, height: 0.5 });
  });

  it('between linear keyframes returns lerp', () => {
    const result = interpolateViewportAtFrame(50, [
      kf(0, 0.0, 0.0, 1.0, 1.0),
      kf(100, 0.2, 0.2, 0.5, 0.5, 'linear'),
    ]);
    expect(result.x).toBeCloseTo(0.1, 5);
    expect(result.y).toBeCloseTo(0.1, 5);
    expect(result.width).toBeCloseTo(0.75, 5);
    expect(result.height).toBeCloseTo(0.75, 5);
  });
});

// ─── buildViewportSegments ───

describe('buildViewportSegments', () => {
  it('single keyframe produces segments with same viewport values (hold)', () => {
    const segs = buildViewportSegments([kf(50, 0.2, 0.2, 0.5, 0.5)], 0, 100);
    expect(segs.length).toBeGreaterThanOrEqual(1);
    expect(segs[0].startFrame).toBe(0);
    expect(segs[segs.length - 1].endFrame).toBe(100);
    for (const seg of segs) {
      expect(seg.from).toEqual({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 });
      expect(seg.to).toEqual({ x: 0.2, y: 0.2, width: 0.5, height: 0.5 });
      expect(seg.interpolation).toBe('hold');
    }
  });

  it('two keyframes within section produce one segment', () => {
    const segs = buildViewportSegments(
      [kf(10, 0.0, 0.0, 1.0, 1.0), kf(90, 0.2, 0.2, 0.5, 0.5, 'linear')],
      0,
      100,
    );
    expect(segs).toHaveLength(3);
    expect(segs[0].startFrame).toBe(0);
    expect(segs[0].endFrame).toBe(10);
    expect(segs[1].startFrame).toBe(10);
    expect(segs[1].endFrame).toBe(90);
    expect(segs[1].interpolation).toBe('linear');
    expect(segs[2].startFrame).toBe(90);
    expect(segs[2].endFrame).toBe(100);
  });

  it('section starts between keyframes — interpolated start', () => {
    const segs = buildViewportSegments(
      [kf(0, 0.0, 0.0, 1.0, 1.0), kf(100, 0.2, 0.2, 0.5, 0.5, 'linear')],
      50,
      150,
    );
    expect(segs[0].startFrame).toBe(0);
    expect(segs[0].from.width).toBeCloseTo(0.75, 3);
  });

  it('mixed hold/linear keyframes have correct interpolation modes', () => {
    const segs = buildViewportSegments(
      [
        kf(0, 0.0, 0.0, 1.0, 1.0),
        kf(50, 0.1, 0.1, 0.8, 0.8, 'hold'),
        kf(100, 0.2, 0.2, 0.5, 0.5, 'linear'),
      ],
      0,
      100,
    );
    const holdSeg = segs.find((s) => s.startFrame === 0 && s.endFrame === 50);
    expect(holdSeg?.interpolation).toBe('hold');
    const linearSeg = segs.find((s) => s.startFrame === 50 && s.endFrame === 100);
    expect(linearSeg?.interpolation).toBe('linear');
  });
});

// ─── computeCropValues ───

describe('computeCropValues', () => {
  it('full frame → w=W, h=H, x=0, y=0', () => {
    const crop = computeCropValues({ x: 0, y: 0, width: 1, height: 1 }, 1920, 1080);
    expect(crop.w).toBe(1920);
    expect(crop.h).toBe(1080);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });

  it('pixel-square viewport → square crop (w == h)', () => {
    const vp = { x: 0, y: 0, width: 0.5, height: 0.5 * (1920 / 1080) };
    const crop = computeCropValues(vp, 1920, 1080);
    expect(crop.w).toBe(960);
    expect(crop.h).toBe(960);
    expect(crop.x).toBe(0);
    expect(crop.y).toBe(0);
  });

  it('pixel-square viewport offset → direct x/y', () => {
    const vp = { x: 0.2, y: 0.1, width: 0.5, height: 0.5 * (1920 / 1080) };
    const crop = computeCropValues(vp, 1920, 1080);
    expect(crop.w).toBe(960);
    expect(crop.h).toBe(960);
    expect(crop.x).toBe(384);
    expect(crop.y).toBe(108);
  });

  it('values are even and clamped', () => {
    const crop = computeCropValues({ x: 0.1, y: 0.1, width: 0.3, height: 0.3 }, 1921, 1081);
    expect(crop.w % 2).toBe(0);
    expect(crop.h % 2).toBe(0);
    expect(crop.x).toBeGreaterThanOrEqual(0);
    expect(crop.y).toBeGreaterThanOrEqual(0);
  });
});

// ─── buildCropExpr ───

describe('buildCropExpr', () => {
  it('single hold segment → literal x/y, no if()', () => {
    const segs = [
      {
        startFrame: 0,
        endFrame: 100,
        from: { x: 0.25, y: 0.05, width: 0.5, height: SQ_H },
        to: { x: 0.25, y: 0.05, width: 0.5, height: SQ_H },
        interpolation: 'hold' as const,
      },
    ];
    const crop = buildCropExpr(segs, 1920, 1080);
    expect(crop.w).toBe(960);
    expect(crop.h).toBe(960);
    expect(crop.x).not.toContain('if');
    expect(crop.y).not.toContain('if');
    expect(crop.x).toBe('480');
    expect(crop.y).toBe('54');
  });

  it('linear pan → expression with n', () => {
    const segs = [
      {
        startFrame: 0,
        endFrame: 100,
        from: { x: 0, y: 0, width: 0.5, height: SQ_H },
        to: { x: 0.5, y: 0.1, width: 0.5, height: SQ_H },
        interpolation: 'linear' as const,
      },
    ];
    const crop = buildCropExpr(segs, 1920, 1080);
    expect(crop.x).toContain('n');
    expect(crop.y).toContain('n');
  });

  it('two hold segments → if(lt(n,...)) for x/y', () => {
    const segs = [
      {
        startFrame: 0,
        endFrame: 50,
        from: { x: 0, y: 0, width: 0.5, height: SQ_H },
        to: { x: 0, y: 0, width: 0.5, height: SQ_H },
        interpolation: 'hold' as const,
      },
      {
        startFrame: 50,
        endFrame: 100,
        from: { x: 0.25, y: 0.05, width: 0.5, height: SQ_H },
        to: { x: 0.25, y: 0.05, width: 0.5, height: SQ_H },
        interpolation: 'hold' as const,
      },
    ];
    const crop = buildCropExpr(segs, 1920, 1080);
    expect(crop.x).toContain('if(');
    expect(crop.x).toContain('lt(n');
    expect(crop.y).toContain('if(');
  });
});

// ─── buildSectionCutArgsWithViewport ───

describe('buildSectionCutArgsWithViewport', () => {
  const segments = [
    {
      startFrame: 0,
      endFrame: 100,
      from: { x: 0.25, y: 0.05, width: 0.5, height: SQ_H },
      to: { x: 0.25, y: 0.05, width: 0.5, height: SQ_H },
      interpolation: 'hold' as const,
    },
  ];

  it('produces crop=...,scale=resHeight:resHeight (fixed square)', () => {
    const args = buildSectionCutArgsWithViewport(
      'ffmpeg',
      '/in.mp4',
      '/out.mp4',
      100,
      200,
      30,
      720,
      1920,
      1080,
      segments,
    );
    const vfIdx = args.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = args[vfIdx + 1];
    expect(vf).toMatch(/^crop=.*,scale=720:720$/);
    expect(vf).not.toContain('eval=frame');
    expect(vf).not.toContain('min(');
  });

  it('has standard args: -ss, -t, -c:v, -an', () => {
    const args = buildSectionCutArgsWithViewport(
      'ffmpeg',
      '/in.mp4',
      '/out.mp4',
      100,
      200,
      30,
      720,
      1920,
      1080,
      segments,
    );
    expect(args).toContain('-ss');
    expect(args).toContain('-t');
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-an');
  });

  it('includes faststart and yuv420p for compatibility', () => {
    const args = buildSectionCutArgsWithViewport(
      'ffmpeg',
      '/in.mp4',
      '/out.mp4',
      100,
      200,
      30,
      720,
      1920,
      1080,
      segments,
    );
    expect(args).toContain('-movflags');
    expect(args).toContain('+faststart');
    expect(args).toContain('-pix_fmt');
    expect(args).toContain('yuv420p');
  });

  it('has no eval=frame or min() in output', () => {
    const args = buildSectionCutArgsWithViewport(
      'ffmpeg',
      '/in.mp4',
      '/out.mp4',
      100,
      200,
      30,
      720,
      1920,
      1080,
      segments,
    );
    const vf = args[args.indexOf('-vf') + 1];
    expect(vf).not.toContain('eval=frame');
    expect(vf).not.toContain('min(');
  });
});

// ─── computeViewportHash ───

describe('computeViewportHash', () => {
  it('returns "none" for empty keyframes', () => {
    expect(computeViewportHash([])).toBe('none');
  });

  it('same data returns same hash', () => {
    const kfs = [kf(0, 0.2, 0.3, 0.5, 0.5, 'hold')];
    expect(computeViewportHash(kfs)).toBe(computeViewportHash(kfs));
  });

  it('different data returns different hash', () => {
    const kfs1 = [kf(0, 0.2, 0.3, 0.5, 0.5, 'hold')];
    const kfs2 = [kf(0, 0.2, 0.3, 0.6, 0.5, 'hold')];
    expect(computeViewportHash(kfs1)).not.toBe(computeViewportHash(kfs2));
  });
});

// ─── getDefaultViewportNormalized ───

describe('getDefaultViewportNormalized', () => {
  it('16:9 video → centered pixel-square viewport', () => {
    const vp = getDefaultViewportNormalized(1920, 1080);
    expect(vp.height).toBeCloseTo(0.5, 5);
    expect(vp.width).toBeCloseTo(0.5 / (1920 / 1080), 5);
    expect(vp.x).toBeCloseTo((1 - vp.width) / 2, 5);
    expect(vp.y).toBeCloseTo(0.25, 5);
  });

  it('4:3 video → centered pixel-square viewport', () => {
    const vp = getDefaultViewportNormalized(1024, 768);
    expect(vp.height).toBeCloseTo(0.5, 5);
    expect(vp.width).toBeCloseTo(0.5 / (1024 / 768), 5);
    expect(vp.x).toBeCloseTo((1 - vp.width) / 2, 5);
    expect(vp.y).toBeCloseTo(0.25, 5);
  });

  it('square video → equal width and height fractions', () => {
    const vp = getDefaultViewportNormalized(1080, 1080);
    expect(vp.width).toBeCloseTo(0.5, 5);
    expect(vp.height).toBeCloseTo(0.5, 5);
    expect(vp.x).toBeCloseTo(0.25, 5);
    expect(vp.y).toBeCloseTo(0.25, 5);
  });

  it('default viewport + computeCropValues produces pixel-square crop', () => {
    const vp16 = getDefaultViewportNormalized(1920, 1080);
    const crop16 = computeCropValues(vp16, 1920, 1080);
    expect(crop16.w).toBe(crop16.h);

    const vp43 = getDefaultViewportNormalized(1024, 768);
    const crop43 = computeCropValues(vp43, 1024, 768);
    expect(crop43.w).toBe(crop43.h);
  });
});

// ─── filterKeyframesForSection ───

describe('filterKeyframesForSection', () => {
  const mkKf = (frame: number): ViewportKeyframeDB => ({
    frame_number: frame,
    x: 0.1,
    y: 0.1,
    width: 0.8,
    height: 0.8,
    interpolation: 'hold',
  });

  it('returns empty when no keyframes exist', () => {
    expect(filterKeyframesForSection([], 100, 200)).toEqual([]);
  });

  it('returns only keyframes inside the section range', () => {
    const kfs = [mkKf(50), mkKf(150), mkKf(250)];
    const result = filterKeyframesForSection(kfs, 100, 200);
    expect(result).toHaveLength(2);
    expect(result[0].frame_number).toBe(50);
    expect(result[1].frame_number).toBe(150);
  });

  it('includes last keyframe before start as the "from" state', () => {
    const kfs = [mkKf(10), mkKf(30), mkKf(80)];
    const result = filterKeyframesForSection(kfs, 100, 200);
    expect(result).toHaveLength(1);
    expect(result[0].frame_number).toBe(80);
  });

  it('includes keyframe exactly at start_frame', () => {
    const kfs = [mkKf(100), mkKf(150)];
    const result = filterKeyframesForSection(kfs, 100, 200);
    expect(result).toHaveLength(2);
    expect(result[0].frame_number).toBe(100);
    expect(result[1].frame_number).toBe(150);
  });

  it('includes keyframe exactly at end_frame', () => {
    const kfs = [mkKf(150), mkKf(200), mkKf(300)];
    const result = filterKeyframesForSection(kfs, 100, 200);
    expect(result).toHaveLength(2);
    expect(result[0].frame_number).toBe(150);
    expect(result[1].frame_number).toBe(200);
  });

  it('excludes keyframes after end_frame', () => {
    const kfs = [mkKf(50), mkKf(100), mkKf(201)];
    const result = filterKeyframesForSection(kfs, 100, 200);
    expect(result).toHaveLength(2);
    expect(result[0].frame_number).toBe(50);
    expect(result[1].frame_number).toBe(100);
  });

  it('picks only the LAST keyframe before start (not all before)', () => {
    const kfs = [mkKf(10), mkKf(20), mkKf(30), mkKf(150)];
    const result = filterKeyframesForSection(kfs, 100, 200);
    expect(result).toHaveLength(2);
    expect(result[0].frame_number).toBe(30);
    expect(result[1].frame_number).toBe(150);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// New tests
// ═══════════════════════════════════════════════════════════════════════════

// ─── buildVideoCutArgs ───

describe('buildVideoCutArgs', () => {
  it('produces correct -ss and -t from frames/fps', () => {
    const args = buildVideoCutArgs('ffmpeg', '/in.mp4', '/out.mp4', 30, 90, 30, 720);
    const ssIdx = args.indexOf('-ss');
    expect(ssIdx).toBeGreaterThan(-1);
    expect(args[ssIdx + 1]).toBe('1.000000'); // 30/30 = 1s
    const tIdx = args.indexOf('-t');
    expect(tIdx).toBeGreaterThan(-1);
    expect(args[tIdx + 1]).toBe('2.000000'); // (90-30)/30 = 2s
  });

  it('has scale filter without crop', () => {
    const args = buildVideoCutArgs('ffmpeg', '/in.mp4', '/out.mp4', 0, 100, 30, 720);
    const vfIdx = args.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = args[vfIdx + 1];
    expect(vf).toContain('scale=');
    expect(vf).toContain('720');
    expect(vf).not.toContain('crop=');
  });

  it('has standard codec args: libx264, fast, crf 23, yuv420p, faststart, no audio', () => {
    const args = buildVideoCutArgs('ffmpeg', '/in.mp4', '/out.mp4', 0, 100, 30, 720);
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-preset');
    expect(args).toContain('fast');
    expect(args).toContain('-crf');
    expect(args).toContain('23');
    expect(args).toContain('-pix_fmt');
    expect(args).toContain('yuv420p');
    expect(args).toContain('-movflags');
    expect(args).toContain('+faststart');
    expect(args).toContain('-an');
  });

  it('first element is the ffmpeg binary', () => {
    const args = buildVideoCutArgs('/usr/bin/ffmpeg', '/in.mp4', '/out.mp4', 0, 100, 30, 720);
    expect(args[0]).toBe('/usr/bin/ffmpeg');
  });
});

// ─── buildFrameExtractArgs ───

describe('buildFrameExtractArgs', () => {
  it('seeks to correct frame time', () => {
    const args = buildFrameExtractArgs('ffmpeg', '/in.mp4', '/out.jpg', 90, 30);
    const ssIdx = args.indexOf('-ss');
    expect(ssIdx).toBeGreaterThan(-1);
    expect(args[ssIdx + 1]).toBe('3.000000'); // 90/30 = 3s
  });

  it('extracts single frame as JPEG', () => {
    const args = buildFrameExtractArgs('ffmpeg', '/in.mp4', '/out.jpg', 0, 30);
    expect(args).toContain('-frames:v');
    expect(args).toContain('1');
    expect(args[args.length - 1]).toBe('/out.jpg');
  });

  it('includes crop+scale when crop is provided', () => {
    const crop = { x: 0.1, y: 0.2, width: 0.5, height: 0.5 };
    const args = buildFrameExtractArgs('ffmpeg', '/in.mp4', '/out.jpg', 0, 30, crop, 720);
    const vfIdx = args.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = args[vfIdx + 1];
    expect(vf).toContain('crop=');
    expect(vf).toContain('scale=');
  });

  it('omits crop filter when no crop provided', () => {
    const args = buildFrameExtractArgs('ffmpeg', '/in.mp4', '/out.jpg', 0, 30);
    const vfIdx = args.indexOf('-vf');
    if (vfIdx !== -1) {
      expect(args[vfIdx + 1]).not.toContain('crop=');
    }
  });

  it('includes scale when maxHeight is provided without crop', () => {
    const args = buildFrameExtractArgs('ffmpeg', '/in.mp4', '/out.jpg', 0, 30, undefined, 720);
    const vfIdx = args.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = args[vfIdx + 1];
    expect(vf).toContain('scale=');
    expect(vf).toContain('720');
  });
});

// ─── processVideoSection ───

describe('processVideoSection', () => {
  // Mock fs and spawnFFmpeg at module level
  vi.mock('node:fs', () => ({
    default: {
      readFileSync: vi.fn(),
      existsSync: vi.fn(),
      mkdirSync: vi.fn(),
      writeFileSync: vi.fn(),
    },
  }));

  vi.mock('../media-processing.js', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../media-processing.js')>();
    return {
      ...actual,
      computeProcessingHash: vi.fn(() => 'fakehash1234'),
      isProcessingCurrent: vi.fn(() => false),
      spawnFFmpeg: vi.fn(() => Promise.resolve()),
    };
  });

  let mockSpawn: Mock;
  let mockCache: Mock;
  let mockFs: typeof import('node:fs')['default'];

  beforeEach(async () => {
    ({ spawnFFmpeg: mockSpawn, isProcessingCurrent: mockCache } = await import(
      '../media-processing.js'
    ) as Record<string, Mock>);
    mockFs = (await import('node:fs')).default;
    vi.clearAllMocks();
  });

  it('calls spawnFFmpeg with built args', async () => {
    (mockFs.existsSync as Mock).mockReturnValue(false);

    await processVideoSection('ffmpeg', '/in.mp4', '/out.mp4', 0, 100, 30, 720);

    expect(mockSpawn).toHaveBeenCalledTimes(1);
    const [bin, args] = (mockSpawn as Mock).mock.calls[0];
    expect(bin).toBe('ffmpeg');
    expect(args).toContain('-ss');
  });

  it('writes params.hash sidecar after processing', async () => {
    (mockFs.existsSync as Mock).mockReturnValue(false);

    await processVideoSection('ffmpeg', '/in.mp4', '/dir/out.mp4', 0, 100, 30, 720);

    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });

  it('skips processing when cache is current', async () => {
    (mockCache as Mock).mockReturnValue(true);
    (mockFs.existsSync as Mock).mockReturnValue(true);

    await processVideoSection('ffmpeg', '/in.mp4', '/out.mp4', 0, 100, 30, 720);

    expect(mockSpawn).not.toHaveBeenCalled();
  });
});

// ─── processFrameExtract ───

describe('processFrameExtract', () => {
  let mockSpawn: Mock;
  let mockCache: Mock;
  let mockFs: typeof import('node:fs')['default'];

  beforeEach(async () => {
    ({ spawnFFmpeg: mockSpawn, isProcessingCurrent: mockCache } = await import(
      '../media-processing.js'
    ) as Record<string, Mock>);
    mockFs = (await import('node:fs')).default;
    vi.clearAllMocks();
  });

  it('calls spawnFFmpeg with built args', async () => {
    (mockCache as Mock).mockReturnValue(false);
    (mockFs.existsSync as Mock).mockReturnValue(false);
    (mockSpawn as Mock).mockResolvedValue(undefined);

    await processFrameExtract('ffmpeg', '/in.mp4', '/out.jpg', 90, 30);

    expect(mockSpawn).toHaveBeenCalledTimes(1);
  });

  it('writes params.hash sidecar after processing', async () => {
    (mockCache as Mock).mockReturnValue(false);
    (mockFs.existsSync as Mock).mockReturnValue(false);
    (mockSpawn as Mock).mockResolvedValue(undefined);

    await processFrameExtract('ffmpeg', '/in.mp4', '/dir/out.jpg', 90, 30);

    expect(mockFs.writeFileSync).toHaveBeenCalled();
  });

  it('skips processing when cache is current', async () => {
    (mockCache as Mock).mockReturnValue(true);
    (mockFs.existsSync as Mock).mockReturnValue(true);

    await processFrameExtract('ffmpeg', '/in.mp4', '/out.jpg', 90, 30);

    expect(mockSpawn).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// buildFullVideoArgs
// ═══════════════════════════════════════════════════════════════════════════

describe('buildFullVideoArgs', () => {
  it('produces scale+pad filter for 1040x1040', () => {
    const args = buildFullVideoArgs('ffmpeg', '/in.mp4', '/out.mp4', 1040);
    const vfIdx = args.indexOf('-vf');
    expect(vfIdx).toBeGreaterThan(-1);
    const vf = args[vfIdx + 1];
    expect(vf).toContain('scale=');
    expect(vf).toContain("min(1040");
    expect(vf).toContain('pad=1040:1040');
  });

  it('has no -ss or -t flags (full video)', () => {
    const args = buildFullVideoArgs('ffmpeg', '/in.mp4', '/out.mp4', 1040);
    expect(args).not.toContain('-ss');
    expect(args).not.toContain('-t');
  });

  it('has standard codec args (libx264, crf 23, yuv420p, no audio)', () => {
    const args = buildFullVideoArgs('ffmpeg', '/in.mp4', '/out.mp4', 1040);
    expect(args).toContain('-c:v');
    expect(args).toContain('libx264');
    expect(args).toContain('-crf');
    expect(args).toContain('23');
    expect(args).toContain('-pix_fmt');
    expect(args).toContain('yuv420p');
    expect(args).toContain('-an');
  });

  it('first element is the ffmpeg binary', () => {
    const args = buildFullVideoArgs('/usr/bin/ffmpeg', '/in.mp4', '/out.mp4', 1040);
    expect(args[0]).toBe('/usr/bin/ffmpeg');
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// readVideoMetadata
// ═══════════════════════════════════════════════════════════════════════════

vi.mock('node:child_process', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:child_process')>();
  return {
    ...actual,
    spawn: vi.fn(),
  };
});

describe('readVideoMetadata', () => {
  let mockSpawnForProbe: Mock;

  beforeEach(async () => {
    const cp = await import('node:child_process');
    mockSpawnForProbe = cp.spawn as unknown as Mock;
    vi.clearAllMocks();
  });

  /** Create a fake spawn proc that emits stdout data then closes. */
  function fakeSpawnProc(stdout: string, code = 0) {
    const listeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const stdoutListeners: Record<string, ((...args: unknown[]) => void)[]> = {};
    const proc = {
      stdout: {
        on(event: string, cb: (...args: unknown[]) => void) {
          (stdoutListeners[event] ??= []).push(cb);
          return proc.stdout;
        },
      },
      on(event: string, cb: (...args: unknown[]) => void) {
        (listeners[event] ??= []).push(cb);
        if (event === 'close') {
          queueMicrotask(() => {
            // Emit stdout data first
            for (const dataCb of stdoutListeners['data'] ?? []) {
              dataCb(Buffer.from(stdout));
            }
            // Then close
            cb(code);
          });
        }
        return proc;
      },
    };
    return proc;
  }

  function setupSpawn(stdout: string, code = 0) {
    mockSpawnForProbe.mockReturnValue(fakeSpawnProc(stdout, code));
  }

  it('parses fps from r_frame_rate fraction (30/1)', async () => {
    setupSpawn(JSON.stringify({
      streams: [{ codec_type: 'video', r_frame_rate: '30/1', width: 1920, height: 1080 }],
      format: { duration: '10.5' },
    }));
    const meta = await readVideoMetadata('ffprobe', '/test.mp4');
    expect(meta.fps).toBe(30);
    expect(meta.width).toBe(1920);
    expect(meta.height).toBe(1080);
    expect(meta.duration).toBe(10.5);
  });

  it('parses fps from r_frame_rate fraction (30000/1001)', async () => {
    setupSpawn(JSON.stringify({
      streams: [{ codec_type: 'video', r_frame_rate: '30000/1001', width: 1920, height: 1080 }],
      format: { duration: '5.0' },
    }));
    const meta = await readVideoMetadata('ffprobe', '/test.mp4');
    expect(meta.fps).toBeCloseTo(29.97, 1);
  });

  it('falls back to fps=30 when r_frame_rate is missing', async () => {
    setupSpawn(JSON.stringify({
      streams: [{ codec_type: 'video', width: 1920, height: 1080 }],
      format: { duration: '5.0' },
    }));
    const meta = await readVideoMetadata('ffprobe', '/test.mp4');
    expect(meta.fps).toBe(30);
  });

  it('throws on no video stream', async () => {
    setupSpawn(JSON.stringify({
      streams: [{ codec_type: 'audio' }],
      format: { duration: '5.0' },
    }));
    await expect(readVideoMetadata('ffprobe', '/test.mp4')).rejects.toThrow('No video stream');
  });

  it('throws on non-zero exit code', async () => {
    setupSpawn('', 1);
    await expect(readVideoMetadata('ffprobe', '/test.mp4')).rejects.toThrow('ffprobe exited with code 1');
  });
});
