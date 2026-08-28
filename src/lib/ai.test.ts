import { describe, expect, it, vi } from 'vitest';
import {
  checkChromeAIAvailability,
  extractMessageSymbols,
  polishMessageWithAI,
  preserveMessageTokens,
  sanitizePolishedOutput,
} from './ai';

describe('ai library', () => {
  describe('extractMessageSymbols', () => {
    it('returns empty lists for empty text or plain text without emojis or icons', () => {
      expect(extractMessageSymbols('')).toEqual({ emojis: [], iconTokens: [] });
      expect(extractMessageSymbols('Hello world')).toEqual({ emojis: [], iconTokens: [] });
    });

    it('extracts Unicode emojis including complex graphemes and skin tones', () => {
      const symbols = extractMessageSymbols('Great job! 👍🏽 🚀 👨‍👩‍👧‍👦 ✨');
      expect(symbols.iconTokens).toEqual([]);
      expect(symbols.emojis).toContain('👍🏽');
      expect(symbols.emojis).toContain('🚀');
      expect(symbols.emojis).toContain('✨');
    });

    it('extracts icon tokens in :kebab-name: format', () => {
      const symbols = extractMessageSymbols('Check :arrow-right: and :folder-git-2: now');
      expect(symbols.emojis).toEqual([]);
      expect(symbols.iconTokens).toEqual([':arrow-right:', ':folder-git-2:']);
    });

    it('extracts mixed emojis and icon tokens', () => {
      const symbols = extractMessageSymbols('Launch :rocket: version 2.0 🚀 with :heart: ❤️');
      expect(symbols.iconTokens).toEqual([':rocket:', ':heart:']);
      expect(symbols.emojis).toContain('🚀');
      expect(symbols.emojis).toContain('❤️');
    });
  });

  describe('preserveMessageTokens', () => {
    it('returns original text if polished output is empty or whitespace', () => {
      expect(preserveMessageTokens('Original text 🚀', '')).toBe('Original text 🚀');
      expect(preserveMessageTokens('Original text 🚀', '   ')).toBe('Original text 🚀');
    });

    it('returns polished text unchanged if all emojis and icon tokens are preserved', () => {
      const original = 'Hey team :rocket: we shipped 🚀 let\'s party 🎉';
      const polished = 'Hello team! :rocket: We have successfully shipped 🚀 Let us celebrate! 🎉';
      expect(preserveMessageTokens(original, polished)).toBe(polished);
    });

    it('restores missing icon tokens if the AI model omitted them', () => {
      const original = 'Please check :arrow-right: the docs';
      const polished = 'Please review the documentation.';
      const restored = preserveMessageTokens(original, polished);
      expect(restored).toBe('Please review the documentation. :arrow-right:');
    });

    it('restores missing Unicode emojis if the AI model omitted them', () => {
      const original = 'Great job team 🥳 🚀';
      const polished = 'Fantastic work, team!';
      const restored = preserveMessageTokens(original, polished);
      expect(restored).toContain('🥳');
      expect(restored).toContain('🚀');
    });

    it('restores both missing emojis and missing icon tokens without duplicates', () => {
      const original = 'Status update :sparkles: done 👍🏼 :check:';
      const polished = 'The status update is complete with :sparkles:';
      const restored = preserveMessageTokens(original, polished);
      expect(restored).toContain(':sparkles:');
      expect(restored).toContain(':check:');
      expect(restored).toContain('👍🏼');
    });
  });

  describe('sanitizePolishedOutput', () => {
    it('returns empty string for empty or whitespace input', () => {
      expect(sanitizePolishedOutput('')).toBe('');
      expect(sanitizePolishedOutput('   ')).toBe('');
    });

    it('strips asterisks, quotes, and removes commentary paragraphs (user exact example)', () => {
      const raw = `* "Would you be free for coffee tomorrow to discuss the AI paper?"** 

This is concise, friendly, and directly to the point. It's also a slightly more natural phrasing.`;

      const result = sanitizePolishedOutput(raw);
      expect(result).toBe('Would you be free for coffee tomorrow to discuss the AI paper?');
    });

    it('strips markdown bold, italics, backticks, and smart quotes', () => {
      expect(sanitizePolishedOutput('**"Polished text"**')).toBe('Polished text');
      expect(sanitizePolishedOutput('“*Polished italic with smart quotes*”')).toBe(
        'Polished italic with smart quotes',
      );
      expect(sanitizePolishedOutput('```markdown\n`Polished inline code`\n```')).toBe(
        'Polished inline code',
      );
    });

    it('strips leading prelude paragraphs and trailing explanation notes', () => {
      const raw = `Here is your polished message:

Would you like to meet tomorrow at 10 AM? 🚀

Note: I made the sentence clearer and kept the rocket emoji.`;

      expect(sanitizePolishedOutput(raw)).toBe(
        'Would you like to meet tomorrow at 10 AM? 🚀',
      );
    });

    it('strips inline trailing commentary on subsequent lines', () => {
      const raw = `Would you like coffee tomorrow? ☕
This phrasing is direct and polite.`;

      expect(sanitizePolishedOutput(raw)).toBe('Would you like coffee tomorrow? ☕');
    });
  });

  describe('checkChromeAIAvailability', () => {
    it('returns unsupported when no Chrome AI factory exists', async () => {
      const result = await checkChromeAIAvailability(null);
      expect(result).toEqual({ available: false, status: 'unsupported' });
    });

    it('detects availability via globalThis.ai.languageModel or globalThis.LanguageModel', async () => {
      const originalAi = (globalThis as { ai?: unknown }).ai;
      const originalLanguageModel = (globalThis as { LanguageModel?: unknown }).LanguageModel;

      try {
        (globalThis as { ai?: unknown }).ai = {
          languageModel: {
            availability: vi.fn().mockResolvedValue('readily'),
          },
        };
        const resultGlobalAi = await checkChromeAIAvailability();
        expect(resultGlobalAi).toEqual({ available: true, status: 'readily' });

        delete (globalThis as { ai?: unknown }).ai;
        (globalThis as { LanguageModel?: unknown }).LanguageModel = {
          capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
        };
        const resultGlobalLM = await checkChromeAIAvailability();
        expect(resultGlobalLM).toEqual({ available: true, status: 'readily' });
      } finally {
        (globalThis as { ai?: unknown }).ai = originalAi;
        (globalThis as { LanguageModel?: unknown }).LanguageModel = originalLanguageModel;
      }
    });

    it('detects availability via availability() method including falsy/fallback status', async () => {
      const mockFactory = {
        availability: vi.fn().mockResolvedValue('readily'),
      };
      const result = await checkChromeAIAvailability(mockFactory);
      expect(result).toEqual({ available: true, status: 'readily' });

      const mockAfterDownload = {
        availability: vi.fn().mockResolvedValue('after-download'),
      };
      const resultDownload = await checkChromeAIAvailability(mockAfterDownload);
      expect(resultDownload).toEqual({ available: true, status: 'after-download' });

      const mockUnavailable = {
        availability: vi.fn().mockResolvedValue('no'),
      };
      const resultNo = await checkChromeAIAvailability(mockUnavailable);
      expect(resultNo).toEqual({ available: false, status: 'no' });

      const mockFalsy = {
        availability: vi.fn().mockResolvedValue(undefined),
      };
      const resultFalsy = await checkChromeAIAvailability(mockFalsy);
      expect(resultFalsy).toEqual({ available: false, status: 'unsupported' });
    });

    it('detects availability via capabilities() method including null or missing available field', async () => {
      const mockFactory = {
        capabilities: vi.fn().mockResolvedValue({ available: 'readily' }),
      };
      const result = await checkChromeAIAvailability(mockFactory);
      expect(result).toEqual({ available: true, status: 'readily' });

      const mockNullCaps = {
        capabilities: vi.fn().mockResolvedValue(null),
      };
      const resultNull = await checkChromeAIAvailability(mockNullCaps);
      expect(resultNull).toEqual({ available: false, status: 'no' });
    });

    it('falls back to readily when factory only has create() method', async () => {
      const mockFactory = {
        create: vi.fn(),
      };
      const result = await checkChromeAIAvailability(mockFactory);
      expect(result).toEqual({ available: true, status: 'readily' });

      const emptyFactory = {};
      const resultEmpty = await checkChromeAIAvailability(emptyFactory);
      expect(resultEmpty).toEqual({ available: false, status: 'unsupported' });
    });

    it('handles exceptions gracefully and returns unsupported', async () => {
      const mockFactory = {
        availability: vi.fn().mockRejectedValue(new Error('GPU disabled')),
      };
      const result = await checkChromeAIAvailability(mockFactory);
      expect(result).toEqual({ available: false, status: 'unsupported' });
    });

    it('passes outputLanguage and expectedInputs/expectedOutputs to availability()', async () => {
      const availability = vi.fn().mockResolvedValue('readily');
      await checkChromeAIAvailability({ availability });
      expect(availability).toHaveBeenCalledWith({
        outputLanguage: 'en',
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
      });
    });

    it('falls back to availability() without options if call with options throws', async () => {
      const availability = vi
        .fn()
        .mockRejectedValueOnce(new Error('unsupported option'))
        .mockResolvedValueOnce('available');
      const result = await checkChromeAIAvailability({ availability });
      expect(result).toEqual({ available: true, status: 'available' });
      expect(availability).toHaveBeenCalledTimes(2);
    });
  });

  describe('polishMessageWithAI', () => {
    it('returns empty text as-is without invoking model', async () => {
      const result = await polishMessageWithAI('   ');
      expect(result).toBe('   ');
    });

    it('throws an error if Chrome AI is not available', async () => {
      await expect(
        polishMessageWithAI('Hello world', { customLanguageModel: null }),
      ).rejects.toThrow('Chrome Built-in AI is not available');
    });

    it('creates a session, prompts the model for single rewording, and destroys the session on success', async () => {
      const destroy = vi.fn();
      const prompt = vi.fn().mockResolvedValue('Hello world! 🚀');
      const create = vi.fn().mockResolvedValue({ prompt, destroy });
      const customLanguageModel = { create };

      const result = await polishMessageWithAI('hi world 🚀', {
        customLanguageModel,
      });

      expect(create).toHaveBeenCalledOnce();
      expect(create.mock.calls[0]![0]!.outputLanguage).toBe('en');
      expect(create.mock.calls[0]![0]!.expectedOutputs).toEqual([{ type: 'text', languages: ['en'] }]);
      expect(create.mock.calls[0]![0]!.expectedInputs).toEqual([{ type: 'text', languages: ['en'] }]);
      expect(create.mock.calls[0]![0]!.systemPrompt).toContain('You are an expert on-device text editor');
      expect(create.mock.calls[0]![0]!.systemPrompt).toContain('EXACTLY ONE polished');
      expect(create.mock.calls[0]![0]!.systemPrompt).toContain('STRICT SYMBOL PRESERVATION');
      expect(prompt).toHaveBeenCalledWith(expect.stringContaining('hi world 🚀'), expect.anything());
      expect(destroy).toHaveBeenCalledOnce();
      expect(result).toBe('Hello world! 🚀');
    });

    it('handles message with text only and cleans quotes/backticks/commentary', async () => {
      const destroy = vi.fn();
      const prompt = vi.fn().mockResolvedValue(
        `**"Would you be free for coffee tomorrow to discuss the AI paper?"** 

This is concise, friendly, and directly to the point. It's also a slightly more natural phrasing.`,
      );
      const create = vi.fn().mockResolvedValue({ prompt, destroy });

      const result = await polishMessageWithAI('free for coffee tomorrow to discuss ai paper?', {
        customLanguageModel: { create },
      });

      expect(result).toBe('Would you be free for coffee tomorrow to discuss the AI paper?');
    });

    it('handles session destroy exceptions gracefully', async () => {
      const destroy = vi.fn();
      const prompt = vi.fn().mockImplementation(() => {
        throw new Error('Prompt error');
      });
      const create = vi.fn().mockResolvedValue({ prompt, destroy });

      await expect(
        polishMessageWithAI('Hello', {
          customLanguageModel: { create },
        }),
      ).rejects.toThrow('Prompt error');

      expect(destroy).toHaveBeenCalledOnce();
    });

    it('handles destroy exception without crashing', async () => {
      const destroy = vi.fn().mockImplementation(() => {
        throw new Error('Destroy failed');
      });
      const prompt = vi.fn().mockResolvedValue('Polished output');
      const create = vi.fn().mockResolvedValue({ prompt, destroy });

      const result = await polishMessageWithAI('Hello', {
        customLanguageModel: { create },
      });

      expect(result).toBe('Polished output');
      expect(destroy).toHaveBeenCalledOnce();
    });
  });
});
