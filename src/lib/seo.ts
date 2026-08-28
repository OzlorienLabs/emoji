import type { CategoryId } from '../components/CategoryNav';
import type { ContentType } from '../data/catalog-types';
import type { ResolvedCategory } from '../data/categories';

export type ActiveCategory = CategoryId | null;

export function categoryTitle(
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

export function computeDocumentTitle(
  query: string,
  category: ActiveCategory,
  contentType: ContentType,
  categoryById: Map<string, ResolvedCategory>,
): string {
  const trimmed = query.trim();
  if (trimmed) {
    return `“${trimmed}” Emojis & Icons — Emoji Compass`;
  }
  if (category !== null) {
    const title = categoryTitle(category, contentType, categoryById);
    return `${title} — Emoji Compass`;
  }
  if (contentType === 'emoji') {
    return 'Every Emoji (Unicode 17.0) — Emoji Compass';
  }
  if (contentType === 'icon') {
    return 'Every Vector Icon (Lucide) — Emoji Compass';
  }
  return 'Emoji Compass — Search 3,900+ Emojis & 1,700+ Vector Icons by Meaning';
}
