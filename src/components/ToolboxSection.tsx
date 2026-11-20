import { STACK_GROUPS, type ThemeMode } from "../data/portfolioData";

interface ToolboxSectionProps {
  theme: ThemeMode;
  onAccentChange: (hex: string) => void;
}

export function ToolboxSection({ theme, onAccentChange }: ToolboxSectionProps) {
  return (
    <section
      id="stack"
      className="pointer-events-none mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-20"
    >
      <div className="pointer-events-auto mb-8 flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white/92 px-6 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-white/10 dark:bg-[#0b1226]/92">
        <div>
          <p className="font-mono-code text-xs tracking-[0.18em] text-[#be185d] dark:text-[#f0abfc]">
            02 · Capabilities
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f4f5ff] sm:text-4xl">
            What I actually reach for
          </h2>
        </div>
        <p className="max-w-[44ch] text-sm text-[#475569] dark:text-[#aab0cf]">
          Tools I choose again across AI inference, mobile apps, and full-stack web systems.
        </p>
      </div>

      <div className="pointer-events-auto grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {STACK_GROUPS.map((group) => {
          const accent = theme === "light" ? group.lightAccentHex : group.accentHex;
          return (
            <div
              key={group.id}
              onMouseEnter={() => onAccentChange(accent)}
              className="flex flex-col rounded-2xl border border-slate-200 bg-white/94 p-6 transition-colors duration-200 hover:border-[#6d28d9]/45 dark:border-white/10 dark:bg-[#0b1226]/92 dark:hover:border-[#a78bfa]/50"
            >
              <div className="border-b border-slate-200 pb-4 dark:border-white/10">
                <div className="flex items-baseline justify-between gap-2">
                  <span
                    className="font-mono-code text-xs font-semibold tracking-[0.12em]"
                    style={{ color: accent }}
                  >
                    {group.indexLabel} · {group.title}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-[#64748b] dark:text-[#8b93b0]">
                  {group.focus}
                </p>
              </div>

              <ul className="mt-4 divide-y divide-slate-100 dark:divide-white/5">
                {group.items.map((tech) => (
                  <li
                    key={tech.name}
                    className="flex flex-col gap-0.5 py-2.5 text-sm"
                  >
                    <span className="font-medium text-[#0f172a] dark:text-[#f4f5ff]">
                      {tech.name}
                    </span>
                    <span className="text-xs text-[#64748b] dark:text-[#8b93b0]">
                      {tech.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
