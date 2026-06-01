// Static HTML template fragments. Loaded before nba2k26-html-templates.js.
(function(window) {
  'use strict';

  const registry = window.NBA2K26_TEMPLATE_PARTS = window.NBA2K26_TEMPLATE_PARTS || {};

  registry.confirmModal = `
<div class="modal-overlay" id="confirm-modal">
  <div class="modal" style="max-width:420px;" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message">
    <div class="modal-header">
      <div class="modal-title" id="confirm-title">Confirm Action</div>
    </div>
    <div class="modal-body">
      <div id="confirm-message" style="font-family:'Inter',sans-serif;font-size:14px;line-height:1.6;color:var(--text);"></div>
    </div>
    <div class="modal-footer">
      <div class="modal-footer-right">
        <button class="btn-ghost btn" id="confirm-cancel">Cancel</button>
        <button class="btn" id="confirm-ok" style="background:var(--red);">Confirm</button>
      </div>
    </div>
  </div>
</div>`.trim();

  registry.dataMenuModal = `
<div class="modal-overlay" id="data-modal">
  <div class="modal" style="max-width:480px;" role="dialog" aria-modal="true" aria-labelledby="data-modal-title">
    <div class="modal-header">
      <div class="modal-title" id="data-modal-title">Data Backup</div>
      <button class="modal-close" type="button" onclick="closeDataModal()" aria-label="Close">x</button>
    </div>
    <div class="modal-body">
      <div class="data-action" onclick="exportData()">
        <div class="data-action-icon">OUT</div>
        <div>
          <div class="data-action-title">Export Data</div>
          <div class="data-action-sub">// Save all builds and game logs as a JSON file</div>
        </div>
      </div>
      <div class="data-action" onclick="exportSeasonReport()">
        <div class="data-action-icon">RPT</div>
        <div>
          <div class="data-action-title">Export Season Report</div>
          <div class="data-action-sub">// Download a readable Markdown report for the current or latest logged season</div>
        </div>
      </div>
      <div class="data-action" onclick="exportGamesCsv()">
        <div class="data-action-icon">CSV</div>
        <div>
          <div class="data-action-title">Export Games CSV</div>
          <div class="data-action-sub">// One row per game with shooting splits, margins, and rosters for Excel or Sheets</div>
        </div>
      </div>
      <label for="import-file-modal" class="data-action" style="display:flex;cursor:pointer;">
        <div class="data-action-icon">IN</div>
        <div>
          <div class="data-action-title">Import Data</div>
          <div class="data-action-sub">// Restore from a previously exported JSON file</div>
        </div>
      </label>
      <input type="file" id="import-file-modal" accept="application/json" class="hidden">
      <div class="cloud-sync-panel">
        <div class="cloud-sync-head">
          <div>
            <div class="data-action-title">Cloud Sync</div>
            <div class="data-action-sub" id="cloud-sync-status">// Not configured</div>
          </div>
          <button class="btn cloud-mini-btn" type="button" data-cloud-action onclick="cloudSyncNow()">Sync Now</button>
        </div>
        <div class="cloud-account-state" id="cloud-sync-message" role="status" aria-live="polite">
          Open Advanced setup once, add your Supabase connection, then sign in with your cloud account.
        </div>
        <div class="cloud-sync-grid">
          <label class="cloud-field">
            <span>Email</span>
            <input id="cloud-email" type="email" autocomplete="email" placeholder="you@example.com">
          </label>
          <label class="cloud-field">
            <span>Password</span>
            <input id="cloud-password" type="password" autocomplete="current-password" placeholder="minimum 6 characters">
          </label>
        </div>
        <div class="cloud-sync-actions">
          <button class="btn" type="button" data-cloud-action onclick="cloudSignIn()">Sign In</button>
          <button class="btn btn-ghost" type="button" data-cloud-action onclick="cloudSignUp()">Create Account</button>
        </div>
        <details class="cloud-advanced" id="cloud-advanced">
          <summary>Advanced setup</summary>
          <div class="cloud-setup-note">
            Service connection is normally filled once. Use the anon public key, never the service role key.
          </div>
          <div class="cloud-sync-grid">
            <label class="cloud-field">
              <span>Supabase URL</span>
              <input id="cloud-supabase-url" type="url" autocomplete="off" placeholder="https://project.supabase.co">
            </label>
            <label class="cloud-field">
              <span>Anon Key</span>
              <input id="cloud-supabase-key" type="password" autocomplete="off" placeholder="public anon key">
            </label>
          </div>
          <div class="cloud-sync-actions">
            <button class="btn btn-ghost" type="button" data-cloud-action onclick="saveCloudConfig()">Save Setup</button>
            <button class="btn btn-ghost" type="button" data-cloud-action onclick="pushLocalToCloud()">Upload Local</button>
            <button class="btn btn-ghost" type="button" data-cloud-action onclick="pullCloudToLocal()">Pull Cloud</button>
            <button class="btn btn-ghost" type="button" data-cloud-action onclick="cloudSignOut()">Sign Out</button>
          </div>
        </details>
      </div>
      <div class="data-action danger" onclick="clearAllData()">
        <div class="data-action-icon">DEL</div>
        <div>
          <div class="data-action-title">Clear All Data</div>
          <div class="data-action-sub">// Cannot be undone. Export a backup first.</div>
        </div>
      </div>
      <div style="margin-top:16px;padding:12px;background:rgba(0,0,0,0.4);border-left:3px solid var(--yellow);font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text-dim);line-height:1.6;" id="data-stats">
        <!-- filled by JS -->
      </div>
    </div>
  </div>
</div>`.trim();
})(window);
