const SHEETS = {
  players: "Players",
  maps: "Maps",
  submissions: "Submissions",
  approved: "ApprovedMatches",
  eloHonors: "EloSeasonHonors",
  gslHonors: "GslSeasonHonors",
  opponentClans: "OpponentClans",
  clanWars: "ClanWarMatches"
};

const HEADERS = {
  players: ["id", "race"],
  maps: ["map"],
  submissions: [
    "approve",
    "submittedAt",
    "status",
    "type",
    "date",
    "winner",
    "winnerRace",
    "loser",
    "loserRace",
    "map",
    "teamWin",
    "coffee",
    "approvalRequired",
    "adminNote",
    "seriesId",
    "teamWinner",
    "winnerTeam"
  ],
  approved: [
    "date",
    "type",
    "winner",
    "loser",
    "map",
    "teamWin",
    "coffee",
    "approved",
    "seriesId",
    "teamWinner",
    "winnerTeam",
    "approvedAt"
  ],
  honors: [
    "season",
    "rank",
    "playerId",
    "note"
  ],
  opponentClans: [
    "clan"
  ],
  clanWars: [
    "date",
    "opponentClan",
    "ourPlayer",
    "ourRace",
    "opponentPlayer",
    "opponentRace",
    "result",
    "submittedAt",
    "seriesId"
  ]
};

function setupEloBoardSheets() {
  getOrCreateSheet(SHEETS.players, HEADERS.players);
  getOrCreateSheet(SHEETS.maps, HEADERS.maps);
  getOrCreateSheet(SHEETS.submissions, HEADERS.submissions);
  getOrCreateSheet(SHEETS.approved, HEADERS.approved);
  getOrCreateSheet(SHEETS.eloHonors, HEADERS.honors);
  getOrCreateSheet(SHEETS.gslHonors, HEADERS.honors);
  getOrCreateSheet(SHEETS.opponentClans, HEADERS.opponentClans);
  getOrCreateSheet(SHEETS.clanWars, HEADERS.clanWars);
  repairSubmissionApprovalColumn();
}

function doGet(event) {
  const action = event && event.parameter ? event.parameter.action : "";
  const callback = event && event.parameter ? event.parameter.callback : "";
  let payload;

  if (action === "players") {
    payload = { ok: true, players: Object.values(readPlayers()) };
  } else if (action === "maps") {
    payload = { ok: true, maps: readMaps() };
  } else if (action === "approvedMatches") {
    payload = { ok: true, matches: readApprovedMatches() };
  } else if (action === "majorResults") {
    payload = { ok: true, ...readMajorResults() };
  } else if (action === "opponentClans") {
    payload = { ok: true, clans: readOpponentClans() };
  } else if (action === "clanWarMatches") {
    payload = { ok: true, matches: readClanWarMatches() };
  } else {
    payload = {
      ok: true,
      service: "EloBoard match intake",
      message: "Use action=players or action=approvedMatches for public data. POST match submissions to this Web App URL."
    };
  }

  return callback ? jsonpResponse(callback, payload) : jsonResponse(payload);
}

