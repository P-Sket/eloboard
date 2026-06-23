import { CONFIG } from "./config.js";

const SCALE = 173.7178;
const DEFAULT_PLAYER = { rating: 1500, rd: 350, volatility: 0.06 };
const RACES = ["Zerg", "Terran", "Protoss"];
const FALL_WORLD_HEIGHT = 2300;
const HORSE_TRACK_LENGTH = 11800;

const raceKorean = {
  Zerg: "저그",
  Terran: "테란",
  Protoss: "프로토스"
};

const typeLabel = {
  normal: "일반전",
  proleague: "프로리그",
  deathmatch: "끝장전"
};

const el = {
  body: document.body,
  themeLabel: document.querySelector("#theme-label"),
  topPlayerName: document.querySelector("#top-player-name"),
  topRating: document.querySelector("#top-rating"),
  topRace: document.querySelector("#top-race"),
  homeTopCommanders: document.querySelector("#home-top-commanders"),
  leaderboardTopCommanders: document.querySelector("#leaderboard-top-commanders"),
  raceEmblem: document.querySelector("#race-emblem"),
  leaderboardBody: document.querySelector("#leaderboard-body"),
  recentMatches: document.querySelector("#recent-matches"),
  deathmatchLog: document.querySelector("#deathmatch-log"),
  views: [...document.querySelectorAll("[data-view]")],
  routeLinks: [...document.querySelectorAll("[data-route-link]")],
  ratingButtons: [...document.querySelectorAll("[data-rating-mode]")],
  majorOnlyCells: [...document.querySelectorAll("[data-major-only]")],
  statsButtons: [...document.querySelectorAll("[data-stats-mode]")],
  raceRecordGrid: document.querySelector("#race-record-grid"),
  hallGrid: document.querySelector("#hall-grid"),
  mapRaceStats: document.querySelector("#map-race-stats"),
  playerMapFilter: document.querySelector("#player-map-filter"),
  playerMapStats: document.querySelector("#player-map-stats"),
  headPlayerA: document.querySelector("#head-player-a"),
  headPlayerB: document.querySelector("#head-player-b"),
  headToHeadStats: document.querySelector("#head-to-head-stats"),
  mapPickerOptions: document.querySelector("#map-picker-options"),
  mapPickerResults: document.querySelector("#map-picker-results"),
  mapPickerCount: document.querySelector("#map-picker-count"),
  mapPickerRoll: document.querySelector("#map-picker-roll"),
  mapPickerSelectAll: document.querySelector("#map-picker-select-all"),
  mapPickerClear: document.querySelector("#map-picker-clear"),
  playerGameOptions: document.querySelector("#player-game-options"),
  playerGameMode: document.querySelector("#player-game-mode"),
  playerGameScope: document.querySelector("#player-game-scope"),
  horseWinMode: document.querySelector("#horse-win-mode"),
  horseWinControl: document.querySelector(".horse-win-control"),
  teamGamePanel: document.querySelector("#team-game-panel"),
  teamGameA: document.querySelector("#team-game-a"),
  teamGameB: document.querySelector("#team-game-b"),
  teamGameASearch: document.querySelector("#team-game-a-search"),
  teamGameBSearch: document.querySelector("#team-game-b-search"),
  teamGameReset: document.querySelector("#team-game-reset"),
  teamGameResults: document.querySelector("#team-game-results"),
  playerGameStart: document.querySelector("#player-game-start"),
  playerGameSelectAll: document.querySelector("#player-game-select-all"),
  playerGameClear: document.querySelector("#player-game-clear"),
  playerGameArena: document.querySelector("#player-game-arena"),
  playerGameWinner: document.querySelector("#player-game-winner"),
  playerSearch: document.querySelector("#player-search"),
  raceFilter: document.querySelector("#race-filter"),
  leaderboardDateFrom: document.querySelector("#leaderboard-date-from"),
  leaderboardDateTo: document.querySelector("#leaderboard-date-to"),
  playerList: document.querySelector("#player-list"),
  mapList: document.querySelector("#map-list"),
  clearButtons: [...document.querySelectorAll("[data-clear-target]")],
  form: document.querySelector("#match-form"),
  matchType: document.querySelector("#match-type"),
  matchDate: document.querySelector("#match-date"),
  singleMatchFields: document.querySelector("#single-match-fields"),
  normalSets: document.querySelector("#normal-sets"),
  addNormalSet: document.querySelector("#add-normal-set"),
  proleagueBatch: document.querySelector("#proleague-batch"),
  proleagueTeamWinner: document.querySelector("#proleague-team-winner"),
  proleagueCoffee: document.querySelector("#proleague-coffee"),
  proleagueSets: document.querySelector("#proleague-sets"),
  addProleagueSet: document.querySelector("#add-proleague-set"),
  deathmatchBatch: document.querySelector("#deathmatch-batch"),
  deathmatchPlayerA: document.querySelector("#deathmatch-player-a"),
  deathmatchPlayerB: document.querySelector("#deathmatch-player-b"),
  deathmatchPlayerARace: document.querySelector("#deathmatch-player-a-race"),
  deathmatchPlayerBRace: document.querySelector("#deathmatch-player-b-race"),
  deathmatchSetCount: document.querySelector("#deathmatch-set-count"),
  deathmatchSets: document.querySelector("#deathmatch-sets"),
  message: document.querySelector("#form-message")
};

let players = [];
let matches = [];
let maps = [];
let standingsByMode = {
  normal: [],
  major: [],
  all: []
};
let majorExtrasByPlayer = {};
let activeRatingMode = "major";
let activeStatsMode = "major";
let selectedPlayerId = "";
let playerGameFrame = 0;
let playerGameState = null;
let playerGamePreviewRacers = [];
let playerGamePreviewMode = "";
let dartAimY = 0;
let marbleGameState = null;
let teamGameState = createTeamGameState();
let teamSelections = { A: new Set(), B: new Set() };

async function init() {
  const [playerData, matchData, mapData] = await loadData();

  players = playerData;
  maps = mapData;
  matches = normalizeMatches(matchData).filter((match) => match.approved);
  standingsByMode = buildStandingsByMode(players, matches);
  majorExtrasByPlayer = buildMajorExtras(matches);

  hydrateControls();
  render();
  bindEvents();
}

async function loadData() {
  if (CONFIG.dataSource === "google-sheets" && CONFIG.googleSheetsWebAppUrl) {
    try {
      const [sheetPlayers, sheetMatches, sheetMaps] = await Promise.all([
        fetchJsonp(CONFIG.googleSheetsWebAppUrl, { action: "players" }),
        fetchJsonp(CONFIG.googleSheetsWebAppUrl, { action: "approvedMatches" }),
        fetchJsonp(CONFIG.googleSheetsWebAppUrl, { action: "maps" })
      ]);
      const mapsFromSheet = Object.prototype.hasOwnProperty.call(sheetMaps, "maps")
        ? sheetMaps.maps
        : await fetchJson("data/maps.json");
      return [sheetPlayers.players || [], sheetMatches.matches || [], mapsFromSheet || []];
    } catch (error) {
      console.warn("Google Sheets data load failed.", error);
      return [[], [], []];
    }
  }

  return Promise.all([
    fetchJson("data/players.json"),
    fetchJson("data/matches.json"),
    fetchJson("data/maps.json")
  ]);
}

function normalizeMatches(matchList) {
  return matchList.map((match) => ({
    ...match,
    winner: canonicalPlayerId(match.winner),
    loser: canonicalPlayerId(match.loser),
    map: canonicalMapName(match.map)
  }));
}

function canonicalPlayerId(id) {
  return findPlayer(id)?.id || `${id || ""}`.trim();
}

function canonicalMapName(mapName) {
  const value = `${mapName || ""}`.trim();
  return maps.find((map) => map.toLowerCase() === value.toLowerCase()) || value;
}

async function fetchJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`${path} 로드 실패`);
  return response.json();
}

function fetchJsonp(baseUrl, params = {}) {
  return new Promise((resolve, reject) => {
    const callbackName = `eloboardJsonp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = new URL(baseUrl);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    url.searchParams.set("callback", callbackName);
    url.searchParams.set("_", Date.now().toString());

    const script = document.createElement("script");
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Google Sheets data request timed out"));
    }, 12000);

    function cleanup() {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];
    }

    window[callbackName] = (payload) => {
      cleanup();
      if (payload && payload.ok === false) {
        reject(new Error(payload.error || "Google Sheets data request failed"));
        return;
      }
      resolve(payload);
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("Google Sheets data request failed"));
    };

    script.src = url.toString();
    document.head.append(script);
  });
}


function buildStandings(playerList, matchList) {
  const table = new Map();

  playerList.forEach((player) => {
    table.set(player.id, {
      ...player,
      ...DEFAULT_PLAYER,
      wins: 0,
      losses: 0,
      streak: 0,
      recent: [],
      vs: {
        Zerg: { wins: 0, losses: 0 },
        Terran: { wins: 0, losses: 0 },
        Protoss: { wins: 0, losses: 0 }
      }
    });
  });

  [...matchList]
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))
    .forEach((match) => {
      const winner = table.get(match.winner);
      const loser = table.get(match.loser);
      if (!winner || !loser || winner.id === loser.id) return;

      const [newWinner, newLoser] = ratePair(winner, loser);
      Object.assign(winner, newWinner);
      Object.assign(loser, newLoser);

      winner.wins += 1;
      loser.losses += 1;
      winner.streak = winner.streak >= 0 ? winner.streak + 1 : 1;
      loser.streak = loser.streak <= 0 ? loser.streak - 1 : -1;
      winner.vs[loser.race].wins += 1;
      loser.vs[winner.race].losses += 1;
      winner.recent.unshift("W");
      loser.recent.unshift("L");
      winner.recent = winner.recent.slice(0, 10);
      loser.recent = loser.recent.slice(0, 10);
    });

  return [...table.values()]
    .map((player) => ({
      ...player,
      rating: Math.round(player.rating),
      rd: Math.round(player.rd)
    }))
    .sort((a, b) => b.rating - a.rating || a.rd - b.rd || a.id.localeCompare(b.id))
    .map((player, index) => ({ ...player, rank: index + 1 }));
}

function buildStandingsByMode(playerList, matchList) {
  return {
    normal: buildStandings(playerList, matchList.filter((match) => match.type === "normal")),
    major: buildStandings(playerList, matchList.filter((match) => match.type === "proleague" || match.type === "deathmatch")),
    all: buildStandings(playerList, matchList)
  };
}

function buildMajorExtras(matchList) {
  const extras = players.reduce((result, player) => {
    result[player.id] = createMajorExtraRecord();
    return result;
  }, {});

  const proleagueGroups = new Map();

  matchList.forEach((match) => {
    ensureMajorExtra(extras, match.winner);
    ensureMajorExtra(extras, match.loser);

    if (match.type === "proleague") {
      const key = match.seriesId || "";
      if (key && match.teamWinner && match.winnerTeam) {
        if (!proleagueGroups.has(key)) {
          proleagueGroups.set(key, { teamWinner: match.teamWinner, coffee: false, winners: new Set(), losers: new Set() });
        }
        const group = proleagueGroups.get(key);
        group.coffee = group.coffee || Boolean(match.coffee);
        const winnerIsTeamWinner = match.winnerTeam === group.teamWinner;
        const teamWinnerPlayer = winnerIsTeamWinner ? match.winner : match.loser;
        const teamLoserPlayer = winnerIsTeamWinner ? match.loser : match.winner;
        group.winners.add(teamWinnerPlayer);
        group.losers.add(teamLoserPlayer);
      } else {
        applyLegacyProleagueExtra(extras, match);
      }
    }
  });

  proleagueGroups.forEach((group) => {
    group.winners.forEach((playerId) => {
      ensureMajorExtra(extras, playerId);
      extras[playerId].team.wins += 1;
      if (group.coffee) extras[playerId].coffee += 1;
    });
    group.losers.forEach((playerId) => {
      ensureMajorExtra(extras, playerId);
      extras[playerId].team.losses += 1;
    });
  });

  buildDeathmatchSeries(matchList).forEach((series) => {
    if (!series.winner || !series.loser) return;
    ensureMajorExtra(extras, series.winner);
    ensureMajorExtra(extras, series.loser);
    extras[series.winner].death.wins += 1;
    extras[series.loser].death.losses += 1;
  });

  return extras;
}

function applyLegacyProleagueExtra(extras, match) {
  if (match.teamWin) {
    extras[match.winner].team.wins += 1;
    extras[match.loser].team.losses += 1;
  } else {
    extras[match.winner].team.losses += 1;
    extras[match.loser].team.wins += 1;
  }
  if (match.coffee) extras[match.winner].coffee += 1;
}

function createMajorExtraRecord() {
  return {
    team: { wins: 0, losses: 0 },
    coffee: 0,
    death: { wins: 0, losses: 0 }
  };
}

function ensureMajorExtra(extras, playerId) {
  if (!extras[playerId]) extras[playerId] = createMajorExtraRecord();
}

function buildDeathmatchSeries(matchList) {
  const groups = new Map();

  matchList
    .filter((match) => match.type === "deathmatch")
    .forEach((match, index) => {
      const key = match.seriesId || buildLegacyDeathmatchSeriesKey(match);
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          date: match.date,
          players: [...new Set([match.winner, match.loser])],
          sets: [],
          firstIndex: index
        });
      }

      const series = groups.get(key);
      series.date = series.date || match.date;
      [match.winner, match.loser].forEach((playerId) => {
        if (!series.players.includes(playerId)) series.players.push(playerId);
      });
      series.sets.push(match);
    });

  return [...groups.values()]
    .map((series) => {
      const setWins = series.sets.reduce((result, match) => {
        result[match.winner] = (result[match.winner] || 0) + 1;
        if (!Object.prototype.hasOwnProperty.call(result, match.loser)) result[match.loser] = 0;
        return result;
      }, {});
      const ranked = Object.entries(setWins).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      const winner = ranked[0]?.[0] || "";
      const loser = ranked[1]?.[0] || "";

      return {
        ...series,
        winner: ranked[0] && ranked[1] && ranked[0][1] !== ranked[1][1] ? winner : "",
        loser: ranked[0] && ranked[1] && ranked[0][1] !== ranked[1][1] ? loser : "",
        setWins
      };
    })
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`) || b.firstIndex - a.firstIndex);
}

function buildLegacyDeathmatchSeriesKey(match) {
  const playersKey = [match.winner, match.loser].sort((a, b) => a.localeCompare(b)).join("|");
  return `${match.date}|${playersKey}`;
}

function ratePair(winner, loser) {
  return [
    calculateGlicko2(winner, [{ opponent: loser, score: 1 }]),
    calculateGlicko2(loser, [{ opponent: winner, score: 0 }])
  ];
}

function calculateGlicko2(player, results) {
  const tau = 0.5;
  const epsilon = 0.000001;
  const mu = (player.rating - 1500) / SCALE;
  const phi = player.rd / SCALE;
  const sigma = player.volatility;

  const variance = 1 / results.reduce((sum, result) => {
    const opponentMu = (result.opponent.rating - 1500) / SCALE;
    const opponentPhi = result.opponent.rd / SCALE;
    const g = glickoG(opponentPhi);
    const e = glickoE(mu, opponentMu, opponentPhi);
    return sum + g * g * e * (1 - e);
  }, 0);

  const delta = variance * results.reduce((sum, result) => {
    const opponentMu = (result.opponent.rating - 1500) / SCALE;
    const opponentPhi = result.opponent.rd / SCALE;
    return sum + glickoG(opponentPhi) * (result.score - glickoE(mu, opponentMu, opponentPhi));
  }, 0);

  const a = Math.log(sigma * sigma);
  const f = (x) => {
    const expX = Math.exp(x);
    const numerator = expX * (delta * delta - phi * phi - variance - expX);
    const denominator = 2 * Math.pow(phi * phi + variance + expX, 2);
    return numerator / denominator - (x - a) / (tau * tau);
  };

  let A = a;
  let B;
  if (delta * delta > phi * phi + variance) {
    B = Math.log(delta * delta - phi * phi - variance);
  } else {
    let k = 1;
    while (f(a - k * tau) < 0) k += 1;
    B = a - k * tau;
  }

  let fA = f(A);
  let fB = f(B);
  while (Math.abs(B - A) > epsilon) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);
    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA /= 2;
    }
    B = C;
    fB = fC;
  }

  const newSigma = Math.exp(A / 2);
  const phiStar = Math.sqrt(phi * phi + newSigma * newSigma);
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / variance);
  const newMu = mu + newPhi * newPhi * results.reduce((sum, result) => {
    const opponentMu = (result.opponent.rating - 1500) / SCALE;
    const opponentPhi = result.opponent.rd / SCALE;
    return sum + glickoG(opponentPhi) * (result.score - glickoE(mu, opponentMu, opponentPhi));
  }, 0);

  return {
    rating: 1500 + SCALE * newMu,
    rd: Math.max(30, SCALE * newPhi),
    volatility: newSigma
  };
}

function glickoG(phi) {
  return 1 / Math.sqrt(1 + (3 * phi * phi) / (Math.PI * Math.PI));
}

function glickoE(mu, opponentMu, opponentPhi) {
  return 1 / (1 + Math.exp(-glickoG(opponentPhi) * (mu - opponentMu)));
}

function hydrateControls() {
  el.matchDate.valueAsDate = new Date();
  el.playerList.innerHTML = players
    .map((player) => `<option value="${escapeHtml(player.id)}">${escapeHtml(player.race)}</option>`)
    .join("");
  el.mapList.innerHTML = maps
    .map((map) => `<option value="${escapeHtml(map)}"></option>`)
    .join("");
  renderMapPickerOptions();
  renderPlayerGameOptions();
  syncTeamGameOptionLists();
  resetPlayerGameArena();
}

function bindEvents() {
  el.playerSearch.addEventListener("input", renderLeaderboard);
  el.raceFilter.addEventListener("change", renderLeaderboard);
  el.leaderboardDateFrom.addEventListener("change", renderLeaderboard);
  el.leaderboardDateTo.addEventListener("change", renderLeaderboard);
  el.playerMapFilter.addEventListener("input", renderPlayerMapStats);
  el.headPlayerA.addEventListener("input", renderHeadToHeadStats);
  el.headPlayerB.addEventListener("input", renderHeadToHeadStats);
  el.mapPickerRoll.addEventListener("click", rollMaps);
  el.mapPickerSelectAll.addEventListener("click", () => setMapPickerSelection(true));
  el.mapPickerClear.addEventListener("click", () => setMapPickerSelection(false));
  el.mapPickerCount.addEventListener("input", syncMapPickerCount);
  el.playerGameStart.addEventListener("click", startPlayerGame);
  el.playerGameSelectAll.addEventListener("click", () => {
    setPlayerGameSelection(true);
    resetPlayerGameArena();
  });
  el.playerGameClear.addEventListener("click", () => {
    setPlayerGameSelection(false);
    resetPlayerGameArena();
  });
  el.playerGameOptions.addEventListener("change", resetPlayerGameArena);
  el.playerGameScope.addEventListener("change", () => {
    syncGameScopeControls();
    resetTeamGameState();
    resetPlayerGameArena();
  });
  el.teamGameA.addEventListener("change", () => {
    updateTeamSelectionFromInputs("A");
    resetTeamGameState();
    resetPlayerGameArena();
  });
  el.teamGameB.addEventListener("change", () => {
    updateTeamSelectionFromInputs("B");
    resetTeamGameState();
    resetPlayerGameArena();
  });
  el.teamGameASearch.addEventListener("input", () => {
    renderTeamGameOptions("A");
    markTeamPickedChoices();
  });
  el.teamGameBSearch.addEventListener("input", () => {
    renderTeamGameOptions("B");
    markTeamPickedChoices();
  });
  el.teamGameReset.addEventListener("click", () => {
    resetTeamGameState();
    resetPlayerGameArena();
  });
  el.playerGameMode.addEventListener("change", () => {
    syncGameModeControls();
    resetPlayerGameArena();
  });
  el.horseWinMode.addEventListener("change", resetPlayerGameArena);
  el.leaderboardBody.addEventListener("click", handleLeaderboardClick);
  el.leaderboardBody.addEventListener("keydown", handleLeaderboardKeydown);
  el.ratingButtons.forEach((button) => button.addEventListener("click", setRatingMode));
  el.statsButtons.forEach((button) => button.addEventListener("click", setStatsMode));
  el.matchType.addEventListener("change", syncTypeFields);
  el.deathmatchPlayerA.addEventListener("input", () => {
    syncRacePreview(el.deathmatchPlayerA, el.deathmatchPlayerARace);
    syncDeathmatchWinnerLabels();
  });
  el.deathmatchPlayerB.addEventListener("input", () => {
    syncRacePreview(el.deathmatchPlayerB, el.deathmatchPlayerBRace);
    syncDeathmatchWinnerLabels();
  });
  el.deathmatchSetCount.addEventListener("input", syncDeathmatchSetCount);
  el.clearButtons.forEach((button) => button.addEventListener("click", clearInput));
  el.addNormalSet.addEventListener("click", addNormalSet);
  el.normalSets.addEventListener("input", syncDynamicRacePreview);
  el.normalSets.addEventListener("click", handleNormalSetClick);
  el.addProleagueSet.addEventListener("click", addProleagueSet);
  el.proleagueSets.addEventListener("input", syncDynamicRacePreview);
  el.proleagueSets.addEventListener("click", handleProleagueSetClick);
  el.deathmatchSets.addEventListener("change", syncDeathmatchSetWinnerRaces);
  el.deathmatchSets.addEventListener("click", handleDeathmatchSetClick);
  el.form.addEventListener("submit", submitMatch);
  window.addEventListener("hashchange", syncRoute);
  renderNormalSets(3);
  renderProleagueSets(3);
  renderDeathmatchSets(getDeathmatchSetCount());
  syncRoute();
}

function render() {
  renderTheme();
  renderTopCommanders();
  renderLeaderboard();
  renderMajorSummary();
  renderStats();
  renderMapPickerResults([]);
  syncGameModeControls();
  syncGameScopeControls();
  resetPlayerGameArena();
  renderRecentMatches();
  renderDeathmatchLog();
  syncTypeFields();
}

function syncGameScopeControls() {
  if (el.playerGameScope) el.playerGameScope.value = "team";
  if (el.playerGameScope?.closest("label")) el.playerGameScope.closest("label").hidden = true;
  if (el.playerGameSelectAll) el.playerGameSelectAll.hidden = true;
  if (el.playerGameClear) el.playerGameClear.hidden = true;
  if (el.teamGamePanel) el.teamGamePanel.hidden = false;
  if (el.playerGameOptions) el.playerGameOptions.hidden = true;
  renderTeamGameResults();
}

