/**
 * The one part of Emoji Compass that sends anything.
 *
 * The browser only ever talks to this app's own `/api/feedback` route, which
 * relays the note onward. Validation here is for the person typing — the
 * serverless handler validates again, independently, because a client check is
 * a convenience and never a guarantee.
 */

export const FEEDBACK_ENDPOINT = '/api/feedback';
export const MAX_MESSAGE_LENGTH = 4000;
export const MAX_EMAIL_LENGTH = 254;

/** Deliberately loose: the goal is catching typos, not policing addresses. */
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface FeedbackDraft {
  readonly message: string;
  /** Optional — the visitor only supplies it if they want a reply. */
  readonly email: string;
}

export interface FeedbackIssues {
  message?: string;
  email?: string;
}

export type FeedbackResult =
  | { status: 'sent' }
  | { status: 'invalid'; issues: FeedbackIssues }
  | { status: 'failed'; message: string };

export function createFeedbackDraft(): FeedbackDraft {
  return { message: '', email: '' };
}

export function validateFeedback(draft: FeedbackDraft): FeedbackIssues {
  const issues: FeedbackIssues = {};
  const message = draft.message.trim();
  const email = draft.email.trim();

  if (!message) {
    issues.message = 'Add a note before sending.';
  } else if (message.length > MAX_MESSAGE_LENGTH) {
    issues.message = `Keep it under ${MAX_MESSAGE_LENGTH.toLocaleString('en-US')} characters.`;
  }

  if (email && (email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email))) {
    issues.email = 'That email address does not look right.';
  }

  return issues;
}

export interface SubmitFeedbackOptions {
  readonly endpoint?: string;
  readonly fetcher?: typeof fetch;
}

async function readErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: unknown };
    if (typeof body?.error === 'string' && body.error.trim()) return body.error;
  } catch {
    // A non-JSON error body is not worth surfacing verbatim.
  }
  return 'That did not send. Please try again in a moment.';
}

export async function submitFeedback(
  draft: FeedbackDraft,
  options: SubmitFeedbackOptions = {},
): Promise<FeedbackResult> {
  const issues = validateFeedback(draft);
  if (Object.keys(issues).length > 0) return { status: 'invalid', issues };

  const { endpoint = FEEDBACK_ENDPOINT, fetcher = globalThis.fetch } = options;
  const email = draft.email.trim();

  try {
    const response = await fetcher(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        message: draft.message.trim(),
        ...(email ? { email } : {}),
      }),
    });

    if (!response.ok) {
      return { status: 'failed', message: await readErrorMessage(response) };
    }
    return { status: 'sent' };
  } catch {
    return {
      status: 'failed',
      message: 'That did not send — check your connection and try again.',
    };
  }
}
