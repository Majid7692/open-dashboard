#!/usr/bin/env python3
"""Dashboard collector — Majid's Professional Dashboard v0.1.

Fetches Majid7692's PUBLIC GitHub data (user, repos, public events) with the
standard library only, and writes it to data/current.json, data/events.json
and data/history.json (one entry per day).

No token, no password, no auth. Public reads are free (60 requests/hour
unauthenticated). The dashboard page reads these JSON files only — it never
calls GitHub on every page load. Run once a day (cron) or on demand:

    python3 collect.py

If the API fails, the old cache files are left untouched and the script
exits non-zero, so the dashboard keeps showing the last good data with its
real "last updated" time instead of fake numbers.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

USERNAME = "Majid7692"
API = "https://api.github.com"
BASE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE, "data")

HEADERS = {
    "User-Agent": "majid-dashboard-collector/0.1",
    "Accept": "application/vnd.github+json",
}

# Events shown in the activity feed. Fork/Watch events are real too, but
# the dashboard spec is pushes / PRs / releases only.
FEED_TYPES = {"PushEvent", "PullRequestEvent", "ReleaseEvent"}


def get(path):
    req = urllib.request.Request(API + path, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.load(resp)


def main():
    os.makedirs(DATA_DIR, exist_ok=True)
    now = datetime.now(timezone.utc)
    stamp = now.strftime("%Y-%m-%dT%H:%M:%SZ")

    try:
        user = get(f"/users/{USERNAME}")
        repos = get(f"/users/{USERNAME}/repos?per_page=100&sort=updated")
        events = get(f"/users/{USERNAME}/events/public?per_page=30")
    except urllib.error.HTTPError as e:
        print(f"GitHub API error: HTTP {e.code} — cache left untouched", file=sys.stderr)
        return 1
    except Exception as e:  # network down, DNS, timeout, ...
        print(f"GitHub API error: {e} — cache left untouched", file=sys.stderr)
        return 1

    if not isinstance(repos, list):
        print("Unexpected repos response — cache left untouched", file=sys.stderr)
        return 1

    repos_out = []
    total_stars = 0
    total_forks_received = 0
    for r in repos:
        total_stars += int(r.get("stargazers_count") or 0)
        total_forks_received += int(r.get("forks_count") or 0)
        repos_out.append({
            "name": r.get("name"),
            "full_name": r.get("full_name"),
            "html_url": r.get("html_url"),
            "description": r.get("description"),
            "language": r.get("language"),
            "stars": int(r.get("stargazers_count") or 0),
            "forks": int(r.get("forks_count") or 0),
            "open_issues": int(r.get("open_issues_count") or 0),
            "pushed_at": r.get("pushed_at"),
            "created_at": r.get("created_at"),
            "is_fork": bool(r.get("fork")),
        })

    feed = []
    for e in events if isinstance(events, list) else []:
        if e.get("type") not in FEED_TYPES:
            continue
        feed.append({
            "type": e.get("type"),
            "created_at": e.get("created_at"),
            "repo": (e.get("repo") or {}).get("name"),
            "actor": (e.get("actor") or {}).get("login"),
        })
        if len(feed) >= 10:
            break

    current = {
        "generated_at": stamp,
        "last_updated": stamp,
        "username": USERNAME,
        "user": {
            "login": user.get("login"),
            "html_url": user.get("html_url"),
            "avatar_url": user.get("avatar_url"),
            "public_repos": int(user.get("public_repos") or 0),
            "followers": int(user.get("followers") or 0),
            "following": int(user.get("following") or 0),
        },
        "totals": {
            "repos": len(repos_out),
            "stars": total_stars,
            "forks_received": total_forks_received,
            "followers": int(user.get("followers") or 0),
        },
        "repos": repos_out,
    }

    with open(os.path.join(DATA_DIR, "current.json"), "w") as f:
        json.dump(current, f, indent=2)
    with open(os.path.join(DATA_DIR, "events.json"), "w") as f:
        json.dump({"generated_at": stamp, "events": feed}, f, indent=2)

    # history.json: one entry per day, for later charts (not shown in v0.1).
    history_path = os.path.join(DATA_DIR, "history.json")
    history = []
    if os.path.exists(history_path):
        try:
            with open(history_path) as f:
                history = json.load(f)
        except Exception:
            history = []
    today = stamp[:10]
    entry = {"date": today, "repos": len(repos_out),
             "stars": total_stars, "forks_received": total_forks_received}
    if not history or history[-1].get("date") != today:
        history.append(entry)
    else:
        history[-1] = entry
    with open(history_path, "w") as f:
        json.dump(history, f, indent=2)

    print(f"OK {stamp} — {len(repos_out)} repos, {total_stars} stars, "
          f"{total_forks_received} forks received, "
          f"{user.get('followers')} followers, {len(feed)} feed events")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
