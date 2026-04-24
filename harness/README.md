# omc-harness

Claude Code harness **template** built on top of [`oh-my-claudecode`](https://github.com/Yeachan-Heo/oh-my-claudecode) (OMC). Ships the OMC runtime as a vendored git submodule, 19 framework agents, symlinked vendor workflow skills, and a generator skill (`omh-setup`) that analyses your target workspace and grows this plugin with matching custom skills.

Fork it or click **Use this template** on GitHub to start your own personal harness.

## What you get

```
harness/
├── .claude-plugin/plugin.json    # Claude Code plugin manifest
├── .omc-vendor-version           # pinned OMC vendor version
├── AGENTS.md                     # agent catalog
├── agents/                       # 19 framework agents
├── config/model-routing.json     # per-agent model tier config
├── hooks/hooks.json              # hook wiring (delegates to vendor scripts)
├── scripts/
│   ├── git/submodule-sync.sh     # local vendor updater
│   ├── git/release.ts            # plugin release automation
│   └── hooks/agent-model-router.mjs
├── skills/
│   ├── <vendor skill> -> ../vendor/oh-my-claudecode/skills/<name>   # 22 symlinks
│   └── omh-setup/SKILL.md        # workspace-driven skill generator
├── src/index.ts                  # re-exports vendor OMC core
└── vendor/oh-my-claudecode/      # git submodule → OMC upstream
```

CI in `.github/workflows/`:
- `harness-sync.yml` — daily vendor submodule bump
- `harness-release.yml` — plugin release on PR merge / `/release harness` comment / manual dispatch

## Getting started after fork

1. Clone with submodules:
   ```bash
   git clone --recurse-submodules https://github.com/<you>/<your-repo>.git
   ```
2. Personalise the manifests — replace `<your-github-handle>` placeholders in:
   - `.claude-plugin/marketplace.json` (owner, plugins[0].author)
   - `harness/.claude-plugin/plugin.json` (author)
3. Optionally rename the plugin. If you want `my-harness` instead of `omc-harness`:
   ```bash
   find . -type f \( -name '*.md' -o -name '*.json' -o -name '*.ts' -o -name '*.mjs' -o -name '*.yml' \) \
     -not -path '*/vendor/*' -not -path '*/.git/*' -not -path '*/node_modules/*' \
     -exec sed -i '' 's/omc-harness/my-harness/g' {} +
   ```
4. Install the plugin in Claude Code (point at `.claude-plugin/marketplace.json`).

## Growing the plugin with `omh-setup`

In Claude Code, invoke `/omh-setup` (or say "하네스 구성해줘") and provide:
- a local workspace via `@~/works/your-repo`, or
- a GitHub URL like `https://github.com/org/repo`.

`omh-setup` does a shallow pattern scan (no full directory crawl), proposes matching custom skills and domain agents, and — after your approval — writes them into **this plugin's** `skills/` and `agents/`. The target workspace is never modified.

## Update the vendor submodule

```bash
harness/scripts/git/submodule-sync.sh
```

GitHub Actions (`harness-sync.yml`) also runs this daily.

## Cut a release

On PR merge into main (`harness/**` changes), the workflow derives the version bump from the PR title (`feat:` → minor, `fix:` → patch) and produces a tagged `harness/vX.Y.Z` GitHub Release with auto-generated notes from the merged PRs.

For a manual release: Actions → **harness: Plugin Release** → Run workflow → pick bump type.

## License

MIT
