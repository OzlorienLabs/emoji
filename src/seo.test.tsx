// @vitest-environment jsdom
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SearchBar } from './components/SearchBar';
import { computeDocumentTitle } from './lib/seo';
import type { ResolvedCategory } from './data/categories';

const read = (path: string) => readFileSync(resolve(process.cwd(), path), 'utf8');

describe('robots.txt for search engines & AI agents', () => {
  const robots = read('public/robots.txt');

  it('allows general search engine crawlers', () => {
    expect(robots).toContain('User-agent: *');
    expect(robots).toContain('Allow: /');
  });

  it('explicitly welcomes major AI crawlers and search agents', () => {
    const aiAgents = [
      'GPTBot',
      'ChatGPT-User',
      'ClaudeBot',
      'Claude-Web',
      'PerplexityBot',
      'Applebot-Extended',
      'Google-Extended',
      'CCBot',
    ];
    for (const agent of aiAgents) {
      expect(robots).toContain(`User-agent: ${agent}`);
    }
  });

  it('points crawlers to the sitemap', () => {
    expect(robots).toContain('Sitemap: https://emoji.ozlorienlabs.com/sitemap.xml');
  });
});

describe('sitemap.xml', () => {
  const sitemap = read('public/sitemap.xml');

  it('is a valid sitemap urlset', () => {
    expect(sitemap).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(sitemap).toContain('</urlset>');
  });

  it('includes canonical homepage with highest priority', () => {
    expect(sitemap).toContain('<loc>https://emoji.ozlorienlabs.com/</loc>');
    expect(sitemap).toContain('<priority>1.0</priority>');
  });

  it('includes content type filters and popular intent links', () => {
    expect(sitemap).toContain('<loc>https://emoji.ozlorienlabs.com/?type=emoji</loc>');
    expect(sitemap).toContain('<loc>https://emoji.ozlorienlabs.com/?type=icon</loc>');
    expect(sitemap).toContain('<loc>https://emoji.ozlorienlabs.com/?group=smileys-emotion</loc>');
    expect(sitemap).toContain('<loc>https://emoji.ozlorienlabs.com/?q=happy+dance</loc>');
    expect(sitemap).toContain('<loc>https://emoji.ozlorienlabs.com/?q=deadline</loc>');
  });
});

describe('llms.txt standard for AI assistants and agents', () => {
  const llms = read('public/llms.txt');
  const llmsFull = read('public/llms-full.txt');

  it('documents the service, URL parameters, and catalog sizes for agents', () => {
    expect(llms).toContain('# Emoji Compass');
    expect(llms).toContain('https://emoji.ozlorienlabs.com');
    expect(llms).toContain('https://emoji.ozlorienlabs.com/?q={query}');
    expect(llms).toContain('Unicode 17.0');
    expect(llms).toContain('3,953');
    expect(llms).toContain('1,777');
    expect(llms).toContain('/llms-full.txt');
  });

  it('provides comprehensive taxonomies and alias examples in llms-full.txt', () => {
    expect(llmsFull).toContain('smileys-emotion');
    expect(llmsFull).toContain('communication');
    expect(llmsFull).toContain('deadline');
    expect(llmsFull).toContain('happy dance');
    expect(llmsFull).toContain('SVG');
    expect(llmsFull).toContain('JSX');
  });
});

