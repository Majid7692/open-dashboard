# Security Policy

## What this project does with secrets

Nothing. This dashboard never asks for, stores, or sends any password, API key or token.

- GitHub data comes from public API reads — no login, no token.
- The Musa AI usage/limits box is a **manual field**: you type your own limit and remaining balance into the page, and it is stored only in your browser (localStorage). It is never sent anywhere, never written into code, and never asked for in chat.
- If you ever see a token, password or key in code, a file, or a chat message about this project, treat it as a bug and report it.

## Reporting a vulnerability

Open a GitHub Issue with the title starting `SECURITY: ` and describe what you found. Do not post any real secret in the issue — describe where it is, not the value itself.

If the issue involves a leaked credential, rotate that credential first, then report it.

## Supported versions

Only the latest release (`v1.x`) is supported. Older versions get no security fixes — update to the latest release.
