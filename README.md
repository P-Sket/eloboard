# EloBoard Homepage

This repository contains a static EloBoard homepage for StarCraft 1 match ratings.
It calculates a public Glicko-2 leaderboard from approved match data and supports match intake through Google Sheets or GitHub Issues.

Start with:

- `HARNESS.md` for the operating workflow
- `docs/product-brief.md` for product intent
- `docs/design-system.md` for visual and UX rules
- `docs/feature-backlog.md` for planned work
- `docs/data-management.md` for player, match, Google Sheets, and approval rules
- `.codex/instructions.md` for Codex working rules

## Run Locally

Because the app loads JSON files, serve the directory over HTTP.

```sh
python -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```

## Data Files

- Add players in `data/players.json`.
- Add approved matches in `data/matches.json`.
- Add allowed map names in the Google Sheet `Maps` tab. `data/maps.json` is only the local fallback.
- Configure integrations in `src/config.js`.

The current Google Sheet document URL and Apps Script Web App URL are saved in `src/config.js`.
With `dataSource: "google-sheets"`, the public site reads `Players`, `Maps`, and `ApprovedMatches` directly from Google Sheets.

Proleague input supports up to 9 sets in one submission. Deathmatch input supports repeated 5/7/9-set 1:1 submissions between the same two players. Paste the latest `tools/google-apps-script.gs` into Apps Script and deploy a new Web App version whenever that file changes.

## Race Images

The design is prepared for real race imagery, but copyrighted game assets are not committed here.
Place licensed images in `images/<race>/`:

- `unit` images are used in the upper race background.
- `build` images are used in the lower race background and commander panel.
- `mark` images are used in the leaderboard race column.

## First GitHub Setup

From this directory:

```sh
git init
git add .
git commit -m "Add homepage build harness"
```

Then create a GitHub repository and push this project.

If GitHub CLI is installed:

```sh
gh repo create eloboard --private --source=. --remote=origin --push
```

## Recommended Next Codex Request

```md
Goal:
Refine the EloBoard homepage content and data.

Context:
- Read HARNESS.md
- Read docs/product-brief.md
- Read docs/design-system.md
- Read docs/data-management.md

Requirements:
- Replace sample players with the real player list.
- Replace sample matches with approved match history.
- Set GitHub owner/repo in src/config.js.

Acceptance Criteria:
- Ranking table loads with real data.
- Match submission validates winner/loser against player IDs.
- GitHub Issue fallback opens correctly.
```
