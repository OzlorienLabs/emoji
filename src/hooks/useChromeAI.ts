import { useCallback, useEffect, useRef, useState } from 'react';
import {
  checkChromeAIAvailability,
  polishMessageWithAI,
  type ChromeAICapabilities,
} from '../lib/ai';

export interface UseChromeAIOptions {
  customLanguageModel?: unknown;
  onSuccess?: (result: string) => void;
  onError?: (error: Error) => void;
}

export interface UseChromeAIReturn {
  isAvailable: boolean;
  isChecking: boolean;
  isPolishing: boolean;
  error: string | null;
  polish: (text: string) => Promise<string | null>;
  cancel: () => void;
}

export function useChromeAI(options: UseChromeAIOptions = {}): UseChromeAIReturn {
  const { customLanguageModel, onSuccess, onError } = options;
  const [capabilities, setCapabilities] = useState<ChromeAICapabilities>({
    available: false,
    status: 'unsupported',
  });
  const [isChecking, setIsChecking] = useState(true);
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;

    void checkChromeAIAvailability(customLanguageModel).then((caps) => {
      if (active) {
        setCapabilities(caps);
        setIsChecking(false);
      }
    });

    return () => {
      active = false;
    };
  }, [customLanguageModel]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsPolishing(false);
  }, []);

  const polish = useCallback(
    async (text: string): Promise<string | null> => {
      if (!text.trim()) {
        return null;
      }

      cancel();

      const controller = new AbortController();
      abortControllerRef.current = controller;
      setIsPolishing(true);
      setError(null);

      try {
        const result = await polishMessageWithAI(text, {
          signal: controller.signal,
          customLanguageModel,
        });

        if (!controller.signal.aborted) {
          setIsPolishing(false);
          abortControllerRef.current = null;
          onSuccess?.(result);
          return result;
        }
        return null;
      } catch (err) {
        if (!controller.signal.aborted) {
          const errMessage =
            err instanceof Error ? err.message : 'Failed to polish message with AI';
          setError(errMessage);
          setIsPolishing(false);
          abortControllerRef.current = null;
          onError?.(err instanceof Error ? err : new Error(errMessage));
        }
        return null;
      }
    },
    [cancel, customLanguageModel, onError, onSuccess],
  );

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isAvailable: capabilities.available,
    isChecking,
    isPolishing,
    error,
    polish,
    cancel,
  };
}
