// Feedback submission via Web3Forms email

const WEB3FORMS_URL = 'https://api.web3forms.com/submit';
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY ?? '';

export interface FeedbackData {
  description?: string;
  phoneNumber?: string;
  screenshot?: File | null;
  audioMemo?: Blob | null;
  attachment?: File | null;
  instructionName?: string;
  stepNumber?: number;
  supportEmail?: string | null;
}

export interface FeedbackResult {
  success: boolean;
  channel?: 'whatsapp' | 'email';
}

/** Convert a data:... URL to a Blob */
export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(',');
  const mime = header.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/** Submit via Web3Forms email */
export async function submitViaEmail(data: FeedbackData): Promise<FeedbackResult> {
  try {
    const form = new FormData();
    form.append('access_key', WEB3FORMS_KEY);
    form.append('botcheck', '');
    form.append('subject', 'Montavis Feedback');

    // --- text fields ---
    if (data.description) form.append('message', data.description);
    if (data.phoneNumber) form.append('phone', data.phoneNumber);
    if (data.instructionName) form.append('instruction', data.instructionName);
    if (data.stepNumber != null) form.append('step', 'Step ' + data.stepNumber);
    if (data.supportEmail) form.append('ccemail', data.supportEmail);

    // NOTE: File uploads require Web3Forms Pro plan — disabled for now.
    // The UI still allows capturing screenshots/audio/files but they are
    // not included in the email submission.

    const res = await fetch(WEB3FORMS_URL, { method: 'POST', body: form });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.error('[Feedback] Web3Forms error:', res.status, body);
      return { success: false, channel: 'email' };
    }

    return { success: true, channel: 'email' };
  } catch (err) {
    console.error('[Feedback] submit error:', err);
    return { success: false, channel: 'email' };
  }
}

/** Always submit via Web3Forms email API */
export const submitFeedback = submitViaEmail;
