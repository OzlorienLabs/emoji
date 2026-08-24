import { describe, expect, it, vi } from 'vitest';
import { registerServiceWorker } from './pwa';

function containerWith(register: ServiceWorkerContainer['register']) {
  return { register } as unknown as ServiceWorkerContainer;
}

describe('registerServiceWorker', () => {
  it('registers the worker at the root scope', async () => {
    const registration = {} as ServiceWorkerRegistration;
    const register = vi.fn().mockResolvedValue(registration);

    const outcome = await registerServiceWorker({ container: containerWith(register) });

    expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
    expect(outcome).toEqual({ status: 'registered', registration });
  });

  it('honours an explicit script url and scope', async () => {
    const register = vi.fn().mockResolvedValue({} as ServiceWorkerRegistration);

    await registerServiceWorker({
      container: containerWith(register),
      scriptUrl: '/worker.js',
      scope: '/app/',
    });

    expect(register).toHaveBeenCalledWith('/worker.js', { scope: '/app/' });
  });

  it('skips registration when disabled, as it is on the dev server', async () => {
    const register = vi.fn();

    const outcome = await registerServiceWorker({
      container: containerWith(register),
      enabled: false,
    });

    expect(register).not.toHaveBeenCalled();
    expect(outcome).toEqual({ status: 'disabled' });
  });

  it('reports an unsupported browser instead of throwing', async () => {
    expect(await registerServiceWorker({ container: undefined })).toEqual({
      status: 'unsupported',
    });
    expect(
      await registerServiceWorker({ container: {} as ServiceWorkerContainer }),
    ).toEqual({ status: 'unsupported' });
  });

  it('degrades to a failure outcome when registration is rejected', async () => {
    const outcome = await registerServiceWorker({
      container: containerWith(vi.fn().mockRejectedValue(new Error('insecure origin'))),
    });

    expect(outcome).toEqual({ status: 'failed', reason: 'insecure origin' });
  });

  it('describes a non-Error rejection', async () => {
    const outcome = await registerServiceWorker({
      container: containerWith(vi.fn().mockRejectedValue('blocked')),
    });

    expect(outcome).toEqual({ status: 'failed', reason: 'blocked' });
  });

  it('falls back to navigator.serviceWorker when no container is given', async () => {
    // jsdom's navigator has no serviceWorker property at all, so it is defined
    // here rather than spied on, then removed again.
    const register = vi.fn().mockResolvedValue({} as ServiceWorkerRegistration);
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      get: () => containerWith(register),
    });

    try {
      const outcome = await registerServiceWorker();

      expect(register).toHaveBeenCalledWith('/sw.js', { scope: '/' });
      expect(outcome).toMatchObject({ status: 'registered' });
    } finally {
      Reflect.deleteProperty(navigator, 'serviceWorker');
    }
  });

  it('reports unsupported when the browser lacks navigator.serviceWorker', async () => {
    expect(await registerServiceWorker()).toEqual({ status: 'unsupported' });
  });
});
