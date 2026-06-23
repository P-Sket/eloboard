# Data Management

EloBoard is designed to run on GitHub Pages while keeping match intake on Google Sheets or GitHub Issues.

## Files Used By The Website

- `data/players.json`: official player list. Edit this first when adding players.
- `data/matches.json`: approved matches used for leaderboard calculation.
- `data/maps.json`: local fallback map list.
- `src/config.js`: GitHub and Google Sheets integration settings.

## Player Schema

```json
{ "id": "Larva", "race": "Zerg" }
```

Allowed race values:

- `Zerg`
- `Terran`
- `Protoss`

## Match Schema

```json
{
  "date": "2026-06-01",
  "type": "normal",
  "winner": "Flash",
  "loser": "Larva",
  "map": "Fighting Spirit",
  "approved": true
}
```

For proleague matches:

```json
{
  "date": "2026-06-04",
  "type": "proleague",
  "winner": "Jaedong",
  "loser": "Sea",
  "map": "Neo Sylphid",
  "teamWin": true,
  "coffee": true,
  "approved": true
}
```

`coffee` can only be `true` when `teamWin` is `true`.

## Google Sheets Setup

Management spreadsheet:

```txt
https://docs.google.com/spreadsheets/d/1yYgtArH80b3jl7vKc8m9k-WGAuIly8v3RGCp3-X3rwc/edit?usp=sharing
```

This is the spreadsheet document URL. The public submission form cannot POST directly to this URL.
For form submission, deploy the Apps Script below as a Web App and paste the generated `/exec` URL into `src/config.js` as `googleSheetsWebAppUrl`.

1. Open the Google Sheet above.
2. Go to Extensions -> Apps Script.
3. Delete the default code and paste `tools/google-apps-script.gs`.
4. Save the script.
5. Run `setupEloBoardSheets` once from the Apps Script editor.
6. Fill the `Players` sheet with player IDs and races.
7. Deploy -> New deployment -> Web app.
8. Execute as: Me.
9. Who has access: Anyone.
10. Copy the generated `/exec` URL into `src/config.js` as `googleSheetsWebAppUrl`.

Do not paste the normal spreadsheet URL into `googleSheetsWebAppUrl`. The form needs the Apps Script Web App URL.

The script writes submissions to a `Submissions` sheet with these columns:

- `submittedAt`
- `status`
- `type`
- `date`
- `winner`
- `loser`
- `map`
- `teamWin`
- `coffee`
- `approvalRequired`

## Approval Policy

- `normal`: can be auto-approved if `autoApproveNormalMatches` is `true`.
- `proleague`: must be reviewed by an admin.
- `deathmatch`: must be reviewed by an admin.

## Proleague Batch Input

The website submits proleague matches as a batch of up to 9 sets.

Each set contains:

- Team A player
- Team B player
- Set winner team
- Map

The form-level team winner is applied to every set:

- If `Team A 승리` is selected, Team A players are treated as team winners.
- If `Team B 승리` is selected, Team B players are treated as team winners.
- If `커피빵` is checked, only players on the winning team receive `coffee: true`.

Because `data/matches.json` stores one row per 1:1 game, the Apps Script expands the batch into multiple `Submissions` rows.

## Deathmatch Batch Input

Deathmatch input is for repeated 1:1 sets between the same two players.

The form asks for:

- Player A
- Player B
- Set count: 5, 7, or 9
- Winner side and map for each set

The website expands the batch into one `Submissions` row per set. Deathmatch rows always require admin approval.

The website now reads `Players`, `Maps`, and `ApprovedMatches` directly from the Apps Script Web App when `src/config.js` has:

```js
dataSource: "google-sheets"
```

That means approved Sheet updates and map list updates can appear on the public site without editing JSON files or pushing to GitHub.

Admins can run `approveSubmission(rowNumber)` inside Apps Script for a pending row.

For bulk approval, use the `approve` checkbox column in `Submissions`:

1. Check the pending rows to approve.
2. Open Apps Script.
3. Run `approveCheckedSubmissions`.
4. Checked pending rows are copied into `ApprovedMatches`.
5. Their status changes to `approved` and the checkboxes are cleared.

`data/players.json`, `data/maps.json`, and `data/matches.json` remain as local fallback files. They are used if Google Sheets loading fails or if `dataSource` is changed away from `"google-sheets"`.

To export approved matches from Sheets for backup:

1. Run `exportApprovedMatchesJson`.
2. Open Apps Script logs.
3. Copy the JSON output.
4. Paste it into `data/matches.json`.

## Updating Apps Script Code

When `tools/google-apps-script.gs` changes:

1. Paste the new code into Apps Script.
2. Save.
3. Deploy -> Manage deployments.
4. Edit the existing Web App deployment.
5. Choose New version.
6. Deploy.

Without redeploying a new version, the public `/exec` URL can keep running the old code.

## Visual Assets

Real StarCraft unit/building images are not committed by default because they are copyrighted assets.
If you have permission to use images, place them in `assets/races/` with the filenames listed in `assets/races/README.md`.

The site will automatically use those images for the active rank 1 race theme.

## GitHub Issue Fallback

If `googleSheetsWebAppUrl` is empty, the form opens a prefilled GitHub Issue instead.

Set these values in `src/config.js`:

```js
githubOwner: "your-github-id",
githubRepo: "eloboard"
```
