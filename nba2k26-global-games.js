// NBA 2K26 global games page — all games across all builds.
(function(window) {
  'use strict';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function jsArg(value) {
    return String(value == null ? '' : value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  const BUILD_COLORS = [
    '#e21a2f','#2563eb','#059669','#7c3aed','#d97706','#0891b2',
    '#be185d','#065f46','#dc2626','#1d4ed8','#047857','#6d28d9',
  ];
  function buildColor(id) {
    let h = 0;
    for (let i = 0; i < (id || '').length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return BUILD_COLORS[Math.abs(h) % BUILD_COLORS.length];
  }

  // Sort state — persists across filter calls within the same page visit
  const DEFAULT_FILTER = { result: 'All', mode: 'All', build: 'All', search: '', sortKey: 'date', sortDir: 'desc' };

  function getFilterState(state) {
    if (!state.allGamesFilter || typeof state.allGamesFilter !== 'object') {
      state.allGamesFilter = { ...DEFAULT_FILTER };
    }
    state.allGamesFilter = { ...DEFAULT_FILTER, ...state.allGamesFilter };
    return state.allGamesFilter;
  }

  let _stateRef = null;
  let _sortKey = 'date';
  let _sortDir = 'desc';

  function sortAllGames(key) {
    if (_sortKey === key) {
      _sortDir = _sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      _sortKey = key;
      _sortDir = key === 'date' ? 'desc' : 'desc';
    }
    if (_stateRef) {
      const filter = getFilterState(_stateRef);
      filter.sortKey = _sortKey;
      filter.sortDir = _sortDir;
    }
    _applySortToTable();
  }
  window.sortAllGames = sortAllGames;

  function _applySortToTable() {
    const tbody = document.getElementById('all-games-tbody');
    if (!tbody) return;

    const rows = [...tbody.querySelectorAll('tr')];
    const dir  = _sortDir === 'asc' ? 1 : -1;
    const key  = _sortKey;

    rows.sort((a, b) => {
      const getNum = el => parseFloat(el.dataset[key] || '0') || 0;
      const getStr = el => el.dataset[key] || '';
      if (key === 'date') {
        const da = getStr(a), db = getStr(b);
        const seq_a = parseFloat(a.dataset.seq || '1'), seq_b = parseFloat(b.dataset.seq || '1');
        if (da !== db) return da < db ? dir : -dir;
        // Within the same day, always list games in play order (daySeq ascending),
        // regardless of the day-group direction.
        return seq_a - seq_b;
      }
      if (key === 'result' || key === 'mode' || key === 'build') {
        const sa = getStr(a), sb = getStr(b);
        return sa < sb ? -dir : sa > sb ? dir : 0;
      }
      return (getNum(a) - getNum(b)) * dir;
    });

    rows.forEach(row => tbody.appendChild(row));

    // Update sort indicators on headers
    document.querySelectorAll('.gp-sortable').forEach(th => {
      th.classList.remove('asc', 'desc');
      if (th.dataset.sortKey === key) th.classList.add(_sortDir);
    });
  }

  function renderAllGamesPage({ state, aggregate, t }) {
    const container = document.getElementById('all-games-container');
    if (!container) return;

    _stateRef = state;
    const filterState = getFilterState(state);
    _sortKey = filterState.sortKey || DEFAULT_FILTER.sortKey;
    _sortDir = filterState.sortDir || DEFAULT_FILTER.sortDir;

    // Newest day first, but games within a day stay in play order (daySeq
    // ascending) — matches the click-sort in sortAllGames so the initial render
    // is consistent. (Shared compareGamesByChronology keeps within-day descending
    // for analytics like recent-form, so it is intentionally not reused here.)
    const allGames = [...(state.games || [])].sort((a, b) => {
      const da = String(a.date || ''), db = String(b.date || '');
      if (da !== db) return da < db ? 1 : -1;
      const sa = parseFloat(a.daySeq) || 1, sb = parseFloat(b.daySeq) || 1;
      if (sa !== sb) return sa - sb;
      return String(a.id || '') < String(b.id || '') ? -1 : 1;
    });

    if (!allGames.length) {
      const defaultBuild = (state.builds || [])[0];
      const actionHtml = defaultBuild
        ? `<button class="context-action primary" type="button" onclick="quickLogGame('${jsArg(defaultBuild.id)}')">${t('Record Game')}</button>`
        : `<button class="context-action primary" type="button" onclick="openBuildModal()">${t('Create Build')}</button>`;
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-title">${t('No games recorded yet')}</div>
          <div class="empty-state-text">${defaultBuild ? t('Start from your first build and log the result, score, and key stats.') : t('Create a build first, then record games from it.')}</div>
          ${actionHtml}
        </div>`;
      return;
    }

    const buildMap = {};
    (state.builds || []).forEach(b => { buildMap[b.id] = b; });

    const modes = [...new Set(allGames.map(g => g.mode || 'Unknown').filter(Boolean))].sort();
    const buildIds = [...new Set(allGames.map(g => g.buildId).filter(Boolean))];

    const agg = aggregate(allGames);
    const pmVal = parseFloat(agg.plusMinus);
    const aggHtml = `
      <div class="agg-grid" style="margin-bottom:20px;">
        <div class="agg-cell"><div class="agg-label">${t('Games')}</div><div class="agg-value">${allGames.length}</div><div class="agg-sub">${agg.wins}W - ${agg.losses}L</div></div>
        <div class="agg-cell"><div class="agg-label">${t('Win %')}</div><div class="agg-value ${parseFloat(agg.winPct) >= 50 ? 'good' : 'bad'}">${agg.winPct}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('PPG')}</div><div class="agg-value hot">${agg.ppg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('RPG')}</div><div class="agg-value">${agg.rpg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('APG')}</div><div class="agg-value">${agg.apg}</div></div>
        <div class="agg-cell"><div class="agg-label">FG%</div><div class="agg-value ${parseFloat(agg.fgPct) >= 50 ? 'good' : ''}">${agg.fgPct}</div></div>
        <div class="agg-cell"><div class="agg-label">3P%</div><div class="agg-value ${parseFloat(agg.fg3Pct) >= 40 ? 'good' : ''}">${agg.fg3Pct}</div></div>
        <div class="agg-cell"><div class="agg-label">+/-</div><div class="agg-value ${pmVal >= 0 ? 'good' : 'bad'}">${pmVal >= 0 ? '+' : ''}${agg.plusMinus}</div></div>
      </div>`;

    const selected = (value, active) => value === active ? ' selected' : '';
    const modeOptions = modes.map(m => `<option value="${esc(m)}"${selected(m, filterState.mode)}>${esc(m)}</option>`).join('');
    const buildOptions = buildIds.map(id => {
      const b = buildMap[id];
      return `<option value="${esc(id)}"${selected(id, filterState.build)}>${esc(b ? b.name : id)}</option>`;
    }).join('');

    const filtersHtml = `
      <div class="gp-filters">
        <select class="gp-filter-select" id="gp-filter-result" onchange="filterAllGames()">
          <option value="All"${selected('All', filterState.result)}>${t('All Results')}</option>
          <option value="W"${selected('W', filterState.result)}>${t('Win')}</option>
          <option value="L"${selected('L', filterState.result)}>${t('Loss')}</option>
        </select>
        <select class="gp-filter-select" id="gp-filter-mode" onchange="filterAllGames()">
          <option value="All"${selected('All', filterState.mode)}>${t('All Modes')}</option>
          ${modeOptions}
        </select>
        <select class="gp-filter-select" id="gp-filter-build" onchange="filterAllGames()">
          <option value="All"${selected('All', filterState.build)}>${t('All Builds')}</option>
          ${buildOptions}
        </select>
        <input class="gp-filter-input" id="gp-filter-search" type="search"
               placeholder="${t('Search...')}" value="${esc(filterState.search || '')}" oninput="filterAllGames()" autocomplete="off">
        <button class="context-action" type="button" onclick="clearAllGamesFilters()">${t('Clear Filters')}</button>
        <span class="gp-count" id="gp-count">${allGames.length} ${t('games')}</span>
      </div>`;

    const rows = allGames.map(game => {
      const build = buildMap[game.buildId];
      const buildName = build ? build.name : (game.buildId || '?');
      const color = buildColor(game.buildId || '');
      const rCls = game.result === 'W' ? 'result-w' : 'result-l';
      const score = (game.scoreOwn != null && game.scoreOpp != null && (game.scoreOwn || game.scoreOpp))
        ? `${game.scoreOwn}–${game.scoreOpp}` : '–';
      const pm = Number(game.pm);
      const pmStr = isNaN(pm) ? '–' : (pm >= 0 ? '+' + pm : String(pm));
      const pmCls = pm > 0 ? 'good' : pm < 0 ? 'bad' : '';
      const fg2m = Number(game.fg2m) || 0;
      const fg2a = Number(game.fg2a) || 0;
      const fg3m = Number(game.fg3m) || 0;
      const fg3a = Number(game.fg3a) || 0;
      const fgm = fg2m + fg3m, fga = fg2a + fg3a;
      const fgPct = fga ? Math.round(fgm / fga * 100) : null;
      const fgPctStr = fgPct !== null ? fgPct + '%' : '–';
      const searchData = [game.date, game.mode, buildName, game.result, game.notes].filter(Boolean).join(' ').toLowerCase();
      const gameIdSafe  = esc(game.id);
      const buildIdSafe = esc(game.buildId || '');
      return `<tr class="gp-row"
                data-result="${esc(game.result)}"
                data-mode="${esc(game.mode || '')}"
                data-build="${buildIdSafe}"
                data-search="${esc(searchData)}"
                data-date="${esc(game.date || '')}"
                data-seq="${game.daySeq || 1}"
                data-pts="${game.pts ?? 0}"
                data-reb="${game.reb ?? 0}"
                data-ast="${game.ast ?? 0}"
                data-stl="${game.stl ?? 0}"
                data-blk="${game.blk ?? 0}"
                data-pm="${isNaN(pm) ? 0 : pm}"
                data-fg="${fgPct !== null ? fgPct : 0}"
                onclick="openGameFromGlobalList('${gameIdSafe}','${buildIdSafe}')"
                style="cursor:pointer;"
                title="${t('Click to edit')}">
        <td class="gp-td-date" data-label="${t('Date')}">${esc(game.date || '–')}</td>
        <td class="gp-td-build" data-label="${t('Build')}" onclick="event.stopPropagation();openBuildDetail('${buildIdSafe}')" title="${t('Open build detail')}">
          <span class="gp-build-pill" style="background:${color}22;border:1px solid ${color}88;color:${color};cursor:pointer;">${esc(buildName)}</span>
        </td>
        <td data-label="${t('Mode')}">${esc(game.mode || '–')}</td>
        <td data-label="W/L" class="${rCls}" style="font-weight:800;text-align:center;">${esc(game.result)}</td>
        <td data-label="PTS" style="text-align:center;">${game.pts ?? 0}</td>
        <td data-label="REB" style="text-align:center;">${game.reb ?? 0}</td>
        <td data-label="AST" style="text-align:center;">${game.ast ?? 0}</td>
        <td data-label="STL" style="text-align:center;">${game.stl ?? 0}</td>
        <td data-label="BLK" style="text-align:center;">${game.blk ?? 0}</td>
        <td data-label="+/-" style="text-align:center;" class="${pmCls}">${pmStr}</td>
        <td data-label="FG%" style="text-align:center;">${fgPctStr}</td>
        <td data-label="${t('Score')}" style="text-align:center;font-family:var(--font-mono);font-size:11px;">${esc(score)}</td>
      </tr>`;
    }).join('');

    const th = (label, key, extraStyle = '') =>
      `<th class="gp-sortable ${key === _sortKey ? _sortDir : ''}" data-sort-key="${key}" onclick="sortAllGames('${key}')" style="cursor:pointer;user-select:none;${extraStyle}">${label}</th>`;

    container.innerHTML = `
      ${aggHtml}
      ${filtersHtml}
      <div class="table-wrap" style="margin-top:12px;">
        <table class="game-table" id="all-games-table">
          <thead>
            <tr>
              ${th(t('Date'),  'date')}
              ${th(t('Build'), 'build')}
              ${th(t('Mode'),  'mode')}
              ${th('W/L',     'result')}
              ${th('PTS', 'pts')}${th('REB', 'reb')}${th('AST', 'ast')}
              ${th('STL', 'stl')}${th('BLK', 'blk')}
              ${th('+/-',  'pm')}
              ${th('FG%',  'fg')}
              <th>${t('Score')}</th>
            </tr>
          </thead>
          <tbody id="all-games-tbody">${rows}</tbody>
        </table>
      </div>`;

    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
    filterAllGames({ preserveState: true });
    _applySortToTable();
  }

  function filterAllGames(options = {}) {
    const resultSel = document.getElementById('gp-filter-result');
    const modeSel   = document.getElementById('gp-filter-mode');
    const buildSel  = document.getElementById('gp-filter-build');
    const searchEl  = document.getElementById('gp-filter-search');
    const tbody     = document.getElementById('all-games-tbody');
    const countEl   = document.getElementById('gp-count');
    if (!tbody) return;

    const result = resultSel ? resultSel.value : 'All';
    const mode   = modeSel   ? modeSel.value   : 'All';
    const build  = buildSel  ? buildSel.value  : 'All';
    const rawSearch = searchEl ? searchEl.value.trim() : '';
    const q      = rawSearch.toLowerCase();

    if (_stateRef && !options.skipState) {
      const filter = getFilterState(_stateRef);
      filter.result = result;
      filter.mode = mode;
      filter.build = build;
      filter.search = rawSearch;
      filter.sortKey = _sortKey;
      filter.sortDir = _sortDir;
    }

    let count = 0;
    tbody.querySelectorAll('tr').forEach(row => {
      const matchResult = result === 'All' || row.dataset.result === result;
      const matchMode   = mode   === 'All' || row.dataset.mode   === mode;
      const matchBuild  = build  === 'All' || row.dataset.build  === build;
      const matchSearch = !q || (row.dataset.search || '').includes(q);
      const show = matchResult && matchMode && matchBuild && matchSearch;
      row.style.display = show ? '' : 'none';
      if (show) count++;
    });

    if (countEl) {
      countEl.textContent = `${count} ${t('games')}`;
    }
  }

  function clearAllGamesFilters() {
    if (_stateRef) _stateRef.allGamesFilter = { ...DEFAULT_FILTER };
    _sortKey = DEFAULT_FILTER.sortKey;
    _sortDir = DEFAULT_FILTER.sortDir;
    const resultSel = document.getElementById('gp-filter-result');
    const modeSel   = document.getElementById('gp-filter-mode');
    const buildSel  = document.getElementById('gp-filter-build');
    const searchEl  = document.getElementById('gp-filter-search');
    if (resultSel) resultSel.value = DEFAULT_FILTER.result;
    if (modeSel) modeSel.value = DEFAULT_FILTER.mode;
    if (buildSel) buildSel.value = DEFAULT_FILTER.build;
    if (searchEl) searchEl.value = DEFAULT_FILTER.search;
    filterAllGames();
    _applySortToTable();
  }

  window.NBA2K26_GLOBAL_GAMES = {
    renderAllGamesPage,
    filterAllGames,
    clearAllGamesFilters,
  };
})(window);
