import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import {
  computeProcessingHash,
  isProcessingCurrent,
  readImageDimensions,
  buildImageProcessArgs,
  resolveFFmpegBinary,
  processImage,
  spawnFFmpeg,
  PARTTOOL_EXPORT_SIZE,
  EXPORT_SIZE,
} from '../media-processing.js';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}));

const mockedExecFile = vi.mocked(execFile);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('PARTTOOL_EXPORT_SIZE is 720', () => {
    expect(PARTTOOL_EXPORT_SIZE).toBe(720);
  });

  it('EXPORT_SIZE is 1040', () => {
    expect(EXPORT_SIZE).toBe(1040);
  });
});

// ---------------------------------------------------------------------------
// computeProcessingHash
// ---------------------------------------------------------------------------

describe('computeProcessingHash', () => {
  it('returns consistent hash for same params', () => {
    const a = computeProcessingHash('image', 'path/to/file', 100, 200);
    const b = computeProcessingHash('image', 'path/to/file', 100, 200);
    expect(a).toBe(b);
  });

  it('returns different hash for different params', () => {
    const a = computeProcessingHash('image', 'path/to/file', 100, 200);
    const b = computeProcessingHash('image', 'path/to/file', 100, 300);
    expect(a).not.toBe(b);
  });

  it('returns a 16-character hex string', () => {
    const hash = computeProcessingHash('test');
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });

  it('handles null and undefined params', () => {
    const a = computeProcessingHash('test', null, undefined);
    const b = computeProcessingHash('test', null, undefined);
    expect(a).toBe(b);
  });
});

// ---------------------------------------------------------------------------
// isProcessingCurrent
// ---------------------------------------------------------------------------

