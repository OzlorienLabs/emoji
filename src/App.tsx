import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { CategoryNav, type CategoryId, type CategoryOption } from './components/CategoryNav';
import { ComposerDock } from './components/ComposerDock';
import { ContentTypeFilter } from './components/ContentTypeFilter';
import { EmojiDetailsDialog } from './components/EmojiDetailsDialog';
import { EmojiGrid, type EmojiGridItem, type GridSelectableItem } from './components/EmojiGrid';
import { IconDetailsDialog } from './components/IconDetailsDialog';
import { PreferencePanel } from './components/PreferencePanel';
import { SearchBar } from './components/SearchBar';
import { flattenCatalog, flattenIconCatalog, getIconHtml, getIconJsx, getIconSvg } from './data/catalog';
import type {
  ContentType,
  EmojiCatalog,
  EmojiFamily,
  EmojiVariant,
  IconCatalog,
  IconRecord,
} from './data/catalog-types';
import { useEmojiCatalog } from './hooks/useEmojiCatalog';
import { useEmojiPreferences } from './hooks/useEmojiPreferences';
import { useChromeAI } from './hooks/useChromeAI';
import { copyText, type ClipboardResult, type CopyTextOptions } from './lib/clipboard';
import {
  appendToComposer,
  clearComposer,
  commitComposerValue,
  createComposerHistory,
  placeCaretAtEnd,
  undoComposer,
} from './lib/composer';
import type { EmojiPreferences, StorageLike } from './lib/preferences';
import { createSearchIndex, searchItems } from './lib/search';
import { iconCatalogFixture } from './test/catalog-fixture';

type CopyFunction = (text: string, options?: CopyTextOptions) => Promise<ClipboardResult>;
type ActiveCategory = CategoryId | null;

export interface AppProps {
  initialCatalog?: EmojiCatalog;
  initialIconCatalog?: IconCatalog;
  initialPreferences?: EmojiPreferences;
  fetcher?: typeof fetch;
  storage?: StorageLike | null;
  copy?: CopyFunction;
  customLanguageModel?: unknown;
}

