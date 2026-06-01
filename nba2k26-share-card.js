// NBA 2K26 build share card generator.
// Draws a branded 480×720 PNG card via Canvas API and triggers a download.
(function(window) {
  'use strict';

  const W = 480, H = 720;
  const RED = '#D4001A', DARK_RED = '#8B0015', GOLD = '#FFD000';
  const DIM = 'rgba(255,255,255,0.42)';

  const TIER_STYLE = {
    bronze: { bg: '#6B3F1A', text: '#FFCF9C', label: 'BR'  },
    silver: { bg: '#3A4458', text: '#C8D4E8', label: 'SI'  },
    gold:   { bg: '#7A5000', text: '#FFD700', label: 'GO'  },
    hof:    { bg: '#7C2D12', text: '#FB923C', label: 'HOF' },
    legend: { bg: '#3B0764', text: '#C084FC', label: 'LEG' },
  };

  function getBadgeName(id) {
    if (typeof BADGE_CATEGORIES === 'undefined') return id;
    for (const cat of BADGE_CATEGORIES) {
      for (const b of cat.badges) {
        if (b.id === id) return b.name;
      }
    }
    return id;
  }

  function getAttrLabel(key) {
    if (typeof ATTR_LABELS !== 'undefined' && ATTR_LABELS[key]) return ATTR_LABELS[key][0];
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
  }

  function getTopAttrs(attrs, n) {
    if (!attrs || !Object.keys(attrs).length) return [];
    return Object.entries(attrs)
      .map(([k, v]) => ({ key: k, val: Number(v) || 0, label: getAttrLabel(k) }))
      .filter(a => a.val > 0)
      .sort((a, b) => b.val - a.val)
      .slice(0, n);
  }

  function getEquippedBadges(badges) {
    if (!badges || typeof badges !== 'object') return [];
    const TIER_RANK = { bronze: 1, silver: 2, gold: 3, hof: 4, legend: 5 };
    const result = [];
    const isV2 = badges._format === 'v2' ||
      Object.keys(badges).some(k => k !== '_format' && TIER_RANK[badges[k]]);
    if (isV2) {
      Object.entries(badges).forEach(([id, tier]) => {
        if (id === '_format' || !TIER_RANK[tier]) return;
        result.push({ id, tier, name: getBadgeName(id) });
      });
      result.sort((a, b) => (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0));
    } else {
      ['legend', 'hof', 'gold', 'silver', 'bronze'].forEach(tier => {
        (Array.isArray(badges[tier]) ? badges[tier] : [])
          .forEach(id => result.push({ id, tier, name: getBadgeName(id) }));
      });
    }
    return result.slice(0, 14);
  }

  function rrect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  async function drawCard(build, agg, gameCount) {
    await document.fonts.ready;

    const canvas = document.createElement('canvas');
    canvas.width = W * 2;
    canvas.height = H * 2;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);

    // ── BACKGROUND ──────────────────────────────────────────────────────
    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#131313');
    bg.addColorStop(1, '#1b0505');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Corner glow
    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 300);
    glow.addColorStop(0, 'rgba(212,0,26,0.2)');
    glow.addColorStop(1, 'rgba(212,0,26,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // Diagonal accent stripe
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.moveTo(W - 140, 0); ctx.lineTo(W, 0); ctx.lineTo(W, H); ctx.lineTo(W - 190, H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // ── HEADER BAR ──────────────────────────────────────────────────────
    ctx.fillStyle = RED;
    ctx.fillRect(0, 0, W, 46);

    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 16px "Bebas Neue", "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('BIG', 16, 23);
    ctx.fillStyle = GOLD;
    ctx.fillText('REDFLOWERS', 43, 23);

    ctx.fillStyle = 'rgba(255,255,255,0.62)';
    ctx.font = '10px "Inter", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('NBA 2K26 BUILD CARD', W - 16, 23);

    // ── HERO ────────────────────────────────────────────────────────────
    const heroY = 62;

    // Position badge(s)
    [build.position, build.position2].filter(Boolean).forEach((pos, i) => {
      const px = 16 + i * 54;
      ctx.fillStyle = i === 0 ? DARK_RED : 'rgba(139,0,21,0.45)';
      rrect(ctx, px, heroY, 46, 22, 4);
      ctx.fill();
      ctx.fillStyle = i === 0 ? GOLD : 'rgba(255,208,0,0.55)';
      ctx.font = '700 12px "Inter", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pos, px + 23, heroY + 11);
    });

    // OVR circle
    if (build.ovr) {
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.arc(W - 52, heroY + 32, 38, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      ctx.beginPath();
      ctx.arc(W - 52, heroY + 32, 28, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '700 28px "Bebas Neue", "Arial Black", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(build.ovr), W - 52, heroY + 28);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = '9px "Inter", Arial, sans-serif';
      ctx.fillText('OVR', W - 52, heroY + 48);
    }

    // Build name — auto-shrink if too wide
    const nameMaxW = build.ovr ? W - 118 : W - 32;
    const rawName = (build.name || 'Unnamed Build').toUpperCase();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#ffffff';
    let fs = 52;
    ctx.font = `${fs}px "Bebas Neue", "Arial Black", sans-serif`;
    while (ctx.measureText(rawName).width > nameMaxW && fs > 26) {
      fs -= 3;
      ctx.font = `${fs}px "Bebas Neue", "Arial Black", sans-serif`;
    }
    ctx.fillText(rawName, 16, heroY + 80);

    // Archetype / physical specs sub-line
    const specParts = [
      build.archetype || '',
      build.height || '',
      build.weight ? build.weight + ' lbs' : '',
    ].filter(Boolean);
    if (specParts.length) {
      ctx.fillStyle = GOLD;
      ctx.font = '11px "JetBrains Mono", "Courier New", monospace';
      ctx.fillText(specParts.join(' · '), 16, heroY + 98);
    }

    // ── FIRST DIVIDER ───────────────────────────────────────────────────
    const div1Y = heroY + 112;
    ctx.fillStyle = RED;
    ctx.fillRect(16, div1Y, W - 32, 1.5);

    // ── RECORD / STATS ───────────────────────────────────────────────────
    const recY = div1Y + 24;
    const recStr = `${agg.wins}W-${agg.losses}L`;

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 30px "Bebas Neue", "Arial Black", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(recStr, 16, recY);

    const recStrW = ctx.measureText(recStr).width;
    ctx.fillStyle = GOLD;
    ctx.fillText(`  ${agg.winPct}%`, 16 + recStrW, recY);

    ctx.fillStyle = DIM;
    ctx.font = '10px "Inter", Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${gameCount} ${gameCount === 1 ? 'GAME' : 'GAMES'}`, W - 16, recY - 10);

    const plusSign = parseFloat(agg.plusMinus) >= 0 ? '+' : '';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '12px "JetBrains Mono", "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(
      `${agg.ppg} PTS  ${agg.rpg} REB  ${agg.apg} AST  ${plusSign}${agg.plusMinus} +/-`,
      16, recY + 18
    );

    // ── ATTRIBUTES ──────────────────────────────────────────────────────
    const attrTitleY = recY + 44;
    ctx.fillStyle = DIM;
    ctx.font = '700 10px "Inter", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('KEY ATTRIBUTES', 16, attrTitleY);

    const topAttrs = getTopAttrs(build.attrs || {}, 8);
    const LABEL_W = 126;
    const BAR_X = LABEL_W + 20;
    const BAR_W = W - BAR_X - 46;
    const VAL_X = W - 16;
    const ROW_H = 26;

    topAttrs.forEach((attr, i) => {
      const rowMidY = attrTitleY + 14 + i * ROW_H + 8;
      const barTopY = rowMidY - 5;
      const barH = 10;

      // Attr label
      ctx.fillStyle = 'rgba(255,255,255,0.72)';
      ctx.font = '11px "Inter", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(attr.label, 16, rowMidY);

      // Bar background
      ctx.fillStyle = 'rgba(255,255,255,0.07)';
      rrect(ctx, BAR_X, barTopY, BAR_W, barH, 3);
      ctx.fill();

      // Bar fill
      const filledW = Math.max(6, Math.round((attr.val / 99) * BAR_W));
      const barColor = attr.val >= 90 ? GOLD
        : attr.val >= 80 ? '#43d968'
        : attr.val >= 70 ? '#4da6ff'
        : '#888888';
      ctx.fillStyle = barColor;
      rrect(ctx, BAR_X, barTopY, filledW, barH, 3);
      ctx.fill();

      // Value
      ctx.fillStyle = attr.val >= 90 ? GOLD : '#ffffff';
      ctx.font = '700 11px "Inter", Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(attr.val), VAL_X, rowMidY);
    });

    // ── SECOND DIVIDER ──────────────────────────────────────────────────
    const div2Y = attrTitleY + 14 + topAttrs.length * ROW_H + 10;
    ctx.fillStyle = RED;
    ctx.fillRect(16, div2Y, W - 32, 1);

    // ── BADGES ──────────────────────────────────────────────────────────
    const badgeTitleY = div2Y + 14;
    ctx.fillStyle = DIM;
    ctx.font = '700 10px "Inter", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('EQUIPPED BADGES', 16, badgeTitleY);

    const equippedBadges = getEquippedBadges(build.badges || {});
    if (equippedBadges.length) {
      let bx = 16, by = badgeTitleY + 10;
      const pillH = 20;
      ctx.font = '700 9px "Inter", Arial, sans-serif';

      equippedBadges.forEach(badge => {
        const style = TIER_STYLE[badge.tier] || { bg: '#333', text: '#aaa', label: '??' };
        const tierLabelW = badge.tier === 'legend' ? 30 : badge.tier === 'hof' ? 28 : 22;
        const nameW = Math.min(ctx.measureText(badge.name).width + 10, 128);
        const totalW = tierLabelW + nameW + 4;

        if (bx + totalW > W - 16) {
          bx = 16;
          by += pillH + 6;
        }

        // Tier chip
        ctx.fillStyle = style.bg;
        rrect(ctx, bx, by, tierLabelW, pillH, 3);
        ctx.fill();
        ctx.fillStyle = style.text;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(style.label, bx + tierLabelW / 2, by + 10);

        // Name chip
        ctx.fillStyle = 'rgba(255,255,255,0.09)';
        rrect(ctx, bx + tierLabelW + 2, by, nameW, pillH, 3);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.textAlign = 'left';
        let nameText = badge.name;
        const maxNW = nameW - 8;
        while (ctx.measureText(nameText).width > maxNW && nameText.length > 5) {
          nameText = nameText.slice(0, -1);
        }
        if (nameText !== badge.name) nameText += '…';
        ctx.fillText(nameText, bx + tierLabelW + 6, by + 10);

        bx += totalW + 5;
      });
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.font = '11px "Inter", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText('No badges configured', 16, badgeTitleY + 24);
    }

    // ── FOOTER ──────────────────────────────────────────────────────────
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, H - 30, W, 30);

    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = '10px "Inter", Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('2KBIGREDFLOWERS', 16, H - 15);
    ctx.textAlign = 'right';
    ctx.fillText(new Date().toLocaleDateString(), W - 16, H - 15);

    return canvas;
  }

  async function downloadBuildCard(build, agg, gameCount) {
    const canvas = await drawCard(build, agg, gameCount);
    const link = document.createElement('a');
    link.download = `${(build.name || 'build').replace(/\s+/g, '-').toLowerCase()}-card.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  window.NBA2K26_SHARE_CARD = { downloadBuildCard, drawCard };
})(window);
