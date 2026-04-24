# omc-harness

Personal Claude Code plugin built on top of the `oh-my-claudecode` (OMC) vendor runtime. Ships framework agents, standard skill symlinks, and a generator skill (`omh-setup`) that analyses a target workspace and grows this plugin with matching custom skills.

## Layout

```
harness/
├── .claude-plugin/plugin.json    # Claude Code plugin manifest
├── .omc-vendor-version           # pinned OMC vendor version
├── AGENTS.md                     # agent catalog
├── agents/                       # 19 framework agents
├── config/model-routing.json     # per-agent model tier config
├── hooks/hooks.json              # hook wiring (delegates to vendor scripts)
├── scripts/
│   ├── git/submodule-sync.sh     # vendor submodule updater
│   ├── git/release.ts            # plugin release automation
│   └── hooks/agent-model-router.mjs
├── skills/
│   ├── <vendor skill> -> ../vendor/oh-my-claudecode/skills/<name>   # symlinks
│   └── omh-setup/SKILL.md        # workspace-driven harness builder
├── src/index.ts                  # re-exports vendor OMC core
└── vendor/oh-my-claudecode/      # git submodule → OMC upstream
```

Repo root ships `.claude-plugin/marketplace.json` so the harness can be served as a local marketplace.

## Growing the plugin with `omh-setup`

Invoke `/omh-setup` (or say "하네스 구성해줘") and provide either a local workspace (`@~/works/xyz`) or a GitHub URL. The skill does a shallow pattern scan and proposes new custom skills / domain agents to add **inside this repo's `skills/` and `agents/`**. Target workspaces are not modified.

## Use as a submodule

```bash
git submodule add https://github.com/<you>/omc-harness.git .harness
git submodule update --init --recursive
```

Then symlink `.harness/harness` into your plugin path, or point Claude Code at its `marketplace.json`.

## Update vendor

```bash
harness/scripts/git/submodule-sync.sh
```

GitHub Actions (`harness-sync.yml`) also runs this daily.
