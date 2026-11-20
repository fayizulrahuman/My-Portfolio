import fs from "node:fs";
import path from "node:path";

export const GITHUB_USER =
  process.env.GITHUB_USERNAME?.trim() || "fayizulrahuman";
const MAX_REPOS = 6;
const EXCLUDE = new Set([GITHUB_USER, `${GITHUB_USER}.github.io`]);

const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace";
const SANS = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const COLORS = ["#5eead4", "#a78bfa", "#f0abfc", "#fbbf24", "#60a5fa", "#fb7185"];
const TEAL = "#5eead4";
const VIOLET = "#a78bfa";
const PINK = "#f0abfc";
const AMBER = "#fbbf24";
const BLUE = "#60a5fa";
const ROSE = "#fb7185";
const MUTED = "#8b93b0";

export interface GitHubStats {
  stars_earned: number;
  starred: number;
  repos: number;
  contribs: number;
  commits: number;
  contrib_repos: number;
}

export interface RepoSummary {
  name: string;
  description: string | null;
  language: string | null;
  stargazers_count: number;
  topics?: string[];
  fork?: boolean;
  archived?: boolean;
}

export interface ProjectOverride {
  desc?: string;
  chips?: string[];
}

export const DEMO_STATS: GitHubStats = {
  stars_earned: 8,
  starred: 13,
  repos: 9,
  contribs: 41,
  commits: 26,
  contrib_repos: 8,
};

const DEMO_CONTRIB_COUNTS = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 2, 6, 0, 0, 7, 3];
const DEMO_CONTRIB_LABELS = [
  ...Array.from({ length: 13 }, (_, i) => String(19 + i)),
  ...Array.from({ length: 18 }, (_, i) => String(1 + i)),
];

export const DEMO_CONTRIB_DAYS: Array<[string, number]> = DEMO_CONTRIB_LABELS.map((label, i) => [
  label,
  DEMO_CONTRIB_COUNTS[i] ?? 0,
]);