function doPost(event) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    setupEloBoardSheets();

    if (!event || !event.postData || !event.postData.contents) {
      return jsonResponse({ ok: false, error: "Missing request body" });
    }

    const payload = JSON.parse(event.postData.contents);
    const players = readPlayers();
    const maps = readMaps();
    if (payload.type === "clanwarBatch") {
      const validation = validateClanWarBatch(payload, players, readOpponentClans());
      if (validation) return jsonResponse({ ok: false, error: validation });
      const seriesId = `${payload.seriesId || ""}`.trim() || `clanwar-${Utilities.getUuid()}`;
      payload.matches.forEach((match) => {
        match.seriesId = `${match.seriesId || ""}`.trim() || seriesId;
      });
      payload.matches.forEach((match) => appendClanWarMatch(normalizeClanWarPayload(match, players)));
      return jsonResponse({ ok: true, status: "recorded", count: payload.matches.length });
    }

    const validation = payload.type === "normalBatch" || payload.type === "proleagueBatch" || payload.type === "deathmatchBatch"
      ? validateBatchSubmission(payload, players, maps)
      : validateSubmission(payload, players, maps);
    if (validation) {
      return jsonResponse({ ok: false, error: validation });
    }

    if (payload.type === "normalBatch" || payload.type === "proleagueBatch" || payload.type === "deathmatchBatch") {
      const status = payload.type === "normalBatch" && payload.matches.every((match) => !match.approvalRequired)
        ? "approved"
        : "pending";
      payload.matches.forEach((match) => {
        const normalized = normalizeSubmissionPayload(match, players, maps);
        appendSubmission(normalized, players, status);
        if (status === "approved") appendApprovedMatch(normalized);
      });
      return jsonResponse({ ok: true, status, count: payload.matches.length });
    }

    const normalizedPayload = normalizeSubmissionPayload(payload, players, maps);
    const status = payload.approvalRequired ? "pending" : "approved";
    appendSubmission(normalizedPayload, players, status);

    if (status === "approved") {
      appendApprovedMatch(normalizedPayload);
    }

    return jsonResponse({ ok: true, status });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message });
  } finally {
    lock.releaseLock();
  }
}

function appendSubmission(payload, players, status) {
  const winner = players[payload.winner.toLowerCase()];
  const loser = players[payload.loser.toLowerCase()];
  const submissions = getOrCreateSheet(SHEETS.submissions, HEADERS.submissions);

  submissions.appendRow([
    false,
    new Date().toISOString(),
    status,
    payload.type,
    payload.date,
    payload.winner,
    winner.race,
    payload.loser,
    loser.race,
    payload.map,
    Boolean(payload.teamWin),
    Boolean(payload.coffee),
    Boolean(payload.approvalRequired),
    "",
    payload.seriesId || "",
    payload.teamWinner || "",
    payload.winnerTeam || ""
  ]);
}

function normalizeSubmissionPayload(payload, players, maps) {
  return {
    ...payload,
    winner: canonicalPlayerId(payload.winner, players),
    loser: canonicalPlayerId(payload.loser, players),
    map: canonicalMapName(payload.map, maps)
  };
}

function canonicalPlayerId(id, players) {
  const player = players[`${id || ""}`.trim().toLowerCase()];
  return player ? player.id : `${id || ""}`.trim();
}

function canonicalMapName(mapName, maps) {
  const value = `${mapName || ""}`.trim();
  return maps.find((map) => map.toLowerCase() === value.toLowerCase()) || value;
}

function approveSubmission(rowNumber) {
  setupEloBoardSheets();
  const players = readPlayers();
  const maps = readMaps();
  const submissions = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.submissions);
  const values = submissions.getRange(rowNumber, 1, 1, HEADERS.submissions.length).getValues()[0];
  const row = rowToObject(HEADERS.submissions, values);

  if (!row.type || !row.date || !row.winner || !row.loser || !row.map) {
    throw new Error("Selected row is not a valid submission.");
  }

  appendApprovedMatch(normalizeSubmissionPayload({
    type: row.type,
    date: formatDateValue(row.date),
    winner: row.winner,
    loser: row.loser,
    map: row.map,
    teamWin: row.teamWin === true || row.teamWin === "TRUE",
    coffee: row.coffee === true || row.coffee === "TRUE",
    seriesId: row.seriesId || "",
    teamWinner: row.teamWinner || "",
    winnerTeam: row.winnerTeam || ""
  }, players, maps));

  submissions.getRange(rowNumber, 1).setValue(false);
  submissions.getRange(rowNumber, 3).setValue("approved");
}

