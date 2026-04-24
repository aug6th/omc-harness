# omc-harness

Claude Code plugin template built on [oh-my-claudecode](https://github.com/Yeachan-Heo/oh-my-claudecode). Fork it, personalise the manifests, and use `/omh-setup` to grow it with custom skills per workspace.

## Quick start

1. Click **Use this template** (or fork) on GitHub
2. Clone with submodules
   ```bash
   git clone --recurse-submodules https://github.com/<you>/<your-repo>.git
   ```
3. Replace `<your-github-handle>` placeholders in `.claude-plugin/marketplace.json` and `harness/.claude-plugin/plugin.json`
4. Install in Claude Code — point at `.claude-plugin/marketplace.json`

## Grow it

Invoke `/omh-setup` (or say "하네스 구성해줘") and pass either a local workspace (`@~/works/repo`) or a GitHub URL. The skill does a shallow pattern scan and proposes custom skills and agents matching that repo's stack. On approval it writes them into **this plugin's** `skills/` and `agents/` — the target workspace is not modified.

## Structure

```
harness/
├── agents/                  # 19 framework agents
├── skills/                  # vendor skill symlinks + your custom skills
├── config/model-routing.json
├── hooks/hooks.json
├── scripts/, src/
└── vendor/oh-my-claudecode/ # git submodule, pinned by .omc-vendor-version
```

## CI

- `harness-sync.yml` — daily vendor submodule bump
- `harness-release.yml` — tagged `harness/vX.Y.Z` on PR merge, `/release harness` comment, or manual dispatch