export const DEMO_REPOS: RepoSummary[] = [
  {
    name: "fallguard",
    description: "AI-powered, privacy-first fall detection for the elderly.",
    language: "Python",
    stargazers_count: 1,
    topics: [],
  },
  {
    name: "VitalSync",
    description: "VitalSync is a unified mobile health platform.",
    language: "JavaScript",
    stargazers_count: 1,
    topics: [],
  },
  {
    name: "hidden-gems",
    description: "A full-stack travel app.",
    language: "JavaScript",
    stargazers_count: 1,
    topics: ["nodejs", "mongodb", "maplibre"],
  },
  {
    name: "fintrack",
    description: "FinTrack - Smart Personal Expense Manager.",
    language: "TypeScript",
    stargazers_count: 2,
    topics: [],
  },
];

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function wrapText(text: string, width: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function shortenDescription(text: string | null | undefined, limit = 165): string {
  const normalized = (text || "No description yet.").split(/\s+/).join(" ").trim();
  if (normalized.length <= limit) return normalized;
  const slice = normalized.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  const trimmed = lastSpace > 0 ? slice.slice(0, lastSpace) : slice;
  return `${trimmed.replace(/[.,;:]+$/, "")}…`;
}

const STATS_QUERY = `query($login:String!){user(login:$login){
 repositories(ownerAffiliations:OWNER,isFork:false,first:100){totalCount nodes{stargazerCount}}
 starredRepositories{totalCount}
 contributionsCollection{totalCommitContributions totalPullRequestContributions totalIssueContributions
   totalRepositoriesWithContributedCommits contributionCalendar{totalContributions}}}}`;

export async function fetchStats(token: string): Promise<GitHubStats> {
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "profile-stats",
    },
    body: JSON.stringify({ query: STATS_QUERY, variables: { login: GITHUB_USER } }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL stats request failed (${res.status})`);
  }
  const payload = (await res.json()) as {
    data?: {
      user?: {
        repositories: { totalCount: number; nodes: Array<{ stargazerCount: number }> };
        starredRepositories: { totalCount: number };
        contributionsCollection: {
          totalCommitContributions: number;
          totalRepositoriesWithContributedCommits: number;
          contributionCalendar: { totalContributions: number };
        };
      };
    };
  };
  const user = payload.data?.user;
  if (!user) throw new Error("GitHub GraphQL response missing user");
  const cc = user.contributionsCollection;
  return {
    stars_earned: user.repositories.nodes.reduce((sum, r) => sum + r.stargazerCount, 0),
    starred: user.starredRepositories.totalCount,
    repos: user.repositories.totalCount,
    contribs: cc.contributionCalendar.totalContributions,
    commits: cc.totalCommitContributions,
    contrib_repos: cc.totalRepositoriesWithContributedCommits,
  };
}

export function renderStatsSvg(d: GitHubStats): string {
  const W = 1200;
  const H = 330;
  const tiles: Array<[string, number, string, string]> = [
    ["Stars earned", d.stars_earned, "stars others gave your repos", TEAL],
    ["Repos you starred", d.starred, "the count on your Stars tab", VIOLET],
    ["Public repos", d.repos, "owned by you, forks excluded", PINK],
    ["Contributions", d.contribs, "in the last year", AMBER],
    ["Commits", d.commits, "in the last year", BLUE],
    ["Repos worked on", d.contrib_repos, "with commits, last year", ROSE],
  ];

  let body = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b16"/><stop offset="1" stop-color="#160f2e"/></linearGradient>
<radialGradient id="g1" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="${VIOLET}" stop-opacity=".25"/><stop offset="1" stop-color="${VIOLET}" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" rx="24" fill="url(#bg)"/><rect width="${W}" height="${H}" rx="24" fill="url(#g1)"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="23" fill="none" stroke="${VIOLET}" stroke-opacity=".22"/>
<text x="40" y="52" font-family="${SERIF}" font-size="30" fill="#f4f5ff">GitHub <tspan font-style="italic" fill="${TEAL}">at a glance</tspan></text>
<text x="${W - 40}" y="50" text-anchor="end" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.5">live from the GitHub API</text>`;

  const cw = 352;
  const ch = 112;
  const gap = 22;

  tiles.forEach(([label, val, sub, color], i) => {
    const x = 40 + (i % 3) * (cw + gap);
    const y = 84 + Math.floor(i / 3) * (ch + 16);
    const t = (0.15 * i).toFixed(2);
    body += `<g opacity="0"><animate attributeName="opacity" values="0;1" dur="0.7s" begin="${t}s" fill="freeze"/>`;
    body += `<rect x="${x}" y="${y}" width="${cw}" height="${ch}" rx="16" fill="#0b1226" stroke="${color}" stroke-opacity=".45"/><rect x="${x}" y="${y + 20}" width="4" height="${ch - 40}" rx="2" fill="${color}"/>`;
    body += `<text x="${x + 26}" y="${y + 34}" font-family="${MONO}" font-size="12" fill="${color}" letter-spacing="1.5">${escapeHtml(label)}</text>`;
    body += `<text x="${x + 26}" y="${y + 82}" font-family="${SERIF}" font-size="50" fill="#f4f5ff">${val}</text>`;
    body += `<text x="${x + cw - 22}" y="${y + 82}" text-anchor="end" font-family="${SANS}" font-size="12.5" fill="${MUTED}">${escapeHtml(sub)}</text>`;
    body += `<circle cx="${x + cw - 24}" cy="${y + 28}" r="4" fill="${color}"><animate attributeName="opacity" values="1;.2;1" dur="2.8s" begin="${t}s" repeatCount="indefinite"/></circle></g>`;
  });

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="GitHub stats">${body}</svg>`;
}

const CONTRIB_QUERY = `query($login:String!,$from:DateTime!,$to:DateTime!){user(login:$login){contributionsCollection(from:$from,to:$to){contributionCalendar{weeks{contributionDays{date contributionCount}}}}}}`;

export async function fetchContrib(token: string, ndays = 31): Promise<Array<[string, number]>> {
  const end = new Date();
  const start = new Date(end.getTime() - (ndays + 1) * 86400_000);
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": "contrib-graph",
    },
    body: JSON.stringify({
      query: CONTRIB_QUERY,
      variables: { login: GITHUB_USER, from: start.toISOString(), to: end.toISOString() },
    }),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) {
    throw new Error(`GitHub GraphQL contrib request failed (${res.status})`);
  }
  const payload = (await res.json()) as {
    data?: {
      user?: {
        contributionsCollection: {
          contributionCalendar: {
            weeks: Array<{ contributionDays: Array<{ date: string; contributionCount: number }> }>;
          };
        };
      };
    };
  };
  const weeks = payload.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) throw new Error("GitHub GraphQL response missing contributionsCalendar");

  const dayMap = new Map<string, number>();
  for (const w of weeks) {
    for (const d of w.contributionDays) {
      dayMap.set(d.date, d.contributionCount);
    }
  }

  const out: Array<[string, number]> = [];
  for (let i = ndays - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 86400_000);
    const iso = d.toISOString().slice(0, 10);
    out.push([String(d.getUTCDate()), dayMap.get(iso) ?? 0]);
  }
  return out;
}

export function renderContribSvg(days: Array<[string, number]>, total: number): string {
  const W = 1200;
  const H = 360;
  const L = 64;
  const R = 1150;
  const T = 96;
  const B = 292;
  const n = days.length;
  const ymax = Math.max(5, ...days.map(([, c]) => c));
  const xs = days.map((_, i) => L + (i * (R - L)) / (n - 1));
  const ys = days.map(([, c]) => B - (c / ymax) * (B - T));

  let d = `M${xs[0].toFixed(1)},${ys[0].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    d += ` C${mx.toFixed(1)},${ys[i].toFixed(1)} ${mx.toFixed(1)},${ys[i + 1].toFixed(1)} ${xs[i + 1].toFixed(1)},${ys[i + 1].toFixed(1)}`;
  }
  const area = `${d} L${xs[xs.length - 1].toFixed(1)},${B} L${xs[0].toFixed(1)},${B} Z`;
  const CYC = 10;
  const D = 0.45;
  const anim = (attr: string, vals: string, kts: string) =>
    `<animate attributeName="${attr}" dur="${CYC}s" repeatCount="indefinite" values="${vals}" keyTimes="${kts}"/>`;

  const seglen: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    const mx = (xs[i] + xs[i + 1]) / 2;
    const P: Array<[number, number]> = [
      [xs[i], ys[i]],
      [mx, ys[i]],
      [mx, ys[i + 1]],
      [xs[i + 1], ys[i + 1]],
    ];
    let prev = P[0];
    let ln = 0;
    for (let k = 1; k <= 40; k++) {
      const t = k / 40;
      const u = 1 - t;
      const x = u ** 3 * P[0][0] + 3 * u * u * t * P[1][0] + 3 * u * t * t * P[2][0] + t ** 3 * P[3][0];
      const y = u ** 3 * P[0][1] + 3 * u * u * t * P[1][1] + 3 * u * t * t * P[2][1] + t ** 3 * P[3][1];
      ln += Math.hypot(x - prev[0], y - prev[1]);
      prev = [x, y];
    }
    seglen.push(ln);
  }
  const tot = seglen.reduce((a, b) => a + b, 0) || 1;
  const cum = [0];
  for (const sl of seglen) cum.push(cum[cum.length - 1] + sl / tot);

  let pts = "";
  days.forEach(([, c], i) => {
    const x = xs[i];
    const y = ys[i];
    const st = cum[i] * D;
    const kt = `0;${st.toFixed(4)};${Math.min(st + 0.012, 0.9).toFixed(4)};0.92;0.97;1`;
    const fade = anim("opacity", "0;0;1;1;0;0", kt);
    if (c > 0) {
      pts += `<g opacity="0">${fade}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="${PINK}" fill-opacity=".18"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="5" fill="${PINK}" stroke="#0b1020" stroke-width="2"/>`;
      pts += `<text x="${x.toFixed(1)}" y="${(y - 16).toFixed(1)}" text-anchor="middle" font-family="${MONO}" font-size="13" font-weight="700" fill="#f4f5ff">${c}</text></g>`;
    } else {
      pts += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3" fill="${VIOLET}" opacity="0">${fade}</circle>`;
    }
  });

  const defs = `<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b16"/><stop offset="1" stop-color="#160f2e"/></linearGradient>
<linearGradient id="ln" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${TEAL}"/><stop offset=".55" stop-color="${VIOLET}"/><stop offset="1" stop-color="${PINK}"/></linearGradient>
<linearGradient id="ar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${VIOLET}" stop-opacity=".42"/><stop offset="1" stop-color="${VIOLET}" stop-opacity="0"/></linearGradient>
<radialGradient id="g1" cx=".85" cy=".1" r=".7"><stop offset="0" stop-color="${VIOLET}" stop-opacity=".25"/><stop offset="1" stop-color="${VIOLET}" stop-opacity="0"/></radialGradient>
<filter id="blur"><feGaussianBlur stdDeviation="5"/></filter>
</defs>`;

  let b =
    defs +
    `
<rect width="${W}" height="${H}" rx="24" fill="url(#bg)"/><rect width="${W}" height="${H}" rx="24" fill="url(#g1)"/>
<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="23" fill="none" stroke="${VIOLET}" stroke-opacity=".22"/>
<text x="40" y="52" font-family="${SERIF}" font-size="30" fill="#f4f5ff">Contribution <tspan font-style="italic" fill="url(#ln)">graph</tspan></text>
<text x="${W - 40}" y="50" text-anchor="end" font-family="${MONO}" font-size="12.5" fill="${MUTED}" letter-spacing="1.5">${total} contributions · last ${n} days</text>`;

  const steps = ymax <= 7 ? 8 : 6;
  for (let k = 0; k < steps; k++) {
    const v = ymax <= 7 ? k : Math.round((k * ymax) / 5);
    const y = B - (v / ymax) * (B - T);
    b += `<line x1="${L}" y1="${y.toFixed(1)}" x2="${R}" y2="${y.toFixed(1)}" stroke="#fff" stroke-opacity=".06" stroke-dasharray="3 6"/><text x="${L - 14}" y="${(y + 4).toFixed(1)}" text-anchor="end" font-family="${MONO}" font-size="11" fill="${MUTED}">${v}</text>`;
  }

  days.forEach(([lab], i) => {
    b += `<text x="${xs[i].toFixed(1)}" y="${B + 22}" text-anchor="middle" font-family="${MONO}" font-size="10.5" fill="${TEAL}" fill-opacity=".8">${escapeHtml(lab)}</text>`;
  });

  b += `<text x="${(L + R) / 2}" y="${B + 46}" text-anchor="middle" font-family="${MONO}" font-size="11" fill="${MUTED}" letter-spacing="3">DAYS</text>`;
  b += `<path d="${area}" fill="url(#ar)" opacity="0">${anim("opacity", "0;0;1;1;0;0", `0;${(D - 0.04).toFixed(3)};${(D + 0.1).toFixed(3)};0.92;0.97;1`)}</path>`;

  for (const [sw, op, extra] of [
    [7, ".6", ' filter="url(#blur)"'],
    [3.2, "1", ""],
  ] as const) {
    b +=
      `<path pathLength="1" d="${d}" fill="none" stroke="url(#ln)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" stroke-opacity="${op}" stroke-dasharray="1" stroke-dashoffset="1"${extra}>` +
      anim("stroke-dashoffset", "1;0;0", `0;${D};1`) +
      anim("opacity", "1;1;0;0", "0;0.92;0.97;1") +
      `</path>`;
  }

  b += pts;
  b +=
    `<circle r="7" fill="#fff" opacity="0"><animateMotion dur="${CYC}s" repeatCount="indefinite" calcMode="linear" keyPoints="0;1;1" keyTimes="0;${D};1" path="${d}"/>` +
    anim("opacity", "1;1;0;0", `0;${D};${D + 0.04};1`) +
    `</circle>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Animated contribution graph">${b}</svg>`;
}