function syncGameModeControls() {
  if (!el.horseWinControl) return;
  const hasRankWinner = ["horse", "marble"].includes(el.playerGameMode.value);
  el.horseWinControl.hidden = !hasRankWinner;
  el.horseWinControl.style.display = hasRankWinner ? "" : "none";
}

function renderMapPickerOptions() {
  el.mapPickerOptions.innerHTML = maps.map((map, index) => `
    <label class="map-choice">
      <input type="checkbox" value="${escapeHtml(map)}" checked>
      <span class="map-choice-name">${escapeHtml(map)}</span>
      <small>#${index + 1}</small>
    </label>
  `).join("") || `<p class="empty-state inline-empty">등록된 맵이 없습니다.</p>`;
}

function setMapPickerSelection(checked) {
  el.mapPickerOptions.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = checked;
  });
}

function syncMapPickerCount() {
  const count = Number(el.mapPickerCount.value);
  if (!Number.isFinite(count)) {
    el.mapPickerCount.value = 1;
    return;
  }
  el.mapPickerCount.value = Math.min(9, Math.max(1, Math.round(count)));
}

function rollMaps() {
  syncMapPickerCount();
  const selectedMaps = getSelectedPickerMaps();
  if (!selectedMaps.length) {
    renderMapPickerResults([], "맵을 하나 이상 선택해주세요.");
    return;
  }

  const targetCount = Number(el.mapPickerCount.value) || 9;
  const results = [];
  while (results.length < targetCount) {
    const round = shuffleList(selectedMaps);
    results.push(...round.slice(0, targetCount - results.length));
  }
  renderMapPickerResults(results);
}

function getSelectedPickerMaps() {
  return [...el.mapPickerOptions.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => input.value);
}

function shuffleList(list) {
  const copy = [...list];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

function renderMapPickerResults(results, emptyText = "뽑기를 누르면 순서대로 표시됩니다.") {
  el.mapPickerResults.innerHTML = results.length
    ? results.map((map, index) => `
      <li class="map-flip-card" style="--flip-delay: ${index * 260}ms">
        <div class="map-flip-inner">
          <div class="map-flip-face map-flip-front">
            <span>${index + 1}</span>
          </div>
          <div class="map-flip-face map-flip-back">
            <span>${index + 1}</span>
            <strong>${escapeHtml(map)}</strong>
          </div>
        </div>
      </li>
    `).join("")
    : `<li class="empty-map-result">${escapeHtml(emptyText)}</li>`;
}

function renderPlayerGameOptions() {
  el.playerGameOptions.innerHTML = players.map((player) => `
    <label class="player-choice ${player.race.toLowerCase()}">
      <input type="checkbox" value="${escapeHtml(player.id)}" checked>
      ${renderRaceMark(player.race)}
      <span>${escapeHtml(player.id)}</span>
    </label>
  `).join("") || `<p class="empty-state inline-empty">등록된 플레이어가 없습니다.</p>`;
}

function syncTeamGameOptionLists() {
  renderTeamGameOptions("A");
  renderTeamGameOptions("B");
}

function renderTeamGameOptions(team) {
  const root = team === "A" ? el.teamGameA : el.teamGameB;
  const searchInput = team === "A" ? el.teamGameASearch : el.teamGameBSearch;
  const query = (searchInput?.value || "").trim().toLowerCase();
  const recentIds = getRecentProleaguePlayerIds(10);
  const otherTeam = team === "A" ? "B" : "A";
  const sorted = players
    .filter((player) => !teamSelections[otherTeam].has(player.id))
    .filter((player) => !query || player.id.toLowerCase().includes(query))
    .slice()
    .sort((a, b) => {
      const recentDelta = Number(recentIds.has(b.id)) - Number(recentIds.has(a.id));
      if (recentDelta) return recentDelta;
      return a.id.localeCompare(b.id);
    });
  root.innerHTML = sorted.map((player) => renderTeamPlayerChoice(player, team)).join("")
    || `<p class="empty-state inline-empty">검색 결과 없음</p>`;
}

function renderTeamPlayerChoice(player, team) {
  const checked = teamSelections[team].has(player.id) ? " checked" : "";
  return `
    <label class="player-choice ${player.race.toLowerCase()}">
      <input type="checkbox" value="${escapeHtml(player.id)}"${checked}>
      ${renderRaceMark(player.race)}
      <span>${escapeHtml(player.id)}</span>
    </label>
  `;
}

function updateTeamSelectionFromInputs(team) {
  const root = team === "A" ? el.teamGameA : el.teamGameB;
  const otherTeam = team === "A" ? "B" : "A";
  root.querySelectorAll("input[type='checkbox']").forEach((input) => {
    if (input.checked) {
      teamSelections[team].add(input.value);
      teamSelections[otherTeam].delete(input.value);
    } else {
      teamSelections[team].delete(input.value);
    }
  });
  renderTeamGameOptions(otherTeam);
  renderTeamGameOptions(team);
}

function getRecentProleaguePlayerIds(days) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffKey = cutoff.toISOString().slice(0, 10);
  const ids = new Set();
  matches
    .filter((match) => match.type === "proleague")
    .filter((match) => normalizeDateString(match.date) >= cutoffKey)
    .forEach((match) => {
      if (match.winner) ids.add(match.winner);
      if (match.loser) ids.add(match.loser);
    });
  return ids;
}

function setPlayerGameSelection(checked) {
  el.playerGameOptions.querySelectorAll("input[type='checkbox']").forEach((input) => {
    input.checked = checked;
  });
}

function getSelectedGamePlayers() {
  return [...el.playerGameOptions.querySelectorAll("input[type='checkbox']:checked")]
    .map((input) => findPlayer(input.value))
    .filter(Boolean);
}

function startPlayerGame() {
  window.cancelAnimationFrame(playerGameFrame);
  playerGameState = null;
  startTeamGame();
  return;
  const participants = getSelectedGamePlayers();
  if (!participants.length) {
    renderPlayerGameArena([]);
    el.playerGameWinner.textContent = "참가자를 선택해주세요.";
    return;
  }

  const mode = el.playerGameMode.value;
  const racers = playerGamePreviewMode === mode && hasSameRacerSet(playerGamePreviewRacers, participants)
    ? playerGamePreviewRacers
    : buildGameRacers(participants);
  renderPlayerGameArena(racers);
  el.playerGameWinner.textContent = mode === "horse" ? "출발 준비" : mode === "marble" ? "낙하 준비" : "조준 중";
  el.playerGameStart.disabled = true;

  if (mode === "horse") {
    const state = createHorseRaceState(racers);
    playerGameState = state;
    const start = performance.now();

    function tickHorse(now) {
      const done = renderHorseRaceFrame(state, now - start);
      if (done) {
        finishPlayerGame(state.winner);
        return;
      }
      playerGameFrame = window.requestAnimationFrame(tickHorse);
    }

    playerGameFrame = window.requestAnimationFrame(tickHorse);
    return;
  }

  if (mode === "marble") {
    const state = createMarbleRaceState(racers);
    if (!state) {
      el.playerGameStart.disabled = false;
      return;
    }
    marbleGameState = state;
    playerGameState = state;
    function tickMarble(now) {
      const done = renderMarbleRaceFrame(state, now);
      if (done) {
        finishPlayerGame(state.winner);
        return;
      }
      playerGameFrame = window.requestAnimationFrame(tickMarble);
    }
    playerGameFrame = window.requestAnimationFrame(tickMarble);
    return;
  }

  if (racers.length === 1) {
    const state = createDartWheelState(racers);
    playerGameState = state;
    state.thrown = true;
    state.throwTime = performance.now();
    state.finalRotation = 0;
    state.winner = racers[0];
    state.throwX = 40;
    state.throwY = 40;
    state.stuckX = getStageCenter().x;
    state.stuckY = getStageCenter().y;
    state.stuckRadius = 0;
    renderDartWheelFrame(state, performance.now());
    finishPlayerGame(racers[0]);
    return;
  }

  const state = createDartWheelState(racers);
  playerGameState = state;

  function tick(now) {
    const done = renderDartWheelFrame(state, now);

    if (done) {
      finishPlayerGame(state.winner);
      return;
    }

    playerGameFrame = window.requestAnimationFrame(tick);
  }

  playerGameFrame = window.requestAnimationFrame(tick);
}

function createTeamGameState() {
  return {
    active: false,
    currentTeam: "A",
    picked: { A: [], B: [] },
    lastWinner: null
  };
}

function resetTeamGameState() {
  teamGameState = createTeamGameState();
  renderTeamGameResults();
}

function getSelectedTeamPlayers(team) {
  const picked = new Set(teamGameState.picked[team]);
  return [...teamSelections[team]]
    .map((playerId) => findPlayer(playerId))
    .filter(Boolean)
    .filter((player) => !picked.has(player.id));
}

function startTeamGame() {
  const team = teamGameState.currentTeam;
  const participants = getSelectedTeamPlayers(team);
  if (!participants.length) {
    el.playerGameWinner.textContent = `Team ${team} 남은 참가자가 없습니다.`;
    return;
  }
  teamGameState.active = true;
  teamGameState.lastWinner = null;
  const racers = buildGameRacers(participants);
  el.playerGameWinner.textContent = `Team ${team} 진행`;
  launchPlayerGameRun(racers);
}

function launchPlayerGameRun(racers) {
  const mode = el.playerGameMode.value;
  renderPlayerGameArena(racers);
  el.playerGameWinner.textContent = teamGameState.active
    ? `Team ${teamGameState.currentTeam} 진행`
    : mode === "horse" ? "출발 준비" : mode === "marble" ? "낙하 준비" : "조준 중";
  el.playerGameStart.disabled = true;

  if (mode === "horse") {
    const state = createHorseRaceState(racers);
    playerGameState = state;
    const start = performance.now();
    function tickHorse(now) {
      const done = renderHorseRaceFrame(state, now - start);
      if (done) {
        finishPlayerGame(state.winner);
        return;
      }
      playerGameFrame = window.requestAnimationFrame(tickHorse);
    }
    playerGameFrame = window.requestAnimationFrame(tickHorse);
    return;
  }

  if (mode === "marble") {
    const state = createMarbleRaceState(racers);
    if (!state) {
      el.playerGameStart.disabled = false;
      return;
    }
    marbleGameState = state;
    playerGameState = state;
    function tickMarble(now) {
      const done = renderMarbleRaceFrame(state, now);
      if (done) {
        finishPlayerGame(state.winner);
        return;
      }
      playerGameFrame = window.requestAnimationFrame(tickMarble);
    }
    playerGameFrame = window.requestAnimationFrame(tickMarble);
    return;
  }

  if (racers.length === 1) {
    const state = createDartWheelState(racers);
    playerGameState = state;
    state.thrown = true;
    state.throwTime = performance.now();
    state.finalRotation = 0;
    state.winner = racers[0];
    state.throwX = 40;
    state.throwY = 40;
    state.stuckX = getStageCenter().x;
    state.stuckY = getStageCenter().y;
    state.stuckRadius = 0;
    renderDartWheelFrame(state, performance.now());
    finishPlayerGame(racers[0]);
    return;
  }

  const state = createDartWheelState(racers);
  playerGameState = state;
  function tick(now) {
    const done = renderDartWheelFrame(state, now);
    if (done) {
      finishPlayerGame(state.winner);
      return;
    }
    playerGameFrame = window.requestAnimationFrame(tick);
  }
  playerGameFrame = window.requestAnimationFrame(tick);
}

function buildGameRacers(participants) {
  const shuffled = shuffleList(participants);
  return shuffled.map((player, index) => ({
    id: player.id,
    race: player.race,
    index,
    duration: 30000 + Math.random() * 20000,
    laneSeed: Math.random() * Math.PI * 2,
    wobble: 18 + Math.random() * 34,
    events: buildRaceEvents(5 + Math.floor(Math.random() * 4), 0.12, 0.9)
  }));
}

function buildRaceEvents(count, minProgress, maxProgress) {
  return Array.from({ length: count }, () => ({
    at: minProgress + Math.random() * (maxProgress - minProgress),
    width: 0.045 + Math.random() * 0.055,
    kind: Math.random() > 0.52 ? "boost" : "block",
    strength: 0.012 + Math.random() * 0.028
  })).sort((a, b) => a.at - b.at);
}

function renderPlayerGameArena(racers) {
  el.playerGameWinner.textContent = racers.length ? "준비 완료" : "대기 중";
  const mode = el.playerGameMode.value;
  el.playerGameArena.dataset.mode = mode;
  playerGamePreviewRacers = racers;
  playerGamePreviewMode = mode;

  if (!racers.length) {
    el.playerGameArena.innerHTML = `<p class="empty-state inline-empty">참가자를 선택하고 시작을 누르세요.</p>`;
    return;
  }

  el.playerGameArena.innerHTML = mode === "horse" ? renderHorseRace(racers) : mode === "marble" ? renderMarbleRace(racers) : renderDartWheel(racers);
  if (mode === "horse") bindHorseControls();
  if (mode === "dart") bindDartAiming();
  if (mode === "marble") {
    bindMarbleControls(racers);
    renderMarblePreview(racers);
  }
}

function bindHorseControls() {
  el.playerGameArena.querySelector("#horse-shuffle")?.addEventListener("click", () => {
    shuffleCurrentGameBoard("Shuffle");
  });
}

function shuffleCurrentGameBoard(message) {
  if (el.playerGameStart.disabled) return;
  const participants = getSelectedTeamPlayers(teamGameState.currentTeam);
  const racers = participants.length ? buildGameRacers(participants) : [];
  renderPlayerGameArena(racers);
  el.playerGameWinner.textContent = message;
}

function bindDartAiming() {
  const stage = el.playerGameArena.querySelector(".dart-stage");
  const throwZone = el.playerGameArena.querySelector(".dart-throw-zone");
  if (!stage || !throwZone) return;
  el.playerGameArena.querySelector("#dart-shuffle")?.addEventListener("click", () => {
    shuffleCurrentGameBoard("Shuffle");
  });
  const pointer = el.playerGameArena.querySelector(".dart-pointer");
  if (pointer) {
    const rect = stage.getBoundingClientRect();
    pointer.style.transform = getAimDartTransform({ pulling: false, pullStart: 0 }, rect.width / 2, rect.height / 2);
  }

  stage.addEventListener("pointermove", aimDart);
  throwZone.addEventListener("pointerdown", startDartPull);
  throwZone.addEventListener("pointerup", throwDart);
  throwZone.addEventListener("pointercancel", cancelDartPull);
  throwZone.addEventListener("pointerleave", cancelDartPull);
}

function aimDart(event) {
  if (playerGameState?.thrown) return;
  const stage = el.playerGameArena.querySelector(".dart-stage");
  const pointer = el.playerGameArena.querySelector(".dart-pointer");
  if (!stage || !pointer) return;

  const rect = stage.getBoundingClientRect();
  const x = Math.max(24, Math.min(rect.width - 24, event.clientX - rect.left));
  const y = Math.max(24, Math.min(rect.height - 24, event.clientY - rect.top));
  dartAimY = y;
  pointer.style.transform = getAimDartTransform(playerGameState || { pulling: false, pullStart: 0 }, x, y);

  if (!playerGameState) return;

  const wheelRect = el.playerGameArena.querySelector(".dart-wheel-wrap").getBoundingClientRect();
  const target = clampPointToWheel(x, y, rect, wheelRect);
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  playerGameState.aimX = x;
  playerGameState.aimY = y;
  playerGameState.targetX = target.x;
  playerGameState.targetY = target.y;
  playerGameState.pointerAngle = normalizeAngle(Math.atan2(target.y - centerY, target.x - centerX) * 180 / Math.PI);
}

function startDartPull(event) {
  if (!playerGameState || playerGameState.thrown) return;
  event.currentTarget.setPointerCapture?.(event.pointerId);
  playerGameState.activePointerId = event.pointerId;
  playerGameState.pulling = true;
  playerGameState.pullStart = performance.now();
  aimDart(event);
  const stage = el.playerGameArena.querySelector(".dart-stage");
  if (stage) stage.classList.add("dart-pulling");
  updatePulledDart();
}

function cancelDartPull() {
  if (!playerGameState || playerGameState.thrown) return;
  playerGameState.activePointerId = null;
  playerGameState.pulling = false;
  playerGameState.activePointerId = null;
  const stage = el.playerGameArena.querySelector(".dart-stage");
  const pointer = el.playerGameArena.querySelector(".dart-pointer");
  if (stage) stage.classList.remove("dart-pulling");
  if (pointer) pointer.style.transform = getAimDartTransform(playerGameState, playerGameState.aimX, playerGameState.aimY);
}

function updatePulledDart() {
  if (!playerGameState || !playerGameState.pulling || playerGameState.thrown) return;
  const pointer = el.playerGameArena.querySelector(".dart-pointer");
  if (pointer) pointer.style.transform = getAimDartTransform(playerGameState, playerGameState.aimX, playerGameState.aimY);
  window.requestAnimationFrame(updatePulledDart);
}

function getAimDartTransform(state, x = 0, y = 0) {
  const pullMs = state.pulling ? performance.now() - state.pullStart : 0;
  const pull = Math.min(1, pullMs / 900);
  const recoil = 18 + pull * 74;
  const scale = 1 + pull * 0.18;
  return `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(calc(-50% + ${recoil.toFixed(1)}px), -50%) rotate(-28deg) scale(${scale.toFixed(3)})`;
}

function throwDart(event) {
  if (!playerGameState || playerGameState.thrown) return;
  aimDart(event);

  const now = performance.now();
  const currentRotation = getDartFreeRotation(playerGameState, now);
  const hitIndex = getDartHitIndex(playerGameState, currentRotation, playerGameState.pointerAngle);
  const targetCenter = hitIndex * playerGameState.segment + playerGameState.segment / 2;
  const lockedPointer = playerGameState.pointerAngle;

  playerGameState.thrown = true;
  playerGameState.dartLocked = true;
  playerGameState.pulling = false;
  playerGameState.throwTime = now;
  playerGameState.baseRotation = currentRotation;
  playerGameState.winner = playerGameState.racers[hitIndex];
  playerGameState.holdDuration = 250 + Math.random() * 250;
  playerGameState.holdRotation = playerGameState.rotationSpeed * (playerGameState.holdDuration / 1000);
  playerGameState.afterHoldRotation = currentRotation + playerGameState.holdRotation;
  const naturalSlowdownDistance = playerGameState.rotationSpeed * (playerGameState.duration / 1000) / 2;
  playerGameState.finalRotation = playerGameState.afterHoldRotation
    + naturalSlowdownDistance
    + normalizeSignedAngle(lockedPointer - (playerGameState.afterHoldRotation + naturalSlowdownDistance + targetCenter));
  playerGameState.throwX = playerGameState.aimX;
  playerGameState.throwY = playerGameState.aimY;
  playerGameState.stuckX = playerGameState.targetX;
  playerGameState.stuckY = playerGameState.targetY;
  playerGameState.stuckRadius = getDistanceFromCenter(playerGameState.stuckX, playerGameState.stuckY);
  playerGameState.flightDuration = 280;

  const stage = el.playerGameArena.querySelector(".dart-stage");
  const readout = el.playerGameArena.querySelector(".dart-readout");
  if (stage) {
    stage.classList.remove("dart-pulling");
    stage.classList.add("dart-thrown");
  }
  if (readout) readout.textContent = "Dart locked";
}

function getDartFreeRotation(state, now) {
  return ((now - state.startTime) / 1000) * state.rotationSpeed;
}

function getDartHitIndex(state, rotation, pointerAngle) {
  const wheelAngle = normalizeAngle(pointerAngle - rotation + 90);
  return Math.floor(wheelAngle / state.segment) % state.racers.length;
}

function clampPointToWheel(x, y, stageRect, wheelRect) {
  const centerX = stageRect.width / 2;
  const centerY = stageRect.height / 2;
  const radius = Math.min(wheelRect.width, wheelRect.height) / 2 - 16;
  const dx = x - centerX;
  const dy = y - centerY;
  const distance = Math.max(1, Math.sqrt(dx * dx + dy * dy));
  const clampedDistance = Math.min(radius, Math.max(radius * 0.22, distance));
  return {
    x: centerX + dx / distance * clampedDistance,
    y: centerY + dy / distance * clampedDistance
  };
}

function getDistanceFromCenter(x, y) {
  const stage = el.playerGameArena.querySelector(".dart-stage");
  if (!stage) return 0;
  const rect = stage.getBoundingClientRect();
  const dx = x - rect.width / 2;
  const dy = y - rect.height / 2;
  return Math.sqrt(dx * dx + dy * dy);
}

function createDartWheelState(racers) {
  const segment = 360 / racers.length;
  return {
    racers,
    segment,
    winner: null,
    duration: 12200 + Math.random() * 3600,
    startTime: performance.now(),
    throwTime: 0,
    baseRotation: 0,
    finalRotation: 0,
    pointerAngle: 0,
    aimX: 0,
    aimY: 0,
    targetX: 0,
    targetY: 0,
    throwX: 0,
    throwY: 0,
    stuckX: 0,
    stuckY: 0,
    stuckRadius: 0,
    flightDuration: 430,
    holdDuration: 0,
    holdRotation: 0,
    afterHoldRotation: 0,
    rotationSpeed: 860 + Math.random() * 320,
    thrown: false,
    dartLocked: false,
    pulling: false,
    pullStart: 0,
    activePointerId: null
  };
}

