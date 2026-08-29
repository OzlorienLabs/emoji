import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import * as aiModule from '../lib/ai';
import { useChromeAI } from './useChromeAI';

describe('useChromeAI hook', () => {
  it('detects AI availability as false when factory is missing', async () => {
    const { result } = renderHook(() => useChromeAI({ customLanguageModel: null }));

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.isAvailable).toBe(false);
    expect(result.current.isPolishing).toBe(false);
  });

  it('detects AI availability as true when factory is available', async () => {
    const mockFactory = {
      availability: vi.fn().mockResolvedValue('readily'),
    };

    const { result } = renderHook(() =>
      useChromeAI({ customLanguageModel: mockFactory }),
    );

    await waitFor(() => {
      expect(result.current.isChecking).toBe(false);
    });

    expect(result.current.isAvailable).toBe(true);
  });

  it('returns null immediately when polishing empty or whitespace text', async () => {
    const { result } = renderHook(() => useChromeAI());
    let res: string | null = 'not null';
    await act(async () => {
      res = await result.current.polish('   ');
    });
    expect(res).toBeNull();
  });

  it('executes polish successfully and calls onSuccess', async () => {
    const destroy = vi.fn();
    const prompt = vi.fn().mockResolvedValue('Polished text! ✨');
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    const mockFactory = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };
    const onSuccess = vi.fn();

    const { result } = renderHook(() =>
      useChromeAI({
        customLanguageModel: mockFactory,
        onSuccess,
      }),
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let polishedResult: string | null = null;
    await act(async () => {
      polishedResult = await result.current.polish('raw text ✨');
    });

    expect(polishedResult).toBe('Polished text! ✨');
    expect(onSuccess).toHaveBeenCalledWith('Polished text! ✨');
    expect(result.current.isPolishing).toBe(false);
  });

  it('returns null if aborted during async polish resolution', async () => {
    const destroy = vi.fn();
    let triggerResolve!: (val: string) => void;
    const promptPromise = new Promise<string>((res) => {
      triggerResolve = res;
    });
    const prompt = vi.fn().mockImplementation(() => promptPromise);
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    const mockFactory = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };

    const { result } = renderHook(() =>
      useChromeAI({ customLanguageModel: mockFactory }),
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let polishPromise!: Promise<string | null>;
    act(() => {
      polishPromise = result.current.polish('message text');
    });

    expect(result.current.isPolishing).toBe(true);

    act(() => {
      result.current.cancel();
    });

    expect(result.current.isPolishing).toBe(false);

    triggerResolve('late resolution');
    const output = await polishPromise;
    expect(output).toBeNull();
  });

  it('handles error during polish and calls onError with Error instance', async () => {
    const destroy = vi.fn();
    const prompt = vi.fn().mockRejectedValue(new Error('Quota limit reached'));
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    const mockFactory = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useChromeAI({
        customLanguageModel: mockFactory,
        onError,
      }),
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let polishedResult: string | null = null;
    await act(async () => {
      polishedResult = await result.current.polish('raw text');
    });

    expect(polishedResult).toBeNull();
    expect(result.current.error).toBe('Quota limit reached');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    expect(result.current.isPolishing).toBe(false);
  });

  it('handles non-Error exception during polish', async () => {
    const mockFactory = {
      availability: vi.fn().mockResolvedValue('readily'),
    };
    const onError = vi.fn();
    const polishSpy = vi.spyOn(aiModule, 'polishMessageWithAI').mockRejectedValueOnce('raw string rejection');

    const { result } = renderHook(() =>
      useChromeAI({
        customLanguageModel: mockFactory,
        onError,
      }),
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let polishedResult: string | null = null;
    await act(async () => {
      polishedResult = await result.current.polish('raw text');
    });

    expect(polishedResult).toBeNull();
    expect(result.current.error).toBe('Failed to polish message with AI');
    expect(onError).toHaveBeenCalledWith(expect.any(Error));
    polishSpy.mockRestore();
  });

  it('cancels ongoing polish request on unmount', async () => {
    const destroy = vi.fn();
    let triggerResolve!: (val: string) => void;
    const promptPromise = new Promise<string>((res) => {
      triggerResolve = res;
    });
    const prompt = vi.fn().mockImplementation(() => promptPromise);
    const create = vi.fn().mockResolvedValue({ prompt, destroy });
    const mockFactory = {
      availability: vi.fn().mockResolvedValue('readily'),
      create,
    };

    const { result, unmount } = renderHook(() =>
      useChromeAI({ customLanguageModel: mockFactory }),
    );

    await waitFor(() => {
      expect(result.current.isAvailable).toBe(true);
    });

    let polishPromise!: Promise<string | null>;
    act(() => {
      polishPromise = result.current.polish('text before unmount');
    });

    expect(result.current.isPolishing).toBe(true);

    unmount();

    triggerResolve('output');
    const output = await polishPromise;
    expect(output).toBeNull();
  });
});