describe('isProcessingCurrent', () => {
  const tmpDir = path.join(import.meta.dirname, '__tmp_test_sidecar__');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('returns true when sidecar matches', () => {
    fs.writeFileSync(path.join(tmpDir, 'params.hash'), 'abc123', 'utf-8');
    expect(isProcessingCurrent(tmpDir, 'abc123')).toBe(true);
  });

  it('returns false when sidecar mismatches', () => {
    fs.writeFileSync(path.join(tmpDir, 'params.hash'), 'abc123', 'utf-8');
    expect(isProcessingCurrent(tmpDir, 'different')).toBe(false);
  });

  it('returns false when sidecar is missing', () => {
    expect(isProcessingCurrent(tmpDir, 'abc123')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// readImageDimensions
// ---------------------------------------------------------------------------

describe('readImageDimensions', () => {
  const tmpDir = path.join(import.meta.dirname, '__tmp_test_images__');

  beforeEach(() => {
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('reads PNG dimensions correctly', () => {
    // Minimal valid PNG header: 8-byte signature + IHDR chunk
    // Width=200 (0x00C8), Height=150 (0x0096) at bytes 16-23
    const buf = Buffer.alloc(32, 0);
    // PNG signature
    buf[0] = 0x89; buf[1] = 0x50; buf[2] = 0x4E; buf[3] = 0x47;
    buf[4] = 0x0D; buf[5] = 0x0A; buf[6] = 0x1A; buf[7] = 0x0A;
    // IHDR chunk length (13)
    buf.writeUInt32BE(13, 8);
    // IHDR type
    buf[12] = 0x49; buf[13] = 0x48; buf[14] = 0x44; buf[15] = 0x52;
    // Width = 200, Height = 150
    buf.writeUInt32BE(200, 16);
    buf.writeUInt32BE(150, 20);

    const filePath = path.join(tmpDir, 'test.png');
    fs.writeFileSync(filePath, buf);

    const dims = readImageDimensions(filePath);
    expect(dims).toEqual({ width: 200, height: 150 });
  });

  it('reads JPEG dimensions correctly', () => {
    // Minimal JPEG with SOF0 marker
    // SOI + APP0 (minimal) + SOF0 with dimensions
    const parts: number[] = [
      // SOI
      0xFF, 0xD8,
      // APP0 marker with minimal length (just to get past it)
      0xFF, 0xE0,
      0x00, 0x02, // segment length = 2 (just the length bytes)
      // SOF0 marker
      0xFF, 0xC0,
      0x00, 0x0B, // segment length = 11
      0x08,       // precision
      0x01, 0x2C, // height = 300
      0x01, 0x90, // width = 400
    ];
    const buf = Buffer.from(parts);
    const filePath = path.join(tmpDir, 'test.jpg');
    fs.writeFileSync(filePath, buf);

    const dims = readImageDimensions(filePath);
    expect(dims).toEqual({ width: 400, height: 300 });
  });

  it('returns zero dimensions for unsupported format', () => {
    const filePath = path.join(tmpDir, 'test.bmp');
    fs.writeFileSync(filePath, Buffer.from('BM not a real bmp'));

    const dims = readImageDimensions(filePath);
    expect(dims).toEqual({ width: 0, height: 0 });
  });

  it('returns zero dimensions for non-existent file', () => {
    const dims = readImageDimensions(path.join(tmpDir, 'nonexistent.png'));
    expect(dims).toEqual({ width: 0, height: 0 });
  });
});

// ---------------------------------------------------------------------------
// buildImageProcessArgs
// ---------------------------------------------------------------------------

describe('buildImageProcessArgs', () => {
  const ffmpeg = '/usr/bin/ffmpeg';
  const src = '/tmp/input.png';
  const dest = '/tmp/output.jpg';

  it('includes crop+scale filters when crop provided', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, { x: 0.1, y: 0.2, width: 0.5, height: 0.6 }, 720);
    expect(args[0]).toBe(ffmpeg);
    expect(args).toContain('-vf');
    const vfIndex = args.indexOf('-vf');
    const vf = args[vfIndex + 1];
    expect(vf).toContain('crop=');
    expect(vf).toContain('scale=');
    expect(vf).toContain('0.5');  // crop width
    expect(vf).toContain('0.6');  // crop height
    expect(vf).toContain('0.1');  // crop x
    expect(vf).toContain('0.2');  // crop y
  });

  it('includes only scale filter when no crop', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, undefined, 720);
    const vfIndex = args.indexOf('-vf');
    const vf = args[vfIndex + 1];
    expect(vf).not.toContain('crop=');
    expect(vf).toContain('scale=');
  });

  it('uses -pix_fmt yuvj420p and -q:v 2', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, undefined, 720);
    expect(args).toContain('-pix_fmt');
    expect(args[args.indexOf('-pix_fmt') + 1]).toBe('yuvj420p');
    expect(args).toContain('-q:v');
    expect(args[args.indexOf('-q:v') + 1]).toBe('2');
  });

  it('handles full-image crop (0,0,1,1) — includes crop filter', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, { x: 0, y: 0, width: 1, height: 1 }, 720);
    const vfIndex = args.indexOf('-vf');
    const vf = args[vfIndex + 1];
    // Full-image crop is still passed through (FFmpeg handles it as a no-op)
    expect(vf).toContain('crop=');
  });

  it('applies maxHeight in scale filter', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, undefined, 1040);
    const vfIndex = args.indexOf('-vf');
    const vf = args[vfIndex + 1];
    expect(vf).toContain('1040');
  });

  it('includes -y flag to overwrite output', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, undefined, 720);
    expect(args).toContain('-y');
  });

  it('includes input and output paths', () => {
    const args = buildImageProcessArgs(ffmpeg, src, dest, undefined, 720);
    expect(args).toContain('-i');
    expect(args[args.indexOf('-i') + 1]).toBe(src);
    expect(args[args.length - 1]).toBe(dest);
  });
});

// ---------------------------------------------------------------------------
// resolveFFmpegBinary
// ---------------------------------------------------------------------------

