// NBA 2K26 game detail table helpers.
// Owns aggregate cards, game filters, sorting, and table markup.
(function(window) {
  'use strict';

  // Wilson 95% confidence-interval sub-line for the headline Win% card, so a
  // hot-looking small sample reads honestly (e.g. "±34% · n=4" warns it is noise).
  function winRateCiSub(agg) {
    const ciFn = window.NBA2K26_VISUALIZATIONS && window.NBA2K26_VISUALIZATIONS.winRateCI;
    if (typeof ciFn !== 'function') return '';
    const decisive = (Number(agg.wins) || 0) + (Number(agg.losses) || 0);
    if (decisive < 1) return '';
    const ci = ciFn(Number(agg.wins) || 0, decisive);
    if (ci.small) {
      return `<div class="agg-sub agg-ci" title="${t('Sample too small for a reliable estimate')}">n=${ci.n} · ${t('low confidence')}</div>`;
    }
    const title = `${t('95% confidence interval')}: ${ci.lower.toFixed(0)}–${ci.upper.toFixed(0)}%`;
    return `<div class="agg-sub agg-ci" title="${title}">±${ci.halfWidth.toFixed(0)}% · ${t('95% CI')}</div>`;
  }

  function renderAggregate(agg, n) {
    if (n === 0) {
      return `<div class="empty-state" style="margin-top:0;"><div class="empty-state-icon">0</div><div class="empty-state-text">${t('// no games recorded yet')}</div></div>`;
    }

    return `
      <div class="agg-grid">
        <div class="agg-cell"><div class="agg-label">${t('Games')}</div><div class="agg-value">${n}</div><div class="agg-sub">${agg.wins}W - ${agg.losses}L</div></div>
        <div class="agg-cell"><div class="agg-label">${t('Win %')}</div><div class="agg-value ${parseFloat(agg.winPct) >= 50 ? 'good' : 'bad'}">${agg.winPct}</div>${winRateCiSub(agg)}</div>
        <div class="agg-cell"><div class="agg-label">${t('PPG')}</div><div class="agg-value hot">${agg.ppg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('RPG')}</div><div class="agg-value">${agg.rpg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('APG')}</div><div class="agg-value">${agg.apg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('SPG')}</div><div class="agg-value">${agg.spg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('BPG')}</div><div class="agg-value">${agg.bpg}</div></div>
        <div class="agg-cell"><div class="agg-label">${t('TOPG')}</div><div class="agg-value">${agg.topg}</div></div>
        <div class="agg-cell"><div class="agg-label">FG%</div><div class="agg-value ${parseFloat(agg.fgPct) >= 50 ? 'good' : ''}">${agg.fgPct}</div></div>
        <div class="agg-cell"><div class="agg-label">3P%</div><div class="agg-value ${parseFloat(agg.fg3Pct) >= 40 ? 'good' : ''}">${agg.fg3Pct}</div></div>
        <div class="agg-cell"><div class="agg-label">FT%</div><div class="agg-value ${parseFloat(agg.ftPct) >= 75 ? 'good' : ''}">${agg.ftPct}</div></div>
        <div class="agg-cell"><div class="agg-label">+/-</div><div class="agg-value ${parseFloat(agg.plusMinus) >= 0 ? 'good' : 'bad'}">${parseFloat(agg.plusMinus) >= 0 ? '+' : ''}${agg.plusMinus}</div></div>
      </div>
    `;
  }

  function applyGameFilters(games, state) {
    const f = state.gameFilter;
    let result = [...games];

    if (f.result !== 'All') {
      result = result.filter(g => g.result === f.result);
    }
    if (f.dateFrom) {
      result = result.filter(g => g.date >= f.dateFrom);
    }
    if (f.dateTo) {
      result = result.filter(g => g.date <= f.dateTo);
    }
    if (f.search) {
      const q = f.search.toLowerCase();
      const rosterText = game => {
        const teammates = game.roster && Array.isArray(game.roster.teammates) ? game.roster.teammates : [];
        const opponents = game.roster && Array.isArray(game.roster.opponents) ? game.roster.opponents : [];
        return teammates.concat(opponents).map(player => player.name || '').join(' ').toLowerCase();
      };
      result = result.filter(g =>
        (g.notes || '').toLowerCase().includes(q) ||
        (g.mode || '').toLowerCase().includes(q) ||
        (g.venue || '').toLowerCase().includes(q) ||
        (g.date || '').includes(q) ||
        (g.grade || '').toLowerCase().includes(q) ||
        rosterText(g).includes(q)
      );
    }

    const key = f.sortKey;
    const dir = f.sortDir === 'asc' ? 1 : -1;
    result.sort((a, b) => {
      let va = a[key];
      let vb = b[key];
      if (key === 'date') {
        // Day groups follow the sort direction (desc = newest day on top), but
        // games WITHIN the same day always read in play order (daySeq ascending),
        // so a day lists game 1 → game N top-to-bottom instead of reversed.
        const da = String(a.date || '');
        const db = String(b.date || '');
        if (da !== db) return da < db ? -dir : dir;
        const sa = parseFloat(a.daySeq) || 1;
        const sb = parseFloat(b.daySeq) || 1;
        if (sa !== sb) return sa - sb;
        const ia = String(a.id || '');
        const ib = String(b.id || '');
        return ia < ib ? -1 : ia > ib ? 1 : 0;
      }
      if (key === 'dayseq') {
        return ((parseFloat(a.daySeq) || 1) - (parseFloat(b.daySeq) || 1)) * dir;
      }
      if (key === 'result' || key === 'mode' || key === 'venue' || key === 'grade') {
        va = va || '';
        vb = vb || '';
        return va < vb ? -dir : va > vb ? dir : 0;
      }
      if (key === 'score') {
        va = (a.scoreOwn || 0) - (a.scoreOpp || 0);
        vb = (b.scoreOwn || 0) - (b.scoreOpp || 0);
        return (va - vb) * dir;
      }
      if (key === 'fg') {
        va = (a.fg2m + a.fg3m) / (a.fg2a + a.fg3a) || 0;
        vb = (b.fg2m + b.fg3m) / (b.fg2a + b.fg3a) || 0;
        return (va - vb) * dir;
      }
      if (key === 'tp') {
        va = a.fg3a ? a.fg3m / a.fg3a : 0;
        vb = b.fg3a ? b.fg3m / b.fg3a : 0;
        return (va - vb) * dir;
      }
      if (key === 'ft') {
        va = a.fta ? a.ftm / a.fta : 0;
        vb = b.fta ? b.ftm / b.fta : 0;
        return (va - vb) * dir;
      }
      va = parseFloat(va) || 0;
      vb = parseFloat(vb) || 0;
      return (va - vb) * dir;
    });

    return result;
  }

  function setGameFilter(state, key, val, renderBuildDetail) {
    state.gameFilter[key] = val;
    renderBuildDetail();
  }

  function resetGameFilters(state, renderBuildDetail) {
    state.gameFilter = { result: 'All', dateFrom: '', dateTo: '', search: '', sortKey: 'date', sortDir: 'desc' };
    renderBuildDetail();
  }

  function sortGameTable(state, key, renderBuildDetail) {
    const f = state.gameFilter;
    if (f.sortKey === key) {
      f.sortDir = f.sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      f.sortKey = key;
      f.sortDir = 'desc';
    }
    renderBuildDetail();
  }

  function renderGameFilterBar(state, deps) {
    const { escapeAttr } = deps;
    const f = state.gameFilter;

    // Determine which season preset is currently active (if dateFrom/dateTo match exactly)
    const seasons = (typeof NBA2K26_SEASONS !== 'undefined') ? NBA2K26_SEASONS : [];
    const activeSeason = seasons.find(s => s.from === f.dateFrom && s.to === f.dateTo);
    const activeN = f.dateFrom === '' && f.dateTo === '' ? 'all'
                  : activeSeason ? activeSeason.n : null;

    const lang = (typeof getLang === 'function') ? getLang() : 'zh';

    const seasonBtns = [
      `<button class="season-preset-btn${activeN === 'all' ? ' active' : ''}" data-season-preset="all" onclick="setSeasonPreset('all')">${lang === 'zh' ? '全部' : 'All'}</button>`,
      ...seasons.map(s =>
        `<button class="season-preset-btn${activeN === s.n ? ' active' : ''}" data-season-preset="${s.n}"
           onclick="setSeasonPreset(${s.n})"
           title="${s.from} – ${s.to}">${lang === 'zh' ? s.zh : s.label}</button>`
      ),
    ].join('');

    return `
      <div class="game-filter-bar">
        <div class="game-filter-row">
          <span class="filter-label">${lang === 'zh' ? '赛季' : 'Season'}</span>
          <div class="season-preset-group">${seasonBtns}</div>
        </div>
        <div class="game-filter-row">
          <span class="filter-label">${t('Filter')}</span>
          <select onchange="setGameFilter('result', this.value)">
            <option value="All" ${f.result === 'All' ? 'selected' : ''}>${t('All')}</option>
            <option value="W" ${f.result === 'W' ? 'selected' : ''}>W</option>
            <option value="L" ${f.result === 'L' ? 'selected' : ''}>L</option>
          </select>
          <div class="filter-sep"></div>
          <span class="filter-label">${t('Date')}</span>
          <input type="date" value="${f.dateFrom}" onchange="setGameFilter('dateFrom', this.value);document.querySelectorAll('[data-season-preset]').forEach(b=>b.classList.remove('active'));" placeholder="${t('Start')}">
          <span style="color:var(--text-dim);font-size:10px;">-</span>
          <input type="date" value="${f.dateTo}" onchange="setGameFilter('dateTo', this.value);document.querySelectorAll('[data-season-preset]').forEach(b=>b.classList.remove('active'));" placeholder="${t('End')}">
          <div class="filter-sep"></div>
          <input type="text" value="${escapeAttr(f.search)}" oninput="setGameFilter('search', this.value)" placeholder="${t('Search notes/mode/grade...')}">
          <div class="filter-sep"></div>
          <button class="filter-reset" onclick="resetGameFilters()">${t('RESET')}</button>
        </div>
      </div>
    `;
  }

  function renderGamesTable(games, state, deps) {
    const { escapeHtml } = deps;
    if (games.length === 0) {
      return `<div class="empty-state"><div class="empty-state-text">${t('// no matching game records')}</div></div>`;
    }

    const f = state.gameFilter;
    const sk = f.sortKey;
    const sd = f.sortDir;
    const cls = key => sk === key ? 'sortable ' + sd : 'sortable';
    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th class="${cls('date')}" onclick="sortGameTable('date')">${t('Date')}</th>
              <th class="${cls('dayseq')}" onclick="sortGameTable('dayseq')">${t('#')}</th>
              <th class="${cls('mode')}" onclick="sortGameTable('mode')">${t('Mode')}</th>
              <th class="${cls('venue')}" onclick="sortGameTable('venue')">${t('Venue')}</th>
              <th class="${cls('result')}" onclick="sortGameTable('result')">W/L</th>
              <th class="${cls('score')}" onclick="sortGameTable('score')" title="${t('Final score')}">${t('Score')}</th>
              <th class="${cls('pts')}" onclick="sortGameTable('pts')">PTS</th>
              <th class="${cls('reb')}" onclick="sortGameTable('reb')">REB</th>
              <th class="${cls('ast')}" onclick="sortGameTable('ast')">AST</th>
              <th class="${cls('stl')}" onclick="sortGameTable('stl')">STL</th>
              <th class="${cls('blk')}" onclick="sortGameTable('blk')">BLK</th>
              <th class="${cls('pf')}" onclick="sortGameTable('pf')">FLS</th>
              <th class="${cls('to')}" onclick="sortGameTable('to')">TO</th>
              <th class="${cls('fg')}" onclick="sortGameTable('fg')">FG</th>
              <th class="${cls('tp')}" onclick="sortGameTable('tp')">3P</th>
              <th class="${cls('ft')}" onclick="sortGameTable('ft')">FT</th>
              <th class="${cls('pm')}" onclick="sortGameTable('pm')">+/-</th>
              <th class="${cls('grade')}" onclick="sortGameTable('grade')">${t('Grade')}</th>
              <th>${t('Share')}</th>
            </tr>
          </thead>
          <tbody>
            ${games.map(g => `
              <tr class="clickable-row" onclick="openGameDetail('${g.id}')" title="${t('Click to view')}">
                <td>${g.date || '-'}</td>
                <td style="color:var(--text-dim);font-size:11px;">${g.daySeq || 1}</td>
                <td>${escapeHtml(g.mode)}</td>
                <td>${escapeHtml(t(g.venue === 'away' ? 'Away' : 'Home'))}</td>
                <td class="result-${g.result === 'W' ? 'w' : 'l'}">${g.result}</td>
                <td style="font-family:var(--font-mono);font-size:11px;white-space:nowrap;">${(g.scoreOwn || g.scoreOpp) ? `${g.scoreOwn ?? 0}–${g.scoreOpp ?? 0}` : '–'}</td>
                <td>${g.pts}</td>
                <td>${g.reb}</td>
                <td>${g.ast}</td>
                <td>${g.stl}</td>
                <td>${g.blk}</td>
                <td>${g.pf || 0}</td>
                <td>${g.to}</td>
                <td>${(g.fg2m||0) + (g.fg3m||0)}/${(g.fg2a||0) + (g.fg3a||0)}</td>
                <td>${g.fg3m||0}/${g.fg3a||0}</td>
                <td>${g.ftm}/${g.fta}</td>
                <td class="${g.pm >= 0 ? 'pm-pos' : 'pm-neg'}">${g.pm >= 0 ? '+' : ''}${g.pm}</td>
                <td>${escapeHtml(g.grade || '-')}</td>
                <td><button class="card-action-btn" onclick="event.stopPropagation();shareGame('${g.id}')" title="${t('Share Game')}">${t('Share')}</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  window.NBA2K26_GAME_TABLE = {
    renderAggregate,
    applyGameFilters,
    setGameFilter,
    resetGameFilters,
    sortGameTable,
    renderGameFilterBar,
    renderGamesTable,
  };
})(window);
