import test from "node:test";
import assert from "node:assert/strict";
import { CYCLING_DISCIPLINES, PROJECTS } from "../data/portfolioData";
import {
  buildEmailJsPayload,
  classifyGitHubRepoCategory,
  computeCameraRigTarget,
  cycleDisciplineIndex,
  dampScalar,
  filterProjects,
  getSceneThemePalette,
  mapGitHubReposToProjects,
  parseDotEnv,
  resolveThemePreference,
  validateContactForm,
} from "./portfolioLogic";

test("filterProjects returns all projects or filters accurately by category", () => {
  assert.equal(filterProjects(PROJECTS, "all").length, 4);
  const mobile = filterProjects(PROJECTS, "mobile");
  assert.equal(mobile.length, 2);
  assert.deepEqual(
    mobile.map((p) => p.name),
    ["VitalSync", "fintrack"],
  );
  const ai = filterProjects(PROJECTS, "ai");
  assert.equal(ai.length, 1);
  assert.equal(ai[0].name, "fallguard");
});

test("resolveThemePreference and getSceneThemePalette handle dark and light modes cleanly", () => {
  assert.equal(resolveThemePreference("light", true), "light");
  assert.equal(resolveThemePreference("dark", false), "dark");
  assert.equal(resolveThemePreference(null, true), "dark");

  const darkPalette = getSceneThemePalette("dark");
  const lightPalette = getSceneThemePalette("light");
  assert.equal(darkPalette.background, "#070b16");
  assert.equal(lightPalette.background, "#f5f6fa");
  assert.notEqual(darkPalette.contourHigh, lightPalette.contourHigh);
});

test("computeCameraRigTarget clamps inputs and adapts across topography and lattice modes", () => {
  const topo = computeCameraRigTarget(-0.4, "topography", 2, -2);
  assert.equal(topo.latticeSpin, 1.0);
  assert.ok(topo.position[2] > 7.5);

  const lattice = computeCameraRigTarget(0.2, "lattice", 0, 0);
  assert.ok(lattice.latticeSpin >= 1.5);
});

test("dampScalar moves smoothly toward target without overshooting", () => {
  const next = dampScalar(0, 10, 6, 0.016);
  assert.ok(next > 0 && next < 10);
});

test("cycleDisciplineIndex wraps cleanly through cycling roles", () => {
  assert.equal(cycleDisciplineIndex(0, CYCLING_DISCIPLINES.length), 1);
  assert.equal(
    cycleDisciplineIndex(CYCLING_DISCIPLINES.length - 1, CYCLING_DISCIPLINES.length),
    0,
  );
  assert.equal(cycleDisciplineIndex(2, 0), 0);
});

test("classifyGitHubRepoCategory and mapGitHubReposToProjects merge flagship builds and new repos", () => {
  assert.equal(classifyGitHubRepoCategory("Python", ["vision"], ""), "ai");
  assert.equal(classifyGitHubRepoCategory("TypeScript", ["expo"], ""), "mobile");
  assert.equal(classifyGitHubRepoCategory("TypeScript", ["nextjs"], ""), "fullstack");
  assert.equal(
    classifyGitHubRepoCategory("HTML", ["tailwindcss"], "Personal portfolio website", "portfolio"),
    "fullstack",
  );

  const mapped = mapGitHubReposToProjects(
    [
      {
        name: "fayizulrahuman",
        description: "Profile README",
        language: "Python",
        stargazers_count: 1,
        fork: false,
      },
      {
        name: "forked-demo",
        description: "Forked repo",
        language: "JavaScript",
        stargazers_count: 99,
        fork: true,
      },
      {
        name: "fallguard",
        description: "Updated fallguard description",
        language: "Python",
        stargazers_count: 4,
        fork: false,
      },
      {
        name: "campus-radar",
        description: "Campus transit tracker",
        language: "TypeScript",
        stargazers_count: 3,
        topics: ["react", "maps"],
        homepage: "https://campus.example.com",
        fork: false,
      },
    ],
    PROJECTS,
    "fayizulrahuman",
  );

  assert.equal(mapped.length, 2);
  assert.equal(mapped[0].name, "fallguard");
  assert.equal(mapped[0].stars, 4);
  assert.equal(mapped[0].architecture.includes("MediaPipe"), true);
  assert.equal(mapped[1].name, "campus-radar");
  assert.equal(mapped[1].homepageUrl, "https://campus.example.com");
  assert.equal(mapped[1].category, "fullstack");
});

test("validateContactForm catches invalid inputs and accepts complete messages", () => {
  const invalid = validateContactForm({ name: "A", email: "bad", message: "hi" });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.fieldErrors.name);
  assert.ok(invalid.fieldErrors.email);
  assert.ok(invalid.fieldErrors.message);

  const valid = validateContactForm({
    name: "Fayizul",
    email: "fayizul@example.com",
    message: "Let's collaborate on an AI vision prototype.",
  });
  assert.equal(valid.valid, true);
  assert.equal(valid.error, undefined);
});

test("parseDotEnv parses key/value pairs, comments, and quoted values cleanly", () => {
  const parsed = parseDotEnv(`
    # EmailJS config
    EMAILJS_SERVICE_ID="service_123"
    export EMAILJS_TEMPLATE_ID='template_456'
    EMAILJS_PUBLIC_KEY=pub_789
    EMPTY_KEY=
  `);
  assert.equal(parsed.EMAILJS_SERVICE_ID, "service_123");
  assert.equal(parsed.EMAILJS_TEMPLATE_ID, "template_456");
  assert.equal(parsed.EMAILJS_PUBLIC_KEY, "pub_789");
  assert.equal(parsed.EMPTY_KEY, "");
});

test("buildEmailJsPayload formats EmailJS REST body with optional accessToken", () => {
  const payload = buildEmailJsPayload(
    {
      serviceId: "svc_abc",
      templateId: "tpl_xyz",
      publicKey: "pub_111",
      privateKey: "priv_222",
    },
    {
      name: "  Riya Nair ",
      email: " riya@example.com ",
      message: " Hi, would love to discuss a project. ",
    },
  );
  assert.equal(payload.service_id, "svc_abc");
  assert.equal(payload.template_id, "tpl_xyz");
  assert.equal(payload.user_id, "pub_111");
  assert.equal(payload.accessToken, "priv_222");
  assert.equal(payload.template_params.from_name, "Riya Nair");
  assert.equal(payload.template_params.from_email, "riya@example.com");
  assert.equal(payload.template_params.reply_to, "riya@example.com");
  assert.equal(payload.template_params.message, "Hi, would love to discuss a project.");

  const publicOnly = buildEmailJsPayload(
    {
      serviceId: "svc_abc",
      templateId: "tpl_xyz",
      publicKey: "pub_111",
    },
    {
      name: "Sam",
      email: "sam@example.com",
      message: "Hello without private key!",
    },
  );
  assert.equal("accessToken" in publicOnly, false);
});

