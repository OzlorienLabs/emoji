declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    GA_MEASUREMENT_ID?: string;
  }
}

let initializedMeasurementId: string | null = null;

/**
 * Resolves the Google Analytics GA4 Measurement ID from parameters,
 * environment variables, or global window configuration.
 */
export function getMeasurementId(customId?: string): string | null {
  if (customId && customId.trim()) {
    return customId.trim();
  }

  if (typeof window !== 'undefined' && typeof window.GA_MEASUREMENT_ID === 'string' && window.GA_MEASUREMENT_ID.trim()) {
    return window.GA_MEASUREMENT_ID.trim();
  }

  const envId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (typeof envId === 'string' && envId.trim() && envId !== 'undefined') {
    return envId.trim();
  }

  return null;
}

/**
 * Initializes Google Analytics 4 (gtag.js) script dynamically if a Measurement ID is configured.
 */
export function initAnalytics(customId?: string): boolean {
  const measurementId = getMeasurementId(customId);
  if (!measurementId) {
    return false;
  }

  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  if (initializedMeasurementId === measurementId) {
    return true;
  }

  // Setup dataLayer and gtag function.
  //
  // gtag.js walks the dataLayer and only treats an entry as a command when it is
  // an `arguments` object; a plain array is read as an inert data push and
  // skipped. Pushing `args` as an array therefore swallowed `js` and `config`,
  // left the stream unconfigured, and silently sent nothing. Keep the shim in
  // the canonical `dataLayer.push(arguments)` form.
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params -- rest params build a plain array, which is the bug.
      window.dataLayer?.push(arguments);
    };
  }

  // Check if the script is already present
  const scriptSrc = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  let scriptElement = document.querySelector<HTMLScriptElement>(`script[src*="googletagmanager.com/gtag/js"]`);

  if (!scriptElement) {
    scriptElement = document.createElement('script');
    scriptElement.async = true;
    scriptElement.src = scriptSrc;
    document.head.appendChild(scriptElement);
  }

  // Configure GA4
  window.gtag('js', new Date());
  window.gtag('config', measurementId, {
    send_page_view: true,
  });

  initializedMeasurementId = measurementId;
  return true;
}

/**
 * Generic event dispatcher for Google Analytics.
 */
export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  window.gtag('event', eventName, params);
}

/**
 * Tracks a page view in GA4.
 */
export function trackPageView(pagePath?: string, pageTitle?: string): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }

  // Stay inert until a measurement ID is configured, matching initAnalytics.
  const measurementId = initializedMeasurementId || getMeasurementId();
  if (!measurementId) return;

  // GA4 ignores a repeated `config` for an already-configured stream, so a
  // manual page view has to be sent as a `page_view` event instead.
  window.gtag('event', 'page_view', {
    page_path: pagePath ?? (typeof window.location !== 'undefined' ? window.location.pathname + window.location.search : undefined),
    page_title: pageTitle ?? (typeof document !== 'undefined' ? document.title : undefined),
    page_location: typeof window.location !== 'undefined' ? window.location.href : undefined,
  });
}

/**
 * Tracks search query execution.
 */
export function trackSearch(searchTerm: string, resultCount?: number, contentType?: string): void {
  if (!searchTerm.trim()) return;
  trackEvent('search', {
    search_term: searchTerm.trim(),
    result_count: resultCount,
    content_type: contentType,
  });
}

/**
 * Tracks copy actions (individual emoji, icon, or composed message).
 */
export function trackCopy(
  itemType: 'emoji' | 'icon' | 'message',
  itemValue: string,
  format?: string,
): void {
  trackEvent('copy_item', {
    item_type: itemType,
    item_value: itemValue,
    format: format ?? (itemType === 'emoji' ? 'glyph' : itemType === 'message' ? 'text' : 'svg'),
  });
}

/**
 * Tracks on-device AI polish actions.
 */
export function trackAIPolish(style: string): void {
  trackEvent('ai_polish', {
    style,
  });
}

/**
 * Tracks content type filter selection ('all' | 'emoji' | 'icon').
 */
export function trackContentTypeChange(contentType: string): void {
  trackEvent('select_content_type', {
    content_type: contentType,
  });
}

/**
 * Tracks category filter selection.
 */
export function trackCategoryChange(categoryId: string | number | null): void {
  trackEvent('select_category', {
    category_id: String(categoryId ?? 'all'),
  });
}

/**
 * Tracks preference modifications.
 */
export function trackPreferenceChange(key: string, value: unknown): void {
  trackEvent('change_preference', {
    preference_name: key,
    preference_value: String(value),
  });
}

/**
 * Tracks details modal view for an emoji or icon.
 */
export function trackDetailsOpen(itemType: 'emoji' | 'icon', itemId: string | number, name: string): void {
  trackEvent('view_item_details', {
    item_type: itemType,
    item_id: String(itemId),
    item_name: name,
  });
}

/**
 * Reset function strictly for unit test hygiene.
 */
export function resetAnalyticsForTesting(): void {
  initializedMeasurementId = null;
}
