import { MARQUEE_DISCIPLINES } from "../data/portfolioData";

interface DisciplinesMarqueeProps {
  motionPaused: boolean;
}

export function DisciplinesMarquee({ motionPaused }: DisciplinesMarqueeProps) {
  const trackItems = [...MARQUEE_DISCIPLINES, ...MARQUEE_DISCIPLINES];

  return (
    <div
      aria-label="Disciplines overview"
      className="pointer-events-auto relative z-10 overflow-hidden border-y border-slate-200 bg-white/85 py-4 dark:border-white/10 dark:bg-[#090f20]/88"
    >
      <div
        className={`flex w-max items-center gap-8 whitespace-nowrap font-display text-lg italic text-[#475569] dark:text-[#aab0cf] ${
          motionPaused ? "animate-marquee animate-marquee-paused" : "animate-marquee"
        }`}
      >
        {trackItems.map((label, idx) => (
          <div key={`${label}-${idx}`} className="flex items-center gap-8">
            <span>{label}</span>
            <span
              aria-hidden="true"
              className="font-mono-code text-xs not-italic text-[#0d9488] dark:text-[#5eead4]"
            >
              ·
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