export function renderProjectCardSvg(
  repo: string,
  desc: string,
  chips: string[],
  stars: number,
  color: string,
): string {
  const W = 580;
  const H = 240;
  let b = `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b16"/><stop offset="1" stop-color="#160f2e"/></linearGradient>
<radialGradient id="g1" cx=".8" cy=".4" r=".6"><stop offset="0" stop-color="#a78bfa" stop-opacity=".3"/><stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></radialGradient></defs>
<rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="20" fill="url(#bg)" stroke="${color}" stroke-opacity=".45"/><rect x="2" y="2" width="${W - 4}" height="${H - 4}" rx="20" fill="url(#g1)"/>
<circle cx="${W - 34}" cy="46" r="5" fill="${color}"><animate attributeName="opacity" values="1;.2;1" dur="2.6s" repeatCount="indefinite"/></circle>`;
  if (stars) {
    b += `<text x="${W - 52}" y="51" text-anchor="end" font-family="${MONO}" font-size="13" fill="#e8eaf6">★ ${stars}</text>`;
  }
  b += `<text x="32" y="48" font-family="${MONO}" font-size="12" fill="${color}" letter-spacing="2">${escapeHtml((chips[0] ?? "repository").toLowerCase())}</text>`;
  b += `<text x="32" y="94" font-family="${SERIF}" font-size="36" fill="#f4f5ff" letter-spacing="-.5">${escapeHtml(repo)}</text>`;
  let y = 126;
  for (const line of wrapText(desc, 62).slice(0, 3)) {
    b += `<text x="32" y="${y}" font-family="${SANS}" font-size="14.5" fill="#aab0cf">${escapeHtml(line)}</text>`;
    y += 22;
  }
  let x = 32;
  for (const ch of chips.slice(0, 3)) {
    const w = ch.length * 7.4 + 24;
    b += `<rect x="${x}" y="190" width="${Math.round(w)}" height="28" rx="14" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-opacity=".4"/>`;
    b += `<text x="${Math.round(x + w / 2)}" y="209" text-anchor="middle" font-family="${MONO}" font-size="12" fill="#e8eaf6">${escapeHtml(ch)}</text>`;
    x += w + 10;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(repo)}">${b}</svg>`;
}