function approveCheckedSubmissions() {
  setupEloBoardSheets();
  const players = readPlayers();
  const maps = readMaps();
  const submissions = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.submissions);
  const lastRow = submissions.getLastRow();
  if (lastRow < 2) return { approved: 0 };

  const values = submissions.getRange(2, 1, lastRow - 1, HEADERS.submissions.length).getValues();
  let approvedCount = 0;

  values.forEach((valuesRow, index) => {
    const rowNumber = index + 2;
    const row = rowToObject(HEADERS.submissions, valuesRow);
    const checked = row.approve === true || row.approve === "TRUE";
    const pending = row.status === "pending";

    if (!checked || !pending) return;

    appendApprovedMatch(normalizeSubmissionPayload({
      type: row.type,
      date: formatDateValue(row.date),
      winner: row.winner,
      loser: row.loser,
      map: row.map,
      teamWin: row.teamWin === true || row.teamWin === "TRUE",
      coffee: row.coffee === true || row.coffee === "TRUE",
      seriesId: row.seriesId || "",
      teamWinner: row.teamWinner || "",
      winnerTeam: row.winnerTeam || ""
    }, players, maps));

    submissions.getRange(rowNumber, 1).setValue(false);
    submissions.getRange(rowNumber, 3).setValue("approved");
    approvedCount += 1;
  });

  return { approved: approvedCount };
}

function repairSubmissionApprovalColumn() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEETS.submissions);
  if (!sheet) return;

  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  const approveColumnIndex = headers.indexOf("approve") + 1;

  if (approveColumnIndex === 0) {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("approve");
  } else if (approveColumnIndex !== 1) {
    sheet.moveColumns(sheet.getRange(1, approveColumnIndex, sheet.getMaxRows(), 1), 1);
  }

  sheet.getRange(1, 1, 1, HEADERS.submissions.length).setValues([HEADERS.submissions]);

  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const approvalRange = sheet.getRange(2, 1, lastRow - 1, 1);
    approvalRange.insertCheckboxes();
    const values = approvalRange.getValues().map((row) => [row[0] === true]);
    approvalRange.setValues(values);
  }
}

function exportApprovedMatchesJson() {
  setupEloBoardSheets();
  const matches = readApprovedMatches();

  Logger.log(JSON.stringify(matches, null, 2));
  return matches;
}

function readApprovedMatches() {
  const sheet = getOrCreateSheet(SHEETS.approved, HEADERS.approved);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();

  return values
    .filter((row) => row[0])
    .map((row) => rowToObject(headers, row))
    .map((match) => ({
      date: formatDateValue(match.date),
      type: match.type,
      winner: match.winner,
      loser: match.loser,
      map: match.map,
      teamWin: match.teamWin === true || match.teamWin === "TRUE",
      coffee: match.coffee === true || match.coffee === "TRUE",
      approved: match.approved === true || match.approved === "TRUE" || match.approved === true,
      seriesId: match.seriesId || "",
      teamWinner: match.teamWinner || "",
      winnerTeam: match.winnerTeam || "",
      approvedAt: match.approvedAt ? formatDateTimeValue(match.approvedAt) : ""
    }));
}

function appendApprovedMatch(payload) {
  const approved = getOrCreateSheet(SHEETS.approved, HEADERS.approved);
  approved.appendRow([
    payload.date,
    payload.type,
    payload.winner,
    payload.loser,
    payload.map,
    Boolean(payload.teamWin),
    Boolean(payload.coffee),
    true,
    payload.seriesId || "",
    payload.teamWinner || "",
    payload.winnerTeam || "",
    new Date().toISOString()
  ]);
}

