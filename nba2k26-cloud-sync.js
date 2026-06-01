// Supabase-backed cloud sync for the local-first storage layer.
// The app keeps working from localStorage when cloud sync is not configured.
(function(window) {
  'use strict';

  const CONFIG_KEY = 'nba2k26_cloud_config';
  const SDK_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const TABLE = 'nba2k26_cloud_records';
  const RECORD_PREFIXES = ['build:', 'game:', 'player:'];

  let client = null;
  let sdkPromise = null;
  let status = { configured: false, signedIn: false, email: '', syncing: false, lastSyncAt: '' };

  function safeJsonParse(text, fallback) {
    try { return JSON.parse(text); }
    catch (error) { return fallback; }
  }

  function getConfig() {
    const saved = safeJsonParse(localStorage.getItem(CONFIG_KEY) || '{}', {});
    const runtime = window.NBA2K26_RUNTIME_CONFIG || {};
    return {
      url: String(saved.url || runtime.supabaseUrl || '').trim(),
      anonKey: String(saved.anonKey || runtime.supabaseAnonKey || '').trim(),
    };
  }

  function setConfig(config) {
    localStorage.setItem(CONFIG_KEY, JSON.stringify({
      url: String(config.url || '').trim(),
      anonKey: String(config.anonKey || '').trim(),
    }));
  }

  function hasConfig(config) {
    return !!(config && config.url && config.anonKey);
  }

  function isRecordKey(key) {
    return RECORD_PREFIXES.some(prefix => String(key || '').startsWith(prefix));
  }

  function translate(message) {
    return typeof window.t === 'function' ? window.t(message) : message;
  }

  function notify(message, isError) {
    const text = translate(message);
    setPanelMessage(text, isError ? 'err' : 'ok');
    if (typeof window.toast === 'function') window.toast(text, !!isError);
  }

  function setStatus(next) {
    status = { ...status, ...next };
    renderStatus();
  }

  function setPanelMessage(message, tone) {
    const el = document.getElementById('cloud-sync-message');
    if (!el) return;
    el.textContent = message ? translate(message) : '';
    el.classList.toggle('ok', tone === 'ok');
    el.classList.toggle('err', tone === 'err');
    el.classList.toggle('warn', tone === 'warn');
  }

  function setBusy(isBusy, label) {
    status.syncing = !!isBusy;
    const translatedLabel = translate(label);
    const buttons = document.querySelectorAll('[data-cloud-action]');
    buttons.forEach(button => {
      button.disabled = !!isBusy;
      if (isBusy && (button.textContent === label || button.textContent === translatedLabel)) {
        button.dataset.busyLabel = translatedLabel;
      }
    });
    renderStatus();
  }

  async function runCloudAction(label, action) {
    setBusy(true, label);
    setPanelMessage(`${translate(label)}...`, 'warn');
    try {
      return await action();
    } catch (error) {
      console.error(`${label} failed:`, error);
      const message = translate(error.message || `${label} failed`);
      setPanelMessage(message, 'err');
      if (typeof window.toast === 'function') window.toast(message, true);
      return null;
    } finally {
      setBusy(false);
    }
  }

  function loadSdk() {
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.supabase && window.supabase.createClient) resolve(window.supabase);
        else reject(new Error('Supabase SDK did not load'));
      };
      script.onerror = () => reject(new Error('Supabase SDK failed to load'));
      document.head.appendChild(script);
    });
    return sdkPromise;
  }

  async function getClient() {
    const config = getConfig();
    if (!hasConfig(config)) {
      setStatus({ configured: false, signedIn: false, email: '' });
      const advanced = document.getElementById('cloud-advanced');
      if (advanced) advanced.open = true;
      setPanelMessage('Cloud setup is missing. Open Advanced setup and add your Supabase URL plus anon key.', 'err');
      return null;
    }
    if (client && client.__nba2k26Url === config.url && client.__nba2k26Key === config.anonKey) return client;
    const sdk = await loadSdk();
    client = sdk.createClient(config.url, config.anonKey);
    client.__nba2k26Url = config.url;
    client.__nba2k26Key = config.anonKey;
    setStatus({ configured: true });
    return client;
  }

  async function refreshSession() {
    const supabase = await getClient();
    if (!supabase) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    const session = data && data.session;
    setStatus({
      configured: true,
      signedIn: !!session,
      email: session && session.user && session.user.email ? session.user.email : '',
    });
    return session;
  }

  async function requireSession() {
    const session = await refreshSession();
    if (!session) throw new Error('Sign in before using cloud sync');
    return session;
  }

  // Side-effect-free check for opportunistic background sync. Returns false
  // (silently, without loading the SDK or touching the panel) when cloud is
  // not configured, so users who never opted into sync see no error.
  async function canAutoSync() {
    if (!hasConfig(getConfig())) return false;
    try {
      return !!(await refreshSession());
    } catch (error) {
      return false;
    }
  }

  function readInput(id) {
    const el = document.getElementById(id);
    return el ? el.value.trim() : '';
  }

  function writeInput(id, value) {
    const el = document.getElementById(id);
    if (el) el.value = value || '';
  }

  function saveConfigFromInputs() {
    const current = getConfig();
    const next = {
      url: readInput('cloud-supabase-url') || current.url,
      anonKey: readInput('cloud-supabase-key') || current.anonKey,
    };
    setConfig(next);
    client = null;
    return next;
  }

  async function configureFromInputs() {
    return runCloudAction('Save setup', async () => {
      saveConfigFromInputs();
      const config = getConfig();
      if (!hasConfig(config)) throw new Error('Add both Supabase URL and anon key.');
      await refreshSession();
      notify('Cloud setup saved. You can sign in now.');
    });
  }

  async function signUp() {
    return runCloudAction('Create account', async () => {
      saveConfigFromInputs();
      const supabase = await getClient();
      if (!supabase) throw new Error('Add Supabase URL and anon key first.');
      const email = readInput('cloud-email');
      const password = readInput('cloud-password');
      if (!email || !password) throw new Error('Email and password are required.');
      if (password.length < 6) throw new Error('Password must be at least 6 characters.');
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      await refreshSession();
      const needsConfirm = data && data.user && !data.session;
      notify(needsConfirm ? 'Account created. Check your email to confirm, then sign in.' : 'Account created and signed in.');
    });
  }

  async function signIn() {
    return runCloudAction('Sign in', async () => {
      saveConfigFromInputs();
      const supabase = await getClient();
      if (!supabase) throw new Error('Add Supabase URL and anon key first.');
      const email = readInput('cloud-email');
      const password = readInput('cloud-password');
      if (!email || !password) throw new Error('Email and password are required.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await refreshSession();
      notify('Signed in. Your future saves will sync automatically.');
    });
  }

  async function signOut() {
    return runCloudAction('Sign out', async () => {
      const supabase = await getClient();
      if (!supabase) throw new Error('Cloud setup is not configured.');
      await supabase.auth.signOut();
      setStatus({ signedIn: false, email: '' });
      notify('Signed out of cloud sync');
    });
  }

  async function syncSet(key, value) {
    if (!isRecordKey(key)) return false;
    const supabase = await getClient();
    if (!supabase) return false;
    const session = await refreshSession();
    if (!session) return false;
    const { error } = await supabase
      .from(TABLE)
      .upsert({
        user_id: session.user.id,
        record_key: key,
        record_value: value,
        deleted: false,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,record_key' });
    if (error) throw error;
    return true;
  }

  async function syncDelete(key) {
    if (!isRecordKey(key)) return false;
    const supabase = await getClient();
    if (!supabase) return false;
    const session = await refreshSession();
    if (!session) return false;
    const { error } = await supabase
      .from(TABLE)
      .upsert({
        user_id: session.user.id,
        record_key: key,
        record_value: null,
        deleted: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,record_key' });
    if (error) throw error;
    return true;
  }

  async function pushLocal() {
    return runCloudAction('Upload local', async () => {
      const session = await requireSession();
      const rows = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!isRecordKey(key)) continue;
        const value = safeJsonParse(localStorage.getItem(key), null);
        if (value) {
          rows.push({
            user_id: session.user.id,
            record_key: key,
            record_value: value,
            deleted: false,
            updated_at: new Date().toISOString(),
          });
        }
      }
      if (!rows.length) {
        notify('No local records to upload');
        return { uploaded: 0 };
      }
      const supabase = await getClient();
      const { error } = await supabase.from(TABLE).upsert(rows, { onConflict: 'user_id,record_key' });
      if (error) throw error;
      setStatus({ lastSyncAt: new Date().toISOString() });
      notify(`${translate('Uploaded')} ${rows.length} ${translate('records to cloud')}`);
      return { uploaded: rows.length };
    });
  }

  async function pullCloud(options = {}) {
    return runCloudAction('Pull cloud', async () => {
      await requireSession();
      const supabase = await getClient();
      const { data, error } = await supabase
        .from(TABLE)
        .select('record_key,record_value,deleted,updated_at')
        .order('updated_at', { ascending: true });
      if (error) throw error;
      let applied = 0;
      let deleted = 0;
      (data || []).forEach(row => {
        if (!isRecordKey(row.record_key)) return;
        if (row.deleted) {
          localStorage.removeItem(row.record_key);
          deleted++;
        } else if (row.record_value) {
          localStorage.setItem(row.record_key, JSON.stringify(row.record_value));
          applied++;
        }
      });
      setStatus({ lastSyncAt: new Date().toISOString() });
      if (options.reload && typeof window.loadData === 'function') {
        const activePage = document.querySelector('.page.active')?.id?.replace(/^page-/, '') || '';
        const route = window.NBA2K26_PAGE_SHELL && window.NBA2K26_PAGE_SHELL.routeFromHash
          ? window.NBA2K26_PAGE_SHELL.routeFromHash(location.hash)
          : { page: activePage || 'overview' };
        await window.loadData();
        if (route.page === 'detail' && route.buildId && typeof window.openBuildDetail === 'function') {
          window.openBuildDetail(route.buildId);
        } else if (route.page === 'player' && route.playerId && typeof window.openPlayerPage === 'function') {
          window.openPlayerPage(route.playerId);
        } else if (typeof window.showPage === 'function') {
          window.showPage(route.page ? route : { page: activePage || 'overview' });
        }
      }
      notify(`${translate('Pulled')} ${applied} ${translate('cloud records')}${deleted ? `, ${translate('removed')} ${deleted}` : ''}`);
      return { applied, deleted };
    });
  }

  async function syncNow() {
    return runCloudAction('Sync now', async () => {
      await requireSession();
      await pushLocal();
      return pullCloud({ reload: true });
    });
  }

  function renderStatus() {
    const el = document.getElementById('cloud-sync-status');
    if (!el) return;
    const bits = [];
    if (!status.configured) bits.push(translate('Setup needed'));
    else if (!status.signedIn) bits.push(translate('Ready to sign in'));
    else bits.push(status.email ? `${translate('Connected')}: ${status.email}` : translate('Connected'));
    if (status.syncing) bits.push(translate('Syncing now'));
    if (status.lastSyncAt) bits.push(`${translate('Last sync')} ${new Date(status.lastSyncAt).toLocaleString()}`);
    el.textContent = `// ${bits.join(' / ')}`;
    el.classList.toggle('ok', status.configured && status.signedIn);
    el.classList.toggle('err', status.configured && !status.signedIn);
  }

  async function hydrateCloudPanel() {
    const config = getConfig();
    writeInput('cloud-supabase-url', config.url);
    writeInput('cloud-supabase-key', config.anonKey);
    const advanced = document.getElementById('cloud-advanced');
    if (advanced && !hasConfig(config)) advanced.open = true;
    try { await refreshSession(); }
    catch (error) {
      console.warn('Cloud session refresh failed:', error);
      setStatus({ configured: hasConfig(config), signedIn: false, email: '' });
    }
    if (!hasConfig(config)) {
      setPanelMessage('First-time setup: open Advanced setup and add your Supabase URL plus anon key.', 'warn');
    } else if (!status.signedIn) {
      setPanelMessage('Cloud service is configured. Sign in or create an account to sync.', 'warn');
    } else {
      setPanelMessage('Connected. Saves sync automatically, and Sync Now can refresh this device.', 'ok');
    }
    renderStatus();
  }

  window.NBA2K26_CLOUD_SYNC = {
    hydrateCloudPanel,
    configureFromInputs,
    signUp,
    signIn,
    signOut,
    pushLocal,
    pullCloud,
    syncNow,
    syncSet,
    syncDelete,
    refreshSession,
    canAutoSync,
  };
})(window);
