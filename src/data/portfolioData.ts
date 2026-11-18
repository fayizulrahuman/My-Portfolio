export type ThemeMode = "dark" | "light";
export type ProjectCategory = "all" | "ai" | "mobile" | "fullstack";
export type SceneMode = "topography" | "lattice";

export interface ProjectItem {
  id: string;
  indexLabel: string;
  name: string;
  tagline: string;
  description: string;
  architecture: string;
  constraint: string;
  category: Exclude<ProjectCategory, "all">;
  primaryLanguage: string;
  stars: number;
  stack: string[];
  accentHex: string;
  lightAccentHex: string;
  githubUrl: string;
  homepageUrl?: string;
  updatedAt?: string;
  highlights: string[];
}

export interface EthosChapter {
  roman: string;
  domain: string;
  headline: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  accentHex: string;
  lightAccentHex: string;
}

export interface StackGroup {
  id: string;
  indexLabel: string;
  title: string;
  focus: string;
  accentHex: string;
  lightAccentHex: string;
  items: Array<{ name: string; role: string }>;
}

export interface ProfileStatsData {
  stars_earned: number;
  starred: number;
  repos: number;
  contribs: number;
  commits: number;
  contrib_repos: number;
}

export interface ContributionDay {
  label: string;
  count: number;
}

export const PROFILE_META = {
  fullName: "Fayizul Rahuman S.",
  wordmark: "Fayizul Rahuman",
  handle: "fayizulrahuman",
  availability: "Open for collaborations & internships",
  location: "Attingal, Kerala, India",
  roleLine: "AI/ML student · Full-stack & mobile builder",
  tagline: "Building tech that keeps people safe, healthy and curious.",
  education: "B.Tech CSE (AI & ML) · College of Engineering Attingal · APJ KTU · Semester 7",
  principle: "Build things that look after people.",
  email: "fayizulrahuman2005@gmail.com",
  githubUrl: "https://github.com/fayizulrahuman",
  linkedinUrl: "https://linkedin.com/in/fayizulrahuman",
  instagramUrl: "https://instagram.com/fa.yix",
  xUrl: "https://x.com/fayizulrahman",
};

export const CYCLING_DISCIPLINES = [
  "AI & Computer Vision Builder",
  "Full-Stack Web Developer",
  "React Native Mobile Maker",
  "CSE (AI & ML) Student",
];

export const MARQUEE_DISCIPLINES = [
  "AI & Machine Learning",
  "MediaPipe Computer Vision",
  "Full-Stack TypeScript",
  "React Native & Expo",
  "FastAPI Inference",
  "Geospatial Web Apps",
];

export const ETHOS_CHAPTERS: EthosChapter[] = [
  {
    roman: "I",
    domain: "Safety & Vision",
    headline: "Tech that looks after people.",
    body: "Models matter most when they protect privacy and act fast in real rooms. With FallGuard, pose landmarks stay on-device—turning an old smartphone into a silent guardian rather than a surveillance feed.",
    ctaLabel: "Inspect FallGuard",
    ctaHref: "#work",
    accentHex: "#5eead4",
    lightAccentHex: "#0d9488",
  },
  {
    roman: "II",
    domain: "Mobile Health",
    headline: "Built for everyday pockets, not flagship specs.",
    body: "From emergency blood donor coordination and medication alerts in VitalSync to clean month-end ledger archiving in FinTrack, I build cross-platform React Native apps that stay crisp and reliable on any phone.",
    ctaLabel: "Explore Mobile Work",
    ctaHref: "#work",
    accentHex: "#a78bfa",
    lightAccentHex: "#6d28d9",
  },
  {
    roman: "III",
    domain: "Spatial Systems",
    headline: "Context-aware APIs from database to map tile.",
    body: "Hidden Gems pairs Express and MongoDB geospatial queries with MapLibre vector layers, live road distance, and local weather—turning quiet community discoveries into an interactive travel atlas.",
    ctaLabel: "View Full-Stack Stack",
    ctaHref: "#stack",
    accentHex: "#f0abfc",
    lightAccentHex: "#be185d",
  },
  {
    roman: "IV",
    domain: "Study & Craft",
    headline: "Bridging AI coursework with shipped software.",
    body: "Currently in Semester 7 of B.Tech CSE (AI & ML) at College of Engineering Attingal (APJ KTU), balancing neural network foundations with hands-on shipping across Python, FastAPI, Node.js, and TypeScript.",
    ctaLabel: "Start a Conversation",
    ctaHref: "#contact",
    accentHex: "#fbbf24",
    lightAccentHex: "#b45309",
  },
];