describe('resolveFFmpegBinary', () => {
  const tmpDir = path.join(import.meta.dirname, '__tmp_test_ffmpeg__');

  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, 'resources', 'ffmpeg'), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('returns path when binary exists (not packaged)', () => {
    const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    fs.writeFileSync(path.join(tmpDir, 'resources', 'ffmpeg', binName), '');

    const result = resolveFFmpegBinary(tmpDir, false);
    expect(result).toBe(path.join(tmpDir, 'resources', 'ffmpeg', binName));
  });

  it('returns path when binary exists (packaged)', () => {
    const binName = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
    // For packaged: resourcesPath/ffmpeg/<bin> — simulate resourcesPath = tmpDir
    fs.mkdirSync(path.join(tmpDir, 'ffmpeg'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'ffmpeg', binName), '');

    const result = resolveFFmpegBinary(tmpDir, true);
    expect(result).toBe(path.join(tmpDir, 'ffmpeg', binName));
  });

  it('throws when binary not found', () => {
    // Empty directory — no binary
    expect(() => resolveFFmpegBinary(tmpDir, false)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// spawnFFmpeg
// ---------------------------------------------------------------------------

describe('spawnFFmpeg', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('resolves on success', async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      (callback as (err: Error | null, stdout: string, stderr: string) => void)(null, '', '');
      return undefined as ReturnType<typeof execFile>;
    });

    await expect(spawnFFmpeg('/bin/ffmpeg', ['-version'])).resolves.toBeUndefined();
  });

  it('rejects on error', async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      (callback as (err: Error | null) => void)(new Error('ffmpeg failed'));
      return undefined as ReturnType<typeof execFile>;
    });

    await expect(spawnFFmpeg('/bin/ffmpeg', ['-version'])).rejects.toThrow('ffmpeg failed');
  });
});

// ---------------------------------------------------------------------------
// processImage
// ---------------------------------------------------------------------------

describe('processImage', () => {
  const tmpDir = path.join(import.meta.dirname, '__tmp_test_process__');

  beforeEach(() => {
    vi.resetAllMocks();
    fs.mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true, maxRetries: 3 });
  });

  it('calls FFmpeg with correct args and writes sidecar on success', async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      (callback as (err: Error | null, stdout: string, stderr: string) => void)(null, '', '');
      return undefined as ReturnType<typeof execFile>;
    });

    const destFile = path.join(tmpDir, 'output', 'image.jpg');
    await processImage('/bin/ffmpeg', '/tmp/input.png', destFile, undefined, 720);

    // Verify execFile was called
    expect(mockedExecFile).toHaveBeenCalledOnce();
    const callArgs = mockedExecFile.mock.calls[0];
    expect(callArgs[0]).toBe('/bin/ffmpeg');

    // Verify sidecar was written
    const sidecar = fs.readFileSync(path.join(tmpDir, 'output', 'params.hash'), 'utf-8');
    expect(sidecar).toMatch(/^[0-9a-f]{16}$/);
  });

  it('calls FFmpeg with crop args when crop provided', async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      (callback as (err: Error | null, stdout: string, stderr: string) => void)(null, '', '');
      return undefined as ReturnType<typeof execFile>;
    });

    const destFile = path.join(tmpDir, 'output', 'image.jpg');
    const crop = { x: 0.1, y: 0.2, width: 0.5, height: 0.6 };
    await processImage('/bin/ffmpeg', '/tmp/input.png', destFile, crop, 720);

    const callArgs = mockedExecFile.mock.calls[0];
    const ffmpegArgs = callArgs[1] as string[];
    const vfIndex = ffmpegArgs.indexOf('-vf');
    expect(ffmpegArgs[vfIndex + 1]).toContain('crop=');
  });

  it('throws on FFmpeg failure', async () => {
    mockedExecFile.mockImplementation((_bin, _args, callback) => {
      (callback as (err: Error | null) => void)(new Error('ffmpeg crashed'));
      return undefined as ReturnType<typeof execFile>;
    });

    const destFile = path.join(tmpDir, 'output', 'image.jpg');
    await expect(
      processImage('/bin/ffmpeg', '/tmp/input.png', destFile, undefined, 720),
    ).rejects.toThrow('ffmpeg crashed');
  });

  it('skips processing when sidecar hash matches', async () => {
    const outputDir = path.join(tmpDir, 'output');
    fs.mkdirSync(outputDir, { recursive: true });

    // Pre-compute the expected hash and write it
    const { computeProcessingHash: hash } = await import('../media-processing.js');
    const expectedHash = hash('image-process', '/tmp/input.png', undefined, undefined, undefined, undefined, 720);
    fs.writeFileSync(path.join(outputDir, 'params.hash'), expectedHash, 'utf-8');

    // Also create a dummy output file (processImage checks it exists)
    fs.writeFileSync(path.join(outputDir, 'image.jpg'), 'dummy', 'utf-8');

    const destFile = path.join(outputDir, 'image.jpg');
    await processImage('/bin/ffmpeg', '/tmp/input.png', destFile, undefined, 720);

    // FFmpeg should NOT have been called
    expect(mockedExecFile).not.toHaveBeenCalled();
  });
});