describe('index.html SEO, Social, and Structured Data', () => {
  const html = read('index.html');

  it('contains enhanced meta tags and canonical link', () => {
    expect(html).toContain('<link rel="canonical" href="https://emoji.ozlorienlabs.com/" />');
    expect(html).toContain('name="description"');
    expect(html).toContain('name="keywords"');
    expect(html).toContain('name="author" content="Ozlorien Labs"');
    expect(html).toContain('name="robots" content="index, follow');
  });

  it('declares Open Graph and Twitter Card tags with image dimensions', () => {
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('property="og:image" content="https://emoji.ozlorienlabs.com/og-image.png"');
    expect(html).toContain('property="og:image:width" content="1200"');
    expect(html).toContain('property="og:image:height" content="630"');
    expect(html).toContain('name="twitter:card" content="summary_large_image"');
    expect(html).toContain('name="twitter:image" content="https://emoji.ozlorienlabs.com/og-image.png"');
  });

  it('embeds valid Schema.org WebSite with SearchAction and WebApplication', () => {
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(jsonLdMatch).not.toBeNull();
    const structuredData = JSON.parse(jsonLdMatch![1]!);
    expect(structuredData['@context']).toBe('https://schema.org');

    const graph = structuredData['@graph'] as { '@type': string; [key: string]: unknown }[];
    const website = graph.find((item) => item['@type'] === 'WebSite');
    const app = graph.find((item) => item['@type'] === 'WebApplication');

    expect(website).toBeDefined();
    expect(website?.url).toBe('https://emoji.ozlorienlabs.com/');
    expect(website?.potentialAction).toMatchObject({
      '@type': 'SearchAction',
      'query-input': 'required name=search_term_string',
    });

    expect(app).toBeDefined();
    expect(app?.name).toBe('Emoji Compass');
    expect(app?.applicationCategory).toContain('UtilitiesApplication');
    expect(app?.offers).toMatchObject({ price: '0' });
  });

  it('provides crawlable semantic fallback for non-JS search scrapers', () => {
    expect(html).toContain('<noscript>');
    expect(html).toContain('href="/?group=smileys-emotion"');
    expect(html).toContain('href="/?q=happy+dance"');
    expect(html).toContain('href="/?q=deadline"');
  });

  it('points to a committed, valid og-image.png', () => {
    const path = resolve(process.cwd(), 'public', 'og-image.png');
    expect(statSync(path).size).toBeGreaterThan(0);
    // PNG header signature
    expect([...readFileSync(path).subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });
});

describe('WebMCP agent integration in SearchBar', () => {
  it('exposes WebMCP attributes and standard form query name', () => {
    render(
      <SearchBar
        value="celebration"
        onChange={vi.fn()}
        resultsId="emoji-results"
      />,
    );

    const form = screen.getByRole('search');
    expect(form).toHaveAttribute('toolname', 'search-emojis-and-icons');
    expect(form).toHaveAttribute('tooldescription');
    expect(form).toHaveAttribute('toolautosubmit');
    expect(form).toHaveAttribute('action', '/');
    expect(form).toHaveAttribute('method', 'get');

    const input = screen.getByRole('searchbox');
    expect(input).toHaveAttribute('name', 'q');
    expect(input).toHaveAttribute('toolparamdescription');
  });
});

describe('dynamic document title generation', () => {
  const sampleCategories = new Map<string, ResolvedCategory>([
    ['food-drink', {
      id: 'food-drink',
      label: 'Food & Drink',
      icon: '🍔',
      hasEmojis: true,
      hasIcons: true,
      emojiGroupIds: [3],
      iconCategoryIds: ['food'],
      aliases: ['food-drink'],
    }],
  ]);

  it('computes title for search queries', () => {
    expect(computeDocumentTitle('heart', null, 'all', sampleCategories)).toBe(
      '“heart” Emojis & Icons — Emoji Compass',
    );
  });

  it('computes title for category selection', () => {
    expect(computeDocumentTitle('', 'food-drink', 'all', sampleCategories)).toBe(
      'Food & Drink — Emoji Compass',
    );
  });

  it('computes title for favorites and recents', () => {
    expect(computeDocumentTitle('', 'favorites', 'all', sampleCategories)).toBe(
      'Your favorites — Emoji Compass',
    );
    expect(computeDocumentTitle('', 'recent', 'all', sampleCategories)).toBe(
      'Recently used — Emoji Compass',
    );
  });

  it('computes title for content type filters', () => {
    expect(computeDocumentTitle('', null, 'emoji', sampleCategories)).toBe(
      'Every Emoji (Unicode 17.0) — Emoji Compass',
    );
    expect(computeDocumentTitle('', null, 'icon', sampleCategories)).toBe(
      'Every Vector Icon (Lucide) — Emoji Compass',
    );
  });

  it('falls back to base title when idle', () => {
    expect(computeDocumentTitle('', null, 'all', sampleCategories)).toBe(
      'Emoji Compass — Search 3,900+ Emojis & 1,700+ Vector Icons by Meaning',
    );
  });
});
