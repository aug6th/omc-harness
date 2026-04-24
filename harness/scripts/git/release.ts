#!/usr/bin/env npx tsx
/**
 * release.ts — Plugin release automation
 *
 * Usage: npx tsx scripts/git/release.ts <patch|minor|major|x.y.z>
 *
 * - Bumps version across package.json, plugin.json, marketplace.json
 * - Generates release notes from merged PRs (GitHub API) since last harness/v* tag
 * - Writes .github/release-body.md consumed by the Release workflow
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { execSync, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const HARNESS_DIR = resolve(dirname(__filename), "../..");
const REPO_ROOT = resolve(HARNESS_DIR, "..");

const FILES = {
  packageJson: resolve(HARNESS_DIR, "package.json"),
  pluginJson: resolve(HARNESS_DIR, ".claude-plugin/plugin.json"),
  marketplaceJson: resolve(REPO_ROOT, ".claude-plugin/marketplace.json"),
};

const RELEASE_BODY_PATH = resolve(REPO_ROOT, ".github/release-body.md");
const RELEASE_NOTES_TEMPLATE = resolve(REPO_ROOT, ".github/release-notes.md");

function parseSemver(v: string): [number, number, number] {
  const m = v.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!m) throw new Error(`Invalid semver: ${v}`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function bumpVersion(current: string, type: string): string {
  if (/^\d+\.\d+\.\d+$/.test(type)) return type;

  const [major, minor, patch] = parseSemver(current);
  switch (type) {
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "major":
      return `${major + 1}.0.0`;
    default:
      throw new Error(
        `Invalid bump type: ${type}. Use patch, minor, major, or x.y.z`
      );
  }
}

function readJson(path: string): any {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path: string, data: any): void {
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n");
}

function updateVersions(version: string): void {
  const pkg = readJson(FILES.packageJson);
  pkg.version = version;
  writeJson(FILES.packageJson, pkg);

  const plugin = readJson(FILES.pluginJson);
  plugin.version = version;
  writeJson(FILES.pluginJson, plugin);

  const marketplace = readJson(FILES.marketplaceJson);
  marketplace.version = version;
  if (marketplace.plugins?.[0]) {
    marketplace.plugins[0].version = version;
  }
  writeJson(FILES.marketplaceJson, marketplace);

  try {
    execSync("npm install --package-lock-only --legacy-peer-deps", {
      cwd: HARNESS_DIR,
      stdio: "pipe",
    });
  } catch {
    console.warn(
      "Warning: Could not update package-lock.json. Run npm install manually."
    );
  }

  console.log(`Version updated to ${version} across all files.`);
}

function getLastTag(): string | null {
  try {
    return execSync('git describe --tags --abbrev=0 --match "harness/v*"', {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

function getRepoInfo(): { owner: string; repo: string } | null {
  try {
    const remote = execSync("git remote get-url origin", {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();

    const sshMatch = remote.match(/github\.com[^:]*:([^/]+)\/([^/.]+)/);
    if (sshMatch) return { owner: sshMatch[1], repo: sshMatch[2] };

    const httpsMatch = remote.match(/github\.com\/([^/]+)\/([^/.]+)/);
    if (httpsMatch) return { owner: httpsMatch[1], repo: httpsMatch[2] };

    return null;
  } catch {
    return null;
  }
}

function getGitHubToken(): string | null {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return execSync("gh auth token", { encoding: "utf8" }).trim();
  } catch {
    return null;
  }
}

function getOMCVersion(): string {
  try {
    const versionFile = resolve(HARNESS_DIR, ".omc-vendor-version");
    const version = readFileSync(versionFile, "utf8").trim();
    if (version) return `v${version}`;
  } catch {}

  try {
    const pkgPath = resolve(HARNESS_DIR, "vendor/oh-my-claudecode/package.json");
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    return `v${pkg.version}`;
  } catch {
    return "unknown";
  }
}

interface PullRequest {
  number: number;
  title: string;
  html_url: string;
  user: { login: string };
  merged_at: string;
}

async function githubGet<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Authorization: `token ${token}`,
      "User-Agent": "omc-harness-release",
      Accept: "application/vnd.github.v3+json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

function getTagDate(tag: string): string | null {
  try {
    return execFileSync("git", ["log", "-1", "--format=%aI", tag], {
      cwd: REPO_ROOT,
      encoding: "utf8",
    }).trim();
  } catch {
    return null;
  }
}

async function fetchMergedPRs(
  owner: string,
  repo: string,
  since: string | null,
  token: string
): Promise<PullRequest[]> {
  const allPRs: PullRequest[] = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const data = await githubGet<PullRequest[]>(
      `/repos/${owner}/${repo}/pulls?state=closed&sort=updated&direction=desc&per_page=${perPage}&page=${page}`,
      token
    );

    if (!data || data.length === 0) break;

    for (const pr of data) {
      if (!pr.merged_at) continue;
      if (since && new Date(pr.merged_at) <= new Date(since)) {
        return allPRs;
      }
      allPRs.push(pr);
    }

    if (data.length < perPage) break;
    page++;
    if (page > 10) break;
  }

  return allPRs;
}

interface CategorizedPRs {
  features: PullRequest[];
  fixes: PullRequest[];
  refactoring: PullRequest[];
  other: PullRequest[];
}

function categorizePRs(prs: PullRequest[]): CategorizedPRs {
  const result: CategorizedPRs = {
    features: [],
    fixes: [],
    refactoring: [],
    other: [],
  };

  for (const pr of prs) {
    const title = pr.title.toLowerCase();
    if (title.startsWith("feat") || title.match(/^\[.*\]\s*feat/))
      result.features.push(pr);
    else if (title.startsWith("fix") || title.match(/^\[.*\]\s*fix/))
      result.fixes.push(pr);
    else if (title.startsWith("refactor") || title.match(/^\[.*\]\s*refactor/))
      result.refactoring.push(pr);
    else result.other.push(pr);
  }

  return result;
}

function formatPR(pr: PullRequest): string {
  return `- ${pr.title} ([#${pr.number}](${pr.html_url})) @${pr.user.login}`;
}

function generateReleaseBody(
  version: string,
  categories: CategorizedPRs,
  _prevTag: string | null
): string {
  const lines: string[] = [`## v${version}`, ""];
  const omcVersion = getOMCVersion();

  const sections: Array<[string, PullRequest[]]> = [
    ["Features", categories.features],
    ["Bug Fixes", categories.fixes],
    ["Refactoring", categories.refactoring],
    ["Other", categories.other],
  ];

  for (const [heading, prs] of sections) {
    if (prs.length === 0) continue;
    lines.push(`### ${heading}`, "");
    for (const pr of prs) {
      lines.push(formatPR(pr));
    }
    lines.push("");
  }

  const allPRs = [
    ...categories.features,
    ...categories.fixes,
    ...categories.refactoring,
    ...categories.other,
  ];
  const contributors = [...new Set(allPRs.map((pr) => `@${pr.user.login}`))];

  if (contributors.length > 0) {
    lines.push("### Contributors", "");
    lines.push(contributors.join(", "), "");
  }

  lines.push("### Components", "");
  lines.push("| Component | Version |");
  lines.push("|-----------|---------|");
  lines.push(`| omc-harness (harness) | v${version} |`);
  lines.push(`| oh-my-claudecode (vendor) | ${omcVersion} |`);
  lines.push("");

  lines.push("---", "");
  try {
    lines.push(readFileSync(RELEASE_NOTES_TEMPLATE, "utf8"));
  } catch {
    // template optional
  }

  return lines.join("\n");
}

async function main() {
  const bumpType = process.argv[2];
  if (!bumpType) {
    console.error(
      "Usage: npx tsx scripts/git/release.ts <patch|minor|major|x.y.z>"
    );
    process.exit(1);
  }

  const pkg = readJson(FILES.packageJson);
  const currentVersion = pkg.version;
  const newVersion = bumpVersion(currentVersion, bumpType);

  console.log(`\nReleasing: ${currentVersion} → ${newVersion}\n`);

  updateVersions(newVersion);

  const repoInfo = getRepoInfo();
  const token = getGitHubToken();
  const lastTag = getLastTag();

  let categories: CategorizedPRs = {
    features: [],
    fixes: [],
    refactoring: [],
    other: [],
  };

  if (repoInfo && token) {
    console.log(
      `Fetching merged PRs from ${repoInfo.owner}/${repoInfo.repo}${lastTag ? ` since ${lastTag}` : ""}...`
    );

    const since = lastTag ? getTagDate(lastTag) : null;
    try {
      const prs = await fetchMergedPRs(
        repoInfo.owner,
        repoInfo.repo,
        since,
        token
      );
      categories = categorizePRs(prs);
      console.log(`Found ${prs.length} merged PR(s).`);
    } catch (err) {
      console.warn(`Warning: Could not fetch PRs: ${err}`);
    }
  } else {
    if (!repoInfo) console.warn("Warning: Could not detect GitHub repo info.");
    if (!token) console.warn("Warning: No GITHUB_TOKEN or gh CLI auth.");
  }

  const releaseBody = generateReleaseBody(newVersion, categories, lastTag);
  writeFileSync(RELEASE_BODY_PATH, releaseBody);
  console.log(`.github/release-body.md generated.`);

  console.log(`
────────────────────────────────────────────
  Release v${newVersion} prepared successfully!
────────────────────────────────────────────
`);
}

main().catch((err) => {
  console.error("Release failed:", err);
  process.exit(1);
});
