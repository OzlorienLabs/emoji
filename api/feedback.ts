/**
 * Relays a note from the site's feedback modal to Ozlorien Labs.
 *
 * This runs as a Vercel Function on the same origin as the app, so the browser
 * never talks to a third party and the site's `connect-src 'self'` policy is
 * unchanged. The Resend credential lives here and is never shipped to a client.
 *
 * Required configuration:
 *   RESEND_API_KEY    a Resend API key
 *   FEEDBACK_TO       destination address (defaults to ozlorienlabs@gmail.com)
 *   FEEDBACK_FROM     verified sender (defaults to Resend's shared test sender)
 */

const MAX_MESSAGE_LENGTH = 4000;
const MAX_EMAIL_LENGTH = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESEND_ENDPOINT = 'https://api.resend.com/emails';

const DEFAULT_TO = 'ozlorienlabs@gmail.com';
const DEFAULT_FROM = 'Emoji Compass <onboarding@resend.dev>';

interface FeedbackPayload {
  message?: unknown;
  email?: unknown;
  /** Honeypot. Real people never see this field, so a value means a bot. */
  company?: unknown;
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export async function POST(request: Request): Promise<Response> {
  let payload: FeedbackPayload;
  try {
    payload = (await request.json()) as FeedbackPayload;
  } catch {
    return json({ error: 'Send a JSON body.' }, 400);
  }

  // Quietly accept and drop anything that filled the honeypot, so a bot gets
  // no signal about why it failed.
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return json({ ok: true }, 202);
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  const email = typeof payload.email === 'string' ? payload.email.trim() : '';

  if (!message) {
    return json({ error: 'Add a note before sending.' }, 400);
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    return json({ error: 'That note is too long to send.' }, 413);
  }
  if (email && (email.length > MAX_EMAIL_LENGTH || !EMAIL_SHAPE.test(email))) {
    return json({ error: 'That email address does not look right.' }, 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return json(
      { error: 'Feedback is not configured on this deployment yet.' },
      503,
    );
  }

  const replyTo = email || undefined;
  const subject = email
    ? `Emoji Compass feedback from ${email}`
    : 'Emoji Compass feedback';

  let response: Response;
  try {
    response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.FEEDBACK_FROM || DEFAULT_FROM,
        to: [process.env.FEEDBACK_TO || DEFAULT_TO],
        subject,
        ...(replyTo ? { reply_to: replyTo } : {}),
        text: [
          message,
          '',
          '---',
          `Reply to: ${email || 'not supplied'}`,
          'Sent from the Emoji Compass footer.',
        ].join('\n'),
        html: [
          `<p style="white-space:pre-wrap">${escapeHtml(message)}</p>`,
          '<hr />',
          `<p><strong>Reply to:</strong> ${escapeHtml(email || 'not supplied')}</p>`,
          '<p>Sent from the Emoji Compass footer.</p>',
        ].join(''),
      }),
    });
  } catch {
    return json({ error: 'The mail service is unreachable right now.' }, 502);
  }

  if (!response.ok) {
    return json({ error: 'The mail service refused that message.' }, 502);
  }

  return json({ ok: true }, 202);
}
