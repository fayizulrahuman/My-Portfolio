import { useState } from "react";
import { Menu, Moon, Sun, X } from "lucide-react";
import { PROFILE_META, type ThemeMode } from "../data/portfolioData";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Work", href: "#work" },
  { label: "Craft", href: "#craft" },
  { label: "Stack", href: "#stack" },
  { label: "Contact", href: "#contact" },
];

interface TopNavProps {
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export function TopNav({ theme, onToggleTheme }: TopNavProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/90 bg-[#f5f6fa]/95 dark:border-white/10 dark:bg-[#070b16]/95 transition-colors duration-300">
      <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-8 px-5 py-3.5 sm:px-8">
        {/* Zone 1: Single-element logo mark */}
        <a
          href="#top"
          aria-label={`${PROFILE_META.wordmark} — Back to top`}
          className="inline-flex items-center shrink-0 rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
        >
          <img
            src="/assets/aistudio/1000827206_8K_594af516_594af516.png"
            alt={`${PROFILE_META.wordmark} logo`}
            className="h-9 w-auto object-contain drop-shadow-[0_2px_10px_rgba(34,211,238,0.2)]"
          />
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7 text-sm font-medium text-[#475569] dark:text-[#aab0cf]"
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="whitespace-nowrap shrink-0 transition-colors duration-150 hover:text-[#0d9488] dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Zone 3: Theme Switch + Mobile Menu Button */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            data-testid="theme-toggle"
            className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-3.5 text-xs font-medium text-[#0f172a] whitespace-nowrap shrink-0 transition-colors duration-150 hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/15 dark:bg-[#0b1226] dark:text-[#f4f5ff] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
          >
            {theme === "dark" ? (
              <>
                <Sun className="h-3.5 w-3.5 text-[#5eead4]" aria-hidden="true" />
                <span className="hidden sm:inline">Light</span>
              </>
            ) : (
              <>
                <Moon className="h-3.5 w-3.5 text-[#6d28d9]" aria-hidden="true" />
                <span className="hidden sm:inline">Dark</span>
              </>
            )}
          </button>

          <button
            type="button"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-300 bg-white text-[#0f172a] md:hidden dark:border-white/15 dark:bg-[#0b1226] dark:text-[#f4f5ff] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          aria-label="Mobile navigation"
          className="border-t border-slate-200 bg-[#f5f6fa] px-5 py-4 md:hidden dark:border-white/10 dark:bg-[#070b16]"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="flex min-h-[44px] items-center rounded-lg px-3 text-sm font-medium text-[#0f172a] hover:bg-slate-200/60 dark:text-[#dfe2f5] dark:hover:bg-white/5 dark:hover:text-[#5eead4]"
              >
                {link.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
