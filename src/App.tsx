import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AuroraBackdrop } from './components/AuroraBackdrop';
import { CategoryNav, type CategoryId, type CategoryOption } from './components/CategoryNav';
import { ComposerDock } from './components/ComposerDock';
import { ContentTypeFilter } from './components/ContentTypeFilter';
import { EmojiDetailsDialog } from './components/EmojiDetailsDialog';
import { EmojiGrid, type EmojiGridItem, type GridSelectableItem } from './components/EmojiGrid';
import { FeedbackDialog } from './components/FeedbackDialog';
import { HeroSection } from './components/HeroSection';
import { IconDetailsDialog } from './components/IconDetailsDialog';
import { PreferencePanel } from './components/PreferencePanel';
import { SearchBar } from './components/SearchBar';
import { SiteHeader } from './components/SiteHeader';
import { Toast } from './components/Toast';
import { flattenCatalog, flattenIconCatalog, getIconHtml, getIconJsx, getIconSvg } from './data/catalog';
import {
  filterCategoriesForContentType,
  resolveCategories,
  resolveCategoryId,
  type ResolvedCategory,
} from './data/categories';
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
import { usePrefersDarkScheme, useReducedMotion } from './hooks/useMediaQuery';
import {
  trackAIPolish,
  trackCategoryChange,
  trackContentTypeChange,
  trackCopy,
  trackDetailsOpen,
  trackEvent,
  trackPreferenceChange,
  trackSearch,
} from './lib/analytics';
import { copyText, type ClipboardResult, type CopyTextOptions } from './lib/clipboard';
import {
  appendToComposer,
  clearComposer,
  commitComposerValue,
  createComposerHistory,
  placeCaretAtEnd,
  undoComposer,
} from './lib/composer';
import { countUp, flyToDock, staggerGridCells } from './lib/motion';
import type { EmojiPreferences, StorageLike } from './lib/preferences';
import { createSearchIndex, searchItems } from './lib/search';
import { selectToneVariant } from './lib/variants';
import { iconCatalogFixture } from './test/catalog-fixture';

type CopyFunction = (text: string, options?: CopyTextOptions) => Promise<ClipboardResult>;
type ActiveCategory = CategoryId | null;
type Feedback = { kind: 'success' | 'error'; message: string; key?: number };

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


const SEARCH_SUGGESTIONS = [
  'blue heart',
  'happy dance',
  'deadline',
  'mindblown',
  'work computer',
  'download',
  'celebration',
  'pride',
];

/** Success confirmations are fleeting; an actionable error is given longer. */
const TOAST_MS = { success: 2600, error: 5000 } as const;

function readInitialUrl(
  resolvedCategories: readonly ResolvedCategory[],
): { query: string; contentType: ContentType; category: ActiveCategory } {
  const parameters = new URLSearchParams(window.location.search);
  const query = parameters.get('q')?.slice(0, 120) ?? '';
  const typeParam = parameters.get('type');
  const contentType: ContentType =
    typeParam === 'emoji' || typeParam === 'icon' || typeParam === 'all'
      ? typeParam
      : 'all';

  const groupParameter = parameters.get('group');
  const category = resolveCategoryId(groupParameter, resolvedCategories);

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
  categoryById: Map<string, ResolvedCategory>,
): string {
  if (category === 'favorites') return 'Your favorites';
  if (category === 'recent') return 'Recently used';
  if (category !== null) {
    const cat = categoryById.get(String(category));
    if (cat) return cat.label;
  }
  if (contentType === 'emoji') return 'Every emoji';
  if (contentType === 'icon') return 'Every icon';
  return 'Everything, ranked by meaning';
}

