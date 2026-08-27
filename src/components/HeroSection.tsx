import type { ReactNode } from 'react';

export interface HeroStat {
  value: string;
  label: string;
}

export interface HeroSectionProps {
  /** The search field, passed in so the app owns its state and ref. */
  searchSlot: ReactNode;
  ideas: readonly string[];
  onIdea: (idea: string) => void;
  stats: readonly HeroStat[];
}

/** Four drifting glyphs that frame the headline. Decorative only. */
const DECOR = ['🫡', '🪩', '🩷', '🫧'] as const;

export function HeroSection({ searchSlot, ideas, onIdea, stats }: HeroSectionProps) {
  return (
    <section className="hero shell-width" aria-labelledby="hero-title">
      <div className="hero__decor" aria-hidden="true">
        {DECOR.map((glyph) => (
          <span key={glyph}>{glyph}</span>
        ))}
      </div>

      <div className="hero__inner">
        <span className="eyebrow">
          <span className="eyebrow__spark" aria-hidden="true">✨</span>
          Say it without overthinking it
        </span>

        <h1 id="hero-title">
          Find the <em>exact</em> emoji you mean
        </h1>

        <p className="hero__lede">
          Search a feeling, a phrase, an object or an icon name. Every Unicode 17
          sequence and every Lucide vector, ranked by meaning — no account, no
          tracking, nothing leaves your device.
        </p>

        <div className="hero__search">
          {searchSlot}
          <div className="idea-chips">
            {ideas.map((idea) => (
              <button
                type="button"
                key={idea}
                className="idea-chip"
                aria-label={`Search for ${idea}`}
                onClick={() => onIdea(idea)}
              >
                {idea}
              </button>
            ))}
          </div>
        </div>

        <div className="hero__stats" aria-label="Catalog completeness">
          {stats.map((stat) => (
            <div className="stat-card" key={stat.label}>
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
