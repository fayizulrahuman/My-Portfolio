import { useEffect, useState } from "react";
import { ArrowUpRight, ExternalLink, Star, X } from "lucide-react";
import type {
  ProjectCategory,
  ProjectItem,
  ThemeMode,
} from "../data/portfolioData";
import { filterProjects } from "../utils/portfolioLogic";

const FILTER_TABS: Array<{ id: ProjectCategory; label: string }> = [
  { id: "all", label: "All Work" },
  { id: "ai", label: "AI & Vision" },
  { id: "mobile", label: "Mobile" },
  { id: "fullstack", label: "Full-Stack" },
];

interface ProjectsSectionProps {
  theme: ThemeMode;
  projects: ProjectItem[];
  isLoading: boolean;
  onAccentChange: (hex: string) => void;
}

export function ProjectsSection({
  theme,
  projects,
  isLoading,
  onAccentChange,
}: ProjectsSectionProps) {
  const [activeFilter, setActiveFilter] = useState<ProjectCategory>("all");
  const [selectedProject, setSelectedProject] = useState<ProjectItem | null>(null);

  const visibleProjects = filterProjects(projects, activeFilter);

  useEffect(() => {
    if (!selectedProject) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedProject(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedProject]);

  const getProjectAccent = (p: ProjectItem) =>
    theme === "light" ? p.lightAccentHex : p.accentHex;

  const handleOpenProject = (project: ProjectItem) => {
    setSelectedProject(project);
    onAccentChange(getProjectAccent(project));
  };

  return (
    <section
      id="work"
      className="pointer-events-none mx-auto max-w-[1200px] px-5 py-14 sm:px-8 lg:py-20"
    >
      <div className="pointer-events-auto mb-8 flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white/92 px-6 py-5 sm:flex-row sm:items-end sm:justify-between dark:border-white/10 dark:bg-[#0b1226]/92">
        <div>
          <p className="font-mono-code text-xs tracking-[0.18em] text-[#0d9488] dark:text-[#5eead4]">
            01 · Selected Work &amp; Repositories
          </p>
          <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f4f5ff] sm:text-4xl">
            Things built to look after people
          </h2>
        </div>

        {/* Interactive segmented filter tabs */}
        <div
          role="tablist"
          aria-label="Filter projects by category"
          className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-[#f1f5f9] p-1 dark:border-white/10 dark:bg-[#070b16]"
        >
          {FILTER_TABS.map((tab) => {
            const active = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveFilter(tab.id)}
                className={`min-h-[38px] rounded-lg px-3.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4] ${
                  active
                    ? "bg-[#0d9488] text-white font-semibold dark:bg-[#5eead4] dark:text-[#070b16]"
                    : "text-[#475569] hover:text-[#0f172a] dark:text-[#aab0cf] dark:hover:text-[#f4f5ff]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div
          aria-busy="true"
          className="pointer-events-auto grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {[0, 1, 2, 3].map((slot) => (
            <div
              key={slot}
              className="h-64 animate-pulse rounded-2xl border border-slate-200 bg-white/80 p-7 dark:border-white/10 dark:bg-[#0b1226]/80"
            />
          ))}
        </div>
      ) : visibleProjects.length === 0 ? (
        <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/94 p-8 text-center dark:border-white/10 dark:bg-[#0b1226]/92">
          <p className="text-sm text-[#475569] dark:text-[#aab0cf]">
            No repositories matched this category yet.
          </p>
        </div>
      ) : (
        <div
          data-testid="projects-grid"
          className="pointer-events-auto grid grid-cols-1 gap-6 md:grid-cols-2"
        >
          {visibleProjects.map((project) => {
            const accent = getProjectAccent(project);
            return (
              <article
                key={project.id}
                onMouseEnter={() => onAccentChange(accent)}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-white/94 p-7 transition-all duration-200 hover:-translate-y-1 hover:border-[#6d28d9]/45 dark:border-white/10 dark:bg-[#0b1226]/92 dark:hover:border-[#a78bfa]/55"
              >
                <div>
                  <div className="flex items-center justify-between gap-4 font-mono-code text-xs">
                    <div className="flex flex-wrap items-center gap-2 text-[#64748b] dark:text-[#aab0cf]">
                      <span className="font-semibold" style={{ color: accent }}>
                        {project.indexLabel}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{project.primaryLanguage}</span>
                      <span aria-hidden="true">·</span>
                      <span>{project.tagline}</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[#0f172a] dark:text-[#dfe2f5] tabular-nums shrink-0">
                      <Star className="h-3.5 w-3.5" style={{ color: accent }} aria-hidden="true" />
                      <span>{project.stars}</span>
                    </span>
                  </div>

                  <h3 className="mt-4 font-display text-3xl font-semibold tracking-tight text-[#0f172a] dark:text-[#f4f5ff]">
                    {project.name}
                  </h3>

                  <p className="mt-3 text-[15px] leading-relaxed text-[#475569] dark:text-[#aab0cf]">
                    {project.description}
                  </p>

                  <p className="mt-3 font-mono-code text-xs text-[#64748b] dark:text-[#8b93b0]">
                    Constraint: {project.constraint}
                  </p>
                </div>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-5 dark:border-white/10">
                  <div className="font-mono-code text-xs text-[#64748b] dark:text-[#8b93b0]">
                    {project.stack.join(" · ")}
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenProject(project)}
                      className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-[#f8fafc] px-3.5 py-2 text-xs font-medium text-[#0f172a] whitespace-nowrap shrink-0 transition-colors hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/15 dark:bg-[#121c38] dark:text-[#f4f5ff] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
                    >
                      Case Study
                    </button>
                    {project.homepageUrl && (
                      <a
                        href={project.homepageUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open live site for ${project.name}`}
                        className="inline-flex min-h-[40px] items-center gap-1 text-xs font-medium text-[#475569] whitespace-nowrap shrink-0 transition-colors hover:text-[#0f172a] dark:text-[#aab0cf] dark:hover:text-[#f4f5ff] focus-visible:outline-2 focus-visible:outline-[#0d9488]"
                      >
                        <span>Live</span>
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                      </a>
                    )}
                    <a
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${project.name} on GitHub`}
                      className="inline-flex min-h-[40px] items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors hover:opacity-80 focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
                      style={{ color: accent }}
                    >
                      <span>GitHub</span>
                      <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Case Study / Architecture Modal */}
      {selectedProject && (
        <div
          className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4"
          onClick={() => setSelectedProject(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="project-modal-title"
            className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 dark:border-[#a78bfa]/35 dark:bg-[#0b1226]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className="font-mono-code text-xs font-medium"
                  style={{ color: getProjectAccent(selectedProject) }}
                >
                  {selectedProject.primaryLanguage} · {selectedProject.stack.join(" · ")}
                </div>
                <h3
                  id="project-modal-title"
                  className="mt-2 font-display text-3xl font-semibold text-[#0f172a] dark:text-[#f4f5ff]"
                >
                  {selectedProject.name}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close project details"
                onClick={() => setSelectedProject(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-[#0f172a] hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/15 dark:bg-[#121c38] dark:text-[#dfe2f5] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-[#0d9488]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="mt-4 text-base leading-relaxed text-[#475569] dark:text-[#dfe2f5]">
              {selectedProject.description}
            </p>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
              <h4 className="font-mono-code text-xs tracking-[0.14em] text-[#64748b] dark:text-[#8b93b0]">
                Engineering Constraint &amp; Architecture
              </h4>
              <p className="mt-2 text-sm leading-relaxed text-[#475569] dark:text-[#aab0cf]">
                {selectedProject.architecture}
              </p>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5 dark:border-white/10">
              <h4 className="font-mono-code text-xs tracking-[0.14em] text-[#64748b] dark:text-[#8b93b0]">
                Key Highlights
              </h4>
              <ul className="mt-3 space-y-2 text-sm text-[#0f172a] dark:text-[#dfe2f5]">
                {selectedProject.highlights.map((item) => (
                  <li key={item} className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="mt-1.5 h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: getProjectAccent(selectedProject) }}
                    />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-7 flex flex-wrap items-center justify-end gap-3 border-t border-slate-200 pt-5 dark:border-white/10">
              <button
                type="button"
                onClick={() => setSelectedProject(null)}
                className="min-h-[42px] rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-[#475569] hover:text-[#0f172a] dark:border-white/15 dark:text-[#aab0cf] dark:hover:text-[#f4f5ff] focus-visible:outline-2 focus-visible:outline-[#0d9488]"
              >
                Close
              </button>
              {selectedProject.homepageUrl && (
                <a
                  href={selectedProject.homepageUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-xs font-medium text-[#0f172a] hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/15 dark:text-[#f4f5ff] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4]"
                >
                  <span>Live Deployment</span>
                  <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              )}
              <a
                href={selectedProject.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-[#0d9488] px-5 py-2 text-xs font-semibold text-white hover:bg-[#0f766e] dark:bg-[#5eead4] dark:text-[#070b16] dark:hover:bg-[#8bf3e2] focus-visible:outline-2 focus-visible:outline-[#0d9488]"
              >
                <span>Open Repository on GitHub</span>
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