function validateSubmission(payload, players, maps) {
  const allowedTypes = ["normal", "proleague", "deathmatch"];
  if (!allowedTypes.includes(payload.type)) return "Invalid type";
  if (!payload.date) return "Missing date";
  if (!payload.winner) return "Missing winner";
  if (!payload.loser) return "Missing loser";
  if (`${payload.winner}`.trim().toLowerCase() === `${payload.loser}`.trim().toLowerCase()) return "Winner and loser must differ";
  if (!payload.map) return "Missing map";
  if (!players[payload.winner.toLowerCase()]) return "Winner is not in Players sheet";
  if (!players[payload.loser.toLowerCase()]) return "Loser is not in Players sheet";
  if (!maps.some((map) => map.toLowerCase() === `${payload.map}`.trim().toLowerCase())) {
    return "Map is not in Maps sheet";
  }
  if (payload.type !== "proleague" && (payload.teamWin || payload.coffee)) {
    return "Team win and coffee are only allowed for proleague";
  }
  return "";
}

function validateBatchSubmission(payload, players, maps) {
  if (!payload.date) return "Missing date";
  if (!Array.isArray(payload.matches) || payload.matches.length === 0) {
    return "Missing batch matches";
  }
  if (payload.type === "proleagueBatch" && payload.matches.length > 9) return "Too many proleague matches";

  for (let index = 0; index < payload.matches.length; index += 1) {
    const error = validateSubmission(payload.matches[index], players, maps);
    if (error) return `Set ${index + 1}: ${error}`;
  }

  if (payload.type === "proleagueBatch" && !proleagueTeamWinnerMatchesSetScore(payload)) {
    return "Proleague team winner does not match set wins";
  }

  return "";
}

function proleagueTeamWinnerMatchesSetScore(payload) {
  const scores = payload.matches.reduce((result, match) => {
    if (match.winnerTeam === "A" || match.winnerTeam === "B") {
      result[match.winnerTeam] += 1;
    }
    return result;
  }, { A: 0, B: 0 });
  const otherTeam = payload.teamWinner === "A" ? "B" : "A";
  return scores[payload.teamWinner] > scores[otherTeam];
}

function readPlayers() {
  const sheet = getOrCreateSheet(SHEETS.players, HEADERS.players);
  const values = sheet.getDataRange().getValues();
  values.shift();

  return values.reduce((players, row) => {
    const id = `${row[0] || ""}`.trim();
    const race = `${row[1] || ""}`.trim();
    if (id && race) {
      players[id.toLowerCase()] = { id, race };
    }
    return players;
  }, {});
}

function readMaps() {
  const sheet = getOrCreateSheet(SHEETS.maps, HEADERS.maps);
  const values = sheet.getDataRange().getValues();
  values.shift();

  return values
    .map((row) => `${row[0] || ""}`.trim())
    .filter(Boolean);
}

function readOpponentClans() {
  const sheet = getOrCreateSheet(SHEETS.opponentClans, HEADERS.opponentClans);
  const values = sheet.getDataRange().getValues();
  values.shift();

  return values
    .map((row) => `${row[0] || ""}`.trim())
    .filter(Boolean);
}

function readClanWarMatches() {
  const sheet = getOrCreateSheet(SHEETS.clanWars, HEADERS.clanWars);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();

  return values
    .filter((row) => row[0])
    .map((row, index) => {
      const match = rowToObject(headers, row);
      return {
        date: formatDateValue(match.date),
        opponentClan: match.opponentClan,
        ourPlayer: match.ourPlayer,
        ourRace: match.ourRace,
        opponentPlayer: match.opponentPlayer,
        opponentRace: match.opponentRace,
        result: match.result,
        submittedAt: match.submittedAt ? formatDateTimeValue(match.submittedAt) : "",
        seriesId: match.seriesId,
        sourceIndex: index
      };
    });
}

