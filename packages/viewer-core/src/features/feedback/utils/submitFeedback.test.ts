import { describe, it, expect, vi, beforeEach } from 'vitest';

import {
  submitViaEmail,
  submitFeedback,
  dataUrlToBlob,
} from './submitFeedback';

// Minimal mock data for tests
const makePngFile = () => new File(['img'], 'screenshot.png', { type: 'image/png' });
const makeAudioBlob = () => new Blob(['audio'], { type: 'audio/webm' });
const makeAttachment = () => new File(['att'], 'photo.jpg', { type: 'image/jpeg' });

beforeEach(() => {
  vi.restoreAllMocks();
});

// ---------- dataUrlToBlob ----------
describe('dataUrlToBlob', () => {
  it('converts a data URL to Blob with correct MIME type', () => {
    const dataUrl = 'data:image/png;base64,iVBORw0KGgo=';
    const blob = dataUrlToBlob(dataUrl);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/png');
  });
});

// ---------- submitViaEmail ----------
describe('submitViaEmail', () => {
  it('sends FormData to Web3Forms URL with access_key and botcheck', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitViaEmail({ description: 'email test' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.web3forms.com/submit');
    const body = opts.body as FormData;
    // Key comes from VITE_WEB3FORMS_KEY env var (empty in test environment)
    expect(body.has('access_key')).toBe(true);
    expect(body.get('botcheck')).toBe('');
    expect(result.success).toBe(true);
  });

  it('includes ccemail when supportEmail provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await submitViaEmail({ description: 'cc test', supportEmail: 'support@acme.com' });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('ccemail')).toBe('support@acme.com');
  });

  it('sends step number formatted as "Step N"', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await submitViaEmail({ description: 'step test', stepNumber: 3 });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    expect(body.get('step')).toBe('Step 3');
  });

  it('does not attach files (Web3Forms Pro required)', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    await submitViaEmail({
      description: 'with files',
      screenshot: makePngFile(),
      audioMemo: makeAudioBlob(),
      attachment: makeAttachment(),
    });

    const body = fetchMock.mock.calls[0][1].body as FormData;
    // Files are intentionally not appended (Web3Forms Pro plan required)
    expect(body.get('screenshot')).toBeNull();
    expect(body.get('audio')).toBeNull();
    expect(body.get('attachment')).toBeNull();
  });

  it('returns { success: false } on error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));

    const result = await submitViaEmail({ description: 'fail' });
    expect(result.success).toBe(false);
  });
});

// ---------- submitFeedback (always Web3Forms) ----------
describe('submitFeedback', () => {
  it('submits via Web3Forms email', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    vi.stubGlobal('fetch', fetchMock);

    const result = await submitFeedback({ description: 'test' });
    expect(fetchMock).toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.channel).toBe('email');
  });
});
