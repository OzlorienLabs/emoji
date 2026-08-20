import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CategoryNav, type CategoryId, type CategoryOption } from './components/CategoryNav';
import { ComposerDock } from './components/ComposerDock';
import { EmojiDetailsDialog } from './components/EmojiDetailsDialog';
import { EmojiGrid, type EmojiGridItem } from './components/EmojiGrid';
import { PreferencePanel } from './components/PreferencePanel';
import { SearchBar } from './components/SearchBar';
import { flattenCatalog } from './data/catalog';
import type { EmojiCatalog, EmojiFamily, EmojiVariant } from './data/catalog-types';
import { useEmojiCatalog } from './hooks/useEmojiCatalog';
import { useEmojiPreferences } from './hooks/useEmojiPreferences';
import { copyText, type ClipboardResult, type CopyTextOptions } from './lib/clipboard';
import {
  clearComposer,
  commitComposerValue,
  createComposerHistory,
  insertAtSelection,
  undoComposer,
} from './lib/composer';
import type { EmojiPreferences, StorageLike } from './lib/preferences';
import { createSearchIndex, searchEmojis } from './lib/search';

type CopyFunction = (text: string, options?: CopyTextOptions) => Promise<ClipboardResult>;
type ActiveCategory = number | 'favorites' | 'recent' | null;

interface AppProps {
  initialCatalog?: EmojiCatalog;
  initialPreferences?: EmojiPreferences;
  fetcher?: typeof fetch;
  storage?: StorageLike | null;
  copy?: CopyFunction;
}

interface EmojiExperienceProps extends Omit<AppProps, 'initialCatalog' | 'fetcher'> {
  catalog: EmojiCatalog;
}

const GROUP_ICONS: Readonly<Record<string, string>> = {
  'smileys-emotion': '😀',
  'people-body': '👋',
  component: '🏻',
  'animals-nature': '🌿',
  'food-drink': '🍓',
  'travel-places': '🚀',
  activities: '⚽',
  objects: '💡',
  symbols: '❤️',
  flags: '🏳️',
};

const SEARCH_SUGGESTIONS = ['celebration', 'love', 'work computer', 'happy dance'];

function readInitialUrl(catalog: EmojiCatalog): { query: string; category: ActiveCategory } {
  const parameters = new URLSearchParams(window.location.search);
  const query = parameters.get('q')?.slice(0, 120) ?? '';
  const groupParameter = parameters.get('group');
  const requestedGroup = groupParameter === null ? Number.NaN : Number(groupParameter);
  const category = Number.isInteger(requestedGroup) &&
    catalog.groups.some(({ id }) => id === requestedGroup)
    ? requestedGroup
    : null;
  return { query, category };
}

function familyIdFor(item: EmojiGridItem): string {
  return 'familyId' in item ? item.familyId : item.id;
}

function categoryTitle(category: ActiveCategory, catalog: EmojiCatalog): string {
  if (category === 'favorites') return 'Your favorites';
  if (category === 'recent') return 'Recently used';
  if (typeof category === 'number') {
    return catalog.groups.find(({ id }) => id === category)?.label ?? 'Emoji';
  }
  return 'All emoji';
}

function LoadingView() {
  return (
    <main className="state-page" aria-busy="true">
      <span className="brand-mark" aria-hidden="true">🧭</span>
      <h1>Emoji Compass</h1>
      <p>Loading every emoji…</p>
      <div className="loading-stripes" aria-hidden="true" />
    </main>
  );
}

function ErrorView({ message, retry }: { message: string; retry: () => void }) {
  return (
    <main className="state-page">
      <span className="brand-mark" aria-hidden="true">🧭</span>
      <h1>We lost the trail</h1>
      <p role="alert">{message}</p>
      <button type="button" className="button button-primary" onClick={retry}>
        Try loading again
      </button>
    </main>
  );
}

function CatalogBoundary(props: Omit<AppProps, 'initialCatalog'>) {
  const state = useEmojiCatalog(props.fetcher ?? globalThis.fetch);
  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView message={state.message} retry={state.retry} />;
  return <EmojiExperience {...props} catalog={state.catalog} />;
}

