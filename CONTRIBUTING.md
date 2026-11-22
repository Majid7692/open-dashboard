# Contributing to Open Dashboard

One project at a time, small changes only. This is how every update works — no exceptions.

## Update workflow (har baar yahi)

**1. Start from main, up to date:**

```bash
git checkout main
git pull origin main
```

**2. New branch — never commit direct to main:**

```bash
git checkout -b feature/<short-name>
```

Example: `feature/dark-mode-fix`. Urgent bug: `hotfix/<name>` from main.

**3. One small change only, then run + test it:**

```bash
python3 collect.py
python3 -m http.server 8000
# open http://localhost:8000/ and check the change works
```

A change counts as done only when it actually runs. A "ready" message without a real run is not done.

**4. Update the changelog:**

Add your change under `[Unreleased]` in `CHANGELOG.md` — `Added` for a new feature, `Fixed` for a bug fix.

**5. Push the branch and open a Pull Request:**

```bash
git push -u origin feature/<short-name>
```

Open the PR on GitHub, check it (does the dashboard still run? real numbers only? "last updated" visible?), then merge to main.

**6. New version (after the merge):**

- Bump the version: `v1.0.1` = bug fix, `v1.1.0` = new feature, `v2.0.0` = breaking change.
- Move the `[Unreleased]` entries in `CHANGELOG.md` under the new version with today's date.
- Tag it and publish a GitHub Release with the changelog:

```bash
git tag v1.0.1
git push origin v1.0.1
```

Then create the Release on GitHub from that tag.

**7. Urgent bug:**

`hotfix/<name>` branch from main, fix, test by running the dashboard, merge to main, tag `v1.0.1`, publish a Release.

## Rules

- Never commit directly to `main` — feature branch always.
- Never put passwords, API keys or tokens in code or in chat. The token box is a manual field only.
- Never show fake or sample numbers as if they are real — if data is not loaded yet, show "not loaded yet".
- Always show "last updated" — stale data with no time is a bug.
- One task, one message; short summary first (2–3 lines), details only when asked.
- If stuck, say so plainly with the exact blocker — do not guess or fake progress.