interface EmojiExperienceProps extends Omit<AppProps, 'initialCatalog' | 'initialIconCatalog' | 'fetcher'> {
  catalog: EmojiCatalog;
  iconCatalog: IconCatalog;
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

const SEARCH_SUGGESTIONS = ['celebration', 'arrow', 'love', 'work computer', 'settings', 'download'];

function readInitialUrl(
  catalog: EmojiCatalog,
  iconCatalog: IconCatalog,
): { query: string; contentType: ContentType; category: ActiveCategory } {
  const parameters = new URLSearchParams(window.location.search);
  const query = parameters.get('q')?.slice(0, 120) ?? '';
  const typeParam = parameters.get('type');
  const contentType: ContentType =
    typeParam === 'emoji' || typeParam === 'icon' || typeParam === 'all'
      ? typeParam
      : 'all';

  const groupParameter = parameters.get('group');
  let category: ActiveCategory = null;

  if (groupParameter !== null) {
    const numericGroup = Number(groupParameter);
    if (Number.isInteger(numericGroup) && catalog.groups.some(({ id }) => id === numericGroup)) {
      category = numericGroup;
    } else if (iconCatalog.categories.some(({ id }) => id === groupParameter)) {
      category = groupParameter;
    }
  }

  return { query, contentType, category };
}

function itemIdFor(item: EmojiGridItem): string {
  if ('nodes' in item) return item.id;
  return 'familyId' in item ? item.familyId : item.id;
}

function isIconItem(item: unknown): item is IconRecord {
  return typeof item === 'object' && item !== null && 'nodes' in item;
}

function isEmojiVariant(item: unknown): item is EmojiVariant {
  return typeof item === 'object' && item !== null && 'glyph' in item;
}

function categoryTitle(
  category: ActiveCategory,
  contentType: ContentType,
  catalog: EmojiCatalog,
  iconCatalog: IconCatalog,
): string {
  if (category === 'favorites') return 'Your favorites';
  if (category === 'recent') return 'Recently used';
  if (typeof category === 'number') {
    return catalog.groups.find(({ id }) => id === category)?.label ?? 'Emoji';
  }
  if (typeof category === 'string') {
    return iconCatalog.categories.find(({ id }) => id === category)?.label ?? 'Icons';
  }
  if (contentType === 'emoji') return 'All emojis';
  if (contentType === 'icon') return 'All icons';
  return 'All emojis and icons';
}

function LoadingView() {
  return (
    <main className="state-page" aria-busy="true">
      <span className="brand-mark" aria-hidden="true">🧭</span>
      <h1>Emoji Compass</h1>
      <p>Loading every emoji and icon…</p>
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

function CatalogBoundary(props: Omit<AppProps, 'initialCatalog' | 'initialIconCatalog'>) {
  const state = useEmojiCatalog(props.fetcher ?? globalThis.fetch);
  if (state.status === 'loading') return <LoadingView />;
  if (state.status === 'error') return <ErrorView message={state.message} retry={state.retry} />;
  return <EmojiExperience {...props} catalog={state.catalog} iconCatalog={state.iconCatalog} />;
}

function EmojiExperience({
  catalog,
  iconCatalog,
  initialPreferences,
  storage,
  copy = copyText,
  customLanguageModel,
}: EmojiExperienceProps) {
  const initialUrl = useMemo(() => readInitialUrl(catalog, iconCatalog), [catalog, iconCatalog]);
  const [query, setQuery] = useState(initialUrl.query);
  const deferredQuery = useDeferredValue(query);
  const [contentType, setContentType] = useState<ContentType>(initialUrl.contentType);
  const [category, setCategory] = useState<ActiveCategory>(initialUrl.category);
  const [composer, setComposer] = useState(() => createComposerHistory());
  const [detailsFamily, setDetailsFamily] = useState<EmojiFamily | null>(null);
  const [detailsIcon, setDetailsIcon] = useState<IconRecord | null>(null);
  const [hasPolished, setHasPolished] = useState(false);
  const [copyStatus, setCopyStatus] = useState<{ kind: 'success' | 'error'; message: string; key?: number }>();
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const detailsTriggerRef = useRef<HTMLElement | null>(null);
  const manualCleanup = useRef<(() => void) | undefined>(undefined);
  const preferenceController = useEmojiPreferences({ initial: initialPreferences, storage });
  const { preferences } = preferenceController;

  const feedbackCounter = useRef(0);
  const showFeedback = (status: { kind: 'success' | 'error'; message: string }) => {
    feedbackCounter.current += 1;
    setCopyStatus({ ...status, key: feedbackCounter.current });
  };

  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => {
      setCopyStatus(undefined);
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  const ai = useChromeAI({
    customLanguageModel,
    onSuccess: (polishedValue) => {
      setComposer((current) => commitComposerValue(current, polishedValue));
      setHasPolished(true);
      showFeedback({
        kind: 'success',
        message: 'Polished with on-device AI ✨',
      });
    },
    onError: (err) => {
      showFeedback({
        kind: 'error',
        message: err.message || 'AI polishing could not complete',
      });
    },
  });

  const emojiRecords = useMemo(() => flattenCatalog(catalog), [catalog]);
  const iconRecords = useMemo(() => flattenIconCatalog(iconCatalog), [iconCatalog]);
  const allRecords = useMemo(() => [...emojiRecords, ...iconRecords], [emojiRecords, iconRecords]);
  const searchIndex = useMemo(() => createSearchIndex(allRecords), [allRecords]);

  const familyById = useMemo(
    () => new Map(catalog.emojis.map((family) => [family.id, family])),
    [catalog],
  );
  const iconById = useMemo(
    () => new Map(iconCatalog.icons.map((icon) => [icon.id, icon])),
    [iconCatalog],
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
      items = searchItems(searchIndex, normalizedQuery, {
        contentType,
        group: category === 'favorites' || category === 'recent' ? undefined : category ?? undefined,
      }).map(({ item }) => {
        if (isIconItem(item)) return item;
        const family = familyById.get(item.familyId);
        return family && item.id === family.id ? family : item;
      });
    } else if (category === 'favorites' || category === 'recent') {
      const ids = category === 'favorites' ? preferences.favoriteIds : preferences.recentIds;
      items = ids.flatMap<EmojiGridItem>((id) => {
        const family = familyById.get(id);
        if (family) return [family];
        const icon = iconById.get(id);
        if (icon) return [icon];
        return [];
      });
    } else if (typeof category === 'number') {
      items = catalog.emojis.filter((family) => family.group === category);
    } else if (typeof category === 'string') {
      items = iconCatalog.icons.filter((icon) => icon.category === category);
    } else if (contentType === 'emoji') {
      items = catalog.emojis;
    } else if (contentType === 'icon') {
      items = iconCatalog.icons;
    } else {
      items = [...catalog.emojis, ...iconCatalog.icons];
    }

    if (normalizedQuery && (category === 'favorites' || category === 'recent')) {
      const allowed = new Set(
        category === 'favorites' ? preferences.favoriteIds : preferences.recentIds,
      );
      return items.filter((item) => allowed.has(itemIdFor(item)));
    }
    return items;
  }, [
    catalog.emojis,
    category,
    contentType,
    deferredQuery,
    familyById,
    iconById,
    iconCatalog.icons,
    preferences.favoriteIds,
    preferences.recentIds,
    searchIndex,
  ]);

  const categories = useMemo<readonly CategoryOption[]>(() => {
    const list: CategoryOption[] = [
      { id: 'favorites', label: 'Favorites', icon: '★' },
      { id: 'recent', label: 'Recently used', icon: '↺' },
    ];

    if (contentType === 'emoji' || contentType === 'all') {
      for (const group of catalog.groups) {
        list.push({
          id: group.id,
          label: group.label,
          icon: GROUP_ICONS[group.key] ?? '•',
        });
      }
    }

    if (contentType === 'icon' || contentType === 'all') {
      for (const iconCat of iconCatalog.categories) {
        list.push({
          id: iconCat.id,
          label: iconCat.label,
          icon: iconCat.icon ?? '⚡',
        });
      }
    }

    return list;
  }, [catalog.groups, contentType, iconCatalog.categories]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');

    if (contentType !== 'all') url.searchParams.set('type', contentType);
    else url.searchParams.delete('type');

    if (category !== null && category !== 'favorites' && category !== 'recent') {
      url.searchParams.set('group', String(category));
    } else {
      url.searchParams.delete('group');
    }
    window.history.replaceState(window.history.state, '', url);
  }, [category, contentType, query]);

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
      showFeedback({ kind: 'success', message: successMessage });
    } else {
      manualCleanup.current = result.selection?.cleanup;
      showFeedback({ kind: 'error', message: result.message });
    }
  };

  const selectItem = async (item: GridSelectableItem, source: EmojiGridItem) => {
    const id = itemIdFor(source);
    preferenceController.remember(id);

    if (isIconItem(item)) {
      if (preferences.quickCopy) {
        const payload =
          preferences.iconCopyFormat === 'jsx'
            ? getIconJsx(item)
            : preferences.iconCopyFormat === 'name'
              ? item.kebabName
              : preferences.iconCopyFormat === 'html'
                ? getIconHtml(item)
                : getIconSvg(item);
        finishCopy(await copy(payload), `${item.name} copied`);
        return;
      }

      if (ai.isPolishing) {
        return;
      }

      setHasPolished(false);
      const edit = appendToComposer(composer.value, `:${item.kebabName}:`);
      setComposer((current) => commitComposerValue(current, edit.value));
      showFeedback({ kind: 'success', message: `${item.name} added to your message` });
      queueMicrotask(() => {
        const editor = composerRef.current;
        if (editor) {
          editor.focus();
          placeCaretAtEnd(editor);
        }
      });
      return;
    }

    if (isEmojiVariant(item)) {
      if (preferences.quickCopy) {
        finishCopy(await copy(item.glyph), `${item.name} copied`);
        return;
      }

      if (ai.isPolishing) {
        return;
      }

      setHasPolished(false);
      const edit = appendToComposer(composer.value, item.glyph);
      setComposer((current) => commitComposerValue(current, edit.value));
      showFeedback({ kind: 'success', message: `${item.name} added to your message` });
      queueMicrotask(() => {
        const editor = composerRef.current;
        if (editor) {
          editor.focus();
          placeCaretAtEnd(editor);
        }
      });
    }
  };

  const copyComposition = async () => {
    const result = await copy(composer.value);
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

  const relatedIcons = useMemo(() => {
    if (!detailsIcon) return [];
    return iconCatalog.icons
      .filter((icon) => icon.id !== detailsIcon.id && icon.category === detailsIcon.category)
      .slice(0, 6);
  }, [detailsIcon, iconCatalog.icons]);

  const closeDetails = () => {
    const trigger = detailsTriggerRef.current;
    setDetailsFamily(null);
    setDetailsIcon(null);
    queueMicrotask(() => trigger?.focus());
  };

  const resultTitle = query.trim()
    ? `Matches for “${query.trim()}”`
    : categoryTitle(category, contentType, catalog, iconCatalog);
  const emptyTitle = query.trim()
    ? `Nothing matched “${query.trim()}”`
    : category === 'favorites'
      ? 'No favorites yet'
      : category === 'recent'
        ? 'No recently used items yet'
        : 'No items found';

  const totalCombinedCount = catalog.totalCount + iconCatalog.totalCount;

  return (
    <div
      className="app-shell"
      data-testid="emoji-app"
      data-size={preferences.size}
      data-theme={preferences.theme}
    >
      <a className="skip-link" href="#emoji-results">Skip to results</a>
      <header className="site-header">
        <a className="brand" href="/" aria-label="Emoji Compass home">
          <span className="brand-mark" aria-hidden="true">🧭</span>
          <span>Emoji Compass</span>
        </a>
        <PreferencePanel preferences={preferences} onChange={preferenceController.update} />
      </header>

      <main>
        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <span className="eyebrow">Say it without overthinking it</span>
            <h1 id="hero-title">Find the emoji or icon you mean</h1>
            <p>
              Search a feeling, phrase, object, or icon. Every match stays on your device.
            </p>
            <div className="catalog-stat" aria-label="Catalog completeness">
              <strong>{totalCombinedCount.toLocaleString('en-US')}</strong> complete sequences &amp; vector icons
              <span aria-hidden="true"> (</span>
              <strong>{catalog.totalCount.toLocaleString('en-US')}</strong> emojis
              <span aria-hidden="true"> + </span>
              <strong>{iconCatalog.totalCount.toLocaleString('en-US')}</strong> vector icons
              <span aria-hidden="true">)</span>
            </div>
          </div>
          <div className="hero-emojis" aria-hidden="true">
            <span>🫡</span><span>🪩</span><span>🩷</span><span>🫧</span>
          </div>
        </section>

        <section className="discovery-sticky" aria-label="Find and filter items">
          <SearchBar
            value={query}
            onChange={setQuery}
            resultCount={resultItems.length}
            resultsId="emoji-results"
            inputRef={searchRef}
            placeholder="Search emojis and icons by name, feeling, tag, or code"
          />
          <ContentTypeFilter
            value={contentType}
            onChange={(next) => {
              setContentType(next);
              setCategory(null);
            }}
            totalCount={totalCombinedCount}
            emojiCount={catalog.totalCount}
            iconCount={iconCatalog.totalCount}
          />
          <CategoryNav
            categories={categories}
            activeCategory={category}
            allLabel={
              contentType === 'emoji'
                ? 'All emojis'
                : contentType === 'icon'
                  ? 'All icons'
                  : 'All'
            }
            onCategoryChange={(next: CategoryId | null) => setCategory(next)}
          />
        </section>

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
              : 'Use an item once and it will appear here.'}
            onSelect={(item, source) => void selectItem(item, source)}
            onDetails={(source) => {
              detailsTriggerRef.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
              if (isIconItem(source)) {
                setDetailsIcon(iconById.get(source.id) ?? source);
                setDetailsFamily(null);
              } else {
                setDetailsFamily(familyById.get(itemIdFor(source)) ?? null);
                setDetailsIcon(null);
              }
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
        editorRef={composerRef}
        iconById={iconById}
        onChange={(value) => {
          setHasPolished(false);
          setComposer((current) => commitComposerValue(current, value));
        }}
        onUndo={() => setComposer((current) => undoComposer(current))}
        onClear={() => {
          setHasPolished(false);
          setComposer((current) => clearComposer(current));
        }}
        onCopy={() => void copyComposition()}
        isAIAvailable={ai.isAvailable}
        isPolishing={ai.isPolishing}
        hasPolished={hasPolished}
        onPolish={() => void ai.polish(composer.value)}
        onCancelPolish={ai.cancel}
      />

      <div className="copy-feedback" aria-live="polite">
        {copyStatus?.kind === 'error' ? (
          <p key={copyStatus.key} role="alert">{copyStatus.message}</p>
        ) : (
          <p key={copyStatus?.key ?? 'empty'} role="status" aria-label="Copy status">
            {copyStatus?.message ?? ''}
          </p>
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
            const source = detailsFamily;
            const trigger = detailsTriggerRef.current;
            setDetailsFamily(null);
            void selectItem(variant, source);
            if (preferences.quickCopy) queueMicrotask(() => trigger?.focus());
          }}
          onClose={closeDetails}
        />
      ) : null}

      {detailsIcon ? (
        <IconDetailsDialog
          key={detailsIcon.id}
          icon={detailsIcon}
          favorite={preferences.favoriteIds.includes(detailsIcon.id)}
          relatedIcons={relatedIcons}
          onCopySvg={async (svg) => {
            finishCopy(await copy(svg), `SVG for ${detailsIcon.name} copied`);
          }}
          onCopyJsx={async (jsx) => {
            finishCopy(await copy(jsx), `JSX for ${detailsIcon.name} copied`);
          }}
          onCopyName={async (name) => {
            finishCopy(await copy(name), `Name ${name} copied`);
          }}
          onCopyHtml={async (html) => {
            finishCopy(await copy(html), `HTML tag for ${detailsIcon.name} copied`);
          }}
          onToggleFavorite={() => preferenceController.toggleFavorite(detailsIcon.id)}
          onViewRelated={setDetailsIcon}
          onClose={closeDetails}
        />
      ) : null}

      <footer className="site-footer">
        <span>Emoji 17 · Lucide 1.34 · Unicode &amp; SVG vector kept exact</span>
        <span>No ads. No tracking. No account.</span>
      </footer>
    </div>
  );
}

export function App({
  initialCatalog,
  initialIconCatalog = iconCatalogFixture,
  ...props
}: AppProps) {
  return initialCatalog
    ? <EmojiExperience {...props} catalog={initialCatalog} iconCatalog={initialIconCatalog} />
    : <CatalogBoundary {...props} />;
}
