// NBA 2K26 single-game detail viewer.
// Read-only, richly formatted box-score interface for one recorded game.
// Opened from the build-detail game table and the global Games list; the
// "Edit" action hands off to the existing game-form modal.
(function(window) {
  'use strict';

  let currentId = null;

  function esc(value) {
    return (typeof escapeHtml === 'function') ? escapeHtml(value) : String(value == null ? '' : value);
  }
  function tr(str) { return (typeof t === 'function') ? t(str) : str; }
  function num(value) { const n = Number(value); return Number.isFinite(n) ? n : 0; }
  function pct(made, att) { return att > 0 ? (100 * made / att).toFixed(1) : null; }

  const GRADE_CLASS = g => {
    const c = String(g || '').charAt(0).toUpperCase();
    if (c === 'A') return 'grade-a';
    if (c === 'B') return 'grade-b';
    if (c === 'C') return 'grade-c';
    if (c === 'D' || c === 'F') return 'grade-d';
    return 'grade-b';
  };

  // ── small render helpers ──────────────────────────────────────────────
  function statCell(label, value, opts) {
    const o = opts || {};
    const tone = o.tone ? ` gd-stat-${o.tone}` : '';
    const big = o.big ? ' gd-stat-big' : '';
    const sub = o.sub ? `<div class="gd-stat-sub">${o.sub}</div>` : '';
    return `<div class="gd-stat${big}${tone}"><div class="gd-stat-val">${value}</div><div class="gd-stat-label">${label}</div>${sub}</div>`;
  }

  function shootingRow(label, made, att) {
    const p = pct(made, att);
    const w = att > 0 ? Math.max(2, Math.round(100 * made / att)) : 0;
    const pctText = p === null ? '—' : `${p}%`;
    const tone = p === null ? '' : parseFloat(p) >= 50 ? ' gd-shot-good' : parseFloat(p) < 33 ? ' gd-shot-cold' : '';
    return `
      <div class="gd-shot-row${tone}">
        <div class="gd-shot-label">${label}</div>
        <div class="gd-shot-line">${made}<span class="gd-shot-sep">/</span>${att}</div>
        <div class="gd-shot-bar"><span style="width:${w}%"></span></div>
        <div class="gd-shot-pct">${pctText}</div>
      </div>`;
  }

  function playerHasStats(p) {
    return ['pts','reb','ast','stl','blk','to','pf','fgm','fga','fg3m','fg3a','ftm','fta']
      .some(k => num(p[k]) > 0);
  }

  function rosterSection(title, players) {
    const list = Array.isArray(players) ? players.filter(p => String(p.name || '').trim()) : [];
    if (!list.length) {
      return `
        <div class="gd-roster-block">
          <div class="gd-section-title">${title} <span class="gd-count">0</span></div>
          <div class="gd-empty">${tr('// no players recorded')}</div>
        </div>`;
    }
    const rows = list.map(p => {
      const flags = [];
      if (p.disconnected) flags.push(`<span class="gd-flag gd-flag-dc">${tr('DC')}</span>`);
      if (p.isAI) flags.push(`<span class="gd-flag gd-flag-ai">${tr('AI')}</span>`);
      const posTag = p.position ? `<span class="gd-pos-tag">${esc(p.position)}</span>` : '';
      let statLine = '';
      if (playerHasStats(p)) {
        const bits = [
          `${num(p.pts)} ${tr('PTS')}`,
          `${num(p.reb)} ${tr('REB')}`,
          `${num(p.ast)} ${tr('AST')}`,
        ];
        if (num(p.stl)) bits.push(`${num(p.stl)} STL`);
        if (num(p.blk)) bits.push(`${num(p.blk)} BLK`);
        if (num(p.to)) bits.push(`${num(p.to)} TO`);
        statLine = `<div class="gd-player-stats">${bits.join(' · ')}</div>`;
      }
      const grade = p.grade ? `<span class="gd-player-grade ${GRADE_CLASS(p.grade)}">${esc(p.grade)}</span>` : '';
      return `
        <div class="gd-player${p.disconnected ? ' gd-player-dc' : ''}">
          <div class="gd-player-head">
            ${posTag}
            <span class="gd-player-name">${esc(p.name)}</span>
            ${flags.join('')}
            ${grade}
          </div>
          ${statLine}
        </div>`;
    }).join('');
    return `
      <div class="gd-roster-block">
        <div class="gd-section-title">${title} <span class="gd-count">${list.length}</span></div>
        <div class="gd-roster-list">${rows}</div>
      </div>`;
  }

  function renderBody(game, build) {
    const fg3m = num(game.fg3m), fg3a = num(game.fg3a);
    const fgm = num(game.fg2m) + fg3m;
    const fga = num(game.fg2a) + fg3a;
    const ftm = num(game.ftm), fta = num(game.fta);
    const pts = num(game.pts);

    const scoreOwn = num(game.scoreOwn);
    const scoreOpp = num(game.scoreOpp);
    const margin = scoreOwn - scoreOpp;
    const hasScore = scoreOwn > 0 || scoreOpp > 0;
    const win = game.result === 'W';

    // Derived efficiency
    const efgPct = fga > 0 ? ((fgm + 0.5 * fg3m) / fga * 100).toFixed(1) : null;
    const tsDenom = 2 * (fga + 0.44 * fta);
    const tsPct = tsDenom > 0 ? (pts / tsDenom * 100).toFixed(1) : null;

    const venueLabel = tr(game.venue === 'away' ? 'Away' : 'Home');
    const buildName = build && build.name ? esc(build.name) : tr('Unknown build');
    const posTag = game.myPosition ? `<span class="gd-hero-pos">${esc(game.myPosition)}</span>` : '';
    const dayChip = num(game.daySeq) > 1 ? `<span class="gd-meta-chip">${tr('Game')} #${num(game.daySeq)}</span>` : '';

    const metaLine = [
      esc(game.date || '—'),
      esc(game.mode || ''),
      venueLabel,
    ].filter(Boolean).join('  ·  ');

    // ── HERO (horizontal banner) ──
    const hero = `
      <div class="gd-hero ${win ? 'gd-hero-w' : 'gd-hero-l'}">
        <div class="gd-hero-left">
          <span class="gd-hero-result">${win ? tr('WIN') : tr('LOSS')}</span>
          ${hasScore ? `<span class="gd-hero-score">${scoreOwn}<span>–</span>${scoreOpp}</span>` : ''}
          ${hasScore ? `<span class="gd-hero-margin ${margin >= 0 ? 'pos' : 'neg'}">${margin >= 0 ? '+' : ''}${margin} ${tr('Margin')}</span>` : ''}
        </div>
        <div class="gd-hero-right">
          <div class="gd-hero-build">${posTag}<span>${buildName}</span></div>
          <div class="gd-hero-meta">${metaLine}</div>
        </div>
        <div class="gd-hero-chips">${dayChip}<span class="gd-grade-chip ${GRADE_CLASS(game.grade)}">${esc(game.grade || 'B')}</span></div>
      </div>`;

    // ── PRODUCTION (headline + secondary line) ──
    const production = `
      <section class="gd-panel gd-col-prod">
        <div class="gd-headline">
          ${statCell(tr('PTS'), pts, { big: true, tone: 'hot' })}
          ${statCell(tr('REB'), num(game.reb), { big: true })}
          ${statCell(tr('AST'), num(game.ast), { big: true })}
        </div>
        <div class="gd-statline">
          ${statCell('STL', num(game.stl))}
          ${statCell('BLK', num(game.blk))}
          ${statCell('TO', num(game.to), { tone: num(game.to) >= 5 ? 'warn' : '' })}
          ${statCell('FLS', num(game.pf))}
          ${statCell('+/-', `${margin >= 0 ? '+' : ''}${margin}`, { tone: margin >= 0 ? 'good' : 'bad' })}
        </div>
      </section>`;

    // ── SHOOTING ──
    const effChips = [];
    if (efgPct !== null) effChips.push(`<span class="gd-eff-chip">eFG% <b>${efgPct}</b></span>`);
    if (tsPct !== null) effChips.push(`<span class="gd-eff-chip">${tr('True Shooting')} <b>${tsPct}%</b></span>`);
    const shooting = `
      <section class="gd-panel gd-col-shoot">
        <div class="gd-section-title">${tr('Shooting')}</div>
        <div class="gd-shot-table">
          ${shootingRow('FG', fgm, fga)}
          ${shootingRow('3PT', fg3m, fg3a)}
          ${shootingRow('FT', ftm, fta)}
        </div>
        ${effChips.length ? `<div class="gd-eff-row">${effChips.join('')}</div>` : ''}
      </section>`;

    // ── MINI BOX SCORE ──
    const boxScore = `
      <section class="gd-panel gd-col-box">
        <div class="gd-section-title">${tr('Box Score')}</div>
        <div class="gd-mini-box">
          <div><span>FG</span><b>${fgm}/${fga}</b></div>
          <div><span>3PT</span><b>${fg3m}/${fg3a}</b></div>
          <div><span>FT</span><b>${ftm}/${fta}</b></div>
          <div><span>PTS</span><b>${pts}</b></div>
          <div><span>REB</span><b>${num(game.reb)}</b></div>
          <div><span>AST</span><b>${num(game.ast)}</b></div>
          <div><span>STL</span><b>${num(game.stl)}</b></div>
          <div><span>BLK</span><b>${num(game.blk)}</b></div>
          <div><span>TO</span><b>${num(game.to)}</b></div>
          <div><span>FLS</span><b>${num(game.pf)}</b></div>
        </div>
      </section>`;

    // ── ROSTERS ──
    const roster = game.roster || {};
    const teammates = `<section class="gd-panel gd-col-team">${rosterSection(tr('Teammates'), roster.teammates)}</section>`;
    const opponents = `<section class="gd-panel gd-col-opp">${rosterSection(tr('Opponents'), roster.opponents)}</section>`;

    // ── NOTES ──
    const notes = (game.notes || '').trim()
      ? `<section class="gd-panel gd-col-full"><div class="gd-section-title">${tr('Game Notes')}</div><div class="gd-notes">${esc(game.notes)}</div></section>`
      : '';

    // ── MEDIA ──
    const media = Array.isArray(game.media) ? game.media.filter(m => m && m.dataUrl) : [];
    const mediaBlock = media.length
      ? `<section class="gd-panel gd-col-full">
           <div class="gd-section-title">${tr('Screenshots & Highlights')}</div>
           <div class="gd-media-grid">
             ${media.map(m => `
               <a class="gd-media-item" href="${m.dataUrl}" target="_blank" rel="noopener" title="${esc(m.caption || tr('Screenshot'))}">
                 <img src="${m.dataUrl}" alt="${esc(m.caption || tr('Screenshot'))}" loading="lazy">
                 ${m.caption ? `<span class="gd-media-cap">${esc(m.caption)}</span>` : ''}
               </a>`).join('')}
           </div>
         </section>`
      : '';

    return `
      ${hero}
      <div class="gd-grid">
        ${production}
        ${shooting}
        ${boxScore}
        ${teammates}
        ${opponents}
        ${notes}
        ${mediaBlock}
      </div>`;
  }

  function openGameDetail(id, deps) {
    const state = deps && deps.state;
    if (!state) return;
    const game = state.games.find(g => g.id === id);
    if (!game) {
      if (typeof toast === 'function') toast(tr('Game not found'), true);
      return;
    }
    currentId = id;
    const build = state.builds.find(b => b.id === game.buildId) || null;
    const body = document.getElementById('game-detail-body');
    if (body) body.innerHTML = renderBody(game, build);
    const modal = document.getElementById('game-detail-modal');
    if (modal) modal.classList.add('active');
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  }

  function closeGameDetail() {
    const modal = document.getElementById('game-detail-modal');
    if (modal) modal.classList.remove('active');
    currentId = null;
  }

  function currentGameId() { return currentId; }

  window.NBA2K26_GAME_DETAIL = {
    openGameDetail,
    closeGameDetail,
    currentGameId,
    renderBody,
  };
})(window);