export async function fetchRepos(token?: string): Promise<RepoSummary[]> {
  const headers: Record<string, string> = {
    "User-Agent": "profile-readme",
    Accept: "application/vnd.github+json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(
    `https://api.github.com/users/${encodeURIComponent(GITHUB_USER)}/repos?per_page=100&sort=pushed`,
    { headers, signal: AbortSignal.timeout(8000) },
  );
  if (!res.ok) {
    throw new Error(`GitHub REST repos request failed (${res.status})`);
  }
  return (await res.json()) as RepoSummary[];
}

export async function updateProjects(
  rootDir: string,
  options: { demo?: boolean; token?: string; writeFiles?: boolean } = {},
): Promise<string[]> {
  const { demo = false, token, writeFiles = true } = options;
  const rawRepos = demo ? DEMO_REPOS : await fetchRepos(token);
  const repos = rawRepos
    .filter((r) => !r.fork && !r.archived && !EXCLUDE.has(r.name))
    .slice(0, MAX_REPOS);

  const overridePath = path.join(rootDir, "scripts", "projects.override.json");
  let overrides: Record<string, ProjectOverride> = {};
  if (fs.existsSync(overridePath)) {
    overrides = JSON.parse(fs.readFileSync(overridePath, "utf8")) as Record<string, ProjectOverride>;
  }

  const cardsDir = path.join(rootDir, "assets", "cards");
  if (writeFiles) {
    fs.mkdirSync(cardsDir, { recursive: true });
    for (const file of fs.readdirSync(cardsDir)) {
      if (file.endsWith(".svg")) {
        fs.unlinkSync(path.join(cardsDir, file));
      }
    }
  }

  const overrideMap = new Map<string, ProjectOverride>(
    Object.entries(overrides).map(([key, val]) => [key.toLowerCase(), val]),
  );

  const cells: string[] = [];
  repos.forEach((r, i) => {
    const o = overrideMap.get(r.name.toLowerCase()) ?? {};
    const chips =
      o.chips && o.chips.length > 0
        ? o.chips
        : r.topics && r.topics.length > 0
          ? r.topics.slice(0, 3)
          : r.language
            ? [r.language]
            : [];
    const desc = o.desc || shortenDescription(r.description);
    const svg = renderProjectCardSvg(
      r.name,
      desc,
      chips,
      r.stargazers_count ?? 0,
      COLORS[i % COLORS.length],
    );
    if (writeFiles) {
      fs.writeFileSync(path.join(cardsDir, `${r.name}.svg`), svg, "utf8");
    }
    cells.push(
      `<td width="50%"><a href="https://github.com/${GITHUB_USER}/${r.name}"><img src="assets/cards/${r.name}.svg" alt="${escapeHtml(r.name)}"/></a></td>`,
    );
  });

  if (writeFiles) {
    const rows: string[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      const pair = cells.slice(i, i + 2);
      const pad = pair.length === 1 ? '\n<td width="50%"></td>' : "";
      rows.push(`<tr>\n${pair.join("\n")}${pad}\n</tr>`);
    }
    const block = `<!--PROJECTS:START-->\n<table>\n${rows.join("\n")}\n</table>\n<!--PROJECTS:END-->`;
    const readmePath = path.join(rootDir, "README.md");
    const md = fs.readFileSync(readmePath, "utf8");
    const startIdx = md.indexOf("<!--PROJECTS:START-->");
    const endMarker = "<!--PROJECTS:END-->";
    const endIdx = md.indexOf(endMarker);
    if (startIdx !== -1 && endIdx !== -1) {
      const updated = md.slice(0, startIdx) + block + md.slice(endIdx + endMarker.length);
      fs.writeFileSync(readmePath, updated, "utf8");
    }
  }

  return repos.map((r) => r.name);
}

export async function refreshAllAssets(
  rootDir: string,
  options: { demo?: boolean; token?: string } = {},
): Promise<{ stats: GitHubStats; contribTotal: number; cards: string[] }> {
  const token = options.token ?? process.env.GITHUB_TOKEN;
  const useDemo = options.demo || !token;

  const stats = useDemo ? DEMO_STATS : await fetchStats(token);
  fs.writeFileSync(path.join(rootDir, "assets", "stats.svg"), renderStatsSvg(stats), "utf8");

  const days = useDemo ? DEMO_CONTRIB_DAYS : await fetchContrib(token);
  const contribTotal = days.reduce((sum, [, c]) => sum + c, 0);
  fs.writeFileSync(
    path.join(rootDir, "assets", "contrib.svg"),
    renderContribSvg(days, contribTotal),
    "utf8",
  );

  const cards = await updateProjects(rootDir, {
    demo: useDemo,
    token,
    writeFiles: true,
  });

  return { stats, contribTotal, cards };
}