function renderDartWheel(racers) {
  const segment = 360 / racers.length;
  return `
    <div class="dart-stage" id="dart-stage">
      <div class="game-board-toolbar">
        <button class="button ghost" id="dart-shuffle" type="button">Shuffle</button>
      </div>
      <div class="dart-pointer" aria-hidden="true">
        <svg class="dart-svg" viewBox="0 0 210 54" role="presentation" focusable="false">
          <defs>
            <linearGradient id="dart-metal" x1="0" x2="1" y1="0" y2="0">
              <stop offset="0" stop-color="#f7f9ff"></stop>
              <stop offset="0.36" stop-color="#8c95a3"></stop>
              <stop offset="0.68" stop-color="#e7ebf4"></stop>
              <stop offset="1" stop-color="#5f6874"></stop>
            </linearGradient>
            <linearGradient id="dart-barrel" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#f5d27e"></stop>
              <stop offset="0.48" stop-color="#8e6222"></stop>
              <stop offset="1" stop-color="#f0c36b"></stop>
            </linearGradient>
            <linearGradient id="dart-flight" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0" stop-color="#ffffff"></stop>
              <stop offset="0.42" stop-color="#7fdcff"></stop>
              <stop offset="1" stop-color="#1b5b78"></stop>
            </linearGradient>
          </defs>
          <path class="dart-tip-shape" d="M6 27 L45 18 L45 36 Z"></path>
          <rect class="dart-collar" x="42" y="21" width="12" height="12" rx="3"></rect>
          <rect class="dart-barrel-shape" x="53" y="15" width="58" height="24" rx="9"></rect>
          <g class="dart-knurl">
            <path d="M60 16 L78 39 M70 15 L88 40 M80 15 L98 40 M90 15 L108 39"></path>
            <path d="M60 38 L78 15 M70 40 L88 15 M80 40 L98 15 M90 39 L108 16"></path>
          </g>
          <rect class="dart-shaft" x="108" y="23" width="53" height="8" rx="4"></rect>
          <path class="dart-flight top" d="M156 27 L196 6 L183 27 Z"></path>
          <path class="dart-flight bottom" d="M156 27 L196 48 L183 27 Z"></path>
          <path class="dart-flight back" d="M166 27 L205 16 L196 27 L205 38 Z"></path>
          <line class="dart-flight-spine" x1="156" y1="27" x2="205" y2="27"></line>
        </svg>
      </div>
      <div class="dart-wheel-wrap">
        <svg class="dart-wheel" viewBox="0 0 100 100" role="img" aria-label="Player dart wheel">
          ${racers.map((racer, index) => renderDartSegment(racer, index, segment)).join("")}
          <circle class="dart-wheel-center" cx="50" cy="50" r="8"></circle>
        </svg>
      </div>
      <button class="dart-throw-zone" type="button" aria-label="다트 던지기"></button>
      <div class="dart-readout">마우스로 조준하고 클릭해서 던지세요</div>
    </div>
  `;
}

const MARBLE_MAPS = {
  neonDrop: {
    width: 980,
    height: 5800,
    startY: 120,
    finishY: 5640,
    bumpers: [
      { x: 220, y: 660, r: 38 }, { x: 720, y: 930, r: 42 }, { x: 420, y: 1320, r: 36 },
      { x: 780, y: 1780, r: 44 }, { x: 250, y: 2260, r: 40 }, { x: 590, y: 2860, r: 48 },
      { x: 760, y: 3400, r: 42 }, { x: 260, y: 4260, r: 42 }, { x: 710, y: 4860, r: 46 }
    ],
    ramps: [
      { x: 250, y: 500, w: 285, h: 18, angle: 0.18 },
      { x: 700, y: 820, w: 290, h: 18, angle: -0.19 },
      { x: 335, y: 1500, w: 315, h: 18, angle: -0.17 },
      { x: 680, y: 2060, w: 305, h: 18, angle: 0.18 },
      { x: 355, y: 2740, w: 325, h: 18, angle: -0.16 },
      { x: 700, y: 3560, w: 300, h: 18, angle: 0.17 },
      { x: 345, y: 4440, w: 315, h: 18, angle: -0.18 },
      { x: 680, y: 5120, w: 305, h: 18, angle: 0.17 }
    ],
    gates: [
      { x: 340, y: 1120, w: 360, angle: 0.13, side: "left" },
      { x: 660, y: 1920, w: 340, angle: -0.12, side: "right" },
      { x: 330, y: 2520, w: 350, angle: 0.14, side: "left" },
      { x: 650, y: 3260, w: 350, angle: -0.13, side: "right" },
      { x: 390, y: 4680, w: 350, angle: 0.13, side: "left" }
    ],
    funnels: [
      { x1: 220, y1: 650, x2: 560, y2: 755 },
      { x1: 780, y1: 1608, x2: 440, y2: 1715 },
      { x1: 215, y1: 2945, x2: 575, y2: 3055 },
      { x1: 770, y1: 4005, x2: 430, y2: 4115 },
      { x1: 230, y1: 5185, x2: 565, y2: 5290 }
    ],
    rotators: [
      { x: 500, y: 410, w: 168, h: 12, speed: 0.02 },
      { x: 360, y: 1040, w: 156, h: 12, speed: -0.023 },
      { x: 650, y: 1380, w: 176, h: 12, speed: 0.018 },
      { x: 470, y: 2240, w: 184, h: 12, speed: -0.02 },
      { x: 620, y: 3140, w: 164, h: 12, speed: 0.024 },
      { x: 420, y: 3780, w: 172, h: 12, speed: -0.019 },
      { x: 650, y: 4540, w: 180, h: 12, speed: 0.021 },
      { x: 360, y: 5000, w: 170, h: 12, speed: -0.02 },
      { x: 82, y: 1180, w: 150, h: 12, speed: -0.024 },
      { x: 898, y: 1860, w: 150, h: 12, speed: 0.024 },
      { x: 82, y: 2580, w: 150, h: 12, speed: 0.022 },
      { x: 898, y: 3360, w: 150, h: 12, speed: -0.023 },
      { x: 82, y: 4320, w: 150, h: 12, speed: -0.022 },
      { x: 898, y: 5040, w: 150, h: 12, speed: 0.023 },
      { x: 340, y: 5405, w: 145, h: 14, speed: -0.024 },
      { x: 640, y: 5405, w: 145, h: 14, speed: 0.025 },
      { x: 490, y: 5468, w: 88, h: 14, speed: 0.022 }
    ],
    movers: [
      { x: 275, y: 1240, w: 150, h: 16, range: 170, speed: 0.0027, phase: 0, angle: 0.18 },
      { x: 650, y: 2380, w: 170, h: 16, range: 210, speed: 0.0022, phase: 1.8, angle: -0.16 },
      { x: 450, y: 3660, w: 180, h: 16, range: 230, speed: 0.0025, phase: 3.2, angle: 0.15 },
      { x: 620, y: 4300, w: 170, h: 16, range: 210, speed: 0.0023, phase: 2.4, angle: -0.16 },
      { x: 360, y: 5200, w: 180, h: 16, range: 220, speed: 0.0024, phase: 0.9, angle: 0.15 }
    ],
    boosters: [
      { x: 250, y: 960, w: 190, h: 54, force: 0.058 },
      { x: 620, y: 2160, w: 210, h: 54, force: 0.055 },
      { x: 330, y: 3480, w: 210, h: 54, force: 0.052 },
      { x: 675, y: 4740, w: 210, h: 54, force: 0.052 }
    ],
    slowZones: [
      { x: 665, y: 1560, w: 220, h: 62, drag: 0.88 },
      { x: 315, y: 2640, w: 220, h: 62, drag: 0.875 },
      { x: 710, y: 3860, w: 210, h: 62, drag: 0.88 },
      { x: 305, y: 4940, w: 220, h: 62, drag: 0.875 }
    ],
    finishFunnel: { y: 5420, mouth: 980, throat: 82, height: 145 }
  }
};

function renderMarbleRace(racers) {
  return `
    <div class="marble-stage">
      <div class="marble-toolbar">
        <button class="button ghost" id="marble-shuffle" type="button">Shuffle</button>
      </div>
      <div class="marble-minimap"><canvas id="marble-minimap" width="180" height="460"></canvas></div>
      <canvas id="marble-canvas" class="marble-canvas" width="980" height="720"></canvas>
      <div class="marble-results" id="marble-results" hidden></div>
    </div>
  `;
}

function renderMarblePreview(racers) {
  const canvas = el.playerGameArena.querySelector("#marble-canvas");
  const minimap = el.playerGameArena.querySelector("#marble-minimap");
  if (!canvas || !minimap) return;
  const state = createMarblePreviewState(racers);
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(0, -state.cameraY);
  drawMarbleMap(ctx, state.map, state);
  state.marbles.forEach((marble) => drawMarble(ctx, marble));
  ctx.restore();
  drawMarbleMinimap(state);
}

function createMarblePreviewState(racers) {
  const map = MARBLE_MAPS.neonDrop;
  const startSlots = buildMarbleStartSlots(racers.length, map);
  return {
    map,
    cameraY: 0,
    particles: [],
    rotators: map.rotators.map((rotator, index) => ({
      ...rotator,
      body: { angle: index % 2 ? Math.PI / 5 : -Math.PI / 6, position: { x: rotator.x, y: rotator.y } }
    })),
    movers: map.movers.map((mover) => ({
      ...mover,
      baseX: mover.x,
      body: { angle: mover.angle, position: { x: mover.x, y: mover.y } }
    })),
    marbles: racers.map((racer, index) => {
      const slot = startSlots[index];
      return {
        ...racer,
        trail: [],
        body: {
          position: { x: slot.x, y: slot.y },
          velocity: { x: 0, y: 0 }
        }
      };
    })
  };
}

function bindMarbleControls(racers) {
  el.playerGameArena.querySelector("#marble-shuffle")?.addEventListener("click", () => {
    window.cancelAnimationFrame(playerGameFrame);
    renderPlayerGameArena(shuffleList(racers));
    el.playerGameStart.disabled = false;
    el.playerGameWinner.textContent = "Shuffle";
  });
}

function createMarbleRaceState(racers) {
  if (!window.Matter) {
    el.playerGameArena.innerHTML = `<p class="empty-state inline-empty">Matter.js를 불러오지 못했습니다. 네트워크 연결을 확인해주세요.</p>`;
    return null;
  }
  const { Engine, Bodies, Body, Composite } = window.Matter;
  const map = MARBLE_MAPS.neonDrop;
  const engine = Engine.create({ enableSleeping: false });
  engine.gravity.y = 0.42;
  const walls = [
    Bodies.rectangle(-18, map.height / 2, 36, map.height, { isStatic: true }),
    Bodies.rectangle(map.width + 18, map.height / 2, 36, map.height, { isStatic: true }),
    Bodies.rectangle(map.width / 2, -18, map.width, 36, { isStatic: true }),
    Bodies.rectangle(map.width / 2, map.height + 24, map.width, 48, { isStatic: true, label: "finish-floor" })
  ];
  const bumpers = map.bumpers.map((bumper) => Bodies.circle(bumper.x, bumper.y, bumper.r, { isStatic: true, restitution: 1.25, label: "bumper" }));
  const ramps = map.ramps.map((ramp) => Bodies.rectangle(ramp.x, ramp.y, ramp.w, ramp.h, { isStatic: true, angle: ramp.angle, restitution: 0.85, label: "ramp" }));
  const rotators = map.rotators.map((rotator) => ({
    ...rotator,
    body: Bodies.rectangle(rotator.x, rotator.y, rotator.w, rotator.h, { isStatic: true, restitution: 1.18, chamfer: { radius: 7 }, label: "rotator" })
  }));
  const movers = map.movers.map((mover) => ({
    ...mover,
    baseX: mover.x,
    body: Bodies.rectangle(mover.x, mover.y, mover.w, mover.h, { isStatic: true, angle: mover.angle, restitution: 1.14, chamfer: { radius: 7 }, label: "mover" })
  }));
  const funnels = map.funnels.map((funnel) => buildBarrierBody(
    Bodies,
    { x: funnel.x1, y: funnel.y1 },
    { x: funnel.x2, y: funnel.y2 },
    18,
    "funnel"
  ));
  const gates = map.gates.map((gate) => Bodies.rectangle(gate.x, gate.y, gate.w, 18, {
    isStatic: true,
    angle: gate.angle,
    restitution: 0.92,
    chamfer: { radius: 7 },
    label: "gate"
  }));
  const finishFunnel = buildFinishFunnelBodies(Bodies, map);
  const startSlots = buildMarbleStartSlots(racers.length, map);
  const marbles = racers.map((racer, index) => {
    const slot = startSlots[index];
    const body = Bodies.circle(slot.x + (Math.random() - 0.5) * 16, slot.y + Math.random() * 22, 20, {
      restitution: 0.84 + Math.random() * 0.12,
      friction: 0.002,
      frictionStatic: 0,
      frictionAir: 0.0048 + Math.random() * 0.0014,
      label: racer.id
    });
    Body.setVelocity(body, { x: (Math.random() - 0.5) * 2.2, y: Math.random() * 1.2 });
    return { ...racer, body, trail: [], finished: false, stuckTime: 0, finishStallTime: 0, lastY: body.position.y };
  });
  Composite.add(engine.world, [
    ...walls,
    ...bumpers,
    ...ramps,
    ...rotators.map((rotator) => rotator.body),
    ...movers.map((mover) => mover.body),
    ...funnels,
    ...gates,
    ...finishFunnel,
    ...marbles.map((marble) => marble.body)
  ]);
  return {
    engine,
    map,
    winMode: el.horseWinMode?.value || "first",
    marbles,
    rotators,
    movers,
    cameraY: 0,
    lastTime: performance.now(),
    particles: [],
    finishOrder: [],
    winner: null,
    shake: 0
  };
}

function buildMarbleStartSlots(count, map) {
  const spacing = Math.min(86, 680 / Math.max(1, count - 1));
  const totalWidth = spacing * Math.max(0, count - 1);
  const startX = map.width / 2 - totalWidth / 2;
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * spacing,
    y: map.startY + (index % 2) * 18
  }));
}

function buildFinishFunnelBodies(Bodies, map) {
  const funnel = map.finishFunnel;
  if (!funnel) return [];
  const topY = funnel.y;
  const bottomY = funnel.y + funnel.height;
  const leftTop = { x: Math.max(18, map.width / 2 - funnel.mouth / 2), y: topY };
  const leftBottom = { x: map.width / 2 - funnel.throat / 2, y: bottomY };
  const rightTop = { x: Math.min(map.width - 18, map.width / 2 + funnel.mouth / 2), y: topY };
  const rightBottom = { x: map.width / 2 + funnel.throat / 2, y: bottomY };
  return [
    buildBarrierBody(Bodies, leftTop, leftBottom, 22, "finish-funnel"),
    buildBarrierBody(Bodies, rightTop, rightBottom, 22, "finish-funnel")
  ];
}

function buildBarrierBody(Bodies, start, end, thickness, label) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  return Bodies.rectangle(
    (start.x + end.x) / 2,
    (start.y + end.y) / 2,
    length,
    thickness,
    {
      isStatic: true,
      angle: Math.atan2(dy, dx),
      restitution: 0.92,
      chamfer: { radius: 8 },
      label
    }
  );
}

function renderMarbleRaceFrame(state, now) {
  const { Engine } = window.Matter;
  const delta = Math.min(32, now - state.lastTime);
  state.lastTime = now;
  Engine.update(state.engine, delta * 0.78);
  updateMarbleState(state);
  drawMarbleRace(state);
  drawMarbleMinimap(state);
  if (state.winner) {
    renderMarbleResults(state);
    return true;
  }
  return false;
}

function updateMarbleState(state) {
  const { Body } = window.Matter;
  state.shake *= 0.86;
  state.rotators.forEach((rotator) => {
    Body.setAngle(rotator.body, rotator.body.angle + rotator.speed);
  });
  state.movers.forEach((mover) => {
    const x = mover.baseX + Math.sin(performance.now() * mover.speed + mover.phase) * mover.range;
    Body.setPosition(mover.body, { x, y: mover.y });
  });
  state.marbles.forEach((marble) => {
    const { position, speed } = marble.body;
    applyMarbleTerrainEffects(state, marble);
    applyMarbleWallPocketAssist(state, marble);
    applyMarbleFinishAssist(state, marble);
    marble.trail.push({ x: position.x, y: position.y });
    if (marble.trail.length > 16) marble.trail.shift();
    if (speed > 9 && Math.random() < 0.35) state.particles.push({ x: position.x, y: position.y, life: 1, vx: -marble.body.velocity.x * 0.2, vy: -marble.body.velocity.y * 0.2 });
    if (!marble.finished) {
      const movedDown = position.y - marble.lastY;
      marble.stuckTime = speed < 0.28 && movedDown < 0.12 ? marble.stuckTime + 1 : Math.max(0, marble.stuckTime - 2);
      marble.lastY = position.y;
      if (marble.stuckTime > 110) {
        Body.setVelocity(marble.body, {
          x: (Math.random() - 0.5) * 3.2,
          y: 3.2 + Math.random() * 1.6
        });
        Body.translate(marble.body, { x: (Math.random() - 0.5) * 20, y: 12 });
        marble.stuckTime = 0;
        state.shake = Math.max(state.shake, 2.2);
      }
    }
    if (!marble.finished && position.y >= state.map.finishY) {
      marble.finished = true;
      state.finishOrder.push(marble);
      if (state.winMode === "first" && !state.winner) state.winner = marble;
    }
  });
  if (state.winMode === "last" && state.finishOrder.length === state.marbles.length) {
    state.winner = state.finishOrder[state.finishOrder.length - 1];
  }
  state.particles.forEach((particle) => {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 0.04;
  });
  state.particles = state.particles.filter((particle) => particle.life > 0);
  const focusMarble = getMarbleCameraFocus(state);
  const focusY = focusMarble?.body.position.y || state.cameraY;
  const canvas = el.playerGameArena.querySelector("#marble-canvas");
  const maxCamera = state.map.height - canvas.height;
  const target = Math.max(0, Math.min(maxCamera, focusY - canvas.height * 0.48));
  state.cameraY += (target - state.cameraY) * 0.12;
}

function getMarbleCameraFocus(state) {
  const running = state.marbles.filter((marble) => !marble.finished);
  const candidates = running.length ? running : state.marbles;
  return candidates
    .slice()
    .sort((a, b) => state.winMode === "last"
      ? a.body.position.y - b.body.position.y
      : b.body.position.y - a.body.position.y)[0];
}

function applyMarbleTerrainEffects(state, marble) {
  const { Body } = window.Matter;
  const position = marble.body.position;
  state.map.boosters.forEach((booster) => {
    if (!pointInRect(position, booster)) return;
    Body.applyForce(marble.body, position, {
      x: marble.body.velocity.x * 0.0008,
      y: booster.force * marble.body.mass
    });
    if (Math.random() < 0.5) {
      state.particles.push({ x: position.x, y: position.y + 18, life: 1, vx: (Math.random() - 0.5) * 1.6, vy: -2.4 - Math.random() * 1.5, color: "boost" });
    }
  });
  state.map.slowZones.forEach((zone) => {
    if (!pointInRect(position, zone)) return;
    Body.setVelocity(marble.body, {
      x: marble.body.velocity.x * zone.drag,
      y: marble.body.velocity.y * zone.drag
    });
    if (Math.random() < 0.32) {
      state.particles.push({ x: position.x, y: position.y + 12, life: 1, vx: (Math.random() - 0.5) * 0.8, vy: -0.8, color: "slow" });
    }
  });
}

function applyMarbleWallPocketAssist(state, marble) {
  if (marble.finished) return;
  const { Body } = window.Matter;
  const { position, velocity, speed } = marble.body;
  const margin = 92;
  const nearLeft = position.x < margin;
  const nearRight = position.x > state.map.width - margin;
  if ((!nearLeft && !nearRight) || speed > 1.45) return;
  Body.applyForce(marble.body, position, {
    x: (nearLeft ? 0.0032 : -0.0032) * marble.body.mass,
    y: 0.0034 * marble.body.mass
  });
  if (Math.abs(velocity.x) < 0.45) {
    Body.setVelocity(marble.body, {
      x: nearLeft ? 1.05 : -1.05,
      y: Math.max(velocity.y, 1.55)
    });
  }
}

function applyMarbleFinishAssist(state, marble) {
  if (marble.finished || !state.map.finishFunnel) return;
  const { Body } = window.Matter;
  const funnel = state.map.finishFunnel;
  const { position, velocity, speed } = marble.body;
  const inFinishNeck = position.y > funnel.y + funnel.height * 0.45 && position.y < state.map.finishY;
  if (!inFinishNeck) {
    marble.finishStallTime = 0;
    return;
  }

  const nearCenter = Math.abs(position.x - state.map.width / 2) < funnel.throat * 1.15;
  const barelyMovingDown = velocity.y < 0.55 || speed < 0.45;
  marble.finishStallTime = nearCenter && barelyMovingDown
    ? marble.finishStallTime + 1
    : Math.max(0, marble.finishStallTime - 2);

  if (marble.finishStallTime <= 52) return;
  const centerPull = (state.map.width / 2 - position.x) * 0.00018;
  Body.applyForce(marble.body, position, {
    x: centerPull * marble.body.mass,
    y: 0.0065 * marble.body.mass
  });
  if (marble.finishStallTime > 92) {
    Body.setVelocity(marble.body, {
      x: (state.map.width / 2 - position.x) * 0.018,
      y: Math.max(velocity.y, 2.4)
    });
    Body.translate(marble.body, { x: (state.map.width / 2 - position.x) * 0.08, y: 8 });
    marble.finishStallTime = 30;
    state.shake = Math.max(state.shake, 1.2);
  }
}

function pointInRect(point, rect) {
  return point.x >= rect.x - rect.w / 2
    && point.x <= rect.x + rect.w / 2
    && point.y >= rect.y - rect.h / 2
    && point.y <= rect.y + rect.h / 2;
}

function drawMarbleRace(state) {
  const canvas = el.playerGameArena.querySelector("#marble-canvas");
  const ctx = canvas.getContext("2d");
  const shake = state.shake ? Math.sin(performance.now() / 28) * state.shake : 0;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(shake, -state.cameraY);
  drawMarbleMap(ctx, state.map, state);
  state.particles.forEach((particle) => {
    ctx.globalAlpha = particle.life;
    ctx.fillStyle = particle.color === "boost"
      ? "rgba(120,255,180,0.7)"
      : particle.color === "slow"
        ? "rgba(209,107,255,0.55)"
        : "rgba(224,210,160,0.55)";
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, 4 * particle.life, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
  state.marbles.forEach((marble) => drawMarble(ctx, marble));
  ctx.restore();
}

function drawMarbleMap(ctx, map, courseState = marbleGameState) {
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, map.width, map.height);
  drawCourseWalls(ctx, map);
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  for (let y = 0; y < map.height; y += 120) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(map.width, y);
    ctx.stroke();
  }
  map.boosters.forEach((booster) => {
    drawTerrainPad(ctx, booster, "rgba(120,255,180,0.18)", "rgba(120,255,180,0.72)", "BOOST");
  });
  map.slowZones.forEach((zone) => {
    drawTerrainPad(ctx, zone, "rgba(209,107,255,0.18)", "rgba(209,107,255,0.65)", "SLOW");
  });
  map.bumpers.forEach((bumper) => drawInflatableBumper(ctx, bumper));
  map.ramps.forEach((ramp) => {
    drawMetalRamp(ctx, ramp);
  });
  if (courseState?.rotators) {
    courseState.rotators.forEach((rotator) => {
      drawFoamHammer(ctx, rotator.x, rotator.y, rotator.w, rotator.body.angle, "rotator");
    });
  }
  if (courseState?.movers) {
    courseState.movers.forEach((mover) => {
      drawMoverObstacle(ctx, mover);
    });
  }
  map.funnels.forEach((funnel) => {
    drawStoneBarrier(ctx, funnel.x1, funnel.y1, funnel.x2, funnel.y2);
  });
  map.gates.forEach((gate) => {
    drawMechanicalDoor(ctx, gate.x, gate.y, gate.w, gate.angle, gate.side);
  });
  drawFinishFunnel(ctx, map);
  drawFinishLine(ctx, map);
}

