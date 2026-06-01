// NBA 2K26 game form helpers.
// Owns the game modal, save flow, delete flow, and numeric form parsing.
(function(window) {
  'use strict';

  const statFields = ['pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'pm', 'fg2m', 'fg2a', 'fg3m', 'fg3a', 'ftm', 'fta'];
  const rosterSides = ['teammates', 'opponents'];
  const rosterNumberFields = ['pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'pm'];
  // 4 tabs: combined main (game+stats+review), teammates, opponents, media
  const gameTabs = ['main', 'teammates', 'opponents', 'media'];
  const gameTabAliases = { game: 'main', mine: 'main', notes: 'media' };
  const newGameFields = [...statFields, 'score-own', 'score-opp'];
  const nonNegativeFields = statFields.filter(key => key !== 'pm');
  const shotPairs = [
    ['fg2m', 'fg2a', 'FG'],
    ['fg3m', 'fg3a', '3PT'],
    ['ftm',  'fta',  'FT'],
  ];
  let gameModalBound = false;
  let _previewTimer = null;
  let _draftTimer = null;
  let activeDraftBuildId = null;
  let activeEditingGameId = null;
  const draftFieldKeys = [
    'mode', 'venue', 'date', 'result', 'score-own', 'score-opp', 'dayseq', 'myposition',
    'pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'pm',
    'fg2m', 'fg2a', 'fg3m', 'fg3a', 'ftm', 'fta', 'grade', 'notes',
  ];
  const draftKeyPrefix = 'nba2k26-game-draft:';

  function numberValue(id) {
    return parseInt(document.getElementById(id).value) || 0;
  }

  function pct(made, attempts) {
    if (made > attempts) return '!';
    return attempts > 0 ? Math.round((made / attempts) * 100) + '%' : '--';
  }

  function escapeRosterAttr(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function escapeInlineHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function safeRosterSide(side) {
    return side === 'opponents' ? 'opponents' : 'teammates';
  }

  function rosterContainer(side) {
    return document.getElementById(`g-${safeRosterSide(side)}-rows`);
  }

  function normalizeGameTab(tab) {
    const key = String(tab || '').trim();
    return gameTabs.includes(key) ? key : (gameTabAliases[key] || 'main');
  }

  function showGameTab(tab) {
    const active = normalizeGameTab(tab);
    document.querySelectorAll('[data-game-tab]').forEach(button => {
      button.classList.toggle('active', button.dataset.gameTab === active);
    });
    document.querySelectorAll('[data-game-tab-panel]').forEach(panel => {
      panel.classList.toggle('active', panel.dataset.gameTabPanel === active);
    });
    updateGameStepControls(active);
  }

  function activeGameTab() {
    return document.querySelector('[data-game-tab].active')?.dataset.gameTab || 'main';
  }

  function updateGameStepControls(active = activeGameTab()) {
    const index = Math.max(0, gameTabs.indexOf(active));
    const prev  = document.getElementById('g-prev-step');
    const next  = document.getElementById('g-next-step');
    const label = document.getElementById('g-step-label');
    if (prev)  prev.disabled  = index <= 0;
    if (next)  next.disabled  = index >= gameTabs.length - 1;
    if (label) {
      const currentButton = document.querySelector(`[data-game-tab="${active}"]`);
      label.textContent = `${index + 1}/${gameTabs.length} ${currentButton ? currentButton.textContent.trim() : t('Game')}`;
    }
  }

  function moveGameStep(delta) {
    const index = Math.max(0, gameTabs.indexOf(activeGameTab()));
    const nextIndex = Math.max(0, Math.min(gameTabs.length - 1, index + delta));
    showGameTab(gameTabs[nextIndex]);
  }

  function nextGameStep() { moveGameStep(1);  }
  function prevGameStep() { moveGameStep(-1); }

  function compareGamesByChronology(a, b) {
    const analyticsCompare = window.NBA2K26_GAME_ANALYSIS?.compareGamesByChronology;
    if (typeof analyticsCompare === 'function') return analyticsCompare(a, b);

    const da = String(a?.date || '');
    const db = String(b?.date || '');
    if (da !== db) return da < db ? 1 : -1;

    const seqA = Number.isFinite(Number(a?.daySeq)) ? Number(a.daySeq) : 1;
    const seqB = Number.isFinite(Number(b?.daySeq)) ? Number(b.daySeq) : 1;
    if (seqA !== seqB) return seqB - seqA;

    const ia = String(a?.id || '');
    const ib = String(b?.id || '');
    return ia < ib ? 1 : ia > ib ? -1 : 0;
  }

  function draftKey(buildId) {
    return draftKeyPrefix + String(buildId || 'global');
  }

  function getDraftStorage() {
    try { return window.localStorage || localStorage; }
    catch (e) { return null; }
  }

  function readGameDraft(buildId) {
    const storage = getDraftStorage();
    if (!storage || !buildId) return null;
    try {
      const draft = JSON.parse(storage.getItem(draftKey(buildId)) || 'null');
      return draft && draft.buildId === buildId ? draft : null;
    } catch (e) {
      return null;
    }
  }

  function writeGameDraft(buildId, draft) {
    const storage = getDraftStorage();
    if (!storage || !buildId) return false;
    try {
      storage.setItem(draftKey(buildId), JSON.stringify(draft));
      return true;
    } catch (e) {
      return false;
    }
  }

  function updateGameDraftStatus(message = '', hasDraft = false) {
    const status = document.getElementById('g-draft-status');
    const clearBtn = document.getElementById('g-clear-draft-btn');
    if (status) {
      status.textContent = message;
      status.classList.toggle('active', !!message);
      status.classList.toggle('has-draft', !!hasDraft);
    }
    if (clearBtn) clearBtn.classList.toggle('hidden', !hasDraft);
  }

  function clearGameDraft(buildId = activeDraftBuildId) {
    const storage = getDraftStorage();
    if (storage && buildId) storage.removeItem(draftKey(buildId));
    updateGameDraftStatus(t('Draft cleared'), false);
  }

  function currentDraftPayload() {
    const fields = {};
    draftFieldKeys.forEach(key => {
      const el = document.getElementById('g-' + key);
      if (el) fields[key] = el.value;
    });
    return {
      buildId: activeDraftBuildId,
      savedAt: Date.now(),
      fields,
      roster: collectRoster(),
      rosterDetail: {
        teammates: !document.getElementById('g-teammates-table')?.classList.contains('roster-compact'),
        opponents: !document.getElementById('g-opponents-table')?.classList.contains('roster-compact'),
      },
      tab: activeGameTab(),
    };
  }

  function applyGameDraft(draft) {
    if (!draft || !draft.fields) return;
    Object.entries(draft.fields).forEach(([key, value]) => {
      const el = document.getElementById('g-' + key);
      if (el) el.value = value ?? '';
    });
    populateRosterRows(draft.roster || {});
    rosterSides.forEach(side => {
      const detailed = draft.rosterDetail?.[side] ?? hasDetailedRosterStats(draft.roster?.[side]);
      setRosterDetail(side, !!detailed);
    });
    syncResultFromScore();
    syncRosterPlusMinus();
    updatePostgamePreview();
    showGameTab(draft.tab || 'main');
    updateGameDraftStatus(t('Draft restored'), true);
  }

  function scheduleGameDraftSave() {
    if (!activeDraftBuildId || activeEditingGameId) return;
    const modal = document.getElementById('game-modal');
    if (!modal?.classList.contains('active')) return;
    if (_draftTimer) clearTimeout(_draftTimer);
    _draftTimer = setTimeout(() => {
      const ok = writeGameDraft(activeDraftBuildId, currentDraftPayload());
      if (ok) updateGameDraftStatus(t('Draft saved just now'), true);
    }, 250);
  }

  function clearValidationSummary() {
    const summary = document.getElementById('g-validation-summary');
    if (!summary) return;
    summary.classList.remove('active');
    summary.innerHTML = '';
  }

  function showValidationSummary(errors) {
    const summary = document.getElementById('g-validation-summary');
    if (!summary || !errors.length) return;
    summary.classList.add('active');
    summary.innerHTML = `
      <div class="game-validation-title">${escapeInlineHtml(t('Fix before saving'))}</div>
      <ul>${errors.map(error => `<li>${escapeInlineHtml(error.message)}</li>`).join('')}</ul>
    `;
  }

  const POSITIONS = ['', 'PG', 'SG', 'SF', 'PF', 'C'];

  function rosterRowHtml(side, player = {}) {
    const cleanSide = safeRosterSide(side);
    const id = `${cleanSide}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const val = key => player[key] ?? '';
    const gradeOpts = ['', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    const gradeVal  = player.grade || '';
    const gradeOptions = gradeOpts.map(g => `<option value="${g}"${g === gradeVal ? ' selected' : ''}>${g || '–'}</option>`).join('');
    const posOptions   = POSITIONS.map(p => `<option value="${p}"${p === (player.position || '') ? ' selected' : ''}>${p || '–'}</option>`).join('');
    const isDC = !!player.disconnected;
    const isAI = !!player.isAI;
    return `
      <div class="roster-row${isDC ? ' roster-row-dc' : ''}" data-side="${cleanSide}" data-row-id="${id}">
        <input class="roster-name${isDC ? ' roster-name-dc' : ''}" data-field="name" type="text" value="${escapeRosterAttr(player.name || '')}" placeholder="Player" list="player-names-list" autocomplete="off">
        <select data-field="position" class="roster-pos-select" title="${t('Position')}">${posOptions}</select>
        <button type="button" class="roster-flag-btn roster-dc-btn${isDC ? ' active' : ''}" data-flag="disconnected" onclick="toggleRosterFlag(this)" title="${t('Mark if this player disconnected during the game')}">${t('DC')}</button>
        <button type="button" class="roster-flag-btn roster-ai-btn${isAI ? ' active' : ''}" data-flag="isAI" onclick="toggleRosterFlag(this)" title="${t('Mark if this is an AI fill-in player')}">${t('AI')}</button>
        <input data-field="pts"  type="number" min="0" value="${val('pts')}"  placeholder="PTS">
        <input data-field="reb"  type="number" min="0" value="${val('reb')}"  placeholder="REB">
        <input data-field="ast"  type="number" min="0" value="${val('ast')}"  placeholder="AST">
        <input data-field="stl"  type="number" min="0" value="${val('stl')}"  placeholder="STL">
        <input data-field="blk"  type="number" min="0" value="${val('blk')}"  placeholder="BLK">
        <input data-field="pf"   type="number" min="0" value="${val('pf')}"   placeholder="FLS">
        <input data-field="to"   type="number" min="0" value="${val('to')}"   placeholder="TO">
        <input data-field="fgm"  type="number" min="0" value="${val('fgm')}"  placeholder="FGM">
        <input data-field="fga"  type="number" min="0" value="${val('fga')}"  placeholder="FGA">
        <input data-field="fg3m" type="number" min="0" value="${val('fg3m')}" placeholder="3PM">
        <input data-field="fg3a" type="number" min="0" value="${val('fg3a')}" placeholder="3PA">
        <input data-field="ftm"  type="number" min="0" value="${val('ftm')}"  placeholder="FTM">
        <input data-field="fta"  type="number" min="0" value="${val('fta')}"  placeholder="FTA">
        <input data-field="pm"   type="number" value="${val('pm')}" placeholder="+/-" readonly tabindex="-1" class="roster-pm-auto">
        <select data-field="grade" class="roster-grade-select" title="Grade">${gradeOptions}</select>
        <div class="roster-row-actions">
          <button type="button" class="roster-move" onclick="moveRosterRow(this)" title="${t('Move to the other side (fix swapped teammate/opponent)')}" aria-label="${t('Move to the other side (fix swapped teammate/opponent)')}">⇄</button>
          <button type="button" class="roster-remove" onclick="removeRosterRow(this)" title="${t('Remove player')}" aria-label="${t('Remove player')}">×</button>
        </div>
      </div>
    `;
  }

  function toggleRosterFlag(btn) {
    const row    = btn.closest('.roster-row');
    const isActive = btn.classList.toggle('active');
    const flag   = btn.dataset.flag;
    if (!row) return;
    if (flag === 'disconnected') {
      row.classList.toggle('roster-row-dc', isActive);
      const nameInput = row.querySelector('.roster-name');
      if (nameInput) nameInput.classList.toggle('roster-name-dc', isActive);
    }
    scheduleGameDraftSave();
  }

  function addRosterRow(side, player = {}) {
    const container = rosterContainer(side);
    if (!container) return;
    container.insertAdjacentHTML('beforeend', rosterRowHtml(side, player));
    syncRosterPlusMinus();
    scheduleGameDraftSave();
  }

  function setRosterDetail(side, detailed) {
    const cleanSide = safeRosterSide(side);
    const table  = document.getElementById(`g-${cleanSide}-table`);
    const toggle = document.getElementById(`g-${cleanSide}-detail-toggle`);
    if (!table) return;
    table.classList.toggle('roster-compact', !detailed);
    if (toggle) {
      toggle.textContent = detailed ? t('Quick mode') : t('Detailed stats');
      toggle.setAttribute('aria-pressed', detailed ? 'true' : 'false');
    }
  }

  function toggleRosterDetail(side) {
    const cleanSide = safeRosterSide(side);
    const table = document.getElementById(`g-${cleanSide}-table`);
    setRosterDetail(cleanSide, table ? table.classList.contains('roster-compact') : true);
  }

  function removeRosterRow(button) {
    const row = button?.closest?.('.roster-row');
    if (row) row.remove();
    scheduleGameDraftSave();
  }

  function clearRosterRows() {
    rosterSides.forEach(side => {
      const container = rosterContainer(side);
      if (container) container.innerHTML = '';
    });
  }

  function populateRosterRows(roster = {}) {
    clearRosterRows();
    rosterSides.forEach(side => {
      const players = Array.isArray(roster[side]) ? roster[side] : [];
      if (players.length) players.forEach(player => addRosterRow(side, player));
      else addRosterRow(side);
    });
  }

  function readRosterRow(row) {
    const player = {};
    player.name = row.querySelector('[data-field="name"]')?.value.trim() || '';
    rosterNumberFields.forEach(key => {
      const raw = row.querySelector(`[data-field="${key}"]`)?.value;
      player[key] = raw === '' ? 0 : (parseInt(raw, 10) || 0);
    });
    player.grade        = row.querySelector('[data-field="grade"]')?.value || '';
    player.position     = row.querySelector('[data-field="position"]')?.value || '';
    player.disconnected = row.querySelector('.roster-dc-btn')?.classList.contains('active') || false;
    player.isAI         = row.querySelector('.roster-ai-btn')?.classList.contains('active') || false;
    return player;
  }

  function collectRosterRows(side) {
    const container = rosterContainer(side);
    if (!container) return [];
    return [...container.querySelectorAll('.roster-row')]
      .map(readRosterRow)
      .filter(player => player.name || rosterNumberFields.some(key => player[key] !== 0));
  }

  // Move a single roster row to the opposite side — the fast fix when OCR
  // tags one player on the wrong team.
  function moveRosterRow(button, deps = {}) {
    const row = button?.closest?.('.roster-row');
    if (!row) return;
    const fromSide = safeRosterSide(row.dataset.side);
    const toSide   = fromSide === 'opponents' ? 'teammates' : 'opponents';
    const player   = readRosterRow(row);
    row.remove();
    addRosterRow(toSide, player); // also re-syncs +/- and schedules a draft save
    // Reveal the destination box score if the moved player carries real stats.
    if (hasDetailedRosterStats([player])) setRosterDetail(toSide, true);
    // Keep at least one input row on the side we just emptied.
    const fromContainer = rosterContainer(fromSide);
    if (fromContainer && !fromContainer.querySelector('.roster-row')) addRosterRow(fromSide);
    // Stay on the current tab so several mis-tagged rows can be fixed in a row;
    // confirm the destination with a toast instead of yanking the user away.
    const toast = deps.toast || window.toast;
    if (typeof toast === 'function') {
      toast(toSide === 'opponents' ? t('Moved to opponents') : t('Moved to teammates'));
    }
  }

  // Swap the entire teammate and opponent rosters — the one-click fix when OCR
  // reverses the two sides wholesale.
  function swapRosterSides(deps = {}) {
    const teammates = collectRosterRows('teammates');
    const opponents = collectRosterRows('opponents');
    populateRosterRows({ teammates: opponents, opponents: teammates });
    setRosterDetail('teammates', hasDetailedRosterStats(opponents));
    setRosterDetail('opponents', hasDetailedRosterStats(teammates));
    syncRosterPlusMinus();
    scheduleGameDraftSave();
    updateGameDraftStatus(t('Swapped teammates and opponents'), !!readGameDraft(activeDraftBuildId));
    const toast = deps.toast || window.toast;
    if (typeof toast === 'function') toast(t('Swapped teammates and opponents'));
  }

  function collectRoster() {
    return {
      teammates: collectRosterRows('teammates'),
      opponents: collectRosterRows('opponents'),
    };
  }

  function hasDetailedRosterStats(players = []) {
    return Array.isArray(players) && players.some(player =>
      rosterNumberFields.some(key => Number(player?.[key]) !== 0)
    );
  }

  function copyRosterPlayerShell(player = {}) {
    return {
      name: player.name || '',
      position: player.position || '',
      disconnected: !!player.disconnected,
      isAI: !!player.isAI,
      grade: '',
    };
  }

  // Fill the in-modal build picker so a game can be logged or moved to any
  // build without leaving the modal. Selection defaults to `selectedId`.
  function populateBuildSelect(state, selectedId) {
    const select = document.getElementById('g-build');
    if (!select) return;
    const builds = Array.isArray(state?.builds) ? state.builds : [];
    select.innerHTML = builds
      .map(build => `<option value="${escapeInlineHtml(build.id)}">${escapeInlineHtml(build.name || 'Unnamed')}</option>`)
      .join('');
    if (selectedId && builds.some(build => build.id === selectedId)) select.value = selectedId;
  }

  function selectedBuildId(state) {
    const value = document.getElementById('g-build')?.value;
    if (value && Array.isArray(state?.builds) && state.builds.some(build => build.id === value)) return value;
    return state?.currentBuildId || null;
  }

  function latestGameForCurrentBuild(state) {
    return (state.games || [])
      .filter(game => game.buildId === state.currentBuildId && game.id !== state.editingGameId)
      .sort(compareGamesByChronology)[0] || null;
  }

  function copyPreviousRoster(side = 'all', deps = {}) {
    const { state, toast } = deps;
    const lastGame = state ? latestGameForCurrentBuild(state) : null;
    const sourceRoster = lastGame?.roster || {};
    const sides = side === 'teammates' || side === 'opponents' ? [side] : rosterSides;
    let copied = 0;

    sides.forEach(rosterSide => {
      const players = Array.isArray(sourceRoster[rosterSide]) ? sourceRoster[rosterSide] : [];
      const shells = players
        .filter(player => String(player?.name || '').trim())
        .map(copyRosterPlayerShell);
      const container = rosterContainer(rosterSide);
      if (!container || !shells.length) return;
      container.innerHTML = '';
      shells.forEach(player => addRosterRow(rosterSide, player));
      setRosterDetail(rosterSide, false);
      copied += shells.length;
    });

    if (!copied) {
      if (typeof toast === 'function') toast(t('No previous roster to copy'), true);
      updateGameDraftStatus(t('No previous roster to copy'), !!readGameDraft(activeDraftBuildId));
      return;
    }

    syncRosterPlusMinus();
    scheduleGameDraftSave();
    updateGameDraftStatus(t('Copied last roster'), true);
    if (typeof toast === 'function') toast(t('Copied last roster'));
    showGameTab(sides.length === 1 ? sides[0] : 'teammates');
  }

  function syncRosterPlusMinus() {
    const own    = numberValue('g-score-own');
    const opp    = numberValue('g-score-opp');
    const teamPm = own - opp;
    const oppPm  = opp - own;
    document.querySelectorAll('#g-teammates-rows [data-field="pm"]').forEach(input => {
      input.value = teamPm;
      input.classList.toggle('pm-pos', teamPm >= 0);
      input.classList.toggle('pm-neg', teamPm < 0);
    });
    document.querySelectorAll('#g-opponents-rows [data-field="pm"]').forEach(input => {
      input.value = oppPm;
      input.classList.toggle('pm-pos', oppPm >= 0);
      input.classList.toggle('pm-neg', oppPm < 0);
    });
  }

  function syncResultFromScore() {
    const ownEl    = document.getElementById('g-score-own');
    const oppEl    = document.getElementById('g-score-opp');
    const own      = numberValue('g-score-own');
    const opp      = numberValue('g-score-opp');
    const result   = document.getElementById('g-result');
    const plusMinus = document.getElementById('g-pm');
    if (plusMinus) {
      plusMinus.value = own - opp;
      plusMinus.classList.toggle('pm-pos', own - opp >= 0);
      plusMinus.classList.toggle('pm-neg', own - opp < 0);
    }
    syncRosterPlusMinus();
    if (!result || !ownEl?.value || !oppEl?.value || own === opp) return;
    result.value = own > opp ? 'W' : 'L';
  }

  // Debounced preview + FG% readout — runs at most once per 120 ms
  function updatePostgamePreview() {
    if (_previewTimer) clearTimeout(_previewTimer);
    _previewTimer = setTimeout(_doUpdatePreview, 120);
  }

  function _doUpdatePreview() {
    const outcome   = document.getElementById('game-outcome-line');
    const efficiency = document.getElementById('game-eff-line');
    const gradeChip  = document.getElementById('game-grade-chip');
    const pctLine    = document.getElementById('game-pct-line');
    if (!outcome || !efficiency || !gradeChip) return;

    const mode   = document.getElementById('g-mode').value || 'Game';
    const venue  = document.getElementById('g-venue')?.value || 'home';
    const venueLabel = venue === 'away' ? t('Away') : t('Home');
    const result = document.getElementById('g-result').value || 'W';
    const own    = numberValue('g-score-own');
    const opp    = numberValue('g-score-opp');
    const pts    = numberValue('g-pts');
    const reb    = numberValue('g-reb');
    const ast    = numberValue('g-ast');
    const fgMade = numberValue('g-fg2m'), fgAtt = numberValue('g-fg2a');
    const fg3m   = numberValue('g-fg3m'), fg3a = numberValue('g-fg3a');
    const ftm    = numberValue('g-ftm'),  fta  = numberValue('g-fta');
    const grade  = document.getElementById('g-grade').value || 'B';
    const score  = own || opp ? `${own}-${opp}` : '';

    outcome.textContent  = score ? `${result} ${score} / ${mode} / ${venueLabel}` : `${result} / ${mode} / ${venueLabel}`;
    efficiency.textContent = `${pts} ${t('PTS')} / ${reb} ${t('REB')} / ${ast} ${t('AST')} / FG ${pct(fgMade, fgAtt)}`;
    gradeChip.textContent = grade;

    // Live shooting breakdown readout
    if (pctLine) {
      const hasShots = fgAtt > 0 || fta > 0;
      if (hasShots) {
        pctLine.textContent =
          `FG ${fgMade}/${fgAtt} (${pct(fgMade,fgAtt)})  ·  3PT ${fg3m}/${fg3a} (${pct(fg3m,fg3a)})  ·  FT ${ftm}/${fta} (${pct(ftm,fta)})`;
        pctLine.style.display = '';
      } else {
        pctLine.textContent = '';
        pctLine.style.display = 'none';
      }
    }
  }

  // ====================== MEDIA HELPERS ======================

  function escapeMediaAttr(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  async function compressImage(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const MAX_W = 640, MAX_H = 360;
        let w = img.naturalWidth, h = img.naturalHeight;
        if (w > MAX_W || h > MAX_H) {
          const scale = Math.min(MAX_W / w, MAX_H / h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
      img.src = url;
    });
  }

  function mediaItemHtml(item) {
    return `
      <div class="media-thumb-card" data-media-id="${escapeMediaAttr(item.id)}">
        <div class="media-thumb-img-wrap">
          <img class="media-thumb-img" src="${item.dataUrl}" alt="${t('Screenshot')}" loading="lazy">
          <button type="button" class="media-thumb-remove" onclick="removeMediaItem('${escapeMediaAttr(item.id)}')" title="${t('Remove')}">×</button>
        </div>
        <input class="media-caption-input" type="text" data-media-caption value="${escapeMediaAttr(item.caption || '')}" placeholder="${t('Add caption...')}">
      </div>
    `;
  }

  async function handleMediaFiles(files) {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      try {
        const dataUrl = await compressImage(file);
        addMediaItem({ id: 'media_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), dataUrl, caption: '' });
      } catch (e) {}
    }
  }

  function addMediaItem(item) {
    const grid = document.getElementById('g-media-grid');
    if (!grid) return;
    grid.insertAdjacentHTML('beforeend', mediaItemHtml(item));
  }

  function populateMedia(mediaArray) {
    const grid = document.getElementById('g-media-grid');
    if (!grid) return;
    grid.innerHTML = '';
    (Array.isArray(mediaArray) ? mediaArray : []).forEach(item => {
      if (item && item.dataUrl) addMediaItem(item);
    });
  }

  function collectMedia() {
    const grid = document.getElementById('g-media-grid');
    if (!grid) return [];
    return [...grid.querySelectorAll('.media-thumb-card')].map(card => {
      const img       = card.querySelector('.media-thumb-img');
      const captionEl = card.querySelector('[data-media-caption]');
      return {
        id:      card.dataset.mediaId || ('media_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5)),
        dataUrl: img ? img.src : '',
        caption: captionEl ? captionEl.value.trim() : '',
      };
    }).filter(item => item.dataUrl);
  }

  function removeMediaItem(id) {
    const card = document.querySelector(`.media-thumb-card[data-media-id="${id}"]`);
    if (card) card.remove();
  }

  function bindMediaHandlers() {
    const mediaFile = document.getElementById('g-media-file');
    const mediaDrop = document.getElementById('g-media-drop');
    if (mediaFile) {
      mediaFile.addEventListener('change', () => {
        handleMediaFiles(mediaFile.files);
        mediaFile.value = '';
      });
    }
    if (mediaDrop) {
      mediaDrop.addEventListener('click', e => {
        if (!e.target.closest('.media-thumb-card') && mediaFile) mediaFile.click();
      });
      mediaDrop.addEventListener('dragover',  e => { e.preventDefault(); mediaDrop.classList.add('drag-over'); });
      mediaDrop.addEventListener('dragleave', () => mediaDrop.classList.remove('drag-over'));
      mediaDrop.addEventListener('drop', e => {
        e.preventDefault();
        mediaDrop.classList.remove('drag-over');
        handleMediaFiles(e.dataTransfer.files);
      });
    }
    const gameModal = document.getElementById('game-modal');
    if (gameModal && !gameModal._mediaPasteBound) {
      gameModal._mediaPasteBound = true;
      gameModal.addEventListener('paste', e => {
        if (!document.querySelector('[data-game-tab-panel="media"].active')) return;
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) compressImage(file).then(dataUrl => {
              addMediaItem({ id: 'media_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5), dataUrl, caption: '' });
            }).catch(() => {});
          }
        }
      });
    }
  }

  function bindGameModalEnhancements() {
    if (gameModalBound) return;
    gameModalBound = true;
    bindMediaHandlers();

    // All fields that should trigger preview + sync
    const scoreIds   = ['g-score-own', 'g-score-opp'];
    const previewIds = [
      'g-mode', 'g-venue', 'g-result', 'g-grade',
      'g-score-own', 'g-score-opp',
      'g-pts', 'g-reb', 'g-ast', 'g-stl', 'g-blk', 'g-to', 'g-pf',
      'g-fg2m', 'g-fg2a', 'g-fg3m', 'g-fg3a', 'g-ftm', 'g-fta',
    ];
    previewIds.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      const handler = () => {
        if (scoreIds.includes(id)) syncResultFromScore();
        updatePostgamePreview();
      };
      el.addEventListener('input',  handler);
      el.addEventListener('change', handler);
    });

    const gameModal = document.getElementById('game-modal');
    if (gameModal && !gameModal._draftAutosaveBound) {
      gameModal._draftAutosaveBound = true;
      const draftHandler = event => {
        if (!event.target?.closest?.('.postgame-layout')) return;
        clearValidationSummary();
        scheduleGameDraftSave();
      };
      gameModal.addEventListener('input', draftHandler);
      gameModal.addEventListener('change', draftHandler);
    }

    document.querySelectorAll('[data-game-tab]').forEach(button => {
      button.addEventListener('click', () => showGameTab(button.dataset.gameTab));
    });
  }

  function refreshGameModalPreview() {
    syncResultFromScore();
    updatePostgamePreview();
  }

  function validateGameForm(toast) {
    const errors = [];
    const addError = (tab, message, expandDetailSide = '') => {
      errors.push({ tab, message, expandDetailSide });
    };

    if (!document.getElementById('g-date').value) {
      addError('main', t('Add a game date before saving'));
    }

    for (const key of nonNegativeFields) {
      if (numberValue('g-' + key) < 0) {
        addError('main', t('Box score and shooting values cannot be negative'));
        break;
      }
    }

    if (numberValue('g-score-own') < 0 || numberValue('g-score-opp') < 0) {
      addError('main', t('Score values cannot be negative'));
    }

    for (const [made, attempts, label] of shotPairs) {
      if (numberValue('g-' + made) > numberValue('g-' + attempts)) {
        addError('main', `${t(label)} ${t('made cannot exceed attempts')}`);
      }
    }
    if (numberValue('g-fg3m') > numberValue('g-fg2m') || numberValue('g-fg3a') > numberValue('g-fg2a')) {
      addError('main', `${t('3PT')} ${t('cannot exceed total FG')}`);
    }

    const roster = collectRoster();
    for (const side of rosterSides) {
      for (const player of roster[side]) {
        if (!player.name) {
          addError(side, t('Roster rows need a player name before saving'));
        }
        if (rosterNumberFields.some(key => key !== 'pm' && player[key] < 0)) {
          addError(side, t('Roster box score values cannot be negative'));
        }
        if (player.fgm > player.fga || player.fg3m > player.fg3a || player.ftm > player.fta) {
          addError(side, t('Roster made shots cannot exceed attempts'), side);
        }
      }
    }

    if (errors.length) {
      const first = errors[0];
      showGameTab(first.tab);
      if (first.expandDetailSide) setRosterDetail(first.expandDetailSide, true);
      showValidationSummary(errors);
      toast(first.message, true);
      return false;
    }

    clearValidationSummary();
    return true;
  }

  function openGameModal(id, deps) {
    const { state } = deps;
    bindGameModalEnhancements();
    state.editingGameId = id || null;
    activeEditingGameId = id || null;
    activeDraftBuildId = state.currentBuildId || null;
    clearValidationSummary();
    updateGameDraftStatus('', !id && !!readGameDraft(activeDraftBuildId));

    // Clear any previous OCR result
    const ocrStatus = document.getElementById('ocr-apply-status');
    if (ocrStatus) {
      ocrStatus.classList.remove('active');
      ocrStatus.innerHTML = '';
    }

    const title  = document.getElementById('game-modal-title');
    const delBtn = document.getElementById('g-delete-btn');

    if (id) {
      const game = state.games.find(x => x.id === id);
      if (!game) return;

      title.textContent = t('Edit game record');
      document.getElementById('g-mode').value   = game.mode;
      document.getElementById('g-date').value   = game.date;
      document.getElementById('g-result').value = game.result;
      document.getElementById('g-venue').value  = game.venue === 'away' ? 'away' : 'home';
      statFields.forEach(key => {
        document.getElementById('g-' + key).value = game[key] ?? 0;
      });
      document.getElementById('g-fg2m').value = (game.fg2m || 0) + (game.fg3m || 0);
      document.getElementById('g-fg2a').value = (game.fg2a || 0) + (game.fg3a || 0);
      document.getElementById('g-grade').value      = game.grade || 'B';
      document.getElementById('g-score-own').value  = game.scoreOwn ?? 0;
      document.getElementById('g-score-opp').value  = game.scoreOpp ?? 0;
      document.getElementById('g-pm').value         = (game.scoreOwn ?? 0) - (game.scoreOpp ?? 0);
      document.getElementById('g-dayseq').value     = game.daySeq || 1;
      document.getElementById('g-myposition').value = game.myPosition || '';
      document.getElementById('g-notes').value      = game.notes || '';
      populateRosterRows(game.roster || {});
      populateMedia(game.media || []);
      delBtn.classList.remove('hidden');
    } else {
      title.textContent = t('Record Game');

      // Infer mode from the most recent game for this build
      const buildGames = state.games.filter(g => g.buildId === state.currentBuildId);
      const lastMode   = buildGames.length > 0
        ? [...buildGames].sort(compareGamesByChronology)[0].mode
        : 'Rec';

      document.getElementById('g-mode').value = lastMode;
      document.getElementById('g-venue').value = 'home';

      const todayStr = new Date().toISOString().slice(0, 10);
      document.getElementById('g-date').value = todayStr;

      // daySeq = max existing seq for this build+date + 1 (robust against deletions)
      const todayGames = state.games.filter(g => g.buildId === state.currentBuildId && g.date === todayStr);
      const maxSeq     = todayGames.reduce((m, g) => Math.max(m, g.daySeq || 1), 0);
      document.getElementById('g-dayseq').value = maxSeq + 1;

      document.getElementById('g-result').value = 'W';
      newGameFields.forEach(key => {
        document.getElementById('g-' + key).value = 0;
      });
      document.getElementById('g-grade').value      = 'B';
      document.getElementById('g-myposition').value = '';
      document.getElementById('g-notes').value      = '';
      populateRosterRows();
      populateMedia([]);
      delBtn.classList.add('hidden');

      const draft = readGameDraft(state.currentBuildId);
      if (draft) applyGameDraft(draft);
    }

    const selectedBuild = id ? (state.games.find(x => x.id === id)?.buildId) : state.currentBuildId;
    populateBuildSelect(state, selectedBuild);

    syncResultFromScore();
    syncRosterPlusMinus();
    updatePostgamePreview();
    showGameTab('main');

    const roster = id ? (state.games.find(x => x.id === id)?.roster || {}) : {};
    setRosterDetail('teammates', hasDetailedRosterStats(roster.teammates));
    setRosterDetail('opponents', hasDetailedRosterStats(roster.opponents));

    document.getElementById('game-modal').classList.add('active');
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  }

  function closeGameModal(state) {
    document.getElementById('game-modal').classList.remove('active');
    if (state) state.editingGameId = null;
    activeEditingGameId = null;
  }

  async function saveGame(deps) {
    const { state, saveToStorage, toast, closeGameModal, renderBuildDetail } = deps;
    if (!state.currentBuildId) return;
    syncResultFromScore();
    if (!validateGameForm(toast)) return;

    const buildId = selectedBuildId(state);
    const data = {
      id:         state.editingGameId || ('g_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
      buildId:    buildId,
      mode:       document.getElementById('g-mode').value,
      venue:      document.getElementById('g-venue')?.value === 'away' ? 'away' : 'home',
      date:       document.getElementById('g-date').value,
      result:     document.getElementById('g-result').value,
      pts:        numberValue('g-pts'),
      reb:        numberValue('g-reb'),
      ast:        numberValue('g-ast'),
      stl:        numberValue('g-stl'),
      blk:        numberValue('g-blk'),
      to:         numberValue('g-to'),
      pf:         numberValue('g-pf'),
      pm:         numberValue('g-score-own') - numberValue('g-score-opp'),
      // The visible FG fields are total FGM/FGA; persisted fg2m/fg2a keep twos only.
      fg2m:       Math.max(0, numberValue('g-fg2m') - numberValue('g-fg3m')),
      fg2a:       Math.max(0, numberValue('g-fg2a') - numberValue('g-fg3a')),
      fg3m:       numberValue('g-fg3m'),
      fg3a:       numberValue('g-fg3a'),
      ftm:        numberValue('g-ftm'),
      fta:        numberValue('g-fta'),
      grade:      document.getElementById('g-grade').value,
      scoreOwn:   numberValue('g-score-own'),
      scoreOpp:   numberValue('g-score-opp'),
      daySeq:     parseInt(document.getElementById('g-dayseq')?.value) || 1,
      myPosition: document.getElementById('g-myposition')?.value || '',
      roster:     collectRoster(),
      notes:      document.getElementById('g-notes').value.trim(),
      media:      collectMedia(),
    };

    // Capture prior games before mutating state, to detect new personal records
    const isNewGame      = !state.games.find(g => g.id === data.id);
    const priorBuildGames = state.games.filter(g =>
      g.buildId === data.buildId && g.id !== data.id
    );

    const ok = await saveToStorage('game:' + data.id, data);
    if (ok) {
      const idx = state.games.findIndex(x => x.id === data.id);
      if (idx >= 0) state.games[idx] = data;
      else state.games.unshift(data);
      state.games.sort(compareGamesByChronology);
      state.lastSavedGameId = data.id;
      if (!state.editingGameId) clearGameDraft(data.buildId);
      window.NBA2K26_GAME_ANALYSIS?.invalidateAggCache?.();

      let saveMsg = t('Game record saved');
      if (isNewGame && window.NBA2K26_GAME_ANALYSIS?.checkNewPRs) {
        const newPRs = window.NBA2K26_GAME_ANALYSIS.checkNewPRs(data, priorBuildGames);
        if (newPRs.length) {
          const prStr = newPRs.slice(0, 3).map(pr => {
            const display = pr.key === 'pm' && pr.val > 0 ? `+${pr.val}` : String(pr.val);
            return `${display} ${pr.label}`;
          }).join(' · ');
          saveMsg += ` · PB: ${prStr}`;
        }
      }

      // Sync player profiles for any new names in this game
      if (window.NBA2K26_PLAYER_PROFILES) {
        const newProfiles = window.NBA2K26_PLAYER_PROFILES.syncFromGame(data, state.players);
        for (const prof of newProfiles) {
          await saveToStorage('player:' + prof.id, prof);
        }
        window.NBA2K26_PLAYER_PROFILES.updateDatalist(state.players);
      }
      toast(saveMsg);
      closeGameModal();
      renderBuildDetail();
    } else {
      toast(t('Save failed'), true);
    }
  }

  async function deleteGame(deps) {
    const { state, customConfirm, deleteFromStorage, toast, closeGameModal, renderBuildDetail, escapeHtml } = deps;
    const id = state.editingGameId;
    if (!id) return;

    const game = state.games.find(g => g.id === id);
    const okConfirm = await customConfirm(
      `${t('Delete this game record?')}<br><br><span style="color:var(--text-dim);font-size:12px;">${escapeHtml(game?.date || '')} - ${escapeHtml(game?.mode || '')} - ${game?.pts || 0} ${t('PTS')}</span>`,
      t('Delete game')
    );
    if (!okConfirm) return;

    const ok = await deleteFromStorage('game:' + id);
    if (ok) {
      state.games = state.games.filter(x => x.id !== id);
      window.NBA2K26_GAME_ANALYSIS?.invalidateAggCache?.();
      toast(t('Deleted'));
      closeGameModal();
      renderBuildDetail();
    }
  }

  window.NBA2K26_GAME_FORM = {
    openGameModal,
    closeGameModal,
    saveGame,
    deleteGame,
    numberValue,
    refreshGameModalPreview,
    addRosterRow,
    removeRosterRow,
    moveRosterRow,
    swapRosterSides,
    toggleRosterFlag,
    copyPreviousRoster,
    clearGameDraft,
    showGameTab,
    setRosterDetail,
    nextGameStep,
    prevGameStep,
    toggleRosterDetail,
    removeMediaItem,
    populateBuildSelect,
    selectedBuildId,
  };
})(window);
