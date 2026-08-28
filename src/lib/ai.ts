import { splitGraphemes } from './composer';

export interface ChromeAICapabilities {
  readonly available: boolean;
  readonly status: 'readily' | 'after-download' | 'no' | 'unsupported';
}

export interface PolishMessageOptions {
  readonly signal?: AbortSignal;
  /** Custom language model factory override for testing */
  readonly customLanguageModel?: unknown;
}

/* Chrome Built-in AI global types (Prompt API & Rewriter API) */
interface AILanguageModelSession {
  prompt: (input: string, options?: { signal?: AbortSignal }) => Promise<string>;
  destroy: () => void;
}

export interface AILanguageModelExpectedIO {
  readonly type?: string;
  readonly languages?: readonly string[];
}

export interface AILanguageModelCreateOptions {
  systemPrompt?: string;
  temperature?: number;
  topK?: number;
  signal?: AbortSignal;
  outputLanguage?: string;
  expectedInputs?: readonly AILanguageModelExpectedIO[];
  expectedOutputs?: readonly AILanguageModelExpectedIO[];
}

export interface AILanguageModelAvailabilityOptions {
  outputLanguage?: string;
  expectedInputs?: readonly AILanguageModelExpectedIO[];
  expectedOutputs?: readonly AILanguageModelExpectedIO[];
}

interface AILanguageModelFactory {
  capabilities?: () => Promise<{ available?: string } | null>;
  availability?: (options?: AILanguageModelAvailabilityOptions) => Promise<string | undefined>;
  create?: (options?: AILanguageModelCreateOptions) => Promise<AILanguageModelSession>;
}

interface ChromeAIGlobals {
  ai?: {
    languageModel?: AILanguageModelFactory;
  };
  LanguageModel?: AILanguageModelFactory;
}

const EXTENDED_PICTOGRAPHIC = /\p{Extended_Pictographic}/u;
const REGIONAL_INDICATOR = /\p{Regional_Indicator}/u;
const ICON_TOKEN_REGEX = /:([a-z0-9-]+):/g;

function isEmojiGrapheme(grapheme: string): boolean {
  return (
    EXTENDED_PICTOGRAPHIC.test(grapheme) ||
    REGIONAL_INDICATOR.test(grapheme) ||
    grapheme.includes('\u20e3')
  );
}

export interface ExtractedMessageSymbols {
  readonly emojis: readonly string[];
  readonly iconTokens: readonly string[];
}

export function extractMessageSymbols(value: string): ExtractedMessageSymbols {
  if (!value) {
    return { emojis: [], iconTokens: [] };
  }

  const iconMatches = Array.from(value.matchAll(ICON_TOKEN_REGEX), (m) => m[0]);

  // Strip icon tokens before grapheme splitting to avoid regex overlap
  const textWithoutIcons = value.replace(ICON_TOKEN_REGEX, ' ');
  const graphemes = splitGraphemes(textWithoutIcons);
  const emojis = graphemes.filter(isEmojiGrapheme);

  return {
    emojis,
    iconTokens: iconMatches,
  };
}

/**
 * Ensures that all Unicode emojis and :icon-name: tokens from the original text
 * are preserved in the polished text. If the AI model stripped or omitted any,
 * they are restored so no user-composed emoji or icon is lost.
 */
export function preserveMessageTokens(
  originalText: string,
  polishedText: string,
): string {
  const trimmedPolished = polishedText.trim();
  if (!trimmedPolished) {
    return originalText;
  }

  const originalSymbols = extractMessageSymbols(originalText);
  let result = trimmedPolished;

  // 1. Check icon tokens (:kebab-name:)
  const missingIcons: string[] = [];
  for (const iconToken of originalSymbols.iconTokens) {
    if (!result.includes(iconToken)) {
      missingIcons.push(iconToken);
    }
  }

  // 2. Check Unicode emojis
  const missingEmojis: string[] = [];
  for (const emoji of originalSymbols.emojis) {
    if (!result.includes(emoji)) {
      missingEmojis.push(emoji);
    }
  }

  // If any original symbols were dropped by the model, restore them cleanly
  const missingItems = [...missingIcons, ...missingEmojis];
  if (missingItems.length > 0) {
    const restoreSuffix = missingItems.join(' ');
    result = `${result} ${restoreSuffix}`;
  }

  return result;
}

