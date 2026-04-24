# omc-harness Agent Catalog

Claude Code harness — 19 framework agents from OMC core. Domain specialists can be added later under `agents/`.

## Model Routing

| Tier | Model | Use Case |
|------|-------|----------|
| Opus | claude-opus-4-7 | Architecture, deep analysis, code review, planning |
| Sonnet | claude-sonnet-4-6 | Implementation, debugging, testing, documentation |
| Haiku | claude-haiku-4-5 | Quick lookups, exploration, lightweight writing |

## Framework Agents (19)

### Read-Only (Analysis & Review)

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| analyst | analyst.md | opus | Pre-planning requirements analysis |
| architect | architect.md | opus | Strategic architecture & debugging advisor |
| code-reviewer | code-reviewer.md | opus | Severity-rated code review, SOLID checks |
| critic | critic.md | opus | Work plan & code review, multi-perspective |
| explore | explore.md | haiku | Codebase search, file & pattern finding |
| scientist | scientist.md | sonnet | Data analysis & research |
| security-reviewer | security-reviewer.md | opus | OWASP Top 10, secrets, unsafe patterns |
| document-specialist | document-specialist.md | sonnet | External documentation & reference lookup |

### Read-Write (Implementation)

| Agent | File | Model | Description |
|-------|------|-------|-------------|
| executor | executor.md | sonnet | Focused task implementation |
| planner | planner.md | opus | Strategic planning with interview workflow |
| debugger | debugger.md | sonnet | Root-cause analysis, build error resolution |
| designer | designer.md | sonnet | UI/UX implementation |
| test-engineer | test-engineer.md | sonnet | Test strategy, TDD, flaky test hardening |
| git-master | git-master.md | sonnet | Atomic commits, rebasing, history management |
| qa-tester | qa-tester.md | sonnet | Interactive CLI testing via tmux |
| tracer | tracer.md | sonnet | Evidence-driven causal tracing |
| verifier | verifier.md | sonnet | Evidence-based completion verification |
| writer | writer.md | haiku | Technical documentation |
| code-simplifier | code-simplifier.md | opus | Code clarity & maintainability refactoring |

## Delegation Rules

- **Complex architecture decisions** → architect (opus)
- **Code review** → code-reviewer (opus)
- **Implementation** → executor (sonnet), use model=opus for complex multi-file changes
- **Debugging** → debugger (sonnet), escalate to tracer for deep analysis
- **Planning** → planner (opus)
- **Quick search** → explore (haiku)
- **Uncertain SDK/API usage** → document-specialist first

## Safety Policies

- Read-only agents (analyst, architect, code-reviewer, critic, explore, scientist, security-reviewer, document-specialist) cannot use Write or Edit tools
- Always verify before claiming completion — use verifier agent
- Keep authoring and review as separate passes

## Naming Conventions

New files created by agents must follow these rules.

### Skills → `skills/{domain}-{verb}/SKILL.md`

| Part | Value | Example |
|------|-------|---------|
| `domain` | target system | `ci`, `db`, `infra` |
| `verb` | action | `work`, `debug`, `sync`, `audit`, `deploy` |

### Scripts → `scripts/{domain}/{verb}.sh`

### Agents → `agents/{role}.md` (kebab-case)

### Hooks → `hooks/{trigger}-{action}.mjs`
