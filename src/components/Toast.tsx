export interface ToastProps {
  message: string;
  kind?: 'success' | 'error';
}

/**
 * The transient confirmation that sits directly above the composer dock.
 *
 * It is deliberately `aria-hidden`: every message it shows is also written to
 * the app shell's live region, and announcing the same string twice is worse
 * than not announcing the visual copy at all.
 */
export function Toast({ message, kind = 'success' }: ToastProps) {
  return (
    <div className="toast" data-kind={kind} data-testid="toast" aria-hidden="true">
      <span>{kind === 'error' ? '⚠' : '✓'}</span>
      <span>{message}</span>
    </div>
  );
}
