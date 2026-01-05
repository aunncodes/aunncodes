const TITLE = "Hi, I'm Sahil Chopra.";
const START_CODING_YEAR = 2016;

const DISCORD = "aunn.exe";
const EMAIL = "choprasahil.sc@gmail.com";
const GITHUB_USERNAME = "aunncodes";

const yearsCoding = () => new Date().getFullYear() - START_CODING_YEAR;

const COUNTERAPI_TOKEN = process.env.COUNTERAPI_TOKEN;
const COUNTERAPI_WORKSPACE = "sahil-cs-team-2377";
const COUNTERAPI_COUNTER = "viewcounterawesome";

let cachedRepos: { value: number; fetchedAt: number } | null = null;
const REPOS_CACHE_MS = 60 * 60 * 1000;

async function getPublicRepoCount(username: string): Promise<number> {
  const now = Date.now();
  if (cachedRepos && now - cachedRepos.fetchedAt < REPOS_CACHE_MS) {
    return cachedRepos.value;
  }

  try {
    const res = await fetch(`https://api.github.com/users/${username}`, {
      headers: {
        "User-Agent": "readme-card",
        "Accept": "application/vnd.github+json",
      },
    });

    if (!res.ok) throw new Error(`GitHub API failed: ${res.status}`);

    const data = await res.json();
    const count = typeof data.public_repos === "number" ? data.public_repos : 0;

    cachedRepos = { value: count, fetchedAt: now };
    return count;
  } catch {
    return cachedRepos?.value ?? 0;
  }
}

let svgTemplatePromise: Promise<string> | null = null;
function getSvgTemplate(): Promise<string> {
  if (!svgTemplatePromise) svgTemplatePromise = Bun.file("../readme.template.svg").text();
  return svgTemplatePromise;
}

type CounterApiResponse = {
  code?: string;
  data?: {
    up_count?: number;
  };
};

function counterHeaders(): HeadersInit {
  const headers: Record<string, string> = { "Accept": "application/json" };
  if (COUNTERAPI_TOKEN) headers["Authorization"] = `Bearer ${COUNTERAPI_TOKEN}`;
  return headers;
}

function extractUpCount(json: unknown): number | null {
  const obj = json as CounterApiResponse;
  const up = obj?.data?.up_count;
  return typeof up === "number" ? up : null;
}

async function incrementAndGetViews(): Promise<number> {
  if (!COUNTERAPI_TOKEN) return 0;

  const base = `https://api.counterapi.dev/v2/${encodeURIComponent(COUNTERAPI_WORKSPACE)}/${encodeURIComponent(COUNTERAPI_COUNTER)}`;

  try {
    const upRes = await fetch(`${base}/up`, {
      method: "GET",
      headers: counterHeaders(),
    });
    if (!upRes.ok) throw new Error(`CounterAPI up failed: ${upRes.status}`);

    const upJson = await upRes.json();
    const upCount = extractUpCount(upJson);
    if (upCount !== null) return upCount;

    const getRes = await fetch(base, { headers: counterHeaders() });
    if (!getRes.ok) throw new Error(`CounterAPI get failed: ${getRes.status}`);

    const getJson = await getRes.json();
    return extractUpCount(getJson) ?? 0;
  } catch {
    return 0;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const views = await incrementAndGetViews();

  const repos = await getPublicRepoCount(GITHUB_USERNAME);
  const svgText = await getSvgTemplate();

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
