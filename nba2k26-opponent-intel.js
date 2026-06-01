// NBA 2K26 Opponent Intelligence Board.
// Aggregates opponent roster rows across all game records into a scouting index.
(function(window) {
  'use strict';

  const tr  = v => typeof window.t === 'function' ? window.t(v) : v;
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const fmt = (v, d = 1) => num(v).toFixed(d);
  const norm = name => String(name || '').trim().toLowerCase();

  // ── Data indexing ──────────────────────────────────────────────────────────

  function buildIndex(games) {
    const map = new Map();
    games.forEach(game => {
      const opps = (game.roster?.opponents || []).filter(p => p.name && !p.isAI);
      opps.forEach(opp => {
        const key = norm(opp.name);
        if (!map.has(key)) {
          map.set(key, { name: opp.name.trim(), appearances: [], wins: 0, losses: 0, modes: new Set() });
        }
        const e = map.get(key);
        e.appearances.push({ game, player: opp });
        if (game.result === 'W')      e.wins++;
        else if (game.result === 'L') e.losses++;
        if (game.mode) e.modes.add(game.mode);
      });
    });
    return [...map.values()].sort((a, b) => (b.wins + b.losses) - (a.wins + a.losses));
  }

  function getTag(wins, losses) {
    const total = wins + losses;
    if (total < 2) return null;
    const wr = wins / total;
    if (wr <= 0.35) return { label: tr('NEMESIS'), cls: 'intel-tag-nemesis' };
    if (wr >= 0.70) return { label: tr('PREY'),    cls: 'intel-tag-prey'    };
    if (total >= 5 && wr >= 0.40 && wr <= 0.60) return { label: tr('RIVAL'), cls: 'intel-tag-rival' };
    return null;
  }

  function avgStat(appearances, key) {
    const vals = appearances.map(a => num(a.player[key])).filter(v => v > 0);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }

  // ── Card rendering ─────────────────────────────────────────────────────────

  function renderCard(entry, escapeHtml, players) {
    const { name, wins, losses, modes, appearances } = entry;
    const total = wins + losses;
    const wr    = total ? Math.round((wins / total) * 100) : 0;
    const tag   = getTag(wins, losses);
    const modeStr = [...modes].join(' · ');
    const wrCls = wr >= 60 ? 'intel-wr-hi' : wr <= 40 ? 'intel-wr-lo' : 'intel-wr-mid';

    const statCells = [
      ['pts', 'PTS'], ['reb', 'REB'], ['ast', 'AST'], ['stl', 'STL'], ['blk', 'BLK'],
    ].map(([key, label]) => {
      const v = avgStat(appearances, key);
      return v !== null
        ? `<span class="intel-stat"><em>${label}</em><strong>${fmt(v)}</strong></span>`
        : '';
    }).filter(Boolean).join('');

    // Look up matching player profile
    const PP = window.NBA2K26_PLAYER_PROFILES;
    const profile = (PP && players && players.length) ? PP.findByName(players, name) : null;
    const linked = !!profile;
    const clickAttr = linked ? ` onclick="openPlayerPage('${profile.id}')" role="button" tabindex="0"` : '';

    return `
      <div class="intel-card${linked ? ' intel-card-linked' : ''}"${clickAttr}>
        <div class="intel-card-top">
          <span class="intel-opp-name">${escapeHtml(name)}</span>
          ${tag ? `<span class="intel-tag ${tag.cls}">${tag.label}</span>` : ''}
        </div>
        <div class="intel-record-row">
          <span class="intel-record">${wins}W · ${losses}L</span>
          <span class="intel-wr-pct ${wrCls}">${wr}%</span>
        </div>
        <div class="intel-wr-bar-wrap">
          <div class="intel-wr-bar-fill ${wrCls}" style="width:${wr}%"></div>
        </div>
        ${modeStr   ? `<div class="intel-modes">${escapeHtml(modeStr)}</div>` : ''}
        ${statCells ? `<div class="intel-stats">${statCells}</div>` : ''}
        <div class="intel-foot">
          ${total} ${tr(total === 1 ? 'game' : 'games')} ${tr('against')}
          ${linked ? `<span class="intel-profile-link">→ ${tr('Profile')}</span>` : ''}
        </div>
      </div>
    `;
  }

  // ── Page render ────────────────────────────────────────────────────────────

  function renderOpponentIntel({ state, t, escapeHtml }) {
    const container = document.getElementById('intel-container');
    if (!container) return;

    const games   = state.games   || [];
    const players = state.players || [];
    const index = buildIndex(games);

    if (!index.length) {
      container.innerHTML = `
        <div class="intel-empty">
          <div class="intel-empty-title">// ${t('No opponent data yet')}</div>
          <div class="intel-empty-sub">${t('Add opponents to your game records to unlock the Intel Board.')}</div>
        </div>
      `;
      return;
    }

    const nemeses = index.filter(e => getTag(e.wins, e.losses)?.cls === 'intel-tag-nemesis');
    const rivals  = index.filter(e => getTag(e.wins, e.losses)?.cls === 'intel-tag-rival');
    const prey    = index.filter(e => getTag(e.wins, e.losses)?.cls === 'intel-tag-prey');

    container.innerHTML = `
      <div class="intel-summary">
        <div class="intel-summary-stat">
          <strong>${index.length}</strong><em>${t('Opponents')}</em>
        </div>
        <div class="intel-summary-stat intel-s-nemesis">
          <strong>${nemeses.length}</strong><em>${t('Nemeses')}</em>
        </div>
        <div class="intel-summary-stat intel-s-rival">
          <strong>${rivals.length}</strong><em>${t('Rivals')}</em>
        </div>
        <div class="intel-summary-stat intel-s-prey">
          <strong>${prey.length}</strong><em>${t('Easy Prey')}</em>
        </div>
      </div>
      <div class="intel-legend">
        <span class="intel-tag intel-tag-nemesis">${t('NEMESIS')}</span><span class="intel-legend-note">${t('WR ≤35%')}</span>
        <span class="intel-tag intel-tag-rival">${t('RIVAL')}</span><span class="intel-legend-note">${t('40–60% · 5+ games')}</span>
        <span class="intel-tag intel-tag-prey">${t('PREY')}</span><span class="intel-legend-note">${t('WR ≥70%')}</span>
      </div>
      <div class="intel-grid">
        ${index.map(e => renderCard(e, escapeHtml, players)).join('')}
      </div>
    `;
  }

  window.NBA2K26_OPPONENT_INTEL = { renderOpponentIntel };
})(window);
