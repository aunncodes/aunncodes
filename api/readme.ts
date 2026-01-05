import { kv } from "@vercel/kv";

const TITLE = "Hi, I'm Sahil Chopra.";
const START_CODING_YEAR = 2016;

const DISCORD = "aunn.exe";
const EMAIL = "choprasahil.sc@gmail.com";
const GITHUB_USERNAME = "aunncodes";

const yearsCoding = () => new Date().getFullYear() - START_CODING_YEAR;

const SVG_TEMPLATE_URL = "https://raw.githubusercontent.com/aunncodes/aunncodes/main/readme.template.svg";

async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 2500
): Promise<Response> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
}

let cachedRepos: { value: number; fetchedAt: number } | null = null;
const REPOS_CACHE_MS = 60 * 60 * 1000;

async function getPublicRepoCount(username: string): Promise<number> {
  const now = Date.now();
  if (cachedRepos && now - cachedRepos.fetchedAt < REPOS_CACHE_MS) {
    return cachedRepos.value;
  }

  try {
    const res = await fetchWithTimeout(
      `https://api.github.com/users/${username}`,
      {
        headers: {
          "User-Agent": "readme-card",
          "Accept": "application/vnd.github+json",
        },
      },
      2500
    );

    if (!res.ok) throw new Error(`GitHub API failed: ${res.status}`);

    const data = await res.json();
    const count = data.public_repos;

    cachedRepos = { value: count, fetchedAt: now };
    return count;
  } catch {
    return cachedRepos?.value ?? 0;
  }
}

let svgTemplatePromise: Promise<string> | null = null;
function getSvgTemplate(): Promise<string> {
  if (!svgTemplatePromise) {
    svgTemplatePromise = (async () => {
      const res = await fetchWithTimeout(SVG_TEMPLATE_URL, {}, 2500);
      if (!res.ok) throw new Error(`Failed to fetch SVG template: ${res.status}`);
      return await res.text();
    })();
  }
  return svgTemplatePromise;
}

async function incrementAndGetViews(): Promise<number> {
  try {
    const next = await kv.incr("readme:views");
    return next;
  } catch {
    return 0;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const [views, repos, svgText] = await Promise.all([
    incrementAndGetViews(),
    getPublicRepoCount(GITHUB_USERNAME),
    getSvgTemplate(),
  ]);

  const svg = svgText
    .replace("{title}", TITLE)
    .replace("{years}", yearsCoding().toString())
    .replace("{repos}", repos.toString())
    .replace("{count}", views.toString())
    .replaceAll("{discord}", DISCORD)
    .replaceAll("{email}", EMAIL)
    .replaceAll("{github}", GITHUB_USERNAME);

  return new Response(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