function EmojiExperience({
  catalog,
  initialPreferences,
  storage,
  copy = copyText,
}: EmojiExperienceProps) {
  const initialUrl = useMemo(() => readInitialUrl(catalog), [catalog]);
  const [query, setQuery] = useState(initialUrl.query);
  const deferredQuery = useDeferredValue(query);
  const [category, setCategory] = useState<ActiveCategory>(initialUrl.category);
  const [composer, setComposer] = useState(() => createComposerHistory());
  const [detailsFamily, setDetailsFamily] = useState<EmojiFamily | null>(null);
  const [copyStatus, setCopyStatus] = useState<{ kind: 'success' | 'error'; message: string }>();
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const detailsTriggerRef = useRef<HTMLElement | null>(null);
  const manualCleanup = useRef<(() => void) | undefined>(undefined);
  const preferenceController = useEmojiPreferences({ initial: initialPreferences, storage });
  const { preferences } = preferenceController;

  const records = useMemo(() => flattenCatalog(catalog), [catalog]);
  const searchIndex = useMemo(() => createSearchIndex(records), [records]);
  const familyById = useMemo(
    () => new Map(catalog.emojis.map((family) => [family.id, family])),
    [catalog],
  );
  const groupById = useMemo(
    () => new Map(catalog.groups.map((group) => [group.id, group.label])),
    [catalog],
  );
  const subgroupById = useMemo(
    () => new Map(catalog.subgroups.map((subgroup) => [subgroup.id, subgroup.label])),
    [catalog],
  );

  const resultItems = useMemo<readonly EmojiGridItem[]>(() => {
    let items: readonly EmojiGridItem[];
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery) {
      items = searchEmojis(searchIndex, normalizedQuery, {
        group: typeof category === 'number' ? category : undefined,
      }).map(({ emoji }) => {
        const family = familyById.get(emoji.familyId);
        return family && emoji.id === family.id ? family : emoji;
      });
    } else if (category === 'favorites' || category === 'recent') {
      const ids = category === 'favorites' ? preferences.favoriteIds : preferences.recentIds;
      items = ids.flatMap((id) => {
        const family = familyById.get(id);
        return family ? [family] : [];
      });
    } else {
      items = typeof category === 'number'
        ? catalog.emojis.filter((family) => family.group === category)
        : catalog.emojis;
    }

    if (normalizedQuery && (category === 'favorites' || category === 'recent')) {
      const allowed = new Set(
        category === 'favorites' ? preferences.favoriteIds : preferences.recentIds,
      );
      return items.filter((item) => allowed.has(familyIdFor(item)));
    }
    return items;
  }, [
    catalog.emojis,
    category,
    deferredQuery,
    familyById,
    preferences.favoriteIds,
    preferences.recentIds,
    searchIndex,
  ]);

  const categories = useMemo<readonly CategoryOption[]>(() => [
    { id: 'favorites', label: 'Favorites', icon: '★' },
    { id: 'recent', label: 'Recently used', icon: '↺' },
    ...catalog.groups.map((group) => ({
      id: group.id,
      label: group.label,
      icon: GROUP_ICONS[group.key] ?? '•',
    })),
  ], [catalog.groups]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    if (typeof category === 'number') url.searchParams.set('group', String(category));
    else url.searchParams.delete('group');
    window.history.replaceState(window.history.state, '', url);
  }, [category, query]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target instanceof Element &&
        target.matches('input, textarea, [contenteditable="true"]');
      if (event.key === '/' && !isEditable) {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === 'Escape' && query) {
        setQuery('');
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [query]);

  useEffect(() => () => manualCleanup.current?.(), []);

  const finishCopy = (result: ClipboardResult, successMessage: string) => {
    manualCleanup.current?.();
    if (result.status === 'copied') {
      manualCleanup.current = undefined;
      setCopyStatus({ kind: 'success', message: successMessage });
    } else {
      manualCleanup.current = result.selection?.cleanup;
      setCopyStatus({ kind: 'error', message: result.message });
    }
  };

  const selectEmoji = async (emoji: EmojiVariant, source: EmojiGridItem) => {
    const familyId = familyIdFor(source);
    preferenceController.remember(familyId);

    if (preferences.quickCopy) {
      finishCopy(await copy(emoji.glyph), `${emoji.name} copied`);
      return;
    }

    const edit = insertAtSelection(
      composer.value,
      emoji.glyph,
      composerRef.current?.selectionStart,
      composerRef.current?.selectionEnd,
    );
    setComposer((current) => commitComposerValue(current, edit.value));
    setCopyStatus({ kind: 'success', message: `${emoji.name} added to your message` });
    queueMicrotask(() => {
      composerRef.current?.focus();
      composerRef.current?.setSelectionRange(edit.selectionStart, edit.selectionEnd);
    });
  };

  const copyComposition = async () => {
    const result = await copy(composer.value, { selectionTarget: composerRef.current });
    finishCopy(result, 'Message copied');
  };

  const detailsGroup = detailsFamily ? groupById.get(detailsFamily.group) ?? 'Other' : '';
  const detailsSubgroup = detailsFamily
    ? subgroupById.get(detailsFamily.subgroup) ?? 'Other'
    : '';
  const relatedFamilies = useMemo(() => {
    if (!detailsFamily) return [];
    return catalog.emojis
      .filter((family) => family.id !== detailsFamily.id && family.group === detailsFamily.group)
      .sort((left, right) =>
        Number(right.subgroup === detailsFamily.subgroup) -
          Number(left.subgroup === detailsFamily.subgroup) ||
        left.order - right.order,
      )
      .slice(0, 6);
  }, [catalog.emojis, detailsFamily]);
  const closeDetails = () => {
    const trigger = detailsTriggerRef.current;
    setDetailsFamily(null);
    queueMicrotask(() => trigger?.focus());
  };
  const resultTitle = query.trim()
    ? `Matches for “${query.trim()}”`
    : categoryTitle(category, catalog);
  const emptyTitle = query.trim()
    ? `Nothing matched “${query.trim()}”`
    : category === 'favorites'
      ? 'No favorites yet'
      : category === 'recent'
        ? 'No recently used emoji yet'
        : 'No emojis found';

  return (
    <div
      className="app-shell"
      data-testid="emoji-app"
      data-size={preferences.size}
      data-theme={preferences.theme}
    >
      <a className="skip-link" href="#emoji-results">Skip to emoji results</a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Emoji Compass home">
          <span className="brand-mark" aria-hidden="true">🧭</span>
          <span>Emoji Compass</span>
        </a>
        <div className="header-note">Private · complete · fast</div>
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">Say it without overthinking it</span>
            <h1 id="hero-title">Find the emoji you mean</h1>
            <p>
              Search a feeling, phrase, object, or idea. Every match stays on your device.
            </p>
            <div className="catalog-stat" aria-label="Catalog completeness">
              <strong>{catalog.totalCount.toLocaleString('en-US')}</strong> complete emoji sequences
              <span aria-hidden="true"> / </span>
              <strong>{catalog.familyCount.toLocaleString('en-US')}</strong> families
            </div>
          </div>
          <div className="hero-emojis" aria-hidden="true">
            <span>🫡</span><span>🪩</span><span>🩷</span><span>🫧</span>
          </div>
        </section>

        <section className="discovery-sticky" aria-label="Find and filter emoji">
          <SearchBar
            value={query}
            onChange={setQuery}
            resultCount={resultItems.length}
            resultsId="emoji-results"
            inputRef={searchRef}
          />
          <CategoryNav
            categories={categories}
            activeCategory={category}
            onCategoryChange={(next: CategoryId | null) =>
              setCategory(next === null || typeof next === 'number' ? next : next as ActiveCategory)
            }
          />
        </section>

        <details className="preferences-drawer">
          <summary>Filters &amp; display</summary>
          <PreferencePanel preferences={preferences} onChange={preferenceController.update} />
        </details>

        <section className="results-section" aria-labelledby="results-title">
          <div className="results-heading">
            <div>
              <span className="section-kicker">
                {deferredQuery.trim() ? 'Best semantic matches' : 'Browse the catalog'}
              </span>
              <h2 id="results-title">{resultTitle}</h2>
            </div>
            <span className="result-total">{resultItems.length.toLocaleString('en-US')} found</span>
          </div>

          <EmojiGrid
            id="emoji-results"
            items={resultItems}
            size={preferences.size}
            style={preferences.style}
            tone={preferences.tone}
            actionLabel={preferences.quickCopy ? 'Copy' : 'Add'}
            emptyTitle={emptyTitle}
            emptyMessage={query.trim()
              ? 'Try another word, a broader feeling, or one of the ideas below.'
              : 'Use an emoji once and it will appear here.'}
            onSelect={(emoji, source) => void selectEmoji(emoji, source)}
            onDetails={(source) => {
              detailsTriggerRef.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
              setDetailsFamily(familyById.get(familyIdFor(source)) ?? null);
            }}
          />

          {resultItems.length === 0 && query.trim() ? (
            <div className="suggestion-panel" aria-label="Search suggestions">
              <span>Try an idea:</span>
              {SEARCH_SUGGESTIONS.map((suggestion) => (
                <button
                  type="button"
                  key={suggestion}
                  onClick={() => setQuery(suggestion)}
                >
                  Try {suggestion}
                </button>
              ))}
            </div>
          ) : null}
        </section>
      </main>

      <ComposerDock
        history={composer}
        textareaRef={composerRef}
        onChange={(value) => setComposer((current) => commitComposerValue(current, value))}
        onUndo={() => setComposer((current) => undoComposer(current))}
        onClear={() => setComposer((current) => clearComposer(current))}
        onCopy={() => void copyComposition()}
      />

      <div className="copy-feedback" aria-live="polite">
        {copyStatus?.kind === 'error' ? (
          <p role="alert">{copyStatus.message}</p>
        ) : (
          <p role="status" aria-label="Copy status">{copyStatus?.message ?? ''}</p>
        )}
      </div>

      {detailsFamily ? (
        <EmojiDetailsDialog
          key={detailsFamily.id}
          family={detailsFamily}
          groupLabel={detailsGroup}
          subgroupLabel={detailsSubgroup}
          favorite={preferences.favoriteIds.includes(detailsFamily.id)}
          relatedFamilies={relatedFamilies}
          onToggleFavorite={() => preferenceController.toggleFavorite(detailsFamily.id)}
          onViewRelated={setDetailsFamily}
          onChoose={(variant) => {
            void selectEmoji(variant, detailsFamily);
            setDetailsFamily(null);
          }}
          onClose={closeDetails}
        />
      ) : null}

      <footer className="site-footer">
        <span>Emoji 17 · CLDR 48 · Unicode kept exact</span>
        <span>No ads. No tracking. No account.</span>
      </footer>
    </div>
  );
}

export function App({ initialCatalog, ...props }: AppProps) {
  return initialCatalog
    ? <EmojiExperience {...props} catalog={initialCatalog} />
    : <CatalogBoundary {...props} />;
}
