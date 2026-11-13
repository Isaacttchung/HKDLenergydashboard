# Cloud Agent workspace (GitHub source of truth)

This Cursor Cloud workspace tracks **[Isaacttchung/HKDLenergydashboard](https://github.com/Isaacttchung/HKDLenergydashboard)** on GitHub.

## Layout

| Path | Role |
|------|------|
| Repo root | Wrapper `package.json` only (no root `package-lock.json`) — `npm run dev` / `npm run install:app` |
| `.cursor/environment.json` | Single Cursor Cloud environment file (do not duplicate under the app folder) |
| `disney-energy-gas-monitor/` | Next.js app (`package.json` + `package-lock.json` live here) |

## Agent workflow

1. **Edits** — Make code and doc changes under this repo (usually inside `disney-energy-gas-monitor/`).
2. **Commit locally** — Use clear commit messages on branch `main` (or a branch you request).
3. **Publish when you ask**
   - **Push to GitHub** — `git push origin main` (only when you explicitly request it).
   - **Patch for your PC** — `git format-patch origin/main -o /opt/cursor/artifacts` or `git diff > /opt/cursor/artifacts/hkdl-changes.patch` for manual apply.

## Sync from GitHub

To refresh from GitHub before a task: `git fetch origin && git reset --hard origin/main` (discards unpushed local commits).

## Dev server

From repo root:

```bash
npm run install:app   # first time
npm run dev           # http://localhost:4000
```
