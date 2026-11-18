import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { ETHOS_CHAPTERS, type ThemeMode } from "../data/portfolioData";

interface ChaptersSectionProps {
  theme: ThemeMode;
  onSelectChapterAccent: (hex: string) => void;
}

export function ChaptersSection({
  theme,
  onSelectChapterAccent,
}: ChaptersSectionProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const current = ETHOS_CHAPTERS[activeIndex];
  const activeColor = theme === "light" ? current.lightAccentHex : current.accentHex;

  const handleSelect = (idx: number) => {
    setActiveIndex(idx);
    const ch = ETHOS_CHAPTERS[idx];
    onSelectChapterAccent(theme === "light" ? ch.lightAccentHex : ch.accentHex);
  };

  return (
    <section
      id="about"
      className="pointer-events-none mx-auto max-w-[1200px] px-5 py-16 sm:px-8 lg:py-24"
    >
      <div
        id="craft"
        className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/92 p-6 sm:p-10 dark:border-white/10 dark:bg-[#0b1226]/92 transition-colors duration-300"
      >
        <div className="mb-8 border-b border-slate-200 pb-6 dark:border-white/10">
          <p className="font-mono-code text-xs tracking-[0.18em] text-[#6d28d9] dark:text-[#a78bfa]">
            Engineering Ethos &amp; Craft
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f4f5ff] sm:text-4xl">
            How I approach building software
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center">
          {/* Roman Numeral Interactive Rail */}
          <div
            role="tablist"
            aria-label="Engineering chapters"
            className="flex flex-row gap-2 overflow-x-auto pb-2 lg:col-span-4 lg:flex-col lg:gap-1.5 lg:pb-0"
          >
            {ETHOS_CHAPTERS.map((chapter, idx) => {
              const isActive = idx === activeIndex;
              const accent = theme === "light" ? chapter.lightAccentHex : chapter.accentHex;
              return (
                <button
                  key={chapter.roman}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleSelect(idx)}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3.5 text-left whitespace-nowrap shrink-0 transition-all duration-150 focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4] ${
                    isActive
                      ? "bg-[#f1f5f9] text-[#0f172a] dark:bg-[#131d3b] dark:text-[#f4f5ff]"
                      : "text-[#64748b] hover:bg-slate-100/80 hover:text-[#0f172a] dark:text-[#8b93b0] dark:hover:bg-white/5 dark:hover:text-[#dfe2f5]"
                  }`}
                >
                  <span
                    className="font-display text-lg font-semibold w-7 shrink-0"
                    style={{ color: isActive ? accent : undefined }}
                  >
                    {chapter.roman}
                  </span>
                  <span className="font-mono-code text-xs tracking-[0.12em]">
                    {chapter.domain}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Chapter Stage */}
          <div className="lg:col-span-8 lg:pl-6">
            <div className="font-mono-code text-xs tracking-[0.16em]" style={{ color: activeColor }}>
              {current.roman} · {current.domain}
            </div>
            <h3
              className="mt-3 font-display text-3xl font-semibold leading-tight tracking-tight text-[#0f172a] dark:text-[#f4f5ff] sm:text-4xl"
              style={{ textWrap: "balance" }}
            >
              {current.headline}
            </h3>
            <p className="mt-4 max-w-[60ch] text-base leading-relaxed text-[#475569] dark:text-[#aab0cf]">
              {current.body}
            </p>
            <div className="mt-7">
              <a
                href={current.ctaHref}
                className="inline-flex min-h-[42px] items-center gap-2 font-mono-code text-xs font-semibold tracking-wide transition-transform hover:translate-x-1 focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
                style={{ color: activeColor }}
              >
                <span>{current.ctaLabel}</span>
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
