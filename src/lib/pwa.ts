/**
 * Service worker registration.
 *
 * Offline support is a progressive enhancement: a browser without service
 * workers, or a registration that fails, must leave the app fully usable. The
 * container is injected so the behaviour can be tested without a real worker.
 */

export interface RegisterServiceWorkerOptions {
  /** Defaults to `navigator.serviceWorker` when the browser supports it. */
  container?: ServiceWorkerContainer | undefined;
  /** Set false to skip registration entirely, as the dev server does. */
  enabled?: boolean;
  scriptUrl?: string;
  scope?: string;
}

export type ServiceWorkerOutcome =
  | { status: 'registered'; registration: ServiceWorkerRegistration }
  | { status: 'unsupported' }
  | { status: 'disabled' }
  | { status: 'failed'; reason: string };

function defaultContainer(): ServiceWorkerContainer | undefined {
  return typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
}

export async function registerServiceWorker(
  options: RegisterServiceWorkerOptions = {},
): Promise<ServiceWorkerOutcome> {
  const {
    container = defaultContainer(),
    enabled = true,
    scriptUrl = '/sw.js',
    scope = '/',
  } = options;

  if (!enabled) return { status: 'disabled' };
  if (!container || typeof container.register !== 'function') {
    return { status: 'unsupported' };
  }

  try {
    const registration = await container.register(scriptUrl, { scope });
    return { status: 'registered', registration };
  } catch (error) {
    return {
      status: 'failed',
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