function validateClanWarBatch(payload, players, clans) {
  if (!payload.date) return "Missing date";
  if (!payload.opponentClan) return "Missing opponent clan";
  if (clans.length && !clans.some((clan) => clan.toLowerCase() === `${payload.opponentClan}`.trim().toLowerCase())) {
    return "Opponent clan is not in OpponentClans sheet";
  }
  if (!Array.isArray(payload.matches) || payload.matches.length === 0) return "Missing clan war matches";

  for (let index = 0; index < payload.matches.length; index += 1) {
    const match = payload.matches[index];
    if (!players[`${match.ourPlayer || ""}`.trim().toLowerCase()]) return `Game ${index + 1}: our player is not in Players sheet`;
    if (!`${match.opponentPlayer || ""}`.trim()) return `Game ${index + 1}: missing opponent player`;
    if (!["Zerg", "Terran", "Protoss"].includes(match.opponentRace)) return `Game ${index + 1}: invalid opponent race`;
    if (!["W", "L"].includes(match.result)) return `Game ${index + 1}: invalid result`;
  }

  return "";
}

function normalizeClanWarPayload(payload, players) {
  const ourPlayer = canonicalPlayerId(payload.ourPlayer, players);
  const player = players[ourPlayer.toLowerCase()];
  return {
    ...payload,
    opponentClan: `${payload.opponentClan || ""}`.trim(),
    ourPlayer,
    ourRace: player ? player.race : "",
    opponentPlayer: `${payload.opponentPlayer || ""}`.trim(),
    opponentRace: payload.opponentRace,
    result: payload.result === "L" ? "L" : "W",
    seriesId: `${payload.seriesId || ""}`.trim()
  };
}

function appendClanWarMatch(payload) {
  const sheet = getOrCreateSheet(SHEETS.clanWars, HEADERS.clanWars);
  sheet.appendRow([
    payload.date,
    payload.opponentClan,
    payload.ourPlayer,
    payload.ourRace,
    payload.opponentPlayer,
    payload.opponentRace,
    payload.result,
    new Date().toISOString(),
    payload.seriesId
  ]);
}

function readMajorResults() {
  return {
    eloSeasons: readHonorSeasons(SHEETS.eloHonors),
    gslSeasons: readHonorSeasons(SHEETS.gslHonors)
  };
}

function readHonorSeasons(sheetName) {
  const sheet = getOrCreateSheet(sheetName, HEADERS.honors);
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  const seasons = new Map();

  values
    .map((row) => rowToObject(headers, row))
    .forEach((entry) => {
      const season = `${entry.season || ""}`.trim();
      const rank = Number(entry.rank);
      const playerId = `${entry.playerId || ""}`.trim();
      if (!season || !Number.isFinite(rank) || !playerId) return;

      if (!seasons.has(season)) {
        seasons.set(season, {
          season,
          note: `${entry.note || ""}`.trim(),
          results: []
        });
      }

      const seasonEntry = seasons.get(season);
      if (!seasonEntry.note && entry.note) seasonEntry.note = `${entry.note}`.trim();
      seasonEntry.results.push({ rank, playerId });
    });

  return [...seasons.values()].map((season) => ({
    ...season,
    results: season.results.sort((a, b) => a.rank - b.rank)
  }));
}

function getOrCreateSheet(name, headers) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
  }
  ensureHeaders(sheet, headers);
  if (name === SHEETS.submissions) {
    ensureSubmissionCheckboxes(sheet);
  }
  return sheet;
}

function ensureHeaders(sheet, headers) {
  const existingWidth = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, existingWidth).getValues()[0];
  if (existing[0] !== "approve" && headers[0] === "approve") {
    sheet.insertColumnBefore(1);
    sheet.getRange(1, 1).setValue("approve");
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function ensureSubmissionCheckboxes(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  sheet.getRange(2, 1, lastRow - 1, 1).insertCheckboxes();
}

function rowToObject(headers, row) {
  return headers.reduce((object, header, index) => {
    object[header] = row[index];
    return object;
  }, {});
}

function formatDateValue(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return `${value}`;
}

function formatDateTimeValue(value) {
  if (Object.prototype.toString.call(value) === "[object Date]") {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm:ssXXX");
  }
  return `${value}`;
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(callback, payload) {
  const safeCallback = callback.replace(/[^\w$.]/g, "");
  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
