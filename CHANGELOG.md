# Changelog

All notable changes to Open Dashboard are listed here. Version numbers follow `v1.0.1` = bug fix, `v1.1.0` = new feature, `v2.0.0` = breaking change.

## [Unreleased]

### Added

- Shareable theme link: open the dashboard with `?theme=dark`, `?theme=light` or `?theme=system`. A link theme never overwrites the saved theme choice.

## [1.0.0] — 2026-11-22

### Added

- One-screen live dashboard: top numbers (repos, stars, forks received, followers), repo list, Ideas board, manual Musa AI token/limits box.
- Real GitHub data only, cached in `data/` — never calls GitHub on every page load; auto-refresh every 24 hours plus a Refresh button, always showing "last updated".
- V1 extras: phone-first layout, dark mode (Light / Dark / System, saved), search with status chips and sort, quick actions, recent activity feed, "Today's focus", top 3 repos by stars, top 5 languages bar with tap-to-filter, JSON export/import of manual data.
- Loading skeleton (no layout jump); Refresh keeps old data on screen and shows "updating…" only.
- Empty states with an action (no repos / no search result); human-word error box with a Retry button — cached data plus "last updated" when GitHub is unreachable, never old numbers shown as today's.
- Mobile from 320px, no sideways scroll, 44px+ tap targets; button hover / pressed / loading / disabled states; keyboard focus visible; readable contrast.
- Long repo names cut with "…"; repo list scrolls inside itself.
- Step-by-step README: how to set your own username, and how to change the dashboard for your own workflow.
- MIT license, CONTRIBUTING.md, SECURITY.md.

### Fixed

- Stale data never shown without its "last updated" time; "not loaded yet" shown instead of fake numbers before data loads.
