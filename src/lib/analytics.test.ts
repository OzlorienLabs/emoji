import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  getMeasurementId,
  initAnalytics,
  resetAnalyticsForTesting,
  trackAIPolish,
  trackCategoryChange,
  trackContentTypeChange,
  trackCopy,
  trackDetailsOpen,
  trackEvent,
  trackPageView,
  trackPreferenceChange,
  trackSearch,
} from './analytics';

describe('analytics module', () => {
  beforeEach(() => {
    resetAnalyticsForTesting();
    vi.unstubAllEnvs();
    delete window.gtag;
    delete window.dataLayer;
    delete window.GA_MEASUREMENT_ID;
    document.querySelectorAll('script[src*="googletagmanager.com"]').forEach((el) => el.remove());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('getMeasurementId', () => {
    it('returns custom id if passed', () => {
      expect(getMeasurementId('G-CUSTOM123')).toBe('G-CUSTOM123');
    });

    it('returns window.GA_MEASUREMENT_ID if defined', () => {
      window.GA_MEASUREMENT_ID = 'G-WINDOW123';
      expect(getMeasurementId()).toBe('G-WINDOW123');
    });

    it('returns import.meta.env.VITE_GA_MEASUREMENT_ID if configured', () => {
      vi.stubEnv('VITE_GA_MEASUREMENT_ID', 'G-ENV123');
      expect(getMeasurementId()).toBe('G-ENV123');
    });

    it('returns null if nothing is provided or empty', () => {
      expect(getMeasurementId('')).toBeNull();
      expect(getMeasurementId('   ')).toBeNull();
      expect(getMeasurementId()).toBeNull();
    });
  });

  describe('initAnalytics', () => {
    it('returns false if no measurement ID is configured', () => {
      const initialized = initAnalytics();
      expect(initialized).toBe(false);
      expect(document.querySelector('script[src*="googletagmanager.com"]')).toBeNull();
    });

    it('injects script and initializes dataLayer & gtag when measurement ID is provided', () => {
      const initialized = initAnalytics('G-TEST12345');
      expect(initialized).toBe(true);

      const script = document.querySelector<HTMLScriptElement>('script[src*="googletagmanager.com"]');
      expect(script).not.toBeNull();
      expect(script?.src).toContain('https://www.googletagmanager.com/gtag/js?id=G-TEST12345');
      expect(script?.async).toBe(true);

      expect(window.dataLayer).toBeDefined();
      expect(typeof window.gtag).toBe('function');

      // Call the default window.gtag function to ensure it pushes into dataLayer
      window.gtag?.('event', 'manual_test', { key: 'val' });
      expect(window.dataLayer?.some((entry) => Array.isArray(entry) && entry[1] === 'manual_test')).toBe(true);
    });

    it('preserves existing window.gtag function if already defined before initAnalytics', () => {
      const existingGtag = vi.fn();
      window.gtag = existingGtag;
      window.dataLayer = [];

      expect(initAnalytics('G-EXISTING')).toBe(true);
      expect(window.gtag).toBe(existingGtag);
      expect(existingGtag).toHaveBeenCalledWith('js', expect.any(Date));
      expect(existingGtag).toHaveBeenCalledWith('config', 'G-EXISTING', { send_page_view: true });
    });

    it('handles idempotent initialization when called multiple times with the same ID', () => {
      expect(initAnalytics('G-SAME123')).toBe(true);
      expect(initAnalytics('G-SAME123')).toBe(true);
      const scripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
      expect(scripts.length).toBe(1);
    });

    it('reuses existing script tag if one is already present in the DOM', () => {
      const existingScript = document.createElement('script');
      existingScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-PRELOADED';
      document.head.appendChild(existingScript);

      const initialized = initAnalytics('G-PRELOADED');
      expect(initialized).toBe(true);
      const scripts = document.querySelectorAll('script[src*="googletagmanager.com"]');
      expect(scripts.length).toBe(1);
    });
  });

  describe('event dispatchers', () => {
    beforeEach(() => {
      initAnalytics('G-TRACKTEST');
    });

    it('dispatches custom event via trackEvent', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackEvent('custom_action', { foo: 'bar' });
      expect(gtagSpy).toHaveBeenCalledWith('event', 'custom_action', { foo: 'bar' });
    });

    it('safely handles trackEvent if gtag is not available', () => {
      delete window.gtag;
      expect(() => trackEvent('test_event')).not.toThrow();
    });

    it('tracks page views via trackPageView with custom and default parameters', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackPageView('/search?q=smile', 'Emoji Compass — Search');
      expect(gtagSpy).toHaveBeenCalledWith('config', 'G-TRACKTEST', {
        page_path: '/search?q=smile',
        page_title: 'Emoji Compass — Search',
      });

      // Default arguments
      trackPageView();
      expect(gtagSpy).toHaveBeenCalledWith('config', 'G-TRACKTEST', {
        page_path: window.location.pathname + window.location.search,
        page_title: document.title,
      });
    });

    it('does nothing in trackPageView if no measurement ID is configured', () => {
      resetAnalyticsForTesting();
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackPageView('/path', 'Title');
      expect(gtagSpy).not.toHaveBeenCalled();
    });

    it('does nothing in trackPageView if window.gtag is not available', () => {
      delete window.gtag;
      expect(() => trackPageView('/path', 'Title')).not.toThrow();
    });

    it('tracks searches via trackSearch', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackSearch('heart', 12, 'emoji');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'search', {
        search_term: 'heart',
        result_count: 12,
        content_type: 'emoji',
      });

      // Ignores empty searches
      trackSearch('   ', 0);
      expect(gtagSpy).toHaveBeenCalledTimes(1);
    });

    it('tracks copies for emojis, icons, and messages with default and custom formats', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackCopy('emoji', '🔥');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'copy_item', {
        item_type: 'emoji',
        item_value: '🔥',
        format: 'glyph',
      });

      trackCopy('emoji', '🔥', 'custom_emoji_format');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'copy_item', {
        item_type: 'emoji',
        item_value: '🔥',
        format: 'custom_emoji_format',
      });

      trackCopy('icon', 'arrow-right');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'copy_item', {
        item_type: 'icon',
        item_value: 'arrow-right',
        format: 'svg',
      });

      trackCopy('icon', 'arrow-right', 'jsx');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'copy_item', {
        item_type: 'icon',
        item_value: 'arrow-right',
        format: 'jsx',
      });

      trackCopy('message', 'Hello 🚀');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'copy_item', {
        item_type: 'message',
        item_value: 'Hello 🚀',
        format: 'text',
      });
    });

    it('tracks AI polish actions', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackAIPolish('on-device');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'ai_polish', {
        style: 'on-device',
      });
    });

    it('tracks content type changes', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackContentTypeChange('icon');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'select_content_type', {
        content_type: 'icon',
      });
    });

    it('tracks category changes with various id types', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackCategoryChange('smileys-emotion');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'select_category', {
        category_id: 'smileys-emotion',
      });

      trackCategoryChange(2);
      expect(gtagSpy).toHaveBeenCalledWith('event', 'select_category', {
        category_id: '2',
      });

      trackCategoryChange(null);
      expect(gtagSpy).toHaveBeenCalledWith('event', 'select_category', {
        category_id: 'all',
      });
    });

    it('tracks preference changes', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackPreferenceChange('tone', 'medium-light');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'change_preference', {
        preference_name: 'tone',
        preference_value: 'medium-light',
      });
    });

    it('tracks item details views', () => {
      const gtagSpy = vi.fn();
      window.gtag = gtagSpy;

      trackDetailsOpen('emoji', '1f600', 'grinning face');
      expect(gtagSpy).toHaveBeenCalledWith('event', 'view_item_details', {
        item_type: 'emoji',
        item_id: '1f600',
        item_name: 'grinning face',
      });
    });
  });
});
