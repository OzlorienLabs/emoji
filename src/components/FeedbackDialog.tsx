import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  createFeedbackDraft,
  MAX_MESSAGE_LENGTH,
  submitFeedback,
  validateFeedback,
  type FeedbackDraft,
  type FeedbackIssues,
  type FeedbackResult,
  type SubmitFeedbackOptions,
} from '../lib/feedback';

export interface FeedbackDialogProps {
  onClose: () => void;
  onSent?: (draft: FeedbackDraft) => void;
  /** Injected in tests; defaults to the real endpoint. */
  submit?: (
    draft: FeedbackDraft,
    options?: SubmitFeedbackOptions,
  ) => Promise<FeedbackResult>;
}

type Phase = 'editing' | 'sending' | 'sent';

/**
 * The Ozlorien Labs contact sheet. Reachable from the footer, and the only
 * place in the app that sends anything anywhere — which the copy says plainly
 * rather than leaving the visitor to infer it.
 */
export function FeedbackDialog({
  onClose,
  onSent,
  submit = submitFeedback,
}: FeedbackDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [draft, setDraft] = useState<FeedbackDraft>(createFeedbackDraft);
  const [phase, setPhase] = useState<Phase>('editing');
  const [issues, setIssues] = useState<FeedbackIssues>({});
  const [failure, setFailure] = useState<string>();
  const [honeypot, setHoneypot] = useState('');

  const fieldId = useId();
  const messageId = `feedback-message-${fieldId}`;
  const emailId = `feedback-email-${fieldId}`;
  const messageErrorId = `${messageId}-error`;
  const emailErrorId = `${emailId}-error`;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const supportsModal = typeof dialog.showModal === 'function';
    if (supportsModal) dialog.showModal();
    else dialog.setAttribute('open', '');
    messageRef.current?.focus();

    return () => {
      if (supportsModal) dialog.close();
      else dialog.removeAttribute('open');
    };
  }, []);

  // The thank-you replaces the form, so focus has to follow it.
  useEffect(() => {
    if (phase === 'sent') closeRef.current?.focus();
  }, [phase]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase === 'sending') return;

    const found = validateFeedback(draft);
    setIssues(found);
    setFailure(undefined);
    if (Object.keys(found).length > 0) {
      (found.message ? messageRef.current : null)?.focus();
      return;
    }

    // A filled honeypot is a bot; behave exactly as if it went through.
    if (honeypot.trim()) {
      setPhase('sent');
      return;
    }

    setPhase('sending');
    const result = await submit(draft);
    if (result.status === 'sent') {
      setPhase('sent');
      onSent?.(draft);
      return;
    }

    setPhase('editing');
    if (result.status === 'invalid') setIssues(result.issues);
    else setFailure(result.message);
  };

  const remaining = MAX_MESSAGE_LENGTH - draft.message.length;

  return (
    <dialog
      ref={dialogRef}
      className="feedback-dialog"
      aria-labelledby="feedback-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      <div className="feedback-dialog__head">
        <div className="feedback-dialog__copy">
          <span className="section-kicker">Ozlorien Labs</span>
          <h2 id="feedback-title">
            {phase === 'sent' ? 'Thank you for reaching out' : 'Tell us what you think'}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          className="icon-button"
          aria-label="Close"
          onClick={onClose}
        >
          <span aria-hidden="true">✕</span>
        </button>
      </div>

      {phase === 'sent' ? (
        <div className="feedback-dialog__done">
          <span className="feedback-dialog__mark" aria-hidden="true">🧭</span>
          <p>
            Your note is on its way to Ozlorien Labs. If you left an email address
            we will write back; otherwise, thank you for taking the time.
          </p>
          <button type="button" className="button button-primary" onClick={onClose}>
            Back to the emoji
          </button>
        </div>
      ) : (
        <form
          className="feedback-dialog__form"
          /* Our own checks own the messaging, so the browser must not
             pre-empt them with a native bubble on the email field. */
          noValidate
          onSubmit={(event) => void handleSubmit(event)}
        >
          <p className="feedback-dialog__lede">
            Share feedback on Emoji Compass, or ask us for a deep dive on a stock.
            This form is the one thing on the site that sends anything — nothing
            else you do here leaves your device.
          </p>

          <div className="field">
            <label htmlFor={messageId}>What is on your mind?</label>
            <textarea
              ref={messageRef}
              id={messageId}
              className="field__control"
              rows={5}
              maxLength={MAX_MESSAGE_LENGTH}
              required
              value={draft.message}
              disabled={phase === 'sending'}
              aria-invalid={issues.message ? true : undefined}
              aria-describedby={issues.message ? messageErrorId : undefined}
              placeholder="A bug, an idea, or the ticker you would like us to dig into…"
              onChange={(event) => {
                setDraft((current) => ({ ...current, message: event.target.value }));
                setIssues((current) => ({ ...current, message: undefined }));
              }}
            />
            <div className="field__foot">
              {issues.message ? (
                <span className="field__error" id={messageErrorId} role="alert">
                  {issues.message}
                </span>
              ) : (
                <span className="field__hint">
                  {remaining.toLocaleString('en-US')} characters left
                </span>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor={emailId}>
              Email <span className="field__optional">(optional, only if you want a reply)</span>
            </label>
            <input
              id={emailId}
              className="field__control"
              type="email"
              autoComplete="email"
              value={draft.email}
              disabled={phase === 'sending'}
              aria-invalid={issues.email ? true : undefined}
              aria-describedby={issues.email ? emailErrorId : undefined}
              placeholder="you@example.com"
              onChange={(event) => {
                setDraft((current) => ({ ...current, email: event.target.value }));
                setIssues((current) => ({ ...current, email: undefined }));
              }}
            />
            {issues.email ? (
              <div className="field__foot">
                <span className="field__error" id={emailErrorId} role="alert">
                  {issues.email}
                </span>
              </div>
            ) : null}
          </div>

          {/* Honeypot: off-screen and hidden from assistive tech, so only bots fill it. */}
          <div className="feedback-dialog__trap" aria-hidden="true">
            <label htmlFor={`${fieldId}-company`}>Company</label>
            <input
              id={`${fieldId}-company`}
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
            />
          </div>

          {failure ? (
            <p className="feedback-dialog__failure" role="alert">{failure}</p>
          ) : null}

          <div className="feedback-dialog__actions">
            <button type="button" className="button" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={phase === 'sending'}
            >
              {phase === 'sending' ? 'Sending…' : 'Send to Ozlorien Labs'}
            </button>
          </div>
        </form>
      )}
    </dialog>
  );
}
