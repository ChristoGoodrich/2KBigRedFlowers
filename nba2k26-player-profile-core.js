// NBA 2K26 player profile core helpers.
// Pure helpers split out so player rendering can keep shrinking without changing globals.
(function(window) {
  'use strict';

  const GRADE_ORDER = ['F', 'D-', 'D', 'D+', 'C-', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
  const GRADE_VAL = Object.fromEntries(GRADE_ORDER.map((g, i) => [g, i]));
  const GRADE_COLOR = {
    'F':'#e21a2f','D-':'#e21a2f','D':'#e21a2f','D+':'#ff6b35',
    'C-':'#f6c638','C':'#f6c638','C+':'#f6c638',
    'B-':'#43d968','B':'#43d968','B+':'#43d968',
    'A-':'#4da6ff','A':'#4da6ff','A+':'#c084fc',
  };

  const AVATAR_PALETTE = [
    'linear-gradient(135deg,#e21a2f 0%,#ff5a36 100%)',
    'linear-gradient(135deg,#2563eb 0%,#4da6ff 100%)',
    'linear-gradient(135deg,#059669 0%,#43d968 100%)',
    'linear-gradient(135deg,#7c3aed 0%,#c084fc 100%)',
    'linear-gradient(135deg,#d97706 0%,#f6c638 100%)',
    'linear-gradient(135deg,#0891b2 0%,#22d3ee 100%)',
    'linear-gradient(135deg,#be185d 0%,#f472b6 100%)',
    'linear-gradient(135deg,#065f46 0%,#34d399 100%)',
  ];

  function genId() {
    return 'p_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
  }

  function norm(value) {
    return String(value || '').trim().toLowerCase();
  }

  function esc(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function f1(value) {
    const n = Number(value);
    return isNaN(n) ? '--' : n.toFixed(1);
  }

  function getLang() {
    try {
      return localStorage.getItem('nba2k_lang') || 'zh';
    } catch (e) {
      return 'zh';
    }
  }

  function avatarColor(name) {
    let h = 0;
    const text = String(name || '');
    for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) | 0;
    return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
  }

  function findByName(players, name) {
    const lo = norm(name);
    if (!lo) return null;
    return players.find(p => p.aliases.some(a => norm(a) === lo)) || null;
  }

  function createProfile(name) {
    const primaryName = String(name).trim();
    return {
      id: genId(),
      primaryName,
      aliases: [primaryName],
      notes: '',
      createdAt: new Date().toISOString().slice(0, 10),
    };
  }

  window.NBA2K26_PLAYER_PROFILE_CORE = {
    GRADE_ORDER,
    GRADE_VAL,
    GRADE_COLOR,
    AVATAR_PALETTE,
    genId,
    norm,
    esc,
    f1,
    getLang,
    avatarColor,
    findByName,
    createProfile,
  };
})(window);
