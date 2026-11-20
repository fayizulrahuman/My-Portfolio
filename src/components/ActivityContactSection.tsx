import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Check,
  Copy,
  Loader2,
  Mail,
  MessageSquare,
  User,
} from "lucide-react";
import { PROFILE_META, type ProfileStatsData } from "../data/portfolioData";
import { buildEmailJsPayload, validateContactForm } from "../utils/portfolioLogic";

interface ActivityContactSectionProps {
  stats: ProfileStatsData;
  repoCount: number;
}

function LinkedInIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5 shrink-0"
      aria-hidden="true"
    >
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
      <path d="M9 18c-4.51 2-5-2-7-2" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function XSocialIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="h-4.5 w-4.5"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

export function ActivityContactSection({
  stats,
  repoCount,
}: ActivityContactSectionProps) {
  const [copied, setCopied] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [submittedNote, setSubmittedNote] = useState<{
    name: string;
    email: string;
    deliveredVia?: "emailjs" | "local";
  } | null>(null);

  const handleCopyEmail = () => {
    navigator.clipboard?.writeText(PROFILE_META.email).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2200);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);

    const validation = validateContactForm({ name, email, message });
    if (!validation.valid) {
      setFormError(validation.error || "Please complete all fields.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: AbortSignal.timeout(10000),
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          message: message.trim(),
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        deliveredVia?: "emailjs" | "local";
        requiresBrowserSend?: boolean;
        emailJs?: {
          serviceId: string;
          templateId: string;
          publicKey: string;
          toEmail?: string;
        };
      };

      if (data.requiresBrowserSend && data.emailJs) {
        const emailRes = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify(
            buildEmailJsPayload(data.emailJs, {
              name: name.trim(),
              email: email.trim(),
              message: message.trim(),
            }),
          ),
        });
        if (!emailRes.ok) {
          const detail = await emailRes.text().catch(() => "");
          setFormError(
            detail
              ? `EmailJS could not deliver the message (${detail}).`
              : "EmailJS could not deliver the message. Please try again later.",
          );
          return;
        }
        setSubmittedNote({
          name: name.trim(),
          email: email.trim(),
          deliveredVia: "emailjs",
        });
        setName("");
        setEmail("");
        setMessage("");
        return;
      }

      if (!res.ok || !data.ok) {
        setFormError(data.error || "Unable to send your message right now.");
        return;
      }
      setSubmittedNote({
        name: name.trim(),
        email: email.trim(),
        deliveredVia: data.deliveredVia,
      });
      setName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      if (err instanceof DOMException && err.name === "TimeoutError") {
        setFormError("Request timed out while sending. Please try again.");
      } else {
        setFormError("Network error while sending message. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const displayRepoCount = Math.max(repoCount, stats.repos);
  const numberHighlights = [
    { number: String(displayRepoCount).padStart(2, "0"), label: "Public repositories" },
    { number: String(stats.contribs), label: "Yearly contributions" },
    { number: String(stats.commits), label: "Commits shipped" },
    { number: String(stats.stars_earned).padStart(2, "0"), label: "GitHub stars earned" },
  ];

  return (
    <section
      id="contact"
      className="pointer-events-none mx-auto max-w-300 px-5 pt-10 pb-20 sm:px-8 lg:pt-14 lg:pb-24"
    >
      {/* 03 · Editorial Numbers Band */}
      <div className="pointer-events-auto mb-12 rounded-2xl border border-slate-200 bg-white/94 px-6 py-8 sm:px-10 dark:border-white/10 dark:bg-[#0b1226]/92">
        <p className="font-mono-code text-xs tracking-[0.18em] text-[#6d28d9] dark:text-[#a78bfa]">
          03 · By the Numbers
        </p>
        <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
          {numberHighlights.map((item) => (
            <div
              key={item.label}
              className="border-t border-slate-200 pt-4 dark:border-white/10"
            >
              <div className="font-display text-4xl font-semibold text-[#0f172a] dark:text-[#f4f5ff] tabular-nums sm:text-5xl">
                {item.number}
              </div>
              <div className="mt-2 font-mono-code text-xs text-[#64748b] dark:text-[#8b93b0]">
                {item.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Card matching site palette with Left Links (Image 8) + Right Contact Form (Image 7) */}
      <div className="pointer-events-auto rounded-2xl border border-slate-200 bg-white/95 p-7 sm:p-11 dark:border-white/10 dark:bg-[#0b1226]/95">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
          {/* Left column: Headline, Direct Email + LinkedIn, Circular Social Icon Buttons */}
          <div className="lg:col-span-5">
            <p className="font-mono-code text-xs tracking-[0.18em] text-[#0d9488] dark:text-[#5eead4]">
              Next · Open to Collaborations &amp; Internships
            </p>

            <h2
              className="mt-3 font-display text-[clamp(2rem,3.9vw,3.15rem)] font-semibold leading-[1.06] tracking-tight text-[#0f172a] dark:text-[#f4f5ff]"
              style={{ textWrap: "balance" }}
            >
              Tell me what you&apos;re{" "}
              <span className="italic gradient-accent-text">trying to build.</span>
            </h2>

            <p className="mt-4 max-w-[44ch] text-[15px] leading-relaxed text-[#475569] dark:text-[#aab0cf]">
              Whether it&apos;s an AI/ML safety system, a React Native app, or a crisp full-stack product, reach out anytime.
            </p>

            {/* Stacked Email & LinkedIn rows (Image 8 style) */}
            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3">
                <a
                  href={`mailto:${PROFILE_META.email}`}
                  className="inline-flex items-center gap-3 text-sm font-medium text-[#0d9488] transition-opacity hover:opacity-80 dark:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-[#0d9488]"
                >
                  <Mail className="h-5 w-5 shrink-0" aria-hidden="true" />
                  <span className="break-all">{PROFILE_META.email}</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  aria-label="Copy email address"
                  title="Copy email address"
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-[#475569] transition-colors hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/10 dark:bg-[#121c38] dark:text-[#aab0cf] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4]"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-[#0d9488] dark:text-[#5eead4]" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>

              <div>
                <a
                  href={PROFILE_META.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-3 text-sm font-medium text-[#475569] transition-colors hover:text-[#0f172a] dark:text-[#aab0cf] dark:hover:text-[#f4f5ff] focus-visible:outline-2 focus-visible:outline-[#0d9488]"
                >
                  <LinkedInIcon />
                  <span>linkedin.com/in/fayizulrahuman</span>
                </a>
              </div>
            </div>

            {/* Circular outlined icon buttons: GitHub, Instagram, X (Image 8 style) */}
            <div className="mt-7 flex items-center gap-3.5">
              <a
                href={PROFILE_META.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub profile"
                title="GitHub"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-[#f8fafc] text-[#0f172a] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/15 dark:bg-[#070b16]/80 dark:text-[#dfe2f5] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
              >
                <GitHubIcon />
              </a>
              <a
                href={PROFILE_META.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram profile"
                title="Instagram (@fa.yix)"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-[#f8fafc] text-[#0f172a] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#be185d] hover:text-[#be185d] dark:border-white/15 dark:bg-[#070b16]/80 dark:text-[#dfe2f5] dark:hover:border-[#f0abfc] dark:hover:text-[#f0abfc] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
              >
                <InstagramIcon />
              </a>
              <a
                href={PROFILE_META.xUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X profile"
                title="X (@fayizulrahman)"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-300 bg-[#f8fafc] text-[#0f172a] transition-all duration-150 hover:-translate-y-0.5 hover:border-[#6d28d9] hover:text-[#6d28d9] dark:border-white/15 dark:bg-[#070b16]/80 dark:text-[#dfe2f5] dark:hover:border-[#a78bfa] dark:hover:text-[#a78bfa] focus-visible:outline-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
              >
                <XSocialIcon />
              </a>
            </div>
          </div>

          {/* Right column: Styled Contact Form Card (Image 7 layout matching site theme) */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-5 sm:p-7 dark:border-white/12 dark:bg-[#070b16]/90">
              {submittedNote ? (
                <div
                  role="status"
                  data-testid="contact-success"
                  className="flex flex-col items-start gap-4 py-6"
                >
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#0d9488]/15 text-[#0d9488] dark:bg-[#5eead4]/15 dark:text-[#5eead4]">
                    <Check className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="font-display text-2xl font-semibold text-[#0f172a] dark:text-[#f4f5ff]">
                      {submittedNote.deliveredVia === "emailjs"
                        ? `Email sent, ${submittedNote.name}.`
                        : `Message received, ${submittedNote.name}.`}
                    </h3>
                    <p className="mt-2 text-sm text-[#475569] dark:text-[#aab0cf]">
                      Thanks for writing in. I&apos;ll reply to{" "}
                      <span className="font-mono-code text-[#0d9488] dark:text-[#5eead4]">
                        {submittedNote.email}
                      </span>{" "}
                      soon.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubmittedNote(null)}
                    className="mt-2 inline-flex min-h-10 items-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-[#0f172a] transition-colors hover:border-[#0d9488] hover:text-[#0d9488] dark:border-white/15 dark:bg-[#0b1226] dark:text-[#f4f5ff] dark:hover:border-[#5eead4] dark:hover:text-[#5eead4]"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="relative">
                      <label htmlFor="contact-name" className="sr-only">
                        Your Name
                      </label>
                      <User
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#64748b] dark:text-[#8b93b0]"
                        aria-hidden="true"
                      />
                      <input
                        id="contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        maxLength={100}
                        placeholder="Your Name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-10 text-sm text-[#0f172a] placeholder:text-[#64748b] transition-colors focus:border-[#0d9488] focus:outline-none dark:border-white/12 dark:bg-[#0b1226] dark:text-[#f4f5ff] dark:placeholder:text-[#8b93b0] dark:focus:border-[#5eead4]"
                      />
                    </div>

                    <div className="relative">
                      <label htmlFor="contact-email" className="sr-only">
                        Your Email
                      </label>
                      <Mail
                        className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#64748b] dark:text-[#8b93b0]"
                        aria-hidden="true"
                      />
                      <input
                        id="contact-email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        maxLength={160}
                        placeholder="Your Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white pr-4 pl-10 text-sm text-[#0f172a] placeholder:text-[#64748b] transition-colors focus:border-[#0d9488] focus:outline-none dark:border-white/12 dark:bg-[#0b1226] dark:text-[#f4f5ff] dark:placeholder:text-[#8b93b0] dark:focus:border-[#5eead4]"
                      />
                    </div>
                  </div>

                  <div className="relative">
                    <label htmlFor="contact-message" className="sr-only">
                      Your Message
                    </label>
                    <MessageSquare
                      className="pointer-events-none absolute top-3.5 left-3.5 h-4 w-4 text-[#64748b] dark:text-[#8b93b0]"
                      aria-hidden="true"
                    />
                    <textarea
                      id="contact-message"
                      name="message"
                      rows={5}
                      maxLength={4000}
                      placeholder="Your Message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 bg-white pt-3 pr-4 pb-3 pl-10 text-sm leading-relaxed text-[#0f172a] placeholder:text-[#64748b] transition-colors focus:border-[#0d9488] focus:outline-none dark:border-white/12 dark:bg-[#0b1226] dark:text-[#f4f5ff] dark:placeholder:text-[#8b93b0] dark:focus:border-[#5eead4]"
                    />
                  </div>

                  {formError && (
                    <p
                      role="alert"
                      data-testid="contact-error"
                      className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3.5 py-2 text-xs font-medium text-rose-700 dark:text-rose-300"
                    >
                      {formError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0d9488] px-6 text-sm font-semibold text-white transition-all duration-150 hover:bg-[#0f766e] disabled:cursor-not-allowed disabled:opacity-70 dark:bg-[#5eead4] dark:text-[#070b16] dark:hover:bg-[#7af0dd] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0d9488] dark:focus-visible:outline-[#5eead4]"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Message</span>
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-10 flex flex-col gap-3 border-t border-slate-200 pt-6 font-mono-code text-xs text-[#64748b] sm:flex-row sm:items-center sm:justify-between dark:border-white/10 dark:text-[#8b93b0]">
          <span>© {new Date().getFullYear()} {PROFILE_META.fullName}</span>
          <span>{PROFILE_META.location} · IST (Asia/Kolkata)</span>
        </footer>
      </div>
    </section>
  );
}
