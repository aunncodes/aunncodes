const TITLE = "Hi, I'm Sahil Chopra.";
const START_CODING_YEAR = 2016;

const DISCORD = "aunn.exe";
const EMAIL = "choprasahil.sc@gmail.com";
const GITHUB_USERNAME = "aunncodes";

const yearsCoding = () => new Date().getFullYear() - START_CODING_YEAR;

const COUNTERAPI_TOKEN = process.env.COUNTERAPI_TOKEN;
const COUNTERAPI_WORKSPACE = "sahil-cs-team-2377";
const COUNTERAPI_COUNTER = "viewcounterawesome";

const SVG_TEMPLATE = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1000" viewBox="0 0 900 1000">
  <style>
    .bg { fill: #0b0f14; }
    .h1 { font: 800 44px system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: #e6edf3; }
    .h2 { font: 650 20px system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: #c9d1d9; }
    .label { font: 650 18px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace; fill: #9aa4b2; }
    .big { font: 900 84px system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: #e6edf3; }
    .mid { font: 850 56px system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: #e6edf3; }
    .contact { font: 600 14px system-ui, -apple-system, Segoe UI, Roboto, Arial; fill: #e6edf3; }
  </style>

  <rect class="bg" width="900" height="1000" rx="16"/>


  <g transform="translate(0, 0)">
    <text x="450" y="90" class="h1" text-anchor="middle">
      Hi, I&apos;m Sahil Chopra.
    </text>
  </g>

  <g transform="translate(0, 180)">

    <g transform="translate(150, 0)">
      <text x="0" y="0" class="label" text-anchor="middle">Favorite language</text>

      <g transform="translate(0, 90)">
        <image
          x="-30"
          y="-50"
          width="56"
          height="56"
          href="https://upload.wikimedia.org/wikipedia/commons/c/c3/Python-logo-notext.svg"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>
    </g>

    <g transform="translate(450, 0)">
      <text x="0" y="0" class="label" text-anchor="middle">Years spent coding</text>
      <text x="0" y="90" class="big" text-anchor="middle">{years}</text>
    </g>

    <g transform="translate(750, 0)">
      <text x="0" y="0" class="label" text-anchor="middle">Repositories</text>
      <text x="0" y="90" class="big" text-anchor="middle">{repos}</text>
    </g>

  </g>
  <image
    x="300"
    y="350"
    width="300"
    height="300"
    href="https://raw.githubusercontent.com/aunncodes/aunncodes/main/profilepicture.jpeg"
    preserveAspectRatio="xMidYMid slice"
    clip-path="url(#avatarClip)"
  />



  <g transform="translate(230, 680)">
    <a href="https://discord.com/">
      <rect x="0" y="0" width="200" height="46" rx="14" fill="#161b22"/>
      <text x="100" y="30" class="contact" text-anchor="middle">
        Discord: {discord}
      </text>
    </a>

    <a href="mailto:{email}">
      <rect x="240" y="0" width="200" height="46" rx="14" fill="#161b22"/>
      <text x="340" y="30" class="contact" text-anchor="middle">
        Email
      </text>
    </a>
  </g>


  <image
    x="20"
    y="780"
    width="420"
    height="200"
    href="https://personal-readme-stats.vercel.app/api?username={github}&amp;show_icons=true&amp;theme=solarized-dark"
    preserveAspectRatio="xMidYMid meet"
  />
  <image
    x="460"
    y="780"
    width="420"
    height="200"
    href="https://personal-readme-stats.vercel.app/api/top-langs/?username={github}&amp;layout=compact&amp;theme=solarized-dark"
    preserveAspectRatio="xMidYMid meet"
  />
</svg>
`

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

  const svg = SVG_TEMPLATE
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
