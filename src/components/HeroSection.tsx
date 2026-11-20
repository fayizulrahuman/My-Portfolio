import { useEffect, useState } from "react";
import { ArrowDownRight } from "lucide-react";
import {
  CYCLING_DISCIPLINES,
  PROFILE_META,
  type ProfileStatsData,
} from "../data/portfolioData";
import { cycleDisciplineIndex } from "../utils/portfolioLogic";

interface HeroSectionProps {
  stats: ProfileStatsData;
  repoCount: number;
  motionPaused: boolean;
}

export function HeroSection({
  stats,
  repoCount,
  motionPaused,
}: HeroSectionProps) {
  const [roleIdx, setRoleIdx] = useState(0);

  useEffect(() => {
    if (motionPaused) return;
    const timer = window.setInterval(() => {
      setRoleIdx((prev) => cycleDisciplineIndex(prev, CYCLING_DISCIPLINES.length));
    }, 3200);
    return () => window.clearInterval(timer);
  }, [motionPaused]);

  return (
    <section
      id="top"
      className="pointer-events-none mx-auto flex min-h-[calc(100vh-76px)] max-w-[1200px] flex-col justify-between px-5 pt-10 pb-12 sm:px-8 lg:pt-14 lg:pb-16"
    >
      <div className="my-auto grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-8">
        {/* Open Editorial Left Typography directly on the ambient Three.js canvas */}
        <div className="pointer-events-auto lg:col-span-7">
          <p className="font-mono-code text-xs tracking-[0.18em] text-[#0d9488] dark:text-[#5eead4]">
            {PROFILE_META.availability} · {PROFILE_META.location}
          </p>

          <h1
            className="mt-5 font-display text-[clamp(3.15rem,7.2vw,6.15rem)] leading-[0.94] tracking-[-0.03em] text-[#0f172a] dark:text-[#f4f5ff]"
            style={{ textWrap: "balance" }}
          >
            Fayizul{" "}
            <span className="block italic gradient-accent-text">
              Rahuman S.
            </span>
          </h1>

          {/* Interactive cycling discipline */}
          <div className="mt-7 flex flex-wrap items-baseline gap-x-4 gap-y-2">
            <span className="font-mono-code text-xs tracking-[0.14em] text-[#64748b] dark:text-[#8b93b0]">
              Currently
            </span>
            <button
              type="button"
              onClick={() =>
                setRoleIdx((prev) => cycleDisciplineIndex(prev, CYCLING_DISCIPLINES.length))
              }
              className="text-left font-display text-2xl font-medium text-[#0f172a] underline decoration-[#0d9488]/40 underline-offset-8 transition-colors hover:text-[#0d9488] dark:text-[#f4f5ff] dark:decoration-[#5eead4]/40 dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
            >
              {CYCLING_DISCIPLINES[roleIdx]}
            </button>
          </div>

          <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-[#475569] dark:text-[#aab0cf] sm:text-lg">
            {PROFILE_META.tagline}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#work"
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0d9488] px-5 py-2.5 text-sm font-semibold text-white whitespace-nowrap shrink-0 transition-transform duration-150 hover:-translate-y-0.5 hover:bg-[#0f766e] dark:bg-[#5eead4] dark:text-[#070b16] dark:hover:bg-[#8bf3e2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
            >
              <span>Explore Work</span>
              <ArrowDownRight className="h-4 w-4" aria-hidden="true" />
            </a>
            <a
              href="#contact"
              className="inline-flex min-h-[44px] items-center rounded-lg border border-slate-300 bg-white/95 px-5 py-2.5 text-sm font-medium text-[#0f172a] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#6d28d9] hover:text-[#6d28d9] dark:border-white/15 dark:bg-[#0b1226]/95 dark:text-[#f4f5ff] dark:hover:border-[#a78bfa] dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
            >
              Get in Touch
            </a>
            <a
              href={PROFILE_META.githubUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center px-2.5 py-2 text-sm font-medium text-[#475569] whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#0f172a] dark:text-[#aab0cf] dark:hover:text-[#f4f5ff] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
            >
              GitHub ↗
            </a>
          </div>
        </div>

        {/* Right column: Unobstructed focal window into the 3D Orbital Lattice + Topographic Wave */}
        <div className="pointer-events-none hidden min-h-[380px] lg:col-span-5 lg:block" />
      </div>

      {/* Bottom editorial horizon anchor strip */}
      <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-300/80 pt-4 font-mono-code text-xs text-[#64748b] dark:border-white/12 dark:text-[#8b93b0] sm:mt-8 sm:pt-5">
        <span>B.Tech CSE (AI &amp; ML) · CE Attingal · KTU</span>
        <a
          href="#about"
          className="hidden sm:inline-block tracking-[0.18em] text-[#475569] transition-colors hover:text-[#0d9488] dark:text-[#aab0cf] dark:hover:text-[#5eead4]"
        >
          Scroll ↓
        </a>
        <span className="hidden sm:inline tabular-nums">
          {String(repoCount).padStart(2, "0")} Public Builds · {stats.contribs} Yearly Contributions
        </span>
      </div>
    </section>
  );
}
