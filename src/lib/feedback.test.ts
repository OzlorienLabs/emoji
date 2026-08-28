import { describe, expect, it, vi } from 'vitest';
import {
  createFeedbackDraft,
  FEEDBACK_ENDPOINT,
  MAX_MESSAGE_LENGTH,
  submitFeedback,
  validateFeedback,
} from './feedback';

const draft = (message: string, email = '') => ({ message, email });

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

describe('validateFeedback', () => {
  it('starts from an empty draft', () => {
    expect(createFeedbackDraft()).toEqual({ message: '', email: '' });
  });

  it('requires a note that is more than whitespace', () => {
    expect(validateFeedback(draft('   ')).message).toBe('Add a note before sending.');
    expect(validateFeedback(draft('hello')).message).toBeUndefined();
  });

  it('caps the note length', () => {
    const issues = validateFeedback(draft('x'.repeat(MAX_MESSAGE_LENGTH + 1)));
    expect(issues.message).toContain('4,000');
    expect(validateFeedback(draft('x'.repeat(MAX_MESSAGE_LENGTH))).message).toBeUndefined();
  });

  it('treats the email as optional but checks its shape when supplied', () => {
    expect(validateFeedback(draft('hi')).email).toBeUndefined();
    expect(validateFeedback(draft('hi', '   ')).email).toBeUndefined();
    expect(validateFeedback(draft('hi', 'someone@example.com')).email).toBeUndefined();

    for (const bad of ['nope', 'a@b', 'two parts@example.com', `${'x'.repeat(250)}@example.com`]) {
      expect(validateFeedback(draft('hi', bad)).email, bad).toBe(
        'That email address does not look right.',
      );
    }
  });
});

describe('submitFeedback', () => {
  it('refuses to send an invalid draft and never touches the network', async () => {
    const fetcher = vi.fn();
    const result = await submitFeedback(draft(''), { fetcher: fetcher as unknown as typeof fetch });

    expect(result).toEqual({
      status: 'invalid',
      issues: { message: 'Add a note before sending.' },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('posts a trimmed note to the app’s own endpoint', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ok: true }, { status: 202 }));
    const result = await submitFeedback(draft('  look into $ACME  ', ' me@example.com '), {
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result).toEqual({ status: 'sent' });
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(FEEDBACK_ENDPOINT);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      message: 'look into $ACME',
      email: 'me@example.com',
    });
  });

  it('omits the email key entirely when none was given', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    await submitFeedback(draft('just a note'), { fetcher: fetcher as unknown as typeof fetch });

    const [, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ message: 'just a note' });
  });

  it('surfaces the server’s reason when it rejects the note', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      jsonResponse({ error: 'Feedback is not configured on this deployment yet.' }, { status: 503 }),
    );
    const result = await submitFeedback(draft('hi'), {
      fetcher: fetcher as unknown as typeof fetch,
    });

    expect(result).toEqual({
      status: 'failed',
      message: 'Feedback is not configured on this deployment yet.',
    });
  });

  it('falls back to a generic message for an unreadable error body', async () => {
    for (const response of [
      new Response('<html>502</html>', { status: 502 }),
      jsonResponse({ error: '   ' }, { status: 500 }),
      jsonResponse({ error: 42 }, { status: 500 }),
    ]) {
      const result = await submitFeedback(draft('hi'), {
        fetcher: vi.fn().mockResolvedValue(response) as unknown as typeof fetch,
      });
      expect(result).toEqual({
        status: 'failed',
        message: 'That did not send. Please try again in a moment.',
      });
    }
  });

  it('reports a connection failure without throwing', async () => {
    const result = await submitFeedback(draft('hi'), {
      fetcher: vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch,
    });

    expect(result).toEqual({
      status: 'failed',
      message: 'That did not send — check your connection and try again.',
    });
  });

  it('uses the global fetch and the real endpoint by default', async () => {
    const fetcher = vi.fn().mockResolvedValue(jsonResponse({ ok: true }));
    vi.stubGlobal('fetch', fetcher);
    try {
      await expect(submitFeedback(draft('hi'))).resolves.toEqual({ status: 'sent' });
      expect(fetcher).toHaveBeenCalledWith(FEEDBACK_ENDPOINT, expect.anything());
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