const META_COMMENTARY_PATTERNS = [
  /^(?:here\s+is|here's|here\s+are)\b/i,
  /^(?:this\s+is|this\s+version|this\s+phrasing|this\s+option|this\s+rewording)\b/i,
  /^(?:note:|explanation:|why\s+this|changes\s+made:|i\s+have|i've|i\s+made)\b/i,
  /^(?:sure,|certainly,|of\s+course,)/i,
];

function isMetaCommentary(paragraph: string): boolean {
  const trimmed = paragraph.trim();
  return META_COMMENTARY_PATTERNS.some((pattern) => pattern.test(trimmed));
}

function stripEnclosingPunctuationAndMarkdown(text: string): string {
  let cleaned = text.trim();
  // Strip codeblocks
  if (cleaned.startsWith('```') && cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
  }

  // Continuously strip enclosing/trailing quotes, asterisks, underscores, backticks, bullets
  let prev = '';
  while (cleaned !== prev && cleaned.length > 0) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/^(?:(?:\d+[.)]|[-*•]|Option\s+\d+:?)\s*)/i, '')
      .replace(/^[*_~`"“'‘\s]+/, '')
      .replace(/[*_~`"”'’\s]+$/, '')
      .trim();
  }
  return cleaned;
}

/**
 * Robustly sanitizes the AI output:
 * 1. Discards explanatory prelude/commentary paragraphs (e.g. "Here is...", "This is concise and friendly...").
 * 2. Strips all wrapping markdown syntax (**, *, _, `) and quotation marks from the beginning and end.
 */
export function sanitizePolishedOutput(rawOutput: string): string {
  if (!rawOutput) {
    return '';
  }

  const rawTrimmed = rawOutput.trim();
  const paragraphs = rawTrimmed
    .split(/\r?\n\s*\r?\n+/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) {
    return '';
  }

  // Find the message paragraph (skipping initial greeting/prelude if followed by the actual message)
  let messageParagraph = paragraphs[0]!;
  if (isMetaCommentary(messageParagraph) && paragraphs.length > 1) {
    messageParagraph = paragraphs[1]!;
  }

  // If the chosen paragraph has subsequent single-line commentary, discard trailing commentary lines
  const lines = messageParagraph.split(/\r?\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
  const cleanLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (i > 0 && isMetaCommentary(line)) {
      break;
    }
    cleanLines.push(line);
  }

  const combined = cleanLines.join('\n');
  return stripEnclosingPunctuationAndMarkdown(combined);
}

function getLanguageModelFactory(
  override?: unknown,
): AILanguageModelFactory | null {
  if (override && typeof override === 'object') {
    return override as AILanguageModelFactory;
  }

  const globalScope = globalThis as unknown as ChromeAIGlobals;
  if (globalScope.ai?.languageModel) {
    return globalScope.ai.languageModel;
  }
  if (globalScope.LanguageModel) {
    return globalScope.LanguageModel;
  }

  return null;
}

export async function checkChromeAIAvailability(
  customLanguageModel?: unknown,
): Promise<ChromeAICapabilities> {
  const factory = getLanguageModelFactory(customLanguageModel);
  if (!factory) {
    return { available: false, status: 'unsupported' };
  }

  try {
    if (typeof factory.availability === 'function') {
      let status: string | undefined;
      try {
        status = await factory.availability({
          outputLanguage: 'en',
          expectedInputs: [{ type: 'text', languages: ['en'] }],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        });
      } catch {
        status = await factory.availability();
      }
      const isAvail = status === 'readily' || status === 'available' || status === 'after-download';
      return {
        available: isAvail,
        status: (status as ChromeAICapabilities['status']) ?? 'unsupported',
      };
    }

    if (typeof factory.capabilities === 'function') {
      const caps = await factory.capabilities();
      const status = caps?.available ?? 'no';
      const isAvail = status === 'readily' || status === 'after-download';
      return {
        available: isAvail,
        status: (status as ChromeAICapabilities['status']) ?? 'unsupported',
      };
    }

    // If create function exists without explicit availability check
    if (typeof factory.create === 'function') {
      return { available: true, status: 'readily' };
    }

    return { available: false, status: 'unsupported' };
  } catch {
    return { available: false, status: 'unsupported' };
  }
}

function buildSingleRewordingSystemPrompt(symbols: ExtractedMessageSymbols): string {
  const symbolContext = [];
  if (symbols.iconTokens.length > 0) {
    symbolContext.push(`icon tokens (${symbols.iconTokens.join(', ')})`);
  }
  if (symbols.emojis.length > 0) {
    symbolContext.push(`emojis (${symbols.emojis.join(' ')})`);
  }

  return [
    'You are an expert on-device text editor and rephraser.',
    'Your goal is to provide EXACTLY ONE polished, refined, and improved rewording of the user\'s message while matching its natural tone, voice, and intent.',
    'STRICT FORMATTING & OUTPUT RULES:',
    '1. Generate ONLY the raw message text. NEVER wrap in quotation marks ("..."), asterisks (*...*), or markdown bold (**...**).',
    '2. NEVER include commentary, explanations, or descriptions (e.g. do NOT say "This is concise and friendly" or "Here is the revised version").',
    '3. STRICT SYMBOL PRESERVATION: The input text contains emojis and/or icon tokens in the format `:icon-name:`. You MUST retain all existing emojis and `:icon-name:` tokens without deleting, modifying, translating, or mangling them.',
    symbolContext.length > 0
      ? `4. The input specifically includes: ${symbolContext.join(' and ')}. Keep all of them naturally integrated in the rewording.`
      : '4. Keep any emojis and icons integrated in the rewording.',
    '5. You may naturally complement with fitting emojis matching the sentiment if helpful, but never remove existing ones.',
    '6. Output ONLY the polished message text directly with no surrounding punctuation or markdown.',
  ].join('\n');
}

export async function polishMessageWithAI(
  text: string,
  options: PolishMessageOptions = {},
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }

  const symbols = extractMessageSymbols(text);
  const factory = getLanguageModelFactory(options.customLanguageModel);

  if (!factory || typeof factory.create !== 'function') {
    throw new Error('Chrome Built-in AI is not available in this browser environment.');
  }

  const systemPrompt = buildSingleRewordingSystemPrompt(symbols);

  let session: AILanguageModelSession | null = null;
  try {
    session = await factory.create({
      systemPrompt,
      temperature: 0.6,
      topK: 3,
      signal: options.signal,
      outputLanguage: 'en',
      expectedInputs: [{ type: 'text', languages: ['en'] }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }],
    });

    const promptText = `Please provide a single polished rewording for the following message:\n\n${text}`;
    const rawOutput = await session.prompt(promptText, {
      signal: options.signal,
    });

    const sanitized = sanitizePolishedOutput(rawOutput);
    return preserveMessageTokens(text, sanitized);
  } finally {
    if (session && typeof session.destroy === 'function') {
      try {
        session.destroy();
      } catch {
        // Ignore destruction errors
      }
    }
  }
}
