import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { FeedbackResult } from '../lib/feedback';
import { stubDialogMethods } from '../test/dom-stubs';
import { FeedbackDialog } from './FeedbackDialog';

const sent = (): FeedbackResult => ({ status: 'sent' });

describe('FeedbackDialog', () => {
  it('sends a note with an optional email and thanks the sender', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(sent());
    const onSent = vi.fn();
    render(<FeedbackDialog onClose={vi.fn()} onSent={onSent} submit={submit} />);

    const message = screen.getByRole('textbox', { name: 'What is on your mind?' });
    expect(message).toHaveFocus();

    await user.type(message, 'Please dig into $ACME');
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'me@example.com');
    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));

    expect(submit).toHaveBeenCalledWith({
      message: 'Please dig into $ACME',
      email: 'me@example.com',
    });
    expect(onSent).toHaveBeenCalledWith({
      message: 'Please dig into $ACME',
      email: 'me@example.com',
    });

    expect(await screen.findByRole('heading', { name: 'Thank you for reaching out' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send to Ozlorien Labs' }))
      .not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('sends without an email address', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue(sent());
    render(<FeedbackDialog onClose={vi.fn()} submit={submit} />);

    await user.type(screen.getByRole('textbox', { name: 'What is on your mind?' }), 'Nice app');
    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));

    expect(submit).toHaveBeenCalledWith({ message: 'Nice app', email: '' });
    expect(await screen.findByRole('heading', { name: 'Thank you for reaching out' }))
      .toBeInTheDocument();
  });

  it('blocks an empty note and a malformed address before reaching the network', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    render(<FeedbackDialog onClose={vi.fn()} submit={submit} />);

    const send = screen.getByRole('button', { name: 'Send to Ozlorien Labs' });
    const message = screen.getByRole('textbox', { name: 'What is on your mind?' });

    fireEvent.submit(send.closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Add a note before sending.');
    expect(message).toHaveAttribute('aria-invalid', 'true');
    expect(message).toHaveFocus();
    expect(submit).not.toHaveBeenCalled();

    await user.type(message, 'Hello');
    await user.type(screen.getByRole('textbox', { name: /^Email/ }), 'not-an-address');
    await user.click(send);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'That email address does not look right.',
    );
    expect(submit).not.toHaveBeenCalled();
  });

  it('clears a field error as soon as the sender starts fixing it', async () => {
    const user = userEvent.setup();
    render(<FeedbackDialog onClose={vi.fn()} submit={vi.fn()} />);

    const send = screen.getByRole('button', { name: 'Send to Ozlorien Labs' });
    fireEvent.submit(send.closest('form')!);
    expect(await screen.findByRole('alert')).toBeInTheDocument();

    await user.type(screen.getByRole('textbox', { name: 'What is on your mind?' }), 'a');
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('keeps the draft and explains itself when sending fails', async () => {
    const user = userEvent.setup();
    const submit = vi
      .fn()
      .mockResolvedValueOnce({ status: 'failed', message: 'The mail service is unreachable right now.' })
      .mockResolvedValueOnce(sent());
    render(<FeedbackDialog onClose={vi.fn()} submit={submit} />);

    const message = screen.getByRole('textbox', { name: 'What is on your mind?' });
    await user.type(message, 'Try again please');
    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The mail service is unreachable right now.',
    );
    expect(message).toHaveValue('Try again please');

    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));
    expect(await screen.findByRole('heading', { name: 'Thank you for reaching out' }))
      .toBeInTheDocument();
  });

  it('surfaces server-side validation that the client did not catch', async () => {
    const user = userEvent.setup();
    const submit = vi.fn().mockResolvedValue({
      status: 'invalid',
      issues: { message: 'That note is too long to send.' },
    });
    render(<FeedbackDialog onClose={vi.fn()} submit={submit} />);

    await user.type(screen.getByRole('textbox', { name: 'What is on your mind?' }), 'Hi');
    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('That note is too long to send.');
  });

  it('ignores a submission that filled the hidden honeypot', async () => {
    const user = userEvent.setup();
    const submit = vi.fn();
    const { container } = render(<FeedbackDialog onClose={vi.fn()} submit={submit} />);

    await user.type(screen.getByRole('textbox', { name: 'What is on your mind?' }), 'Buy now');
    const trap = container.querySelector<HTMLInputElement>('.feedback-dialog__trap input')!;
    fireEvent.change(trap, { target: { value: 'Spam Co' } });
    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));

    // The bot sees the same thank-you, but nothing was ever sent.
    expect(await screen.findByRole('heading', { name: 'Thank you for reaching out' }))
      .toBeInTheDocument();
    expect(submit).not.toHaveBeenCalled();
  });

  it('disables the form while a send is in flight', async () => {
    const user = userEvent.setup();
    let resolveSubmit: ((result: FeedbackResult) => void) | undefined;
    const submit = vi.fn().mockImplementation(
      () => new Promise<FeedbackResult>((resolve) => { resolveSubmit = resolve; }),
    );
    render(<FeedbackDialog onClose={vi.fn()} submit={submit} />);

    const message = screen.getByRole('textbox', { name: 'What is on your mind?' });
    await user.type(message, 'Hello');
    await user.click(screen.getByRole('button', { name: 'Send to Ozlorien Labs' }));

    const sending = screen.getByRole('button', { name: 'Sending…' });
    expect(sending).toBeDisabled();
    expect(message).toBeDisabled();

    fireEvent.submit(sending.closest('form')!);
    expect(submit).toHaveBeenCalledTimes(1);

    resolveSubmit?.(sent());
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Thank you for reaching out' }))
        .toBeInTheDocument(),
    );
  });

  it('closes from the header, Cancel, the backdrop, and Escape', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { rerender } = render(<FeedbackDialog onClose={onClose} submit={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.click(screen.getByRole('dialog'));
    fireEvent(
      screen.getByRole('dialog'),
      new Event('cancel', { bubbles: true, cancelable: true }),
    );
    expect(onClose).toHaveBeenCalledTimes(4);

    // A click inside the sheet is not a dismissal.
    onClose.mockClear();
    rerender(<FeedbackDialog onClose={onClose} submit={vi.fn()} />);
    await user.click(screen.getByRole('heading', { level: 2 }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('counts down the characters left in the note', async () => {
    const user = userEvent.setup();
    render(<FeedbackDialog onClose={vi.fn()} submit={vi.fn()} />);

    expect(screen.getByText('4,000 characters left')).toBeInTheDocument();
    await user.type(screen.getByRole('textbox', { name: 'What is on your mind?' }), 'abc');
    expect(screen.getByText('3,997 characters left')).toBeInTheDocument();
  });

  it('opens and closes through the native modal dialog API when available', () => {
    const showModal = vi.fn(function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '');
    });
    const close = vi.fn(function close(this: HTMLDialogElement) {
      this.removeAttribute('open');
    });
    const restore = stubDialogMethods({ showModal, close });

    try {
      const { unmount } = render(<FeedbackDialog onClose={vi.fn()} submit={vi.fn()} />);

      const dialog = screen.getByRole('dialog');
      expect(showModal).toHaveBeenCalledOnce();
      expect(dialog).toHaveAttribute('open');

      unmount();
      expect(close).toHaveBeenCalledOnce();
      expect(dialog).not.toHaveAttribute('open');
    } finally {
      restore();
    }
  });

  it('falls back to a non-modal dialog when showModal is unsupported', () => {
    expect(HTMLDialogElement.prototype.showModal).toBeUndefined();

    const { unmount } = render(<FeedbackDialog onClose={vi.fn()} submit={vi.fn()} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('open');

    unmount();
    expect(dialog).not.toHaveAttribute('open');
  });
});