function LoadingView() {
  return (
    <main className="state-page" aria-busy="true">
      <span className="brand-mark" aria-hidden="true">🧭</span>
      <h1>Emoji Compass</h1>
      <div className="catalog-loading">
        <div className="catalog-loading__track" aria-hidden="true"><span /></div>
        <p>Loading 3,953 emoji sequences and 1,777 vector icons…</p>
      </div>
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
  const resolvedCategories = useMemo(
    () => resolveCategories(catalog, iconCatalog),
    [catalog, iconCatalog],
  );
  const categoryById = useMemo(
    () => new Map(resolvedCategories.map((cat) => [cat.id, cat])),
    [resolvedCategories],
  );
  const categoryByEmojiGroupId = useMemo(() => {
    const map = new Map<number, ResolvedCategory>();
    for (const cat of resolvedCategories) {
      for (const gid of cat.emojiGroupIds) {
        map.set(gid, cat);
      }
    }
    return map;
  }, [resolvedCategories]);
  const categoryByIconId = useMemo(() => {
    const map = new Map<string, ResolvedCategory>();
    for (const cat of resolvedCategories) {
      for (const cid of cat.iconCategoryIds) {
        map.set(cid, cat);
      }
    }
    return map;
  }, [resolvedCategories]);

  const initialUrl = useMemo(
    () => readInitialUrl(resolvedCategories),
    [resolvedCategories],
  );
  const [query, setQuery] = useState(initialUrl.query);
  const deferredQuery = useDeferredValue(query);
  const [contentType, setContentType] = useState<ContentType>(initialUrl.contentType);
  const [category, setCategory] = useState<ActiveCategory>(initialUrl.category);
  const [composer, setComposer] = useState(() => createComposerHistory());
  const [detailsFamily, setDetailsFamily] = useState<EmojiFamily | null>(null);
  const [detailsIcon, setDetailsIcon] = useState<IconRecord | null>(null);
  const [hasPolished, setHasPolished] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [copyStatus, setCopyStatus] = useState<Feedback>();
  const searchRef = useRef<HTMLInputElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLUListElement>(null);
  const detailsTriggerRef = useRef<HTMLElement | null>(null);
  const manualCleanup = useRef<(() => void) | undefined>(undefined);
  const preferenceController = useEmojiPreferences({ initial: initialPreferences, storage });
  const { preferences } = preferenceController;

  const reducedMotion = useReducedMotion();
  const systemDark = usePrefersDarkScheme();
  const isDark =
    preferences.theme === 'dark' || (preferences.theme === 'system' && systemDark);

  const feedbackCounter = useRef(0);
  const showFeedback = useCallback((status: Omit<Feedback, 'key'>) => {
    feedbackCounter.current += 1;
    setCopyStatus({ ...status, key: feedbackCounter.current });
  }, []);

  useEffect(() => {
    if (!copyStatus) return;
    const timer = window.setTimeout(() => {
      setCopyStatus(undefined);
    }, TOAST_MS[copyStatus.kind]);
    return () => window.clearTimeout(timer);
  }, [copyStatus]);

  /* The document element carries the theme so the page background, scrollbars
     and native form controls match the shell even outside its bounds. */
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const previous = root.dataset.theme;
    root.dataset.theme = preferences.theme;
    return () => {
      if (previous === undefined) delete root.dataset.theme;
      else root.dataset.theme = previous;
    };
  }, [preferences.theme]);

  const ai = useChromeAI({
    customLanguageModel,
    onSuccess: (polishedValue) => {
      trackAIPolish('on-device');
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

  const resolvedActiveCategory = useMemo(() => {
    if (!category || category === 'favorites' || category === 'recent') return null;
    return categoryById.get(String(category)) ?? null;
  }, [category, categoryById]);

  const resultItems = useMemo<readonly EmojiGridItem[]>(() => {
    let items: readonly EmojiGridItem[];
    const normalizedQuery = deferredQuery.trim();

    if (normalizedQuery) {
      const searchGroupFilter =
        category === 'favorites' || category === 'recent'
          ? undefined
          : resolvedActiveCategory
            ? [...resolvedActiveCategory.emojiGroupIds, ...resolvedActiveCategory.iconCategoryIds]
            : category ?? undefined;

      items = searchItems(searchIndex, normalizedQuery, {
        contentType,
        group: searchGroupFilter,
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
    } else if (resolvedActiveCategory) {
      const matchingEmojis = contentType !== 'icon'
        ? catalog.emojis.filter((family) => resolvedActiveCategory.emojiGroupIds.includes(family.group))
        : [];
      const matchingIcons = contentType !== 'emoji'
        ? iconCatalog.icons.filter((icon) => resolvedActiveCategory.iconCategoryIds.includes(icon.category))
        : [];
      items = [...matchingEmojis, ...matchingIcons];
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
    resolvedActiveCategory,
    searchIndex,
  ]);

  const categories = useMemo<readonly CategoryOption[]>(
    () => filterCategoriesForContentType(resolvedCategories, contentType),
    [resolvedCategories, contentType],
  );

  const categoryLabelFor = useCallback(
    (item: EmojiGridItem): string => {
      if (isIconItem(item)) {
        const cat = categoryByIconId.get(item.category);
        return cat?.label ?? item.categoryLabel;
      }
      const group = (item as EmojiFamily).group;
      const cat = categoryByEmojiGroupId.get(group);
      return cat?.label ?? groupById.get(group) ?? 'Emoji';
    },
    [categoryByEmojiGroupId, categoryByIconId, groupById],
  );

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

  const focusSearch = useCallback(() => {
    const input = searchRef.current;
    if (!input) return;
    input.focus();
    input.select();
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
  }, [reducedMotion]);

  const closeDetails = useCallback(() => {
    const trigger = detailsTriggerRef.current;
    setDetailsFamily(null);
    setDetailsIcon(null);
    queueMicrotask(() => trigger?.focus());
  }, []);

  const copyComposition = useCallback(async () => {
    if (!composer.value.trim()) {
      showFeedback({ kind: 'error', message: 'Add something to your message first' });
      return;
    }
    trackCopy('message', composer.value, 'text');
    const result = await copy(composer.value);
    manualCleanup.current?.();
    if (result.status === 'copied') {
      manualCleanup.current = undefined;
      showFeedback({ kind: 'success', message: 'Message copied' });
    } else {
      manualCleanup.current = result.selection?.cleanup;
      showFeedback({ kind: 'error', message: result.message });
    }
  }, [composer.value, copy, showFeedback]);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isEditable = target instanceof Element &&
        target.matches('input, textarea, [contenteditable="true"]');

      if (event.key === '/' && !isEditable) {
        event.preventDefault();
        focusSearch();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        void copyComposition();
        return;
      }

      if (event.key !== 'Escape') return;
      if (feedbackOpen) setFeedbackOpen(false);
      else if (detailsFamily || detailsIcon) closeDetails();
      else if (prefsOpen) setPrefsOpen(false);
      else if (query) {
        setQuery('');
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, [
    closeDetails,
    copyComposition,
    detailsFamily,
    detailsIcon,
    feedbackOpen,
    focusSearch,
    prefsOpen,
    query,
  ]);

  useEffect(() => {
    const trimmed = deferredQuery.trim();
    if (trimmed) {
      trackSearch(trimmed, resultItems.length, contentType);
    }
  }, [deferredQuery, contentType, resultItems.length]);

  /* Deals the first screenful of tiles in whenever the result set changes. */
  useEffect(() => {
    staggerGridCells(gridRef.current, { enabled: !reducedMotion });
  }, [
    deferredQuery,
    contentType,
    category,
    preferences.size,
    preferences.tone,
    reducedMotion,
  ]);

  const [shownCounts, setShownCounts] = useState({
    emoji: catalog.totalCount,
    icon: iconCatalog.totalCount,
  });

  useEffect(() => {
    const cancelEmoji = countUp(
      catalog.totalCount,
      (value) => setShownCounts((current) => ({ ...current, emoji: value })),
      { enabled: !reducedMotion },
    );
    const cancelIcon = countUp(
      iconCatalog.totalCount,
      (value) => setShownCounts((current) => ({ ...current, icon: value })),
      { enabled: !reducedMotion },
    );
    return () => {
      cancelEmoji();
      cancelIcon();
    };
  }, [catalog.totalCount, iconCatalog.totalCount, reducedMotion]);

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

  const focusComposer = () => {
    queueMicrotask(() => {
      const editor = composerRef.current;
      if (editor) {
        editor.focus();
        placeCaretAtEnd(editor);
      }
    });
  };

  const selectItem = async (
    item: GridSelectableItem,
    source: EmojiGridItem,
    tile?: HTMLElement,
  ) => {
    const id = itemIdFor(source);
    preferenceController.remember(id);

    if (isIconItem(item)) {
      if (preferences.quickCopy) {
        trackCopy('icon', item.kebabName, preferences.iconCopyFormat);
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

      if (ai.isPolishing) return;

      flyToDock(tile ?? null, dockRef.current, { enabled: !reducedMotion });
      setHasPolished(false);
      const edit = appendToComposer(composer.value, `:${item.kebabName}:`);
      setComposer((current) => commitComposerValue(current, edit.value));
      showFeedback({ kind: 'success', message: `${item.name} added to your message` });
      focusComposer();
      return;
    }

    if (isEmojiVariant(item)) {
      if (preferences.quickCopy) {
        trackCopy('emoji', item.glyph, 'glyph');
        finishCopy(await copy(item.glyph), `${item.name} copied`);
        return;
      }

      if (ai.isPolishing) return;

      flyToDock(tile ?? null, dockRef.current, { enabled: !reducedMotion });
      setHasPolished(false);
      const edit = appendToComposer(composer.value, item.glyph);
      setComposer((current) => commitComposerValue(current, edit.value));
      showFeedback({ kind: 'success', message: `${item.name} added to your message` });
      focusComposer();
    }
  };

  const runSearch = (value: string) => {
    setQuery(value);
    setCategory(null);
    closeDetails();
    searchRef.current?.focus();
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
      .slice(0, 12);
  }, [catalog.emojis, detailsFamily]);

  const relatedIcons = useMemo(() => {
    if (!detailsIcon) return [];
    return iconCatalog.icons
      .filter((icon) => icon.id !== detailsIcon.id && icon.category === detailsIcon.category)
      .slice(0, 12);
  }, [detailsIcon, iconCatalog.icons]);

  const trimmedQuery = query.trim();
  const resultTitle = trimmedQuery
    ? `Matches for “${trimmedQuery}”`
    : categoryTitle(category, contentType, categoryById);
  const resultKicker = trimmedQuery
    ? 'Best semantic matches'
    : category !== null
      ? 'Filtered view'
      : 'Browse the catalog';
  const emptyTitle = trimmedQuery
    ? `Nothing matched “${trimmedQuery}”`
    : category === 'favorites'
      ? 'No favorites yet'
      : category === 'recent'
        ? 'No recently used items yet'
        : 'Nothing here yet';
  const emptyMessage = trimmedQuery
    ? 'Every word has to match, so try one idea at a time — a feeling, an object, or a shorter phrase.'
    : category === 'favorites'
      ? 'Open any tile’s details and star it to pin it here.'
      : 'Use an emoji or icon once and it shows up in this list.';

  const totalCombinedCount = catalog.totalCount + iconCatalog.totalCount;

  /*
   * The denominator of "showing n of m" is the pool the current filter and
   * category actually browse — families rather than every ordered variant —
   * so it can never be smaller than the numerator.
   */
  const poolTotal = useMemo(() => {
    if (category === 'favorites') return preferences.favoriteIds.length;
    if (category === 'recent') return preferences.recentIds.length;
    if (resolvedActiveCategory) {
      const emojiCount = contentType !== 'icon'
        ? catalog.emojis.filter((family) => resolvedActiveCategory.emojiGroupIds.includes(family.group)).length
        : 0;
      const iconCount = contentType !== 'emoji'
        ? iconCatalog.icons.filter((icon) => resolvedActiveCategory.iconCategoryIds.includes(icon.category)).length
        : 0;
      return emojiCount + iconCount;
    }
    if (contentType === 'emoji') return catalog.emojis.length;
    if (contentType === 'icon') return iconCatalog.icons.length;
    return catalog.emojis.length + iconCatalog.icons.length;
  }, [
    catalog.emojis,
    category,
    contentType,
    iconCatalog.icons,
    preferences.favoriteIds.length,
    preferences.recentIds.length,
    resolvedActiveCategory,
  ]);

  const ideaChips = (
    <div className="idea-chips">
      {SEARCH_SUGGESTIONS.map((suggestion) => (
        <button
          type="button"
          key={suggestion}
          className="idea-chip idea-chip--solid"
          aria-label={`Try ${suggestion}`}
          onClick={() => runSearch(suggestion)}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );

  return (
    <div
      className="app-shell"
      data-testid="emoji-app"
      data-size={preferences.size}
      data-theme={preferences.theme}
    >
      <AuroraBackdrop parallax={!reducedMotion} />
      <a className="skip-link" href="#emoji-results">Skip to results</a>

      <SiteHeader
        isDark={isDark}
        prefsOpen={prefsOpen}
        quickCopy={preferences.quickCopy}
        onToggleQuickCopy={() => {
          const next = !preferences.quickCopy;
          preferenceController.update({ quickCopy: next });
          trackPreferenceChange('quickCopy', next);
        }}
        onTogglePrefs={() => setPrefsOpen((open) => !open)}
        onToggleTheme={() => {
          const next = isDark ? 'light' : 'dark';
          preferenceController.update({ theme: next });
          trackPreferenceChange('theme', next);
        }}
      >
        {prefsOpen ? (
          <PreferencePanel
            preferences={preferences}
            onDismiss={() => setPrefsOpen(false)}
            onChange={(patch) => {
              preferenceController.update(patch);
              for (const [key, val] of Object.entries(patch)) {
                trackPreferenceChange(key, val);
              }
            }}
          />
        ) : null}
      </SiteHeader>

      <main>
        <HeroSection
          ideas={SEARCH_SUGGESTIONS}
          onIdea={runSearch}
          stats={[
            { value: shownCounts.emoji.toLocaleString('en-US'), label: 'Emoji sequences' },
            { value: shownCounts.icon.toLocaleString('en-US'), label: 'Vector icons' },
            { value: '0', label: 'Bytes sent to a server' },
          ]}
          searchSlot={
            <SearchBar
              value={query}
              onChange={setQuery}
              resultCount={resultItems.length}
              resultsId="emoji-results"
              inputRef={searchRef}
            />
          }
        />

        <section className="filter-bar" aria-label="Find and filter items">
          <div className="filter-bar__row shell-width">
            <ContentTypeFilter
              value={contentType}
              onChange={(next) => {
                setContentType(next);
                setCategory((current) => {
                  if (!current || current === 'favorites' || current === 'recent') return current;
                  const cat = categoryById.get(String(current));
                  if (!cat) return null;
                  if (next === 'emoji' && !cat.hasEmojis) return null;
                  if (next === 'icon' && !cat.hasIcons) return null;
                  return current;
                });
                trackContentTypeChange(next);
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
              onCategoryChange={(next: CategoryId | null) => {
                setCategory(next);
                trackCategoryChange(next);
              }}
            />
          </div>
        </section>

        <section
          className="results-section shell-width"
          aria-labelledby="results-title"
        >
          <div className="results-heading">
            <div>
              <span className="section-kicker">{resultKicker}</span>
              <h2 id="results-title">{resultTitle}</h2>
            </div>
            <span className="result-total">
              showing {resultItems.length.toLocaleString('en-US')} of{' '}
              {poolTotal.toLocaleString('en-US')}
            </span>
          </div>

          <EmojiGrid
            id="emoji-results"
            items={resultItems}
            gridRef={gridRef}
            size={preferences.size}
            style={preferences.style}
            tone={preferences.tone}
            actionLabel={preferences.quickCopy ? 'Copy' : 'Add'}
            ariaLabel={resultTitle}
            emptyTitle={emptyTitle}
            emptyMessage={emptyMessage}
            emptyAction={ideaChips}
            titleFor={(source, display) => `${display.name} · ${categoryLabelFor(source)}`}
            onSelect={(item, source, tile) => void selectItem(item, source, tile)}
            onDetails={(source) => {
              detailsTriggerRef.current = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
              if (isIconItem(source)) {
                const icon = iconById.get(source.id) ?? source;
                setDetailsIcon(icon);
                setDetailsFamily(null);
                trackDetailsOpen('icon', icon.id, icon.name);
              } else {
                const family = familyById.get(itemIdFor(source)) ?? null;
                setDetailsFamily(family);
                setDetailsIcon(null);
                if (family) {
                  trackDetailsOpen('emoji', family.id, family.name);
                }
              }
            }}
          />
        </section>

        <footer className="site-footer shell-width">
          <p className="site-footer__line">Built with curiosity and care</p>
          <p className="site-footer__line">
            by{' '}
            <button
              type="button"
              className="site-footer__link"
              aria-haspopup="dialog"
              onClick={() => setFeedbackOpen(true)}
            >
              Ozlorien Labs
            </button>
          </p>
        </footer>
      </main>

      <div className="composer-shell">
        {copyStatus?.message ? (
          <Toast
            key={copyStatus.key}
            message={copyStatus.message}
            kind={copyStatus.kind}
          />
        ) : null}
        <ComposerDock
          history={composer}
          editorRef={composerRef}
          dockRef={dockRef}
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
      </div>

      <div className="copy-feedback" aria-live="polite">
        {copyStatus?.kind === 'error' ? (
          <p key={copyStatus.key} role="alert">{copyStatus.message}</p>
        ) : (
          <p key={copyStatus?.key ?? 'empty'} role="status" aria-label="Copy status">
            {copyStatus?.message ?? ''}
          </p>
        )}
      </div>

      {feedbackOpen ? (
        <FeedbackDialog
          onClose={() => setFeedbackOpen(false)}
          onSent={(sent) => {
            trackEvent('feedback_submit', { has_email: sent.email.trim().length > 0 });
          }}
        />
      ) : null}

      {detailsFamily ? (
        <EmojiDetailsDialog
          key={detailsFamily.id}
          family={detailsFamily}
          groupLabel={detailsGroup}
          subgroupLabel={detailsSubgroup}
          favorite={preferences.favoriteIds.includes(detailsFamily.id)}
          relatedFamilies={relatedFamilies}
          displayVariant={selectToneVariant(detailsFamily, preferences.tone)}
          onToggleFavorite={() => preferenceController.toggleFavorite(detailsFamily.id)}
          onViewRelated={setDetailsFamily}
          onSearchKeyword={runSearch}
          onCopyGlyph={async (glyph) => {
            trackCopy('emoji', glyph, 'glyph');
            finishCopy(await copy(glyph), `${detailsFamily.name} copied`);
          }}
          onCopyShortcode={async (shortcode) => {
            trackCopy('emoji', detailsFamily.id, 'shortcode');
            finishCopy(await copy(shortcode), `Shortcode ${shortcode} copied`);
          }}
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
          onSearchKeyword={runSearch}
          onAddToMessage={(icon) => {
            const trigger = detailsTriggerRef.current;
            setDetailsIcon(null);
            void selectItem(icon, icon);
            if (preferences.quickCopy) queueMicrotask(() => trigger?.focus());
          }}
          onCopySvg={async (svg) => {
            trackCopy('icon', detailsIcon.kebabName, 'svg');
            finishCopy(await copy(svg), `SVG for ${detailsIcon.name} copied`);
          }}
          onCopyJsx={async (jsx) => {
            trackCopy('icon', detailsIcon.kebabName, 'jsx');
            finishCopy(await copy(jsx), `JSX for ${detailsIcon.name} copied`);
          }}
          onCopyName={async (name) => {
            trackCopy('icon', detailsIcon.kebabName, 'name');
            finishCopy(await copy(name), `Name ${name} copied`);
          }}
          onCopyHtml={async (html) => {
            trackCopy('icon', detailsIcon.kebabName, 'html');
            finishCopy(await copy(html), `HTML tag for ${detailsIcon.name} copied`);
          }}
          onToggleFavorite={() => preferenceController.toggleFavorite(detailsIcon.id)}
          onViewRelated={setDetailsIcon}
          onClose={closeDetails}
        />
      ) : null}
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
