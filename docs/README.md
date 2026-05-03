# docs/

## Two scopes. One rule.

**Feature scope** — a discrete thing that ships independently. Pre-release artifacts live here.  
**Release scope** — how the whole app performed at a milestone. Post-release artifacts live here.

---

### `docs/features/{name}/`

Pre-release artifacts for a single feature. Created before or during development.

```
prd.md        Product requirements
tasks.md      Implementation task tracker (phases, status)
designs/      Design files, mockups, references
research/     Research specific to this feature
```

**Existing:**
- `docs/features/base-game/` — core 5-game experience (Lede, Spread, SoF, Wave, Quip)
- `docs/features/content-pipeline/` — Firestore content delivery

---

### `docs/releases/{version}/`

Release-scoped artifacts — everything tied to a specific build that ships.

```
prr-{version}.md    Post-release review (covers all features in this release)
smoke-test/         QA test plans for this release (future)
research/           User research tied to this release event (future)
```

**Existing:**
- `docs/releases/alpha-v0.1.0/`

**Template:** `docs/releases/PRR/template.md`

---

### App-level (no version)

| Path | What it is |
|---|---|
| `docs/RELEASES.md` | Release changelog + git tag conventions |
| `docs/archive/` | Superseded PRD versions (v1–v4) |
| `docs/smoke-test/` | Legacy QA plans (will migrate into releases/ over time) |