export const PROJECTS: ProjectItem[] = [
  {
    id: "fallguard",
    indexLabel: "01",
    name: "fallguard",
    tagline: "AI-powered elderly fall detection",
    constraint: "Zero raw video frames leave the room",
    description:
      "Privacy-first fall detection for the elderly. Turns an old phone into a smart safety camera and sends Telegram alerts with stick-figure snapshots.",
    architecture:
      "Runs on-device pose landmark extraction via MediaPipe so raw video frames never leave the room, streaming lightweight skeletal coordinates to a FastAPI detector and React monitoring dashboard.",
    category: "ai",
    primaryLanguage: "Python",
    stars: 1,
    stack: ["MediaPipe", "FastAPI", "React"],
    accentHex: "#5eead4",
    lightAccentHex: "#0d9488",
    githubUrl: "https://github.com/fayizulrahuman/fallguard",
    highlights: [
      "Zero-raw-video privacy model using stick-figure skeletal snapshots",
      "Real-time Telegram caregiver alert pipeline on confirmed fall posture",
      "Repurposes older smartphones into dedicated room monitors",
    ],
  },
  {
    id: "VitalSync",
    indexLabel: "02",
    name: "VitalSync",
    tagline: "Unified mobile health & blood network",
    constraint: "Urgent donor lookup & daily care in one offline-ready flow",
    description:
      "A unified mobile health app: wellness dashboard, medicine reminders, an emergency blood network and a rural health assistant.",
    architecture:
      "Built on React Native and Expo backed by Firebase realtime sync and authentication to coordinate medicine schedules, donor availability, and offline-friendly health guidance.",
    category: "mobile",
    primaryLanguage: "JavaScript",
    stars: 1,
    stack: ["React Native", "Firebase", "Expo"],
    accentHex: "#a78bfa",
    lightAccentHex: "#6d28d9",
    githubUrl: "https://github.com/fayizulrahuman/VitalSync",
    highlights: [
      "Daily wellness dashboard with scheduled medicine reminder alerts",
      "Emergency blood donor discovery network for urgent requests",
      "Rural health assistant designed for fast access on mobile devices",
    ],
  },
  {
    id: "hidden-gems",
    indexLabel: "03",
    name: "hidden-gems",
    tagline: "Crowdsourced discovery & live road context",
    constraint: "Live road routing + local weather per community pin",
    description:
      "A crowdsourced travel app to share secret spots, get road distances and live weather, and earn explorer badges. Live on Render.",
    architecture:
      "Full-stack Express & MongoDB geospatial backend paired with MapLibre interactive vector maps, live weather conditions, and explorer progression badges.",
    category: "fullstack",
    primaryLanguage: "JavaScript",
    stars: 1,
    stack: ["Node.js", "MongoDB", "MapLibre"],
    accentHex: "#f0abfc",
    lightAccentHex: "#be185d",
    githubUrl: "https://github.com/fayizulrahuman/hidden-gems",
    highlights: [
      "Community-curated hidden locations rendered on interactive MapLibre layers",
      "Road distance routing paired with live local weather conditions",
      "Explorer badge progression rewarding verified community contributions",
    ],
  },
  {
    id: "fintrack",
    indexLabel: "04",
    name: "fintrack",
    tagline: "Smart personal expense & archive manager",
    constraint: "Automated monthly rollover without losing history",
    description:
      "Expense manager with spending-trend charts, payment reminders and automatic month-end archiving, built with Expo and TypeScript.",
    architecture:
      "Strongly typed TypeScript state layer in React Native / Expo featuring visual spending trend analysis, recurring due-date reminders, and automated monthly rollovers.",
    category: "mobile",
    primaryLanguage: "TypeScript",
    stars: 2,
    stack: ["React Native", "TypeScript", "Expo"],
    accentHex: "#fbbf24",
    lightAccentHex: "#b45309",
    githubUrl: "https://github.com/fayizulrahuman/fintrack",
    highlights: [
      "Interactive spending-trend charts for category and monthly clarity",
      "Automated payment due reminders to prevent missed bills",
      "Automatic month-end archiving keeping active ledgers clean",
    ],
  },
];

export const STACK_GROUPS: StackGroup[] = [
  {
    id: "ai-vision",
    indexLabel: "01",
    title: "AI & Backend",
    focus: "Pose inference & resilient APIs",
    accentHex: "#5eead4",
    lightAccentHex: "#0d9488",
    items: [
      { name: "Python", role: "Computer vision & ML pipelines" },
      { name: "FastAPI", role: "Async inference endpoints" },
      { name: "Node.js", role: "Event-driven services" },
      { name: "Express", role: "REST APIs & middleware" },
    ],
  },
  {
    id: "frontend-web",
    indexLabel: "02",
    title: "Frontend & Web",
    focus: "Responsive, fluid interfaces",
    accentHex: "#a78bfa",
    lightAccentHex: "#6d28d9",
    items: [
      { name: "React", role: "Interactive web architecture" },
      { name: "TypeScript", role: "Type-safe full-stack apps" },
      { name: "JavaScript", role: "Core runtime & DOM motion" },
      { name: "Tailwind CSS", role: "Design-token systems" },
      { name: "HTML & CSS", role: "Semantic web craft" },
    ],
  },
  {
    id: "mobile",
    indexLabel: "03",
    title: "Mobile",
    focus: "Cross-platform apps built to ship",
    accentHex: "#f0abfc",
    lightAccentHex: "#be185d",
    items: [
      { name: "Expo", role: "Mobile builds & OTA updates" },
      { name: "React Native", role: "Shared iOS & Android UI" },
      { name: "Firebase", role: "Auth & realtime sync" },
    ],
  },
  {
    id: "data-tooling",
    indexLabel: "04",
    title: "Data & Tooling",
    focus: "Persistence & release workflows",
    accentHex: "#fbbf24",
    lightAccentHex: "#b45309",
    items: [
      { name: "MongoDB", role: "Geospatial & document stores" },
      { name: "Supabase", role: "Postgres & row-level auth" },
      { name: "Git", role: "Branching & clean history" },
      { name: "GitHub", role: "Actions & open-source shipping" },
    ],
  },
];

export const DEFAULT_STATS: ProfileStatsData = {
  stars_earned: 8,
  starred: 13,
  repos: 9,
  contribs: 41,
  commits: 26,
  contrib_repos: 8,
};

const RAW_CONTRIB_COUNTS = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 0, 0, 0, 0, 0, 2, 6, 0, 0, 7, 3,
];
const RAW_CONTRIB_LABELS = [
  ...Array.from({ length: 13 }, (_, i) => String(19 + i)),
  ...Array.from({ length: 18 }, (_, i) => String(1 + i)),
];

export const DEFAULT_CONTRIB_DAYS: ContributionDay[] = RAW_CONTRIB_LABELS.map((label, idx) => ({
  label,
  count: RAW_CONTRIB_COUNTS[idx] ?? 0,
}));
