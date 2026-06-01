// NBA 2K26 storage helpers and record validation.
// Kept global for compatibility with the existing classic-script app.
// ====================== STORAGE (localStorage fallback) ======================
// miclaw env provides window.storage; local browser falls back to localStorage
if (!window.storage) {
  window.storage = {
    async list(prefix) {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      return { keys };
    },
    async get(key) {
      const v = localStorage.getItem(key);
      return v != null ? { value: v } : null;
    },
    async set(key, value) {
      localStorage.setItem(key, value);
      return true;
    },
    async delete(key) {
      localStorage.removeItem(key);
      return true;
    }
  };
}

// ====================== STORAGE ======================
const GAME_NUMERIC_FIELDS = ['pts','reb','ast','stl','blk','to','pf','pm','fg2m','fg2a','fg3m','fg3a','ftm','fta','scoreOwn','scoreOpp'];
const ROSTER_NUMERIC_FIELDS = ['pts','reb','ast','stl','blk','to','pf','fgm','fga','fg3m','fg3a','ftm','fta','pm'];
const ATTR_NUMERIC_FIELDS = ['closeShot','drivingLayup','drivingDunk','standingDunk','postControl','midRange','threePoint','freeThrow','passAccuracy','ballHandle','speedWithBall','interiorDefense','perimeterDefense','steal','block','offensiveRebound','defensiveRebound','speed','agility','strength','vertical'];

function clampNumber(value, min, max, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function parseStorageRecord(key, value, issues) {
  try { return JSON.parse(value); }
  catch (e) { issues.push({ key, type: 'json', message: e.message }); return null; }
}

function validateBuildRecord(record, key, issues) {
  if (!record || typeof record !== 'object') { issues.push({ key, type: 'build', message: 'record is not an object' }); return null; }
  if (!record.id || !record.name) { issues.push({ key, type: 'build', message: 'missing id or name' }); return null; }
  const clean = { ...record };
  clean.createdAt = Number(clean.createdAt) || Date.now();
  if (clean.ovr != null && clean.ovr !== '') clean.ovr = clampNumber(clean.ovr, 40, 99, '');
  if (clean.attrs && typeof clean.attrs === 'object') {
    clean.attrs = { ...clean.attrs };
    ATTR_NUMERIC_FIELDS.forEach(k => {
      if (clean.attrs[k] != null && clean.attrs[k] !== '') clean.attrs[k] = clampNumber(clean.attrs[k], 25, 99, 25);
    });
  }
  return clean;
}

function validateGameRecord(record, key, issues) {
  if (!record || typeof record !== 'object') { issues.push({ key, type: 'game', message: 'record is not an object' }); return null; }
  if (!record.id || !record.buildId) { issues.push({ key, type: 'game', message: 'missing id or buildId' }); return null; }
  const clean = { ...record };
  clean.mode = clean.mode || 'Rec';
  clean.result = clean.result === 'L' ? 'L' : 'W';
  GAME_NUMERIC_FIELDS.forEach(k => {
    if (clean[k] != null && clean[k] !== '') clean[k] = clampNumber(clean[k], k === 'pm' ? -200 : 0, 300, 0);
  });
  clean.roster = clean.roster && typeof clean.roster === 'object' ? { ...clean.roster } : {};
  if (Array.isArray(clean.media)) {
    clean.media = clean.media
      .filter(item => item && typeof item === 'object' && typeof item.dataUrl === 'string' && item.dataUrl.startsWith('data:image/'))
      .map(item => ({
        id: String(item.id || ''),
        dataUrl: item.dataUrl,
        caption: String(item.caption || '').slice(0, 200),
      }));
  } else {
    delete clean.media;
  }
  ['teammates', 'opponents'].forEach(side => {
    const rows = Array.isArray(clean.roster[side]) ? clean.roster[side] : [];
    clean.roster[side] = rows
      .filter(player => player && typeof player === 'object')
      .map(player => {
        const row = { name: String(player.name || '').trim() };
        ROSTER_NUMERIC_FIELDS.forEach(field => {
          row[field] = clampNumber(player[field], field === 'pm' ? -200 : 0, 300, 0);
        });
        // Preserve metadata fields added in later versions
        if (player.grade)      row.grade        = String(player.grade).trim();
        if (player.position)   row.position      = String(player.position).trim();
        if (player.disconnected) row.disconnected = true;
        if (player.isAI)       row.isAI          = true;
        return row;
      })
      .filter(player => player.name);
  });
  return clean;
}

function validatePlayerRecord(record, key, issues) {
  if (!record || typeof record !== 'object') { issues.push({ key, type: 'player', message: 'not an object' }); return null; }
  if (!record.id) { issues.push({ key, type: 'player', message: 'missing id' }); return null; }
  const clean = { ...record };
  clean.aliases = Array.isArray(clean.aliases) ? clean.aliases.map(String).filter(a => String(a).trim()) : [];
  clean.primaryName = String(clean.primaryName || clean.aliases[0] || '').trim();
  if (!clean.primaryName) { issues.push({ key, type: 'player', message: 'missing primaryName' }); return null; }
  if (!clean.aliases.some(a => String(a).trim().toLowerCase() === clean.primaryName.toLowerCase())) {
    clean.aliases.unshift(clean.primaryName);
  }
  clean.notes = String(clean.notes || '');
  clean.createdAt = String(clean.createdAt || new Date().toISOString().slice(0, 10));
  return clean;
}

async function loadData() {
  const issues = [];
  try {
    const [b, g, p] = await Promise.all([
      window.storage.list('build:').catch(()=>({keys:[]})),
      window.storage.list('game:').catch(()=>({keys:[]})),
      window.storage.list('player:').catch(()=>({keys:[]})),
    ]);
    const bKeys = b?.keys || [];
    const gKeys = g?.keys || [];
    const pKeys = p?.keys || [];
    state.builds = [];
    state.games = [];
    state.players = [];
    for (const k of bKeys) {
      try {
        const r = await window.storage.get(k);
        if (r?.value) {
          const parsed = parseStorageRecord(k, r.value, issues);
          const clean = validateBuildRecord(parsed, k, issues);
          if (clean) state.builds.push(clean);
        }
      } catch(e) {
        issues.push({ key: k, type: 'build-read', message: e.message || String(e) });
      }
    }
    for (const k of gKeys) {
      try {
        const r = await window.storage.get(k);
        if (r?.value) {
          const parsed = parseStorageRecord(k, r.value, issues);
          const clean = validateGameRecord(parsed, k, issues);
          if (clean) state.games.push(clean);
        }
      } catch(e) {
        issues.push({ key: k, type: 'game-read', message: e.message || String(e) });
      }
    }
    for (const k of pKeys) {
      try {
        const r = await window.storage.get(k);
        if (r?.value) {
          const parsed = parseStorageRecord(k, r.value, issues);
          const clean = validatePlayerRecord(parsed, k, issues);
          if (clean) state.players.push(clean);
        }
      } catch(e) {
        issues.push({ key: k, type: 'player-read', message: e.message || String(e) });
      }
    }
    state.builds.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
    state.games.sort(window.NBA2K26_GAME_ANALYSIS.compareGamesByChronology);

    // Retroactively create player profiles for any names already in games
    if (window.NBA2K26_PLAYER_PROFILES) {
      const PP = window.NBA2K26_PLAYER_PROFILES;
      const newProfiles = [];
      state.games.forEach(game => {
        const created = PP.syncFromGame(game, state.players);
        newProfiles.push(...created);
      });
      for (const prof of newProfiles) {
        await saveToStorage('player:' + prof.id, prof);
      }
      PP.updateDatalist(state.players);
    }

    if (issues.length > 0) {
      console.warn('Data validation issues:', issues);
      toast(`${t('Data loaded with validation warnings')}: ${issues.length}`, true);
    }

    const cloud = window.NBA2K26_CLOUD_SYNC;
    if (cloud && cloud.pullCloud && !state._cloudPullAttempted) {
      state._cloudPullAttempted = true;
      // Opportunistic background pull: only when cloud is configured AND signed
      // in. Users who never set up cloud sync get no error/toast on load.
      Promise.resolve(cloud.canAutoSync ? cloud.canAutoSync() : true)
        .then(ready => { if (ready) return cloud.pullCloud({ reload: true }); })
        .catch(error => { console.warn('Cloud pull skipped:', error); });
    }
  } catch (e) {
    console.error('Load error:', e);
    toast(t('Data load failed'), true);
  }
}

// ====================== STORAGE QUOTA ======================
const STORAGE_LIMIT_BYTES = 5 * 1024 * 1024; // 5 MB — browser typical
let _quotaWarnedThisSession = false;

function getLocalStorageBytes() {
  let bytes = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      bytes += (k.length + (localStorage.getItem(k) || '').length) * 2; // UTF-16
    }
  } catch (e) {}
  return bytes;
}

