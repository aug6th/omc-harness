#!/usr/bin/env npx tsx
import { execSync } from "child_process";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const marketplacePath = join(
  homedir(),
  ".claude/plugins/known_marketplaces.json"
);
const pluginManifest = JSON.parse(
  readFileSync(".claude-plugin/marketplace.json", "utf-8")
);

const abbrev: string = pluginManifest.name;
const pluginName: string = pluginManifest.plugins[0].name;

const remoteUrl = execSync("git remote get-url origin").toString().trim();
const repo = remoteUrl
  .replace(/^git@[^:]+:/, "")
  .replace(/^https:\/\/github\.com\//, "")
  .replace(/\.git$/, "");

const data = existsSync(marketplacePath)
  ? JSON.parse(readFileSync(marketplacePath, "utf-8"))
  : {};

if (data[abbrev]) {
  console.log(`⚠️  '${abbrev}' already exists. Overwriting.`);
}

data[abbrev] = {
  source: { source: "github", repo },
  installLocation: join(homedir(), `.claude/plugins/marketplaces/${abbrev}`),
  lastUpdated: new Date().toISOString(),
  autoUpdate: true,
};

writeFileSync(marketplacePath, JSON.stringify(data, null, 4));
console.log(`✅ Registered '${pluginName}' as marketplace '${abbrev}' (${repo})`);