function drawCourseWalls(ctx, map) {
  ctx.save();
  for (const x of [0, map.width]) {
    const edge = x === 0 ? 18 : map.width - 18;
    const grad = ctx.createLinearGradient(edge - 18, 0, edge + 18, 0);
    grad.addColorStop(0, "#3b2a1c");
    grad.addColorStop(0.5, "#9b6b3c");
    grad.addColorStop(1, "#25170f");
    ctx.fillStyle = grad;
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = 12;
    ctx.fillRect(edge - 12, 0, 24, map.height);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255,220,150,0.28)";
    ctx.lineWidth = 2;
    for (let y = 40; y < map.height; y += 110) {
      ctx.beginPath();
      ctx.moveTo(edge - 10, y);
      ctx.lineTo(edge + 10, y + 18);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawTerrainPad(ctx, pad, fill, stroke, label) {
  ctx.save();
  ctx.shadowColor = stroke;
  ctx.shadowBlur = label === "BOOST" ? 22 : 14;
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  roundRect(ctx, pad.x - pad.w / 2, pad.y - pad.h / 2, pad.w, pad.h, 12);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  const grad = ctx.createLinearGradient(pad.x - pad.w / 2, pad.y - pad.h / 2, pad.x + pad.w / 2, pad.y + pad.h / 2);
  grad.addColorStop(0, "rgba(255,255,255,0.28)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.04)");
  grad.addColorStop(1, "rgba(0,0,0,0.32)");
  ctx.fillStyle = grad;
  roundRect(ctx, pad.x - pad.w / 2 + 6, pad.y - pad.h / 2 + 6, pad.w - 12, pad.h - 12, 9);
  ctx.fill();
  ctx.strokeStyle = label === "BOOST" ? "rgba(210,255,230,0.72)" : "rgba(255,210,255,0.58)";
  ctx.lineWidth = 2;
  for (let offset = -pad.w / 2 + 30; offset < pad.w / 2 - 16; offset += 34) {
    ctx.beginPath();
    ctx.moveTo(pad.x + offset, pad.y + pad.h / 2 - 12);
    ctx.lineTo(pad.x + offset + 18, pad.y - pad.h / 2 + 12);
    ctx.stroke();
  }
  ctx.font = "900 13px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = stroke;
  ctx.fillText(label, pad.x, pad.y + 1);
  ctx.restore();
}

function drawInflatableBumper(ctx, bumper) {
  ctx.save();
  ctx.translate(bumper.x, bumper.y);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  const grad = ctx.createRadialGradient(-bumper.r * 0.32, -bumper.r * 0.38, bumper.r * 0.12, 0, 0, bumper.r);
  grad.addColorStop(0, "#ffd8f0");
  grad.addColorStop(0.35, "#ff6ec6");
  grad.addColorStop(0.72, "#b82f94");
  grad.addColorStop(1, "#551447");
  drawCircle(ctx, 0, 0, bumper.r, grad, "rgba(255,210,245,0.9)");
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(0, 0, bumper.r - 9, -0.25, Math.PI * 1.18);
  ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.38)";
  ctx.beginPath();
  ctx.ellipse(-bumper.r * 0.24, -bumper.r * 0.32, bumper.r * 0.24, bumper.r * 0.11, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMetalRamp(ctx, ramp) {
  ctx.save();
  ctx.translate(ramp.x, ramp.y);
  ctx.rotate(ramp.angle);
  ctx.shadowColor = "rgba(0,0,0,0.58)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 7;
  const grad = ctx.createLinearGradient(0, -22, 0, 22);
  grad.addColorStop(0, "#e9eef6");
  grad.addColorStop(0.32, "#8b98a8");
  grad.addColorStop(0.72, "#394452");
  grad.addColorStop(1, "#151a22");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 2;
  roundRect(ctx, -ramp.w / 2, -18, ramp.w, 36, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.42)";
  ctx.lineWidth = 2;
  for (let x = -ramp.w / 2 + 24; x < ramp.w / 2; x += 38) {
    ctx.beginPath();
    ctx.moveTo(x, -14);
    ctx.lineTo(x + 16, 14);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  roundRect(ctx, -ramp.w / 2 + 10, -14, ramp.w - 20, 7, 4);
  ctx.fill();
  ctx.restore();
}

function drawFoamHammer(ctx, x, y, width, angle) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 7;
  const handleGrad = ctx.createLinearGradient(-width / 2, -8, width / 2, 8);
  handleGrad.addColorStop(0, "#4b3a27");
  handleGrad.addColorStop(0.5, "#b98645");
  handleGrad.addColorStop(1, "#352315");
  ctx.fillStyle = handleGrad;
  roundRect(ctx, -width / 2, -8, width, 16, 8);
  ctx.fill();
  const headGrad = ctx.createLinearGradient(0, -34, 0, 34);
  headGrad.addColorStop(0, "#fff0a8");
  headGrad.addColorStop(0.45, "#ffb84d");
  headGrad.addColorStop(1, "#a4521e");
  ctx.fillStyle = headGrad;
  ctx.strokeStyle = "rgba(255,245,190,0.78)";
  ctx.lineWidth = 3;
  roundRect(ctx, width / 2 - 40, -30, 76, 60, 18);
  ctx.fill();
  ctx.stroke();
  roundRect(ctx, -width / 2 - 36, -28, 72, 56, 18);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(255,255,255,0.32)";
  roundRect(ctx, width / 2 - 24, -22, 38, 9, 6);
  ctx.fill();
  roundRect(ctx, -width / 2 - 22, -20, 34, 8, 6);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.46)";
  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawMoverObstacle(ctx, mover) {
  ctx.save();
  ctx.strokeStyle = "rgba(120,255,180,0.34)";
  ctx.lineWidth = 4;
  ctx.setLineDash([10, 12]);
  ctx.beginPath();
  ctx.moveTo(mover.baseX - mover.range, mover.y + 34);
  ctx.lineTo(mover.baseX + mover.range, mover.y + 34);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
  drawFoamHammer(ctx, mover.body.position.x, mover.y, mover.w, mover.body.angle);
}

function drawStoneBarrier(ctx, x1, y1, x2, y2) {
  const width = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.translate((x1 + x2) / 2, (y1 + y2) / 2);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 7;
  const grad = ctx.createLinearGradient(0, -18, 0, 18);
  grad.addColorStop(0, "#9ba0a7");
  grad.addColorStop(0.45, "#515863");
  grad.addColorStop(1, "#232832");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(210,220,235,0.46)";
  ctx.lineWidth = 2;
  roundRect(ctx, -width / 2, -18, width, 36, 7);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = "rgba(0,0,0,0.28)";
  ctx.lineWidth = 2;
  for (let x = -width / 2 + 46; x < width / 2 - 20; x += 54) {
    ctx.beginPath();
    ctx.moveTo(x, -15);
    ctx.lineTo(x - 10, 15);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,0.24)";
  roundRect(ctx, -width / 2 + 12, -13, width - 24, 6, 4);
  ctx.fill();
  ctx.restore();
}

function drawMechanicalDoor(ctx, x, y, width, angle, side) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.shadowColor = "rgba(0,0,0,0.58)";
  ctx.shadowBlur = 13;
  ctx.shadowOffsetY = 7;
  const grad = ctx.createLinearGradient(0, -20, 0, 20);
  grad.addColorStop(0, "#c8ecff");
  grad.addColorStop(0.28, "#4fa8d6");
  grad.addColorStop(0.72, "#1e4867");
  grad.addColorStop(1, "#102436");
  ctx.fillStyle = grad;
  ctx.strokeStyle = "rgba(180,235,255,0.72)";
  ctx.lineWidth = 3;
  roundRect(ctx, -width / 2, -20, width, 40, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  const panelCount = Math.max(2, Math.floor(width / 80));
  for (let index = 0; index < panelCount; index += 1) {
    const panelX = -width / 2 + 14 + index * ((width - 28) / panelCount);
    roundRect(ctx, panelX, -13, (width - 34) / panelCount, 26, 5);
    ctx.fill();
  }
  ctx.fillStyle = side === "left" ? "#78ffb4" : "#ff6ec6";
  ctx.beginPath();
  ctx.arc(width / 2 - 18, 0, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawFinishFunnel(ctx, map) {
  const funnel = map.finishFunnel;
  if (!funnel) return;
  const topY = funnel.y;
  const bottomY = funnel.y + funnel.height;
  const leftTopX = Math.max(18, map.width / 2 - funnel.mouth / 2);
  const rightTopX = Math.min(map.width - 18, map.width / 2 + funnel.mouth / 2);
  drawStoneBarrier(ctx, leftTopX, topY, map.width / 2 - funnel.throat / 2, bottomY);
  drawStoneBarrier(ctx, rightTopX, topY, map.width / 2 + funnel.throat / 2, bottomY);
  ctx.save();
  ctx.fillStyle = "rgba(120,255,180,0.08)";
  ctx.beginPath();
  ctx.moveTo(leftTopX, topY);
  ctx.lineTo(rightTopX, topY);
  ctx.lineTo(map.width / 2 + funnel.throat / 2, bottomY);
  ctx.lineTo(map.width / 2 - funnel.throat / 2, bottomY);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawFinishLine(ctx, map) {
  const y = map.finishY;
  ctx.save();
  ctx.shadowColor = "rgba(120,255,180,0.65)";
  ctx.shadowBlur = 24;
  const bannerGrad = ctx.createLinearGradient(0, y - 34, 0, y + 34);
  bannerGrad.addColorStop(0, "#d8fff0");
  bannerGrad.addColorStop(0.5, "#58ffac");
  bannerGrad.addColorStop(1, "#127646");
  ctx.fillStyle = bannerGrad;
  roundRect(ctx, map.width / 2 - 190, y - 42, 380, 84, 18);
  ctx.fill();
  ctx.shadowBlur = 0;
  const cell = 22;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 18; col += 1) {
      ctx.fillStyle = (row + col) % 2 === 0 ? "#050507" : "#ffffff";
      ctx.fillRect(map.width / 2 - 198 + col * cell, y - 33 + row * cell, cell, cell);
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 4;
  roundRect(ctx, map.width / 2 - 204, y - 39, 408, 78, 14);
  ctx.stroke();
  ctx.font = "900 34px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.strokeStyle = "rgba(0,0,0,0.95)";
  ctx.lineWidth = 6;
  ctx.strokeText("FINISH", map.width / 2, y - 62);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("FINISH", map.width / 2, y - 62);
  ctx.restore();
}

function drawCircle(ctx, x, y, r, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

function drawMarble(ctx, marble) {
  const { position, velocity } = marble.body;
  const color = marble.race === "Zerg" ? "#d16bff" : marble.race === "Terran" ? "#6fd3ff" : "#ffe27a";
  marble.trail.forEach((point, index) => {
    ctx.globalAlpha = index / marble.trail.length * 0.45;
    drawCircle(ctx, point.x, point.y, 17, color, "transparent");
  });
  ctx.globalAlpha = 1;
  const grad = ctx.createRadialGradient(position.x - 7, position.y - 8, 4, position.x, position.y, 20);
  grad.addColorStop(0, "#fff");
  grad.addColorStop(0.28, color);
  grad.addColorStop(1, "#09090d");
  drawCircle(ctx, position.x, position.y, 20, grad, color);
  drawMarbleName(ctx, marble, position.x, position.y - 27, color);
  ctx.fillStyle = "#050507";
  ctx.font = "900 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(marble.id.slice(0, 2).toUpperCase(), position.x, position.y + 4);
  if (Math.abs(velocity.x) + Math.abs(velocity.y) > 12) stateShake(marble);
}

function drawMarbleName(ctx, marble, x, y, color) {
  const label = marble.id.length > 14 ? `${marble.id.slice(0, 13)}...` : marble.id;
  ctx.save();
  ctx.font = "900 15px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const width = Math.min(122, Math.max(42, ctx.measureText(label).width + 16));
  const boxX = Math.max(8, Math.min(x - width / 2, MARBLE_MAPS.neonDrop.width - width - 8));
  ctx.fillStyle = "rgba(0,0,0,0.68)";
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  roundRect(ctx, boxX, y - 12, width, 24, 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "rgba(0,0,0,0.9)";
  ctx.lineWidth = 3;
  ctx.strokeText(label, boxX + width / 2, y + 1);
  ctx.fillText(label, boxX + width / 2, y + 1);
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function stateShake() {
  if (marbleGameState) marbleGameState.shake = Math.min(5, marbleGameState.shake + 0.15);
}

function drawMarbleMinimap(state) {
  const canvas = el.playerGameArena.querySelector("#marble-minimap");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(255,255,255,0.04)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  state.marbles.forEach((marble) => {
    const x = marble.body.position.x / state.map.width * canvas.width;
    const y = marble.body.position.y / state.map.height * canvas.height;
    ctx.fillStyle = marble.race === "Zerg" ? "#d16bff" : marble.race === "Terran" ? "#6fd3ff" : "#ffe27a";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function renderMarbleResults(state) {
  const results = el.playerGameArena.querySelector("#marble-results");
  if (!results) return;
  results.hidden = false;
  results.innerHTML = `<strong>당첨: ${escapeHtml(state.winner.id)}</strong>`;
}

function renderDartSegment(racer, index, segment) {
  const start = index * segment - 90;
  const end = start + segment;
  const largeArc = segment > 180 ? 1 : 0;
  const startPoint = polarToCartesian(50, 50, 47, end);
  const endPoint = polarToCartesian(50, 50, 47, start);
  const labelAngle = start + segment / 2;
  const labelPoint = polarToCartesian(50, 50, 30, labelAngle);
  return `
    <path class="dart-segment ${racer.race.toLowerCase()}" data-player="${escapeHtml(racer.id)}" d="M 50 50 L ${startPoint.x} ${startPoint.y} A 47 47 0 ${largeArc} 0 ${endPoint.x} ${endPoint.y} Z"></path>
    <text class="dart-label" x="${labelPoint.x}" y="${labelPoint.y}" transform="rotate(${labelAngle + 90} ${labelPoint.x} ${labelPoint.y})">${escapeHtml(racer.id)}</text>
  `;
}

function polarToCartesian(cx, cy, radius, angle) {
  const radians = angle * Math.PI / 180;
  return {
    x: cx + radius * Math.cos(radians),
    y: cy + radius * Math.sin(radians)
  };
}

function renderDartWheelFrame(state, elapsed) {
  const stage = el.playerGameArena.querySelector(".dart-stage");
  const wheel = el.playerGameArena.querySelector(".dart-wheel");
  const readout = el.playerGameArena.querySelector(".dart-readout");
  const pointer = el.playerGameArena.querySelector(".dart-pointer");
  if (!wheel || !stage) return true;

  if (!state.thrown) {
    const rotation = getDartFreeRotation(state, elapsed);
    wheel.style.transform = `rotate(${rotation.toFixed(2)}deg)`;
    if (readout) readout.textContent = "마우스로 조준하고 클릭해서 던지세요";
    return false;
  }

  const sinceThrow = elapsed - state.throwTime;
  let progress = 0;
  let rotation = state.baseRotation;
  if (sinceThrow < state.holdDuration) {
    rotation = state.baseRotation + state.rotationSpeed * (sinceThrow / 1000);
    if (readout) readout.textContent = "Dart locked";
  } else {
    progress = Math.min(1, (sinceThrow - state.holdDuration) / state.duration);
    const eased = easeOutQuad(progress);
    rotation = state.afterHoldRotation + (state.finalRotation - state.afterHoldRotation) * eased;
    if (readout && progress < 1) readout.textContent = "Slowing down";
  }
  wheel.style.transform = `rotate(${rotation.toFixed(2)}deg)`;

  if (pointer) {
    updateThrownDartPointer(state, pointer, elapsed, rotation);
  }

  if (sinceThrow >= state.holdDuration && progress >= 1) {
    stage.classList.add("dart-finished");
    const segment = el.playerGameArena.querySelector(`[data-player="${cssEscape(state.winner.id)}"]`);
    if (segment) segment.classList.add("winner");
    if (readout) readout.textContent = `Hit: ${state.winner.id}`;
    return true;
  }

  return false;
}

function updateThrownDartPointer(state, pointer, now, rotation) {
  const flightProgress = Math.min(1, Math.max(0, (now - state.throwTime) / state.flightDuration));
  const flightEase = easeOutCubic(flightProgress);
  const spin = (rotation - state.baseRotation) * Math.PI / 180;
  const angle = state.pointerAngle * Math.PI / 180 + spin;

  const center = getStageCenter();
  const stuckX = center.x + Math.cos(angle) * state.stuckRadius;
  const stuckY = center.y + Math.sin(angle) * state.stuckRadius;
  const x = state.throwX + (stuckX - state.throwX) * flightEase;
  const y = state.throwY + (stuckY - state.throwY) * flightEase;
  const rotate = Math.atan2(stuckY - center.y, stuckX - center.x) * 180 / Math.PI;

  pointer.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) translate(-50%, -50%) rotate(${rotate.toFixed(2)}deg) scale(${1 + (1 - flightProgress) * 0.45})`;
}

function getStageCenter() {
  const stage = el.playerGameArena.querySelector(".dart-stage");
  if (!stage) return { x: 0, y: 0 };
  const rect = stage.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

function normalizeAngle(angle) {
  return ((angle % 360) + 360) % 360;
}

function normalizeSignedAngle(angle) {
  return ((angle + 180) % 360 + 360) % 360 - 180;
}

function easeOutQuad(value) {
  return 1 - Math.pow(1 - value, 2);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function renderFallRace(racers) {
  return `
    <div class="fall-race-stage" style="--racer-count: ${racers.length}">
      <div class="fall-camera-label">Live marble drop</div>
      <div class="fall-world" style="height: ${FALL_WORLD_HEIGHT}px">
        <div class="fall-course-panels" aria-hidden="true">
          ${renderFallRails()}
        </div>
        <div class="pin-field" aria-hidden="true">
          ${renderFallPins()}
        </div>
        <div class="zigzag-map" aria-hidden="true">
          ${renderFallSpinners()}
        </div>
        <div class="fall-gates" aria-hidden="true">
          ${renderFallGates()}
        </div>
        <div class="finish-line vertical-finish">Finish</div>
        ${racers.map((racer) => `
          <div class="fall-racer" data-player="${escapeHtml(racer.id)}" style="left: ${getLanePosition(racer.index, racers.length)}%">
            <span class="marble-trail"></span>
            <div class="player-ball ${racer.race.toLowerCase()}">
              ${renderRaceMark(racer.race)}
              <strong class="marble-name">${escapeHtml(racer.id)}</strong>
            </div>
            <small class="race-status"></small>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

function renderFallPins() {
  return getFallPinLayout()
    .map((pin) => `<span style="left: ${pin.xPct}%; top: ${pin.y}px;"></span>`)
    .join("");
}

function renderFallRails() {
  return getFallRailLayout()
    .map((rail) => `<span class="course-rail" style="top: ${rail.y}px; left: ${rail.xPct}%; width: ${rail.widthPct}%; transform: rotate(${rail.angle}deg);"></span>`)
    .join("");
}

function renderFallSpinners() {
  return getFallSpinnerLayout()
    .map((spinner) => `<span style="left: ${spinner.xPct}%; top: ${spinner.y}px;"></span>`)
    .join("");
}

function renderFallGates() {
  return getFallGateLayout().map((gate) => {
    return `
      <span class="fall-gate gate-left" style="top: ${gate.y}px;"></span>
      <span class="fall-gate gate-right" style="top: ${gate.y + 48}px;"></span>
    `;
  }).join("");
}

function getFallPinLayout() {
  return Array.from({ length: 112 }, (_, index) => {
    const row = Math.floor(index / 8);
    const col = index % 8;
    return {
      xPct: 7 + col * 12 + (row % 2) * 5,
      y: 120 + row * 145
    };
  });
}

function getFallRailLayout() {
  return Array.from({ length: 16 }, (_, index) => {
    const leftSide = index % 2 === 0;
    return {
      xPct: leftSide ? 4 + (index % 3) * 6 : 61 - (index % 3) * 5,
      y: 170 + index * 125,
      widthPct: 30 + (index % 4) * 5,
      angle: leftSide ? 13 + (index % 3) * 4 : -13 - (index % 3) * 4
    };
  });
}

function getFallSpinnerLayout() {
  return Array.from({ length: 10 }, (_, index) => ({
    xPct: 14 + ((index * 19) % 72),
    y: 230 + index * 185
  }));
}

function getFallGateLayout() {
  return Array.from({ length: 6 }, (_, index) => ({ y: 430 + index * 310 }));
}

function renderHorseRace(racers) {
  return `
    <div class="horse-race-stage svg-horse-stage">
      <div class="game-board-toolbar">
        <button class="button ghost" id="horse-shuffle" type="button">Shuffle</button>
      </div>
      <div class="horse-minimap">
        <div class="horse-minimap-track">
          ${racers.map((racer) => `<span class="horse-mini-dot ${racer.race.toLowerCase()}" data-mini="${escapeHtml(racer.id)}" title="${escapeHtml(racer.id)}"></span>`).join("")}
        </div>
      </div>
      <div class="horse-rank-board" id="horse-rank-board"></div>
      <div class="horse-camera">
        <div class="horse-world" style="--lane-count: ${racers.length}">
          <div class="horse-finish-line">Finish</div>
          ${racers.map((racer) => `
            <div class="horse-lane" data-lane="${racer.index}">
              <span class="horse-lane-name">${escapeHtml(racer.id)}</span>
              <div class="horse-track">
                <span class="track-surface"></span>
                ${renderHorseObstacles(racer.index)}
                <span class="speed-trail" data-trail="${escapeHtml(racer.id)}"></span>
                <span class="dust-particles" data-dust="${escapeHtml(racer.id)}">
                  <i></i><i></i><i></i><i></i><i></i><i></i>
                </span>
                <div class="horse-racer ${racer.race.toLowerCase()}" data-player="${escapeHtml(racer.id)}">
                  ${renderProceduralHorseSvg(racer)}
                  <span class="horse-name">
                    ${renderRaceMark(racer.race)}
                    <strong>${escapeHtml(racer.id)}</strong>
                  </span>
                  <small class="horse-status"></small>
                </div>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
      <div class="horse-results" id="horse-results" hidden></div>
    </div>
  `;
}

function renderHorseObstacles(laneIndex) {
  return getHorseObstacleLayout(laneIndex).map((obstacle) => `
    <span class="horse-obstacle ${obstacle.type}" style="left: ${obstacle.x}px"></span>
  `).join("");
}

function getHorseObstacleLayout(laneIndex) {
  const types = ["hurdle", "fence", "puddle", "rock"];
  const count = 18;
  const start = HORSE_TRACK_LENGTH * 0.08;
  const span = HORSE_TRACK_LENGTH * 0.88;
  return Array.from({ length: count }, (_, index) => {
    const laneOffset = ((laneIndex * 97 + index * 71) % 230) - 115;
    return {
      x: Math.round(start + (span * index) / (count - 1) + laneOffset),
      type: types[(laneIndex + index) % types.length]
    };
  });
}

function renderProceduralHorseSvg(racer) {
  return `
    <svg class="horse-svg" viewBox="0 0 150 82" role="presentation" focusable="false">
      <g class="horse-vector">
        <path class="horse-tail-vector" d="M31 40 C9 31 7 52 27 55 C19 48 23 42 34 44 Z"></path>
        <ellipse class="horse-body-vector" cx="72" cy="39" rx="39" ry="18"></ellipse>
        <path class="horse-neck-vector" d="M101 29 C110 17 128 18 131 30 C124 33 114 36 105 42 Z"></path>
        <ellipse class="horse-head-vector" cx="128" cy="28" rx="14" ry="10" transform="rotate(12 128 28)"></ellipse>
        <path class="horse-ear-vector" d="M121 18 L124 6 L130 19 Z"></path>
        <circle class="horse-eye-vector" cx="133" cy="26" r="1.8"></circle>
        <g class="horse-leg-vector front-a"><path d="M96 52 L101 78 L94 78 L88 53 Z"></path></g>
        <g class="horse-leg-vector front-b"><path d="M83 53 L81 78 L74 78 L76 53 Z"></path></g>
        <g class="horse-leg-vector back-a"><path d="M54 52 L49 78 L42 78 L47 53 Z"></path></g>
        <g class="horse-leg-vector back-b"><path d="M65 53 L66 78 L59 78 L57 53 Z"></path></g>
        <path class="horse-saddle-vector" d="M57 23 H91 L84 36 H62 Z"></path>
      </g>
    </svg>
  `;
}

function createHorseRaceState(racers) {
  const trackLength = HORSE_TRACK_LENGTH;
  return {
    trackLength,
    winMode: el.horseWinMode?.value || "first",
    cameraX: 0,
    racers: racers.map((racer, index) => ({
      ...racer,
      x: 0,
      speed: 0,
      lane: index,
      finished: false,
      finishTime: 0,
      rank: 0,
      stamina: 0.92 + Math.random() * 0.16,
      acceleration: 300 + Math.random() * 90,
      topSpeed: 305 + Math.random() * 45,
      speedForm: 0.94 + Math.random() * 0.12,
      accelForm: 0.94 + Math.random() * 0.12,
      staminaForm: 0.94 + Math.random() * 0.12,
      nextFormAt: 1800 + Math.random() * 2400,
      pacePhase: Math.random() * Math.PI * 2,
      lateKick: 0.62 + Math.random() * 0.26,
      lateKickPower: 18 + Math.random() * 34,
      jumpPower: 0.88 + Math.random() * 0.28,
      recovery: 0.8 + Math.random() * 0.35,
      jumpUntil: 0,
      landingUntil: 0,
      stumbleUntil: 0,
      nextEventAt: 700 + Math.random() * 900,
      eventBoost: 0,
      shock: "",
      obstacles: getHorseObstacleLayout(index).map((obstacle) => ({ ...obstacle, cleared: false })),
      seed: Math.random() * Math.PI * 2,
    })),
    finishOrder: [],
    winner: null
  };
}

function renderHorseRaceFrame(state, elapsed) {
  const time = elapsed / 1000;
  const delta = Math.min(0.045, Math.max(0.001, (elapsed - (state.lastElapsed || 0)) / 1000));
  state.lastElapsed = elapsed;

  state.racers.forEach((racer) => {
    if (racer.finished) return;
    updateHorseRacerPhysics(racer, state, time, delta);
  });

  state.racers.forEach((racer) => {
    const node = el.playerGameArena.querySelector(`[data-player="${cssEscape(racer.id)}"]`);
    const trail = el.playerGameArena.querySelector(`[data-trail="${cssEscape(racer.id)}"]`);
    const dust = el.playerGameArena.querySelector(`[data-dust="${cssEscape(racer.id)}"]`);
    if (!node) return;

    const jumpProgress = racer.jumpUntil > time ? 1 - (racer.jumpUntil - time) / 0.72 : 0;
    const jumpY = jumpProgress > 0 ? -Math.sin(jumpProgress * Math.PI) * 34 * racer.jumpPower : 0;
    const bob = Math.sin(elapsed / 80 + racer.seed) * 2.2;
    const x = Math.min(state.trackLength, racer.x);
    node.style.transform = `translate(${Math.round(x)}px, ${(jumpY + bob).toFixed(1)}px)`;
    node.dataset.speed = racer.eventBoost > 18 ? "boost" : racer.eventBoost < -18 ? "slow" : "";
    node.dataset.jump = jumpProgress > 0 ? "true" : "";
    node.dataset.hit = racer.shock === "stumble" || racer.stumbleUntil > time ? "true" : "";
    node.dataset.land = racer.shock === "land" || racer.landingUntil > time ? "true" : "";
    if (trail) {
      trail.style.transform = `translateX(${Math.round(x - 40)}px)`;
      trail.dataset.speed = node.dataset.speed;
    }
    if (dust) {
      dust.style.transform = `translateX(${Math.round(x - 20)}px)`;
      dust.dataset.heavy = racer.landingUntil > time || jumpProgress > 0.72 ? "true" : "";
    }

    if (!racer.finished && racer.x >= state.trackLength) {
      racer.finished = true;
      racer.finishTime = elapsed;
      racer.rank = state.finishOrder.length + 1;
      state.finishOrder.push(racer);
    }
  });

  renderHorseCamera(state);
  renderHorseMinimap(state);
  renderHorseRanks(state);

  if (state.finishOrder.length === state.racers.length) {
    state.winner = state.winMode === "last"
      ? state.finishOrder[state.finishOrder.length - 1]
      : state.finishOrder[0];
    const node = el.playerGameArena.querySelector(`[data-player="${cssEscape(state.winner.id)}"]`);
    if (node) node.classList.add("winner");
    renderHorseResults(state);
    return true;
  }
  return false;
}

function updateHorseRacerPhysics(racer, state, time, delta) {
  const nextObstacle = racer.obstacles.find((obstacle) => !obstacle.cleared);
  const obstacleDistance = nextObstacle ? nextObstacle.x - racer.x : Infinity;
  const isJumping = racer.jumpUntil > time;
  const isStumbling = racer.stumbleUntil > time;
  if (time * 1000 > racer.nextFormAt) {
    racer.speedForm = racer.speedForm * 0.55 + (0.88 + Math.random() * 0.24) * 0.45;
    racer.accelForm = racer.accelForm * 0.55 + (0.88 + Math.random() * 0.24) * 0.45;
    racer.staminaForm = racer.staminaForm * 0.55 + (0.88 + Math.random() * 0.24) * 0.45;
    racer.nextFormAt += 2200 + Math.random() * 3600;
  }
  const staminaDrop = 1 - Math.max(0, racer.x / state.trackLength) * (1 - racer.stamina * racer.staminaForm) * 0.34;
  const sorted = [...state.racers].sort((a, b) => b.x - a.x);
  const rankIndex = sorted.findIndex((entry) => entry.id === racer.id);
  const rankRatio = state.racers.length <= 1 ? 0 : rankIndex / (state.racers.length - 1);
  const rankNudge = (rankRatio - 0.5) * 58;
  const leaderPenalty = rankIndex === 0 ? -18 : 0;
  const progress = Math.max(0, Math.min(1, racer.x / state.trackLength));
  const paceWave = Math.sin(progress * Math.PI * 5.5 + racer.pacePhase) * 18;
  const lateKick = Math.max(0, 1 - Math.abs(progress - racer.lateKick) / 0.13) * racer.lateKickPower;
  let targetSpeed = racer.topSpeed * racer.speedForm * staminaDrop + paceWave + lateKick;

  if (time > racer.nextEventAt / 1000) {
    racer.eventBoost = (Math.random() - 0.45) * 132 + rankNudge + leaderPenalty;
    racer.nextEventAt += 420 + Math.random() * 760;
  }
  racer.eventBoost *= 0.982;
  racer.shock = "";

  if (obstacleDistance < 130 && obstacleDistance > -30 && !isJumping) {
    racer.jumpUntil = time + 0.72;
    racer.eventBoost -= 42;
  }
  if (obstacleDistance < -35 && nextObstacle && !nextObstacle.cleared) {
    nextObstacle.cleared = true;
    racer.landingUntil = time + 0.38;
    const failChance = Math.max(0.045, 0.17 - racer.jumpPower * 0.05 + (nextObstacle.type === "rock" ? 0.055 : 0) - rankRatio * 0.045 + (1 - rankRatio) * 0.035);
    if (Math.random() < failChance) {
      racer.stumbleUntil = time + 0.7;
      racer.x = Math.max(0, racer.x - 95 - Math.random() * 65);
      racer.speed *= 0.42;
      racer.eventBoost -= 90;
      racer.shock = "stumble";
    } else {
      racer.eventBoost += 42 * racer.recovery;
      racer.shock = "land";
    }
  }

  if (isJumping) targetSpeed *= 0.78;
  if (isStumbling) targetSpeed *= 0.46;
  targetSpeed += racer.eventBoost;
  const accelerationBase = racer.acceleration * racer.accelForm;
  const acceleration = targetSpeed > racer.speed ? accelerationBase : accelerationBase * 0.75;
  racer.speed += Math.max(-acceleration * delta, Math.min(acceleration * delta, targetSpeed - racer.speed));
  racer.speed = Math.max(160, Math.min(racer.topSpeed * 1.22, racer.speed));
  racer.x += racer.speed * delta;
}

function renderHorseCamera(state) {
  const camera = el.playerGameArena.querySelector(".horse-camera");
  const world = el.playerGameArena.querySelector(".horse-world");
  if (!camera || !world) return;
  const sorted = [...state.racers].sort((a, b) => b.x - a.x);
  const focusRacer = state.winMode === "last" ? sorted[sorted.length - 1] : sorted[0];
  const nearby = state.winMode === "last" ? sorted.slice(-2) : sorted.slice(0, 2);
  const nearbyAverage = nearby.reduce((sum, racer) => sum + racer.x, 0) / nearby.length;
  const focus = focusRacer.x * 0.78 + nearbyAverage * 0.22;
  const maxCamera = Math.max(0, state.trackLength - camera.clientWidth + 190);
  const target = Math.max(0, Math.min(maxCamera, focus - camera.clientWidth * 0.46));
  state.cameraX += (target - state.cameraX) * 0.14;
  const closeFinish = sorted[0]?.x > state.trackLength - 260 && Math.abs((sorted[0]?.x || 0) - (sorted[1]?.x || 0)) < 80;
  const shake = closeFinish ? Math.sin(performance.now() / 38) * 3 : 0;
  world.style.transform = `translateX(${-Math.round(state.cameraX + shake)}px)`;
}

function renderHorseMinimap(state) {
  state.racers.forEach((racer) => {
    const dot = el.playerGameArena.querySelector(`[data-mini="${cssEscape(racer.id)}"]`);
    if (dot) dot.style.left = `${Math.min(100, racer.x / state.trackLength * 100)}%`;
  });
}

function renderHorseRanks(state) {
  const board = el.playerGameArena.querySelector("#horse-rank-board");
  if (!board) return;
  const finishedIds = new Set(state.finishOrder.map((racer) => racer.id));
  const running = state.racers
    .filter((racer) => !finishedIds.has(racer.id))
    .sort((a, b) => b.x - a.x);
  const ranked = [...state.finishOrder, ...running];
  board.innerHTML = ranked.map((racer, index) => `<span>${index + 1}. ${escapeHtml(racer.id)}</span>`).join("");
}

function renderHorseResults(state) {
  const results = el.playerGameArena.querySelector("#horse-results");
  if (!results) return;
  results.hidden = false;
  results.innerHTML = `
    <strong>Final results</strong>
    ${state.finishOrder.map((racer, index) => `<span>${index + 1}. ${escapeHtml(racer.id)}</span>`).join("")}
  `;
}

function getLanePosition(index, total) {
  if (total <= 1) return 50;
  return 7 + (index * 86) / (total - 1);
}

function createFallPhysicsState(racers) {
  const stage = el.playerGameArena.querySelector(".fall-race-stage");
  const world = el.playerGameArena.querySelector(".fall-world");
  const width = Math.max(360, stage?.clientWidth || 900);
  const worldHeight = world?.clientHeight || FALL_WORLD_HEIGHT;
  const radius = 28;

  return {
    width,
    worldHeight,
    radius,
    elapsed: 0,
    gravity: 28,
    terminalVelocity: 65,
    pins: getFallPinLayout().map((pin) => ({ x: width * pin.xPct / 100, y: pin.y, r: 8 })),
    spinners: getFallSpinnerLayout().map((spinner) => ({ x: width * spinner.xPct / 100, y: spinner.y, r: 42 })),
    barriers: buildFallBarrierSegments(width),
    balls: racers.map((racer, index) => ({
      ...racer,
      x: width * getLanePosition(index, racers.length) / 100,
      y: 28 + (index % 3) * 18,
      vx: (Math.random() - 0.5) * 36,
      vy: 22 + Math.random() * 16,
      radius,
      rotation: 0,
      status: "",
      finished: false
    }))
  };
}

function buildFallBarrierSegments(width) {
  const railSegments = getFallRailLayout().map((rail) => {
    const length = width * rail.widthPct / 100;
    const angle = rail.angle * Math.PI / 180;
    const x1 = width * rail.xPct / 100;
    const y1 = rail.y;
    return {
      x1,
      y1,
      x2: x1 + Math.cos(angle) * length,
      y2: y1 + Math.sin(angle) * length
    };
  });

  const gateSegments = getFallGateLayout().flatMap((gate) => ([
    { x1: width * 0.07, y1: gate.y, x2: width * 0.43, y2: gate.y + 46 },
    { x1: width * 0.93, y1: gate.y + 48, x2: width * 0.57, y2: gate.y + 94 }
  ]));

  const wallSegments = [
    { x1: 18, y1: 0, x2: 18, y2: FALL_WORLD_HEIGHT },
    { x1: width - 18, y1: 0, x2: width - 18, y2: FALL_WORLD_HEIGHT }
  ];

  return [...railSegments, ...gateSegments, ...wallSegments];
}

function stepFallPhysics(state, delta) {
  state.elapsed += delta;
  const iterations = 4;
  const step = delta / iterations;
  let winner = null;

  for (let turn = 0; turn < iterations; turn += 1) {
    state.balls.forEach((ball) => {
      if (ball.finished) return;
      ball.status = "";
      const lateGravity = state.elapsed > 48 ? 1.55 : 1;
      ball.vy = Math.min(state.terminalVelocity * lateGravity, ball.vy + state.gravity * lateGravity * step);
      ball.vx += Math.sin((ball.y + ball.index * 81) * 0.018) * 10 * step;
      ball.x += ball.vx * step;
      ball.y += ball.vy * step;
      ball.rotation += ball.vx * step * 0.9;

      collideWithBounds(ball, state);
      state.pins.forEach((pin) => collideBallWithCircle(ball, pin, 0.72, "Hit"));
      state.spinners.forEach((spinner, index) => {
        const hit = collideBallWithCircle(ball, spinner, 0.86, "Spin");
        if (hit) ball.vx += (index % 2 === 0 ? 1 : -1) * 32;
      });
      state.barriers.forEach((segment) => collideBallWithSegment(ball, segment));
    });

    collideBalls(state.balls);

    state.balls.forEach((ball) => {
      if (!winner && !ball.finished && ball.y >= state.worldHeight - 74) {
        ball.finished = true;
        winner = ball;
      }
    });
  }

  return winner;
}

function collideWithBounds(ball, state) {
  if (ball.x < ball.radius + 18) {
    ball.x = ball.radius + 18;
    ball.vx = Math.abs(ball.vx) * 0.72;
    ball.status = "Wall";
  }
  if (ball.x > state.width - ball.radius - 18) {
    ball.x = state.width - ball.radius - 18;
    ball.vx = -Math.abs(ball.vx) * 0.72;
    ball.status = "Wall";
  }
}

function collideBallWithCircle(ball, circle, restitution, status) {
  const dx = ball.x - circle.x;
  const dy = ball.y - circle.y;
  const minDistance = ball.radius + circle.r;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq <= 0 || distanceSq >= minDistance * minDistance) return false;

  const distance = Math.sqrt(distanceSq);
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = minDistance - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const velocityAlongNormal = ball.vx * nx + ball.vy * ny;
  if (velocityAlongNormal < 0) {
    ball.vx -= (1 + restitution) * velocityAlongNormal * nx;
    ball.vy -= (1 + restitution) * velocityAlongNormal * ny;
    ball.vx += nx * 8;
  }
  ball.status = status;
  return true;
}

function collideBallWithSegment(ball, segment) {
  const nearest = nearestPointOnSegment(ball.x, ball.y, segment);
  const dx = ball.x - nearest.x;
  const dy = ball.y - nearest.y;
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq <= 0 || distanceSq >= ball.radius * ball.radius) return;

  const distance = Math.sqrt(distanceSq);
  const nx = dx / distance;
  const ny = dy / distance;
  const overlap = ball.radius - distance;
  ball.x += nx * overlap;
  ball.y += ny * overlap;

  const velocityAlongNormal = ball.vx * nx + ball.vy * ny;
  if (velocityAlongNormal < 0) {
    ball.vx -= 1.78 * velocityAlongNormal * nx;
    ball.vy -= 1.78 * velocityAlongNormal * ny;
  }
  ball.status = "Rail";
}

function nearestPointOnSegment(x, y, segment) {
  const vx = segment.x2 - segment.x1;
  const vy = segment.y2 - segment.y1;
  const lengthSq = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((x - segment.x1) * vx + (y - segment.y1) * vy) / lengthSq));
  return { x: segment.x1 + vx * t, y: segment.y1 + vy * t };
}

function collideBalls(balls) {
  for (let a = 0; a < balls.length; a += 1) {
    for (let b = a + 1; b < balls.length; b += 1) {
      const first = balls[a];
      const second = balls[b];
      const dx = second.x - first.x;
      const dy = second.y - first.y;
      const minDistance = first.radius + second.radius;
      const distanceSq = dx * dx + dy * dy;
      if (distanceSq <= 0 || distanceSq >= minDistance * minDistance) continue;

      const distance = Math.sqrt(distanceSq);
      const nx = dx / distance;
      const ny = dy / distance;
      const overlap = (minDistance - distance) / 2;
      first.x -= nx * overlap;
      first.y -= ny * overlap;
      second.x += nx * overlap;
      second.y += ny * overlap;

      const relativeVx = second.vx - first.vx;
      const relativeVy = second.vy - first.vy;
      const velocityAlongNormal = relativeVx * nx + relativeVy * ny;
      if (velocityAlongNormal > 0) continue;

      const impulse = -(1.08) * velocityAlongNormal / 2;
      first.vx -= impulse * nx;
      first.vy -= impulse * ny;
      second.vx += impulse * nx;
      second.vy += impulse * ny;
      first.status = "Bump";
      second.status = "Bump";
    }
  }
}

function renderFallPhysicsFrame(state) {
  state.balls.forEach((ball) => {
    const node = el.playerGameArena.querySelector(`[data-player="${cssEscape(ball.id)}"]`);
    if (!node) return;
    node.style.left = "0";
    node.style.transform = `translate(${Math.round(ball.x - ball.radius)}px, ${Math.round(ball.y - ball.radius)}px) rotate(${ball.rotation.toFixed(1)}deg)`;
    node.dataset.status = ball.status || "";
    node.classList.toggle("collision", ball.status === "Bump");
    node.classList.toggle("blocked", ball.status === "Rail" || ball.status === "Wall");
    const label = node.querySelector(".race-status");
    if (label) label.textContent = ball.status || "";
  });

  updateFallCamera(state.balls.map((ball) => ({
    progress: Math.max(0, Math.min(1, ball.y / state.worldHeight))
  })));
}

function getRacerState(racer, elapsed, mode) {
  const base = Math.min(1, elapsed / racer.duration);
  let progress = mode === "fall" ? base : easeInOutSine(base);
  let speedPulse = Math.sin(base * Math.PI * 10 + racer.laneSeed) * 0.012;
  let blocked = false;
  let jumping = false;

  racer.events.forEach((event) => {
    const distance = Math.abs(base - event.at);
    if (distance > event.width) return;
    const influence = 1 - distance / event.width;
    if (event.kind === "boost") {
      speedPulse += event.strength * influence;
      jumping = mode === "horse" && influence > 0.35;
    } else {
      speedPulse -= event.strength * influence;
      blocked = influence > 0.42;
    }
  });

  progress = Math.max(0, Math.min(1, progress + speedPulse));
  if (base < 1) progress = Math.min(progress, 0.985);

  let xOffset = mode === "fall"
    ? Math.sin(base * Math.PI * 9 + racer.laneSeed) * racer.wobble
      + Math.sin(base * Math.PI * 31 + racer.laneSeed * 0.7) * 14
      + Math.sin(base * Math.PI * 53 + racer.laneSeed * 1.4) * 7
    : 0;

  if (mode === "fall") {
    racer.events.forEach((event, index) => {
      const distance = Math.abs(base - event.at);
      if (distance > event.width * 1.35) return;
      const influence = 1 - distance / (event.width * 1.35);
      const direction = (index + racer.index) % 2 === 0 ? 1 : -1;
      xOffset += direction * influence * (event.kind === "boost" ? 48 : 64);
    });
  }
  const yOffset = mode === "horse" && jumping ? -14 - Math.sin(base * Math.PI * 18) * 5 : 0;
  const rotation = mode === "fall"
    ? Math.sin(base * Math.PI * 12 + racer.laneSeed) * 24
    : Math.sin(base * Math.PI * 20 + racer.laneSeed) * 2;
  const status = jumping ? "Jump" : blocked ? "Block" : speedPulse > 0.02 ? "Boost" : "";

  return { progress, xOffset, yOffset, rotation, jumping, blocked, status };
}

function updateGameRacer(racer, state, mode, states = []) {
  const node = el.playerGameArena.querySelector(`[data-player="${cssEscape(racer.id)}"]`);
  if (!node) return;
  if (mode === "fall") {
    const world = node.closest(".fall-world");
    const distance = Math.max(0, world.clientHeight - node.offsetHeight - 48);
    const collisionOffset = getFallCollisionOffset(racer, state, states);
    node.style.transform = `translate(calc(-50% + ${Math.round(state.xOffset + collisionOffset)}px), ${Math.round(distance * state.progress)}px) rotate(${state.rotation.toFixed(1)}deg)`;
    node.classList.toggle("blocked", state.blocked);
    node.classList.toggle("collision", Math.abs(collisionOffset) > 0);
    node.dataset.status = Math.abs(collisionOffset) > 0 ? "Hit" : state.status;
    const label = node.querySelector(".race-status");
    if (label) label.textContent = node.dataset.status || "";
    return;
  }

  const track = node.closest(".horse-track");
  const distance = Math.max(0, track.clientWidth - node.offsetWidth - 8);
  node.style.transform = `translate(${Math.round(distance * state.progress)}px, ${Math.round(state.yOffset)}px) rotate(${state.rotation.toFixed(1)}deg)`;
  node.classList.toggle("jumping", state.jumping);
  node.classList.toggle("blocked", state.blocked);
  node.dataset.status = state.status;
  const label = node.querySelector(".horse-status");
  if (label) label.textContent = state.status || "";
}

function getFallCollisionOffset(racer, state, states) {
  return states.reduce((offset, otherState, index) => {
    if (index === racer.index) return offset;
    if (Math.abs(index - racer.index) > 1) return offset;
    const verticalGap = Math.abs(otherState.progress - state.progress);
    const horizontalGap = Math.abs((otherState.xOffset || 0) - state.xOffset);
    if (verticalGap > 0.035 || horizontalGap > 45) return offset;
    return offset + (racer.index > index ? 18 : -18) * (1 - verticalGap / 0.035);
  }, 0);
}

function updateFallCamera(states) {
  const stage = el.playerGameArena.querySelector(".fall-race-stage");
  const world = el.playerGameArena.querySelector(".fall-world");
  if (!stage || !world || !states.length) return;

  const leaderProgress = Math.max(...states.map((state) => state.progress || 0));
  const visibleHeight = stage.clientHeight;
  const maxCamera = Math.max(0, world.clientHeight - visibleHeight);
  const camera = Math.max(0, Math.min(maxCamera, leaderProgress * world.clientHeight - visibleHeight * 0.38));
  world.style.transform = `translateY(${-Math.round(camera)}px)`;
}

function finishPlayerGame(winner) {
  if (teamGameState.active) {
    finishTeamGame(winner);
    return;
  }
  el.playerGameWinner.textContent = `당첨: ${winner.id}`;
  el.playerGameStart.disabled = false;
  const node = el.playerGameArena.querySelector(`[data-player="${cssEscape(winner.id)}"]`);
  if (node) {
    node.classList.add("winner");
    node.dataset.status = "Winner";
    const label = node.querySelector(".race-status, .horse-status");
    if (label) label.textContent = "Winner";
  }
}

function finishTeamGame(winner) {
  const team = teamGameState.currentTeam;
  if (!teamGameState.picked[team].includes(winner.id)) {
    teamGameState.picked[team].push(winner.id);
  }
  teamGameState.lastWinner = { team, id: winner.id };
  teamGameState.active = false;
  teamGameState.currentTeam = team === "A" ? "B" : "A";
  el.playerGameStart.disabled = false;
  el.playerGameWinner.textContent = team === "A"
    ? `Team A 당첨: ${winner.id} · Team B 시작`
    : `Team B 당첨: ${winner.id} · 다음 라운드 Team A 시작`;
  renderTeamGameResults();
  markTeamPickedChoices();
}

function renderTeamGameResults() {
  if (!el.teamGameResults) return;
  const rounds = Math.max(teamGameState.picked.A.length, teamGameState.picked.B.length);
  if (!rounds) {
    el.teamGameResults.innerHTML = `<span>팀별 당첨 기록 없음</span>`;
    return;
  }
  el.teamGameResults.innerHTML = Array.from({ length: rounds }, (_, index) => `
    <div class="team-result-row">
      <span>Round ${index + 1}</span>
      <strong>A: ${escapeHtml(teamGameState.picked.A[index] || "-")}</strong>
      <strong>B: ${escapeHtml(teamGameState.picked.B[index] || "-")}</strong>
    </div>
  `).join("");
}

function markTeamPickedChoices() {
  ["A", "B"].forEach((team) => {
    const root = team === "A" ? el.teamGameA : el.teamGameB;
    const picked = new Set(teamGameState.picked[team]);
    root.querySelectorAll(".player-choice").forEach((label) => {
      const input = label.querySelector("input");
      const isPicked = picked.has(input.value);
      label.classList.toggle("picked", isPicked);
      input.disabled = isPicked;
    });
  });
}

function resetPlayerGameArena() {
  window.cancelAnimationFrame(playerGameFrame);
  playerGameState = null;
  marbleGameState = null;
  el.playerGameStart.disabled = false;
  const participants = getSelectedTeamPlayers(teamGameState.currentTeam);
  markTeamPickedChoices();
  renderPlayerGameArena(participants.length ? buildGameRacers(participants) : []);
}

function hasSameRacerSet(racers, participants) {
  if (racers.length !== participants.length) return false;
  const ids = new Set(participants.map((player) => player.id));
  return racers.every((racer) => ids.has(racer.id));
}

function easeInOutSine(value) {
  return -(Math.cos(Math.PI * value) - 1) / 2;
}

function cssEscape(value) {
  if (window.CSS && typeof window.CSS.escape === "function") return window.CSS.escape(value);
  return `${value}`.replace(/["\\]/g, "\\$&");
}

function renderTheme() {
  const race = getThemeRace();
  el.body.dataset.theme = race.toLowerCase();
  if (el.raceEmblem) el.raceEmblem.textContent = race.slice(0, 1);
  if (el.themeLabel) el.themeLabel.textContent = `${race} 우세 테마`;
}

function syncRoute() {
  const route = location.hash.replace("#", "") || "overview";
  const activeRoute = el.views.some((view) => view.dataset.view === route) ? route : "overview";
  el.body.dataset.route = activeRoute;
  el.views.forEach((view) => {
    view.hidden = view.dataset.view !== activeRoute;
  });
  el.routeLinks.forEach((link) => {
    link.dataset.active = link.dataset.routeLink === activeRoute ? "true" : "false";
  });
}

function renderTopCommanders() {
  const html = standingsByMode.major.slice(0, 3).map((player) => `
    <article class="top-commander-card ${player.race.toLowerCase()} podium-${player.rank}">
      <div class="commander-image"></div>
      <div class="commander-content">
        ${renderRankBadge(player.rank)}
        <strong>${escapeHtml(player.id)}</strong>
        <small>${player.race} · ${player.rating} · ${player.wins}-${player.losses}</small>
      </div>
    </article>
  `).join("") || `<article class="top-commander-card"><div class="commander-content"><strong>데이터 없음</strong></div></article>`;

  el.homeTopCommanders.innerHTML = html;
  el.leaderboardTopCommanders.innerHTML = html;
}

function renderLeaderboard() {
  const query = el.playerSearch.value.trim().toLowerCase();
  const race = el.raceFilter.value;
  const rangeActive = hasLeaderboardDateRange();
  const leaderboardMatches = getLeaderboardModeMatches(activeRatingMode);
  const standings = rangeActive
    ? buildStandings(players, leaderboardMatches)
    : standingsByMode[activeRatingMode] || [];
  const extras = rangeActive ? buildMajorExtras(leaderboardMatches) : majorExtrasByPlayer;
  const filtered = standings.filter((player) => {
    const matchesQuery = !query || player.id.toLowerCase().includes(query) || player.race.toLowerCase().includes(query);
    const matchesRace = race === "all" || player.race === race;
    const matchesRange = !rangeActive || player.wins + player.losses > 0;
    const matchesActivity = rangeActive || hasRecentActivityForMode(player.id, activeRatingMode);
    return matchesQuery && matchesRace && matchesRange && matchesActivity;
  }).map((player, index) => ({ ...player, rank: index + 1 }));

  el.leaderboardBody.innerHTML = filtered.map((player) => {
    const tierClass = getTierClass(player.rank);
    return `
    ${player.rank % 8 === 1 ? renderTierRow(player.rank) : ""}
    <tr class="leaderboard-row ${tierClass} ${player.rank <= 3 ? `podium-row podium-${player.rank}` : ""} ${player.id === selectedPlayerId ? "selected-row" : ""}" data-player-id="${escapeHtml(player.id)}" tabindex="0">
      <td>${renderRankBadge(player.rank)}</td>
      <td><button class="player-link" type="button" data-player-id="${escapeHtml(player.id)}">${escapeHtml(player.id)}</button></td>
      <td>${renderRaceMark(player.race)}</td>
      <td><strong>${player.rating}</strong><small> RD ${player.rd}</small></td>
      <td>${formatStreak(player.streak)}</td>
      <td>${formatRecordWithRate(player)}</td>
      <td>${formatRecordWithRate(player.vs.Zerg)}</td>
      <td>${formatRecordWithRate(player.vs.Terran)}</td>
      <td>${formatRecordWithRate(player.vs.Protoss)}</td>
      ${renderMajorExtraCells(player, extras)}
      <td><span class="recent-strip">${renderRecentStrip(player.recent)}</span></td>
    </tr>
    ${player.id === selectedPlayerId ? renderSelectedPlayerDetailRow(player) : ""}
  `;
  }).join("");
  syncRatingTabs();
}

function hasLeaderboardDateRange() {
  return Boolean(el.leaderboardDateFrom.value || el.leaderboardDateTo.value);
}

function getLeaderboardModeMatches(mode) {
  const modeMatches = mode === "normal"
    ? matches.filter((match) => match.type === "normal")
    : mode === "all"
      ? matches
      : matches.filter(isMajorMatch);
  return filterMatchesByLeaderboardDateRange(modeMatches);
}

function filterMatchesByLeaderboardDateRange(matchList) {
  const from = el.leaderboardDateFrom.value;
  const to = el.leaderboardDateTo.value;
  if (!from && !to) return matchList;
  return matchList.filter((match) => {
    const date = normalizeDateString(match.date);
    return (!from || date >= from) && (!to || date <= to);
  });
}

function hasRecentActivityForMode(playerId, mode) {
  if (mode === "normal") return hasRecentMatch(playerId, (match) => match.type === "normal");
  if (mode === "all") {
    return hasRecentMatch(playerId, (match) => match.type === "normal")
      && hasRecentMatch(playerId, isMajorMatch);
  }
  return hasRecentMatch(playerId, isMajorMatch);
}

function hasRecentMatch(playerId, typeFilter) {
  const cutoff = getRecentCutoffDateString();
  return matches.some((match) => {
    if (!typeFilter(match)) return false;
    if (!isPlayerInMatch(playerId, match)) return false;
    return normalizeDateString(match.date) >= cutoff;
  });
}

function isMajorMatch(match) {
  return match.type === "proleague" || match.type === "deathmatch";
}

function isPlayerInMatch(playerId, match) {
  return match.winner === playerId || match.loser === playerId;
}

function getRecentCutoffDateString() {
  const date = new Date();
  date.setDate(date.getDate() - 21);
  return date.toISOString().slice(0, 10);
}

function normalizeDateString(value) {
  return `${value || ""}`.slice(0, 10);
}

function renderTierRow(rank) {
  const tier = Math.floor((rank - 1) / 8) + 1;
  const start = (tier - 1) * 8 + 1;
  const end = tier * 8;
  const label = activeRatingMode === "major"
    ? tier === 1 ? "메이저리거" : `${tier - 1} Tier`
    : `${tier} Tier`;
  return `
    <tr class="tier-row ${getTierClass(rank)}">
      <td colspan="${getLeaderboardColumnCount()}">
        <span>${label}</span>
        <small>${start}위-${end}위</small>
      </td>
    </tr>
  `;
}

function getTierClass(rank) {
  return `tier-${((Math.floor((rank - 1) / 8)) % 4) + 1}`;
}

function handleLeaderboardClick(event) {
  const row = event.target.closest(".leaderboard-row");
  if (!row) return;

  selectedPlayerId = selectedPlayerId === row.dataset.playerId ? "" : row.dataset.playerId;
  renderLeaderboard();
}

function handleLeaderboardKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  const row = event.target.closest(".leaderboard-row");
  if (!row) return;

  event.preventDefault();
  selectedPlayerId = selectedPlayerId === row.dataset.playerId ? "" : row.dataset.playerId;
  renderLeaderboard();
}

function renderRankBadge(rank) {
  if (rank === 1) return `<span class="rank rank-badge top-1"><span class="rank-medal">🏆</span><span>1위</span></span>`;
  if (rank === 2) return `<span class="rank rank-badge top-2"><span class="rank-medal">🥈</span><span>2위</span></span>`;
  if (rank === 3) return `<span class="rank rank-badge top-3"><span class="rank-medal">🥉</span><span>3위</span></span>`;
  return `<span class="rank">#${rank}</span>`;
}

function renderSelectedPlayerDetailRow(player) {
  const detailMatches = getRatingModeMatches();
  const detail = buildPlayerDetail(player.id, detailMatches);
  const ratingHistory = buildPlayerRatingHistory(player.id, detailMatches);
  const ratingByMatchKey = buildRatingHistoryByMatchKey(ratingHistory.matches);
  const achievements = buildPlayerAchievements(player.id);
  return `
    <tr class="player-detail-row">
      <td colspan="${getLeaderboardColumnCount()}">
        <section class="player-detail">
          <div class="player-detail-head">
            <div>
              <p class="eyebrow">Player detail</p>
              <h3>${escapeHtml(player.id)}</h3>
            </div>
            <div class="detail-summary">
              ${renderRaceMark(player.race)}
              <strong>${formatRecordWithRate(detail.total)}</strong>
            </div>
          </div>
          <div class="detail-grid">
            <article class="stat-card compact achievement-card">
              <h4>뱃지</h4>
              <div class="achievement-list">
                ${achievements.length ? achievements.map((achievement) => `
                  <span class="achievement-badge ${achievement.tone}">
                    <strong>${achievement.icon}</strong>
                    <span>${escapeHtml(achievement.label)}</span>
                  </span>
                `).join("") : `<p class="empty-state inline-empty">아직 획득한 업적이 없습니다.</p>`}
              </div>
            </article>
            <article class="stat-card compact map-detail-card">
              <h4>맵별 전적</h4>
              <div class="stat-list">
                ${renderRecordRows(detail.maps, "맵 전적 없음")}
              </div>
            </article>
            <article class="stat-card compact race-streak-card">
              <h4>종족별 연승/연패</h4>
              <div class="stat-list">
                ${RACES.map((race) => `
                  <div class="stat-row">
                    <span>vs ${race}</span>
                    <strong>${formatStreak(detail.raceStreaks[race])}</strong>
                  </div>
                `).join("")}
              </div>
            </article>
            <article class="stat-card compact recent-card">
              <h4>최근 기록</h4>
              <div class="recent-detail-list">
                ${detail.recent.length ? detail.recent.map((match) => `
                  <span>${escapeHtml(match.date)} · ${match.winner === player.id ? "승" : "패"} · ${escapeHtml(match.winner)} vs ${escapeHtml(match.loser)} · ${escapeHtml(match.map)}${renderInlineRatingDelta(match, ratingByMatchKey)}</span>
                `).join("") : `<span>최근 기록 없음</span>`}
              </div>
            </article>
            <article class="stat-card compact rating-history-card">
              <h4>ELO 주간 변동 추이</h4>
              ${renderRatingHistory(ratingHistory)}
            </article>
          </div>
        </section>
      </td>
    </tr>
  `;
}

function getLeaderboardColumnCount() {
  return activeRatingMode === "normal" ? 10 : 13;
}

function buildPlayerAchievements(playerId) {
  const achievements = [];
  const majorStanding = standingsByMode.major.find((player) => player.id === playerId);
  const activeMajorRank = getActiveModeRank(playerId, "major");
  if (activeMajorRank && activeMajorRank <= 8) {
    achievements.push({
      icon: "ML",
      label: "Major League",
      tone: "major-league"
    });
  }

  if (majorStanding?.rank <= 3) {
    achievements.push({
      icon: getRankIcon(majorStanding.rank),
      label: `통합 ${majorStanding.rank}위`,
      tone: `podium-${majorStanding.rank}`
    });
  }

  RACES.forEach((race) => {
    const raceRankings = standingsByMode.major
      .filter((player) => player.race === race)
      .map((player, index) => ({ ...player, raceRank: index + 1 }));
    const raceStanding = raceRankings.find((player) => player.id === playerId);
    if (raceStanding?.raceRank <= 3) {
      achievements.push({
        icon: getRankIcon(raceStanding.raceRank),
        label: `${race} 랭킹 ${raceStanding.raceRank}위`,
        tone: race.toLowerCase()
      });
    }
  });

  buildHallOfFameEntries()
    .filter((entry) => entry.playerId === playerId)
    .forEach((entry) => {
      achievements.push({
        icon: "★",
        label: entry.label,
        tone: entry.race.toLowerCase()
      });
    });

  getKillerAchievements(majorStanding).forEach((achievement) => achievements.push(achievement));

  const tripleAchievement = getTripleWinRateAchievement(majorStanding);
  if (tripleAchievement) achievements.push(tripleAchievement);

  return achievements;
}

function getActiveModeRank(playerId, mode) {
  const standings = standingsByMode[mode] || [];
  const activeStandings = standings.filter((player) => hasRecentActivityForMode(player.id, mode));
  return activeStandings.findIndex((player) => player.id === playerId) + 1 || 0;
}

function getRankIcon(rank) {
  if (rank === 1) return "🏆";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return "★";
}

function buildHallOfFameEntries() {
  const majorStandings = standingsByMode.major;
  return RACES.flatMap((race) => {
    const racePlayers = majorStandings.filter((player) => player.race === race);
    return getHallOfFameCategories(racePlayers, race)
      .filter((category) => category.winner)
      .map((category) => ({
        race,
        label: `${race} ${category.label}`,
        playerId: category.winner.player.id
      }));
  });
}

function getTripleWinRateAchievement(player) {
  if (!player) return null;

  const allEligible = RACES.every((race) => recordGames(player.vs[race]) >= 5);
  if (!allEligible) return null;

  const rates = RACES.map((race) => recordWinRate(player.vs[race]));
  if (rates.every((rate) => rate >= 0.7)) {
    return { icon: "70", label: "트리플 70", tone: "triple-70" };
  }
  if (rates.every((rate) => rate >= 0.6)) {
    return { icon: "60", label: "트리플 60", tone: "triple-60" };
  }
  return null;
}

function getKillerAchievements(player) {
  if (!player) return [];

  return RACES
    .filter((race) => recordGames(player.vs[race]) >= 5 && recordWinRate(player.vs[race]) >= 0.7)
    .map((race) => ({
      icon: "70",
      label: `${race} 킬러`,
      tone: race.toLowerCase()
    }));
}

function getHallOfFameCategories(racePlayers, race) {
  const eligibleRacePlayers = racePlayers.filter((player) => player.wins + player.losses >= 5);
  const categories = [
    { label: "ELO 1위", winner: pickBest(eligibleRacePlayers, (player) => player.rating, (player) => `${player.rating}`) },
    { label: "승률 1위", winner: pickBest(eligibleRacePlayers, winRate, formatPlayerWinRate) },
    { label: "최다 연승", winner: pickBest(eligibleRacePlayers.filter((player) => player.streak > 0), (player) => player.streak, (player) => `${player.streak}연승`) },
    { label: "다승왕", winner: pickBest(eligibleRacePlayers, (player) => player.wins, (player) => `${player.wins}승`) }
  ];

  RACES.forEach((opponent) => {
    categories.push({
      label: `vs ${opponent} 승률 1위`,
      winner: pickBest(
        racePlayers.filter((player) => recordGames(player.vs[opponent]) >= 5),
        (player) => recordWinRate(player.vs[opponent]),
        (player) => formatPercent(recordWinRate(player.vs[opponent]))
      )
    });
  });

  return categories.filter((category) => category.winner);
}

function renderSelectedPlayerDetail() {
  if (!selectedPlayerId) {
    el.playerDetail.hidden = true;
    el.playerDetail.innerHTML = "";
    return;
  }

  const standings = standingsByMode[activeRatingMode] || [];
  const player = standings.find((entry) => entry.id === selectedPlayerId) || findPlayer(selectedPlayerId);
  if (!player) {
    el.playerDetail.hidden = true;
    return;
  }

  const detail = buildPlayerDetail(selectedPlayerId, getRatingModeMatches());
  el.playerDetail.hidden = false;
  el.playerDetail.innerHTML = `
    <div class="player-detail-head">
      <div>
        <p class="eyebrow">Player detail</p>
        <h3>${escapeHtml(player.id)}</h3>
      </div>
      <div class="detail-summary">
        ${renderRaceMark(player.race)}
        <strong>${formatRecordWithRate(detail.total)}</strong>
      </div>
    </div>
    <div class="detail-grid">
      <article class="stat-card compact">
        <h4>맵별 전적</h4>
        <div class="stat-list">
          ${renderRecordRows(detail.maps, "맵 전적 없음")}
        </div>
      </article>
      <article class="stat-card compact">
        <h4>종족별 상대 전적</h4>
        <div class="stat-list">
          ${RACES.map((race) => `
            <div class="stat-row">
              <span>vs ${race}</span>
              <strong>${formatRecordWithRate(detail.vsRace[race])}</strong>
            </div>
          `).join("")}
        </div>
      </article>
      <article class="stat-card compact">
        <h4>최근 기록</h4>
        <div class="recent-detail-list">
          ${detail.recent.length ? detail.recent.map((match) => `
            <span>${escapeHtml(match.date)} · ${match.winner === selectedPlayerId ? "승" : "패"} · ${escapeHtml(match.winner)} vs ${escapeHtml(match.loser)} · ${escapeHtml(match.map)}</span>
          `).join("") : `<span>최근 기록 없음</span>`}
        </div>
      </article>
    </div>
  `;
}

function getRatingModeMatches() {
  return getLeaderboardModeMatches(activeRatingMode);
}

function buildPlayerDetail(playerId, matchList) {
  const detail = {
    total: { wins: 0, losses: 0 },
    maps: {},
    vsRace: createRaceRecordSet(),
    raceStreaks: createRaceStreakSet(),
    recent: []
  };

  matchList.forEach((match) => {
    const isWinner = match.winner === playerId;
    const isLoser = match.loser === playerId;
    if (!isWinner && !isLoser) return;

    const opponent = findPlayer(isWinner ? match.loser : match.winner);
    const resultKey = isWinner ? "wins" : "losses";
    detail.total[resultKey] += 1;
    detail.maps[match.map] ||= { wins: 0, losses: 0 };
    detail.maps[match.map][resultKey] += 1;
    if (opponent) detail.vsRace[opponent.race][resultKey] += 1;
    detail.recent.unshift(match);
  });

  detail.recent = detail.recent
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`))
    .slice(0, 10);
  detail.raceStreaks = buildRaceStreaks(playerId, matchList);

  return detail;
}

function buildPlayerRatingHistory(playerId, matchList) {
  const table = new Map();
  players.forEach((player) => {
    table.set(player.id, { ...player, ...DEFAULT_PLAYER });
  });

  const history = [];
  [...matchList]
    .sort((a, b) => `${a.date}`.localeCompare(`${b.date}`))
    .forEach((match) => {
      const winner = table.get(match.winner);
      const loser = table.get(match.loser);
      if (!winner || !loser || winner.id === loser.id) return;

      const before = table.get(playerId)?.rating || DEFAULT_PLAYER.rating;
      const [newWinner, newLoser] = ratePair(winner, loser);
      Object.assign(winner, newWinner);
      Object.assign(loser, newLoser);

      if (match.winner === playerId || match.loser === playerId) {
        const after = table.get(playerId).rating;
        history.push({
          key: getMatchIdentityKey(match),
          date: match.date,
          weekStart: getWeekStartDate(match.date),
          before: Math.round(before),
          rating: Math.round(after),
          delta: Math.round(after - before),
          result: match.winner === playerId ? "W" : "L",
          opponent: match.winner === playerId ? match.loser : match.winner,
          map: match.map,
          type: match.type
        });
      }
    });

  return {
    weekly: summarizeRatingHistoryByWeek(history),
    matches: history
  };
}

function getMatchIdentityKey(match) {
  return [
    normalizeDateString(match.date),
    match.type,
    match.winner,
    match.loser,
    match.map,
    match.seriesId || ""
  ].join("|");
}

function renderRatingHistory(history) {
  if (!history.weekly.length && !history.matches.length) return `<p class="empty-state inline-empty">선택한 기준의 ELO 기록이 없습니다.</p>`;

  return `
    ${history.weekly.length ? `<div class="rating-sparkline">${renderRatingSparkline(history.weekly)}</div>` : ""}
    <div class="rating-history-list">
      <h5>주간 변동</h5>
      ${history.weekly.slice(-6).reverse().map((point) => `
        <div>
          <span>${escapeHtml(point.weekStart)} 주 · ${point.games}경기</span>
          <strong>${point.startRating} → ${point.rating} <small>${point.delta >= 0 ? "+" : ""}${point.delta}</small></strong>
        </div>
      `).join("")}
    </div>
  `;
}

function buildRatingHistoryByMatchKey(history) {
  return history.reduce((result, point) => {
    result[point.key] = point;
    return result;
  }, {});
}

function renderInlineRatingDelta(match, ratingByMatchKey) {
  const point = ratingByMatchKey[getMatchIdentityKey(match)];
  if (!point) return "";
  const direction = point.delta > 0 ? "up" : point.delta < 0 ? "down" : "even";
  return ` <span class="inline-rating-delta ${direction}">ELO ${point.before} → ${point.rating} (${point.delta >= 0 ? "+" : ""}${point.delta})</span>`;
}

function summarizeRatingHistoryByWeek(history) {
  const weeks = new Map();
  history.forEach((point) => {
    if (!weeks.has(point.weekStart)) {
      weeks.set(point.weekStart, {
        weekStart: point.weekStart,
        startRating: point.before,
        rating: point.rating,
        games: 0
      });
    }

    const week = weeks.get(point.weekStart);
    week.rating = point.rating;
    week.games += 1;
    week.delta = week.rating - week.startRating;
  });

  return [...weeks.values()].sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

function getWeekStartDate(value) {
  const date = new Date(`${normalizeDateString(value)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return normalizeDateString(value);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  return date.toISOString().slice(0, 10);
}

function renderRatingSparkline(history) {
  const width = 420;
  const height = 150;
  const left = 44;
  const right = 12;
  const top = 12;
  const bottom = 34;
  const ratings = history.map((point) => point.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const range = Math.max(1, max - min);
  const yTicks = [max, Math.round((max + min) / 2), min];
  const points = history.map((point, index) => {
    const x = history.length === 1
      ? left + (width - left - right) / 2
      : left + (index * (width - left - right)) / (history.length - 1);
    const y = top + ((max - point.rating) * (height - top - bottom)) / range;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");

  return `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="ELO 주간 변동 추이">
      ${yTicks.map((tick) => {
        const y = top + ((max - tick) * (height - top - bottom)) / range;
        return `
          <line class="chart-grid" x1="${left}" y1="${y.toFixed(1)}" x2="${width - right}" y2="${y.toFixed(1)}"></line>
          <text class="chart-label y-label" x="${left - 8}" y="${(y + 4).toFixed(1)}">${tick}</text>
        `;
      }).join("")}
      <line class="chart-axis" x1="${left}" y1="${top}" x2="${left}" y2="${height - bottom}"></line>
      <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
      <polyline points="${points}" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${history.map((point, index) => {
        const x = history.length === 1
          ? left + (width - left - right) / 2
          : left + (index * (width - left - right)) / (history.length - 1);
        const y = top + ((max - point.rating) * (height - top - bottom)) / range;
        const showLabel = history.length <= 6 || index === 0 || index === history.length - 1 || index % Math.ceil(history.length / 4) === 0;
        return `
          <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.2"></circle>
          ${showLabel ? `<text class="chart-label x-label" x="${x.toFixed(1)}" y="${height - 10}">${escapeHtml(point.weekStart.slice(5))}</text>` : ""}
        `;
      }).join("")}
    </svg>
  `;
}

function createRaceStreakSet() {
  return RACES.reduce((records, race) => {
    records[race] = 0;
    return records;
  }, {});
}

function buildRaceStreaks(playerId, matchList) {
  const streaks = createRaceStreakSet();

  RACES.forEach((race) => {
    const raceMatches = [...matchList]
      .filter((match) => match.winner === playerId || match.loser === playerId)
      .filter((match) => {
        const opponent = findPlayer(match.winner === playerId ? match.loser : match.winner);
        return opponent?.race === race;
      })
      .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));

    if (!raceMatches.length) return;

    const firstResultIsWin = raceMatches[0].winner === playerId;
    let count = 0;
    for (const match of raceMatches) {
      if ((match.winner === playerId) !== firstResultIsWin) break;
      count += 1;
    }
    streaks[race] = firstResultIsWin ? count : -count;
  });

  return streaks;
}

function createRaceRecordSet() {
  return RACES.reduce((records, race) => {
    records[race] = { wins: 0, losses: 0 };
    return records;
  }, {});
}

function renderRecordRows(records, emptyText) {
  const rows = Object.entries(records)
    .sort((a, b) => recordGames(b[1]) - recordGames(a[1]) || a[0].localeCompare(b[0]));

  if (!rows.length) return `<p class="empty-state inline-empty">${emptyText}</p>`;

  return rows.map(([label, record]) => `
    <div class="stat-row">
      <span>${escapeHtml(label)}</span>
      <strong>${formatRecordWithRate(record)}</strong>
    </div>
  `).join("");
}

function renderMajorExtraCells(player, extrasByPlayer = majorExtrasByPlayer) {
  if (activeRatingMode === "normal") return "";

  const extras = extrasByPlayer[player.id] || createMajorExtraRecord();
  return `
    <td>${formatRecordWithRate(extras.team)}</td>
    <td>${extras.coffee}잔</td>
    <td>${formatRecordWithRate(extras.death)}</td>
  `;
}

function setRatingMode(event) {
  activeRatingMode = event.currentTarget.dataset.ratingMode;
  renderLeaderboard();
}

function syncRatingTabs() {
  el.ratingButtons.forEach((button) => {
    button.dataset.active = button.dataset.ratingMode === activeRatingMode ? "true" : "false";
  });
  el.majorOnlyCells.forEach((cell) => {
    cell.hidden = activeRatingMode === "normal";
  });
}

function setStatsMode(event) {
  activeStatsMode = event.currentTarget.dataset.statsMode;
  renderStats();
}

function syncStatsTabs() {
  el.statsButtons.forEach((button) => {
    button.dataset.active = button.dataset.statsMode === activeStatsMode ? "true" : "false";
  });
}

function renderMajorSummary() {
  const majorMatches = matches.filter((match) => match.type === "proleague" || match.type === "deathmatch");
  renderRaceRecords(majorMatches);
  renderHallOfFame();
}

function getThemeRace() {
  const records = createRaceRecords();
  matches
    .filter((match) => match.type === "proleague" || match.type === "deathmatch")
    .forEach((match) => {
      const winner = findPlayer(match.winner);
      const loser = findPlayer(match.loser);
      if (!winner || !loser) return;
      if (winner.race === loser.race) return;
      records[winner.race].total.wins += 1;
      records[loser.race].total.losses += 1;
    });

  return RACES
    .map((race) => ({ race, games: recordGames(records[race].total), rate: recordWinRate(records[race].total) }))
    .filter((entry) => entry.games > 0)
    .sort((a, b) => b.rate - a.rate || b.games - a.games)[0]?.race || "Terran";
}

function renderRaceRecords(majorMatches) {
  const records = createRaceRecords();
  const dominantRace = getThemeRace();

  majorMatches.forEach((match) => {
    const winner = findPlayer(match.winner);
    const loser = findPlayer(match.loser);
    if (!winner || !loser) return;
    if (winner.race === loser.race) return;

    records[winner.race].total.wins += 1;
    records[winner.race].vs[loser.race].wins += 1;
    records[loser.race].total.losses += 1;
    records[loser.race].vs[winner.race].losses += 1;
  });

  el.raceRecordGrid.innerHTML = RACES.map((race) => `
    <article class="race-record-card ${race.toLowerCase()} ${race === dominantRace ? "dominant" : ""}">
      <div class="race-card-title">
        ${renderRaceMark(race)}
        <strong class="${race === dominantRace ? "dominant-title" : ""}">${getRaceRecordTitle(race, race === dominantRace)}</strong>
      </div>
      <dl>
        ${RACES.filter((opponent) => opponent !== race).map((opponent) => `
          <div>
            <dt>vs ${opponent}</dt>
            <dd>${formatRecordWithRate(records[race].vs[opponent])}</dd>
          </div>
        `).join("")}
        <div>
          <dt>총합</dt>
          <dd>${formatRecordWithRate(records[race].total)}</dd>
        </div>
      </dl>
    </article>
  `).join("");
}

function getRaceRecordTitle(race, dominant = false) {
  if (race === "Zerg") return dominant ? "공포의 저그군단" : "저그군단";
  if (race === "Terran") return dominant ? "영광의 테란제국" : "테란제국";
  if (race === "Protoss") return dominant ? "찬란한 아이어행성" : "아이어행성";
  return race;
}

function createRaceRecords() {
  return RACES.reduce((records, race) => {
    records[race] = {
      total: { wins: 0, losses: 0 },
      vs: RACES.reduce((vs, opponent) => {
        vs[opponent] = { wins: 0, losses: 0 };
        return vs;
      }, {})
    };
    return records;
  }, {});
}

function renderHallOfFame() {
  const majorStandings = standingsByMode.major;
  el.hallGrid.innerHTML = RACES.map((race) => {
    const racePlayers = majorStandings.filter((player) => player.race === race);
    const eligibleRacePlayers = racePlayers.filter((player) => player.wins + player.losses >= 5);
    const categories = [
      ["ELO 1등", pickBest(eligibleRacePlayers, (player) => player.rating, (player) => `${player.rating}`)],
      ["승률 1등", pickBest(eligibleRacePlayers, winRate, formatPlayerWinRate)],
      ["최다 연승", pickBest(eligibleRacePlayers.filter((player) => player.streak > 0), (player) => player.streak, (player) => `${player.streak}연승`)],
      ["다승왕", pickBest(eligibleRacePlayers, (player) => player.wins, (player) => `${player.wins}승`)]
    ];

    RACES.forEach((opponent) => {
      categories.push([
        `vs ${opponent} 승률 1등`,
        pickBest(
          racePlayers.filter((player) => recordGames(player.vs[opponent]) >= 5),
          (player) => recordWinRate(player.vs[opponent]),
          (player) => formatPercent(recordWinRate(player.vs[opponent]))
        )
      ]);
    });

    return `
      <article class="hall-card ${race.toLowerCase()}">
        <div class="race-card-title">
          ${renderRaceMark(race)}
          <strong>${race}</strong>
        </div>
        <div class="hall-list">
          ${categories.map(([label, winner]) => `
            <div class="hall-item">
              <span class="hall-label">${label}<small>${winner ? escapeHtml(winner.detail) : "-"}</small></span>
              <strong>${winner ? escapeHtml(winner.player.id) : "-"}</strong>
            </div>
          `).join("")}
        </div>
      </article>
    `;
  }).join("");
}

function renderStats() {
  renderMapRaceStats();
  renderPlayerMapStats();
  renderHeadToHeadStats();
  syncStatsTabs();
}

function getMajorMatches() {
  return matches.filter((match) => match.type === "proleague" || match.type === "deathmatch");
}

function getStatsMatches() {
  return activeStatsMode === "all" ? matches : getMajorMatches();
}

function renderMapRaceStats() {
  const byMap = {};

  getStatsMatches().forEach((match) => {
    const winner = findPlayer(match.winner);
    const loser = findPlayer(match.loser);
    if (!winner || !loser) return;

    byMap[match.map] ||= {};
    const key = getRaceMatchupKey(winner.race, loser.race);
    byMap[match.map][key] ||= createRaceMatchupRecord(key);
    byMap[match.map][key].total += 1;
    byMap[match.map][key].wins[winner.race] += 1;
  });

  const mapNames = Object.keys(byMap).sort();
  el.mapRaceStats.innerHTML = mapNames.length ? mapNames.map((map) => `
    <article class="stat-card">
      <h4>${escapeHtml(map)}</h4>
      <div class="stat-list">
        ${Object.values(byMap[map]).sort((a, b) => a.key.localeCompare(b.key)).map((record) => `
          <div class="stat-row">
            <span>${record.key}</span>
            <strong>${formatRaceMatchupRecord(record)}</strong>
          </div>
        `).join("")}
      </div>
    </article>
  `).join("") : `<p class="empty-state">선택한 기준의 승인 전적이 없습니다.</p>`;
}

function createRaceMatchupRecord(key) {
  return {
    key,
    total: 0,
    wins: { Zerg: 0, Terran: 0, Protoss: 0 }
  };
}

function getRaceMatchupKey(raceA, raceB) {
  return [raceA, raceB].sort((a, b) => RACES.indexOf(a) - RACES.indexOf(b)).join(" vs ");
}

function formatRaceMatchupRecord(record) {
  const races = record.key.split(" vs ");
  if (races[0] === races[1]) return `${races[0]} mirror · ${record.total}전`;

  return races.map((race) => {
    const wins = record.wins[race] || 0;
    const losses = record.total - wins;
    const rate = record.total ? wins / record.total : 0;
    const advantage = rate > 0.5 ? "advantage" : rate < 0.5 ? "disadvantage" : "even";
    const label = rate > 0.5 ? "유리" : rate < 0.5 ? "불리" : "동률";
    return `<span class="matchup-side ${advantage}">${race} ${wins}승 ${losses}패 · ${formatPercent(rate)} · ${label}</span>`;
  }).join("");
}

function renderPlayerMapStats() {
  const playerId = el.playerMapFilter.value.trim();
  if (!playerId) {
    el.playerMapStats.innerHTML = `<p class="empty-state">선수 ID를 입력하면 맵별 전적이 표시됩니다.</p>`;
    return;
  }

  const player = findPlayer(playerId);
  if (!player) {
    el.playerMapStats.innerHTML = `<p class="empty-state">등록된 선수 ID가 아닙니다.</p>`;
    return;
  }

  const byMap = {};
  getStatsMatches().forEach((match) => {
    const isWinner = match.winner.toLowerCase() === player.id.toLowerCase();
    const isLoser = match.loser.toLowerCase() === player.id.toLowerCase();
    if (!isWinner && !isLoser) return;
    byMap[match.map] ||= { wins: 0, losses: 0 };
    if (isWinner) byMap[match.map].wins += 1;
    if (isLoser) byMap[match.map].losses += 1;
  });

  const mapNames = Object.keys(byMap).sort();
  el.playerMapStats.innerHTML = mapNames.length ? mapNames.map((map) => `
    <article class="stat-card compact">
      <h4>${escapeHtml(map)}</h4>
      <div class="stat-row">
        <span>${escapeHtml(player.id)}</span>
        <strong>${formatRecordWithRate(byMap[map])}</strong>
      </div>
    </article>
  `).join("") : `<p class="empty-state">해당 선수의 선택 기준 맵 전적이 없습니다.</p>`;
}

function renderHeadToHeadStats() {
  const playerAId = el.headPlayerA.value.trim();
  const playerBId = el.headPlayerB.value.trim();
  if (!playerAId || !playerBId) {
    el.headToHeadStats.innerHTML = `<p class="empty-state">두 선수 ID를 입력하면 상대전적이 표시됩니다.</p>`;
    return;
  }

  const playerA = findPlayer(playerAId);
  const playerB = findPlayer(playerBId);
  if (!playerA || !playerB) {
    el.headToHeadStats.innerHTML = `<p class="empty-state">등록된 선수 ID를 입력하세요.</p>`;
    return;
  }
  if (playerA.id === playerB.id) {
    el.headToHeadStats.innerHTML = `<p class="empty-state">서로 다른 두 선수를 입력하세요.</p>`;
    return;
  }

  const record = { [playerA.id]: 0, [playerB.id]: 0 };
  const mapRecords = {};
  const recent = [];

  getStatsMatches().forEach((match) => {
    const pair = [match.winner.toLowerCase(), match.loser.toLowerCase()];
    if (!pair.includes(playerA.id.toLowerCase()) || !pair.includes(playerB.id.toLowerCase())) return;

    record[match.winner] += 1;
    mapRecords[match.map] ||= { [playerA.id]: 0, [playerB.id]: 0 };
    mapRecords[match.map][match.winner] += 1;
    recent.unshift(match);
  });

  const advantage = formatHeadToHeadAdvantage(playerA.id, playerB.id, record);

  el.headToHeadStats.innerHTML = `
    <article class="stat-card head-card">
      <h4>${escapeHtml(playerA.id)} vs ${escapeHtml(playerB.id)}</h4>
      <div class="head-score">
        <strong>${record[playerA.id]}</strong>
        <span>:</span>
        <strong>${record[playerB.id]}</strong>
      </div>
      <p class="head-advantage">${advantage}</p>
      <div class="stat-list">
        ${Object.keys(mapRecords).sort().map((map) => `
          <div class="stat-row">
            <span>${escapeHtml(map)}</span>
            <strong>${playerA.id} ${mapRecords[map][playerA.id]}승 / ${playerB.id} ${mapRecords[map][playerB.id]}승</strong>
          </div>
        `).join("") || `<div class="stat-row"><span>전적 없음</span><strong>-</strong></div>`}
      </div>
      <div class="recent-h2h">
        <strong>최근 경기</strong>
        ${recent.slice(0, 10).map((match) => `<span>${escapeHtml(match.date)} · ${typeLabel[match.type] || match.type} · ${escapeHtml(match.winner)} 승 · ${escapeHtml(match.map)}</span>`).join("")}
      </div>
    </article>
  `;
}

function formatHeadToHeadAdvantage(playerAId, playerBId, record) {
  const playerAWins = record[playerAId] || 0;
  const playerBWins = record[playerBId] || 0;
  const total = playerAWins + playerBWins;
  if (!total) return "아직 상대전적이 없습니다.";

  const playerARate = playerAWins / total;
  const playerBRate = playerBWins / total;
  if (playerARate >= 0.65) return `${playerAId} 우세 · ${formatPercent(playerARate)}`;
  if (playerBRate >= 0.65) return `${playerBId} 우세 · ${formatPercent(playerBRate)}`;
  return `박빙 · ${formatPercent(playerARate)} : ${formatPercent(playerBRate)}`;
}

function pickBest(players, scoreFn, detailFn) {
  const sorted = [...players]
    .map((player) => ({ player, score: scoreFn(player), detail: detailFn(player) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score || b.player.wins - a.player.wins || a.player.id.localeCompare(b.player.id));
  return sorted[0] || null;
}

function hasGames(player) {
  return player.wins + player.losses > 0;
}

function winRate(player) {
  const games = player.wins + player.losses;
  return games ? player.wins / games : 0;
}

function formatPlayerWinRate(player) {
  return formatPercent(winRate(player));
}

function recordGames(record) {
  return record.wins + record.losses;
}

function recordWinRate(record) {
  const games = recordGames(record);
  return games ? record.wins / games : 0;
}

function formatRecordWithRate(record) {
  const wins = record.wins || 0;
  const losses = record.losses || 0;
  return `<span class="record-stack"><strong>${wins}승 ${losses}패</strong><small>${formatPercent(recordWinRate({ wins, losses }))}</small></span>`;
}

function formatRecordTextWithRate(record) {
  const wins = record.wins || 0;
  const losses = record.losses || 0;
  return `${formatPercent(recordWinRate({ wins, losses }))} (${wins}승 ${losses}패)`;
}

function formatPercent(value) {
  return `${Math.round(value * 1000) / 10}%`;
}

function renderRecentMatches() {
  el.recentMatches.innerHTML = [...matches]
    .sort(compareRecentMatches)
    .slice(0, 8)
    .map((match) => {
      const winner = findPlayer(match.winner);
      const loser = findPlayer(match.loser);
      return `
        <article class="match-card">
          <div class="match-meta">
            <span>${escapeHtml(match.date)}</span>
            <strong>${typeLabel[match.type] || match.type}</strong>
          </div>
          <p><strong>${escapeHtml(match.winner)}</strong> 승 vs ${escapeHtml(match.loser)}</p>
          <p>${winner?.race || "-"} over ${loser?.race || "-"} · ${escapeHtml(match.map)}</p>
          ${match.type === "proleague" ? `<p>팀 승리 ${match.teamWin ? "Y" : "N"} · ☕ ${match.coffee ? "Y" : "N"}</p>` : ""}
        </article>
      `;
    }).join("");
}

function compareRecentMatches(a, b) {
  return getMatchSortTime(b) - getMatchSortTime(a);
}

function getMatchSortTime(match) {
  const value = match.approvedAt || match.submittedAt || match.date;
  const timestamp = Date.parse(value);
  if (!Number.isNaN(timestamp)) return timestamp;
  return Date.parse(`${match.date || ""}T00:00:00`) || 0;
}

function renderDeathmatchLog() {
  const seriesList = buildDeathmatchSeries(matches);

  el.deathmatchLog.innerHTML = seriesList.length
    ? seriesList.map((series) => {
      const players = series.players.slice(0, 2);
      const playerA = players[0] || series.winner;
      const playerB = players[1] || series.loser;
      const playerAScore = series.setWins[playerA] || 0;
      const playerBScore = series.setWins[playerB] || 0;
      const winner = findPlayer(series.winner);
      const loser = findPlayer(series.loser);

      return `
        <details class="match-card deathmatch-card">
          <summary>
            <div class="match-meta">
              <span>${escapeHtml(series.date)}</span>
              <strong>끝장전</strong>
            </div>
            <p><strong>${escapeHtml(series.winner || "승자 미정")}</strong> 승</p>
            <p>${winner?.race || "-"} over ${loser?.race || "-"} · ${escapeHtml(playerA || "-")} ${playerAScore} : ${playerBScore} ${escapeHtml(playerB || "-")}</p>
            <p>${series.sets.length}세트 · 클릭해서 세트별 기록 보기</p>
          </summary>
          <div class="deathmatch-set-detail">
            ${series.sets.map((match, index) => {
              const setWinner = findPlayer(match.winner);
              const setLoser = findPlayer(match.loser);
              return `
                <div class="deathmatch-set-row">
                  <span>${index + 1}세트</span>
                  <strong>${escapeHtml(match.winner)} 승</strong>
                  <small>${setWinner?.race || "-"} over ${setLoser?.race || "-"} · ${escapeHtml(match.map)}</small>
                </div>
              `;
            }).join("")}
          </div>
        </details>
      `;
    }).join("")
    : `<article class="match-card"><p>승인된 끝장전 기록이 없습니다.</p></article>`;
}

function renderRaceMark(race) {
  return `
    <span class="race-mark ${race.toLowerCase()}" title="${escapeHtml(race)}">
      <img src="${getRaceMarkPath(race)}" alt="${escapeHtml(race)}">
    </span>
  `;
}

function getRaceMarkPath(race) {
  if (race === "Zerg") return "images/zerg/mark.png";
  if (race === "Terran") return "images/terran/mark.png";
  return "images/protoss/mark.png";
}

function syncTypeFields() {
  const isProleague = el.matchType.value === "proleague";
  const isDeathmatch = el.matchType.value === "deathmatch";
  el.singleMatchFields.hidden = isProleague || isDeathmatch;
  el.proleagueBatch.hidden = !isProleague;
  el.deathmatchBatch.hidden = !isDeathmatch;
}

function syncRacePreview(input, output) {
  const player = findPlayer(input.value);
  output.textContent = player ? player.race : "선수 없음";
  output.className = `race-preview ${player ? player.race.toLowerCase() : ""}`;
  output.dataset.valid = player ? "true" : "false";
}

function clearInput(event) {
  const button = event.target.closest(".clear-input");
  const targetId = button?.dataset.clearTarget;
  const input = targetId
    ? document.getElementById(targetId)
    : button?.closest(".clearable-input")?.querySelector("input");
  if (!input) return;

  input.value = "";
  input.focus();

  if (targetId === "deathmatch-player-a") syncRacePreview(el.deathmatchPlayerA, el.deathmatchPlayerARace);
  if (targetId === "deathmatch-player-b") syncRacePreview(el.deathmatchPlayerB, el.deathmatchPlayerBRace);
  if (targetId === "head-player-a" || targetId === "head-player-b") renderHeadToHeadStats();
  if (targetId === "player-map-filter") renderPlayerMapStats();
  syncDynamicRacePreview({ target: input });

  el.message.textContent = "";
  el.message.removeAttribute("data-kind");
}

function renderNormalSets(count) {
  el.normalSets.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    el.normalSets.insertAdjacentHTML("beforeend", renderNormalSet(index + 1));
  }
  syncNormalAddButton();
}

function renderNormalSet(number) {
  return `
    <div class="normal-set" data-set-number="${number}">
      <div class="set-number">${number}</div>
      <label class="field player-field">
        <span>승자</span>
        <div class="input-with-race">
          <div class="clearable-input">
            <input data-normal="winner" list="player-list" autocomplete="off" placeholder="승자 ID">
            <button class="clear-input" type="button" aria-label="승자 입력 지우기">X</button>
          </div>
          <span class="race-preview" data-race-preview-for="winner">종족</span>
        </div>
      </label>
      <label class="field player-field">
        <span>패자</span>
        <div class="input-with-race">
          <div class="clearable-input">
            <input data-normal="loser" list="player-list" autocomplete="off" placeholder="패자 ID">
            <button class="clear-input" type="button" aria-label="패자 입력 지우기">X</button>
          </div>
          <span class="race-preview" data-race-preview-for="loser">종족</span>
        </div>
      </label>
      <label class="field">
        <span>맵</span>
        <div class="clearable-input">
          <input data-normal="map" list="map-list" autocomplete="off" placeholder="맵">
          <button class="clear-input" type="button" aria-label="맵 입력 지우기">X</button>
        </div>
      </label>
      <button class="icon-button remove-set" type="button" aria-label="${number}경기 삭제">X</button>
    </div>
  `;
}

function addNormalSet() {
  el.normalSets.insertAdjacentHTML("beforeend", renderNormalSet(getNormalRows().length + 1));
  renumberRows(getNormalRows());
}

function handleNormalSetClick(event) {
  if (event.target.closest(".remove-set")) {
    const rows = getNormalRows();
    if (rows.length <= 1) return;
    event.target.closest(".normal-set").remove();
    renumberRows(getNormalRows());
    return;
  }

  if (event.target.closest(".clear-input")) {
    clearInput(event);
  }
}

function getNormalRows() {
  return [...el.normalSets.querySelectorAll(".normal-set")];
}

function syncNormalAddButton() {
  el.addNormalSet.disabled = false;
}

function renderProleagueSets(count) {
  el.proleagueSets.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    el.proleagueSets.insertAdjacentHTML("beforeend", renderProleagueSet(index + 1));
  }
  syncAddSetButton();
}

function renderProleagueSet(number) {
  return `
    <div class="proleague-set" data-set-number="${number}">
      <div class="set-number">${number}</div>
      <label class="field">
        <span>Team A</span>
        <div class="input-with-race">
          <div class="clearable-input">
            <input data-proleague="teamA" list="player-list" autocomplete="off" placeholder="Team A ID">
            <button class="clear-input" type="button" aria-label="Team A 입력 지우기">X</button>
          </div>
          <span class="race-preview" data-race-preview-for="teamA">종족</span>
        </div>
      </label>
      <label class="field">
        <span>Team B</span>
        <div class="input-with-race">
          <div class="clearable-input">
            <input data-proleague="teamB" list="player-list" autocomplete="off" placeholder="Team B ID">
            <button class="clear-input" type="button" aria-label="Team B 입력 지우기">X</button>
          </div>
          <span class="race-preview" data-race-preview-for="teamB">종족</span>
        </div>
      </label>
      <label class="field">
        <span>세트 승자</span>
        <select data-proleague="winnerTeam">
          <option value="A">Team A</option>
          <option value="B">Team B</option>
        </select>
      </label>
      <label class="field">
        <span>맵</span>
        <div class="clearable-input">
          <input data-proleague="map" list="map-list" autocomplete="off" placeholder="맵">
          <button class="clear-input" type="button" aria-label="맵 입력 지우기">X</button>
        </div>
      </label>
      <button class="icon-button remove-set" type="button" aria-label="${number}세트 삭제">X</button>
    </div>
  `;
}

function addProleagueSet() {
  if (getProleagueRows().length >= 9) return;
  el.proleagueSets.insertAdjacentHTML("beforeend", renderProleagueSet(getProleagueRows().length + 1));
  renumberProleagueSets();
  syncAddSetButton();
}

function handleProleagueSetClick(event) {
  if (event.target.closest(".remove-set")) {
    const rows = getProleagueRows();
    if (rows.length <= 1) return;
    event.target.closest(".proleague-set").remove();
    renumberProleagueSets();
    syncAddSetButton();
    return;
  }

  if (event.target.closest(".clear-input")) {
    clearInput(event);
  }
}

function syncDynamicRacePreview(event) {
  const input = event.target;
  if (!(input instanceof HTMLInputElement)) return;

  const key = input.dataset.normal || input.dataset.proleague;
  if (!key || key === "map") return;

  const row = input.closest(".normal-set, .proleague-set");
  const output = row?.querySelector(`[data-race-preview-for="${key}"]`);
  if (!output) return;

  syncRacePreview(input, output);
}

function getProleagueRows() {
  return [...el.proleagueSets.querySelectorAll(".proleague-set")];
}

function renumberProleagueSets() {
  renumberRows(getProleagueRows());
}

function renumberRows(rows) {
  rows.forEach((row, index) => {
    const number = index + 1;
    row.dataset.setNumber = number;
    row.querySelector(".set-number").textContent = number;
  });
}

function syncAddSetButton() {
  el.addProleagueSet.disabled = getProleagueRows().length >= 9;
}

function renderDeathmatchSets(count) {
  el.deathmatchSets.innerHTML = "";
  for (let index = 0; index < count; index += 1) {
    el.deathmatchSets.insertAdjacentHTML("beforeend", renderDeathmatchSet(index + 1));
  }
  syncDeathmatchWinnerLabels();
}

function renderDeathmatchSet(number) {
  return `
    <div class="deathmatch-set" data-set-number="${number}">
      <div class="set-number">${number}</div>
      <label class="field">
        <span>승자</span>
        <div class="input-with-race winner-select-with-race">
          <select data-deathmatch="winner">
            <option value="A">Player A</option>
            <option value="B">Player B</option>
          </select>
          <span class="race-preview" data-deathmatch-winner-race>종족</span>
        </div>
      </label>
      <label class="field">
        <span>맵</span>
        <div class="clearable-input">
          <input data-deathmatch="map" list="map-list" autocomplete="off" placeholder="맵">
          <button class="clear-input" type="button" aria-label="맵 입력 지우기">X</button>
        </div>
      </label>
    </div>
  `;
}

function syncDeathmatchSetCount() {
  const targetCount = getDeathmatchSetCount();
  const rows = getDeathmatchRows();

  if (rows.length < targetCount) {
    for (let number = rows.length + 1; number <= targetCount; number += 1) {
      el.deathmatchSets.insertAdjacentHTML("beforeend", renderDeathmatchSet(number));
    }
  }

  if (rows.length > targetCount) {
    rows.slice(targetCount).forEach((row) => row.remove());
  }

  syncDeathmatchWinnerLabels();
}

function getDeathmatchSetCount() {
  const count = Number.parseInt(el.deathmatchSetCount.value, 10);
  if (Number.isNaN(count) || count < 1) return 1;
  return Math.min(count, 99);
}

function syncDeathmatchWinnerLabels() {
  const playerA = el.deathmatchPlayerA.value.trim() || "Player A";
  const playerB = el.deathmatchPlayerB.value.trim() || "Player B";

  getDeathmatchRows().forEach((row) => {
    const select = row.querySelector("[data-deathmatch='winner']");
    select.options[0].textContent = `A: ${playerA}`;
    select.options[1].textContent = `B: ${playerB}`;
  });
  syncDeathmatchSetWinnerRaces();
}

function syncDeathmatchSetWinnerRaces() {
  getDeathmatchRows().forEach((row) => {
    const winnerSide = row.querySelector("[data-deathmatch='winner']").value;
    const playerId = winnerSide === "A"
      ? el.deathmatchPlayerA.value.trim()
      : el.deathmatchPlayerB.value.trim();
    const output = row.querySelector("[data-deathmatch-winner-race]");
    if (!output) return;
    syncRacePreview({ value: playerId }, output);
  });
}

function handleDeathmatchSetClick(event) {
  if (event.target.closest(".clear-input")) {
    clearInput(event);
  }
}

function submitMatch(event) {
  event.preventDefault();
  const payload = el.matchType.value === "proleague"
    ? buildProleaguePayload()
    : el.matchType.value === "deathmatch"
      ? buildDeathmatchPayload()
      : buildNormalPayload();
  const error = validatePayload(payload);
  if (error) {
    el.message.textContent = error;
    el.message.dataset.kind = "error";
    return;
  }

  if (CONFIG.googleSheetsWebAppUrl) {
    submitToSheets(payload);
  } else {
    openGitHubIssue(payload);
  }
}

function buildNormalPayload() {
  const matches = getNormalRows()
    .map((row) => {
      const winner = row.querySelector("[data-normal='winner']").value.trim();
      const loser = row.querySelector("[data-normal='loser']").value.trim();
      const map = row.querySelector("[data-normal='map']").value.trim();
      if (!winner && !loser && !map) return null;

      return {
        type: "normal",
        date: el.matchDate.value,
        winner,
        loser,
        map,
        teamWin: false,
        coffee: false,
        approvalRequired: !CONFIG.autoApproveNormalMatches
      };
    })
    .filter(Boolean);

  return {
    type: "normalBatch",
    date: el.matchDate.value,
    matches
  };
}

function validatePayload(payload) {
  if (payload.type === "normalBatch") return validateNormalPayload(payload);
  if (payload.type === "proleagueBatch") return validateProleaguePayload(payload);
  if (payload.type === "deathmatchBatch") return validateDeathmatchPayload(payload);
  if (!payload.date) return "날짜를 입력하세요.";
  if (!findPlayer(payload.winner)) return "승자는 선수 목록에 있는 ID여야 합니다.";
  if (!findPlayer(payload.loser)) return "패자는 선수 목록에 있는 ID여야 합니다.";
  if (payload.winner.toLowerCase() === payload.loser.toLowerCase()) return "승자와 패자는 달라야 합니다.";
  if (!payload.map) return "맵을 입력하세요.";
  if (!findMap(payload.map)) return "맵은 등록된 맵 목록에서 선택해야 합니다.";
  return "";
}

function validateNormalPayload(payload) {
  if (!payload.date) return "날짜를 입력하세요.";
  if (!payload.matches.length) return "일반전 경기를 최소 1개 입력하세요.";

  for (const [index, match] of payload.matches.entries()) {
    const setNo = index + 1;
    if (!findPlayer(match.winner)) return `${setNo}경기 승자는 선수 목록에 있는 ID여야 합니다.`;
    if (!findPlayer(match.loser)) return `${setNo}경기 패자는 선수 목록에 있는 ID여야 합니다.`;
    if (match.winner.toLowerCase() === match.loser.toLowerCase()) return `${setNo}경기 승자와 패자는 달라야 합니다.`;
    if (!match.map) return `${setNo}경기 맵을 입력하세요.`;
    if (!findMap(match.map)) return `${setNo}경기 맵은 등록된 맵 목록에서 선택해야 합니다.`;
  }

  return "";
}

function buildProleaguePayload() {
  const teamWinner = el.proleagueTeamWinner.value;
  const coffee = el.proleagueCoffee.checked;
  const seriesId = createSubmissionId("proleague");
  const matches = getProleagueRows()
    .map((row) => {
      const teamA = row.querySelector("[data-proleague='teamA']").value.trim();
      const teamB = row.querySelector("[data-proleague='teamB']").value.trim();
      const winnerTeam = row.querySelector("[data-proleague='winnerTeam']").value;
      const map = row.querySelector("[data-proleague='map']").value.trim();
      if (!teamA && !teamB && !map) return null;

      const winner = winnerTeam === "A" ? teamA : teamB;
      const loser = winnerTeam === "A" ? teamB : teamA;
      const winningPlayerIsOnTeamWinner = winnerTeam === teamWinner;

      return {
        type: "proleague",
        date: el.matchDate.value,
        winner,
        loser,
        map,
        teamWin: winningPlayerIsOnTeamWinner,
        coffee,
        approvalRequired: true,
        seriesId,
        teamWinner,
        winnerTeam
      };
    })
    .filter(Boolean);

  return {
    type: "proleagueBatch",
    date: el.matchDate.value,
    teamWinner,
    coffee,
    seriesId,
    matches
  };
}

function validateProleaguePayload(payload) {
  if (!payload.date) return "날짜를 입력하세요.";
  if (!payload.matches.length) return "프로리그 세트를 최소 1개 입력하세요.";
  if (payload.matches.length > 9) return "프로리그는 최대 9세트까지 한 번에 입력할 수 있습니다.";

  for (const [index, match] of payload.matches.entries()) {
    const setNo = index + 1;
    if (!findPlayer(match.winner)) return `${setNo}세트 승자는 선수 목록에 있는 ID여야 합니다.`;
    if (!findPlayer(match.loser)) return `${setNo}세트 패자는 선수 목록에 있는 ID여야 합니다.`;
    if (match.winner.toLowerCase() === match.loser.toLowerCase()) return `${setNo}세트 Team A와 Team B 선수는 달라야 합니다.`;
    if (!match.map) return `${setNo}세트 맵을 입력하세요.`;
    if (!findMap(match.map)) return `${setNo}세트 맵은 등록된 맵 목록에서 선택해야 합니다.`;
  }

  return "";
}

function buildDeathmatchPayload() {
  const playerA = el.deathmatchPlayerA.value.trim();
  const playerB = el.deathmatchPlayerB.value.trim();
  const seriesId = createSubmissionId("deathmatch");
  const matches = getDeathmatchRows()
    .map((row) => {
      const winnerSide = row.querySelector("[data-deathmatch='winner']").value;
      const map = row.querySelector("[data-deathmatch='map']").value.trim();

      return {
        type: "deathmatch",
        date: el.matchDate.value,
        winner: winnerSide === "A" ? playerA : playerB,
        loser: winnerSide === "A" ? playerB : playerA,
        map,
        teamWin: false,
        coffee: false,
        approvalRequired: true,
        seriesId,
        winnerSide
      };
    })
    .filter(Boolean);

  return {
    type: "deathmatchBatch",
    date: el.matchDate.value,
    playerA,
    playerB,
    seriesId,
    matches
  };
}

function createSubmissionId(prefix) {
  const randomPart = window.crypto?.getRandomValues
    ? [...window.crypto.getRandomValues(new Uint32Array(2))].map((value) => value.toString(36)).join("")
    : Math.random().toString(36).slice(2);
  return `${prefix}-${Date.now().toString(36)}-${randomPart}`;
}

function validateDeathmatchPayload(payload) {
  if (!payload.date) return "날짜를 입력하세요.";
  if (!findPlayer(payload.playerA)) return "Player A는 선수 목록에 있는 ID여야 합니다.";
  if (!findPlayer(payload.playerB)) return "Player B는 선수 목록에 있는 ID여야 합니다.";
  if (payload.playerA.toLowerCase() === payload.playerB.toLowerCase()) return "Player A와 Player B는 달라야 합니다.";
  if (!payload.matches.length) return "끝장전 세트 맵을 최소 1개 입력하세요.";

  for (const [index, match] of payload.matches.entries()) {
    const setNo = index + 1;
    if (!match.map) return `${setNo}세트 맵을 입력하세요.`;
    if (!findMap(match.map)) return `${setNo}세트 맵은 등록된 맵 목록에서 선택해야 합니다.`;
  }

  return "";
}

function getDeathmatchRows() {
  return [...el.deathmatchSets.querySelectorAll(".deathmatch-set")];
}

async function submitToSheets(payload) {
  el.message.textContent = "제출 중입니다.";
  el.message.dataset.kind = "info";

  try {
    await fetch(CONFIG.googleSheetsWebAppUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    el.message.textContent = payload.type === "proleagueBatch" || payload.type === "deathmatchBatch"
      ? "접수되었습니다. 관리자 승인 후 반영됩니다."
      : payload.type === "normalBatch"
      ? "접수되었습니다. 일반전 자동 승인 설정에 따라 처리됩니다."
      : payload.approvalRequired
      ? "접수되었습니다. 관리자 승인 후 반영됩니다."
      : "접수되었습니다. 일반전 자동 승인 설정에 따라 처리됩니다.";
    el.message.dataset.kind = "success";
    el.form.reset();
    hydrateControls();
    syncTypeFields();
  } catch {
    el.message.textContent = "제출 실패: Google Apps Script Web App URL을 확인하세요.";
    el.message.dataset.kind = "error";
  }
}

function openGitHubIssue(payload) {
  const title = `[Match] ${typeLabel[payload.type]} ${payload.winner} vs ${payload.loser}`;
  const body = [
    "## Match Submission",
    "",
    `- Type: ${typeLabel[payload.type]}`,
    `- Date: ${payload.date}`,
    `- Winner: ${payload.winner}`,
    `- Loser: ${payload.loser}`,
    `- Map: ${payload.map}`,
    `- Team win: ${payload.type === "proleague" ? payload.teamWin : "N/A"}`,
    `- ☕: ${payload.type === "proleague" ? payload.coffee : "N/A"}`,
    `- Approval required: ${payload.approvalRequired}`,
    "",
    "관리자는 승인 후 data/matches.json 또는 Google Sheets 승인 상태를 업데이트하세요."
  ].join("\n");

  if (!CONFIG.githubOwner || !CONFIG.githubRepo) {
    el.message.textContent = "GitHub Issue fallback을 쓰려면 src/config.js의 githubOwner/githubRepo를 설정하세요.";
    el.message.dataset.kind = "error";
    return;
  }

  const url = new URL(`https://github.com/${CONFIG.githubOwner}/${CONFIG.githubRepo}/issues/new`);
  url.searchParams.set("title", title);
  url.searchParams.set("body", body);
  window.open(url.toString(), "_blank", "noopener,noreferrer");
  el.message.textContent = "GitHub Issue 작성 화면을 열었습니다.";
  el.message.dataset.kind = "success";
}

function findPlayer(id) {
  return players.find((player) => player.id.toLowerCase() === `${id}`.trim().toLowerCase());
}

function findMap(mapName) {
  return maps.some((map) => map.toLowerCase() === `${mapName}`.trim().toLowerCase());
}

function formatRecord(record) {
  return `${record.wins}-${record.losses}`;
}

function formatStreak(streak) {
  if (streak > 0) return `<span class="streak win">${streak}연승</span>`;
  if (streak < 0) return `<span class="streak loss">${Math.abs(streak)}연패</span>`;
  return `<span class="streak neutral">-</span>`;
}

function renderRecentStrip(recent) {
  if (!recent.length) return `<span class="dot empty">-</span>`;
  return recent.map((result) => `<span class="dot ${result === "W" ? "win" : "loss"}">${result}</span>`).join("");
}

function escapeHtml(value) {
  return `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

init().catch((error) => {
  document.body.innerHTML = `<main class="load-error"><h1>EloBoard 로드 실패</h1><p>${escapeHtml(error.message)}</p></main>`;
});