function checkStorageQuota() {
  if (_quotaWarnedThisSession) return;
  try {
    const used = getLocalStorageBytes();
    const pct = used / STORAGE_LIMIT_BYTES;
    if (pct >= 0.8) {
      _quotaWarnedThisSession = true;
      const usedKB = Math.round(used / 1024);
      toast(`${t('Storage')} ${Math.round(pct * 100)}% ${t('full')} (${usedKB} KB) — ${t('Export a backup to free space')}`, true);
    }
  } catch (e) {}
}

async function saveToStorage(key, value) {
  try {
    const r = await window.storage.set(key, JSON.stringify(value));
    if (r) checkStorageQuota();
    if (r && window.NBA2K26_CLOUD_SYNC && window.NBA2K26_CLOUD_SYNC.syncSet) {
      window.NBA2K26_CLOUD_SYNC.syncSet(key, value).catch(error => {
        console.warn('Cloud save skipped:', error);
      });
    }
    return !!r;
  } catch (e) {
    if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
      _quotaWarnedThisSession = false; // allow re-warning next save attempt
      toast(t('Storage full — export a backup to free space'), true);
    } else {
      console.error('Save error:', e);
    }
    return false;
  }
}

async function deleteFromStorage(key) {
  try {
    await window.storage.delete(key);
    if (window.NBA2K26_CLOUD_SYNC && window.NBA2K26_CLOUD_SYNC.syncDelete) {
      window.NBA2K26_CLOUD_SYNC.syncDelete(key).catch(error => {
        console.warn('Cloud delete skipped:', error);
      });
    }
    return true;
  } catch (e) {
    console.error('Delete error:', e);
    return false;
  }
}
