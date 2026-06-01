// Static HTML template fragments. Loaded before nba2k26-html-templates.js.
(function(window) {
  'use strict';

  const registry = window.NBA2K26_TEMPLATE_PARTS = window.NBA2K26_TEMPLATE_PARTS || {};

  registry.ocrProcessingModal = `
<div class="modal-overlay" id="ocr-modal">
  <div class="modal ocr-review-modal" style="max-width:980px;" role="dialog" aria-modal="true" aria-labelledby="ocr-modal-title">
    <div class="modal-header">
      <div class="modal-title" id="ocr-modal-title">Screenshot OCR</div>
      <button class="modal-close" type="button" onclick="closeOCRModal()" aria-label="Close">x</button>
    </div>
    <div class="modal-body">
      <div class="ocr-engine-row">
        <div class="ocr-engine-label">Engine</div>
        <div class="ocr-engine-tabs">
          <button class="ocr-engine-tab" data-engine="zhipu" type="button">Zhipu Free Vision</button>
          <button class="ocr-engine-tab" data-engine="openai" type="button">OpenAI Vision</button>
          <button class="ocr-engine-tab" data-engine="tesseract" type="button">Tesseract Local</button>
        </div>
        <button class="ocr-settings-btn" onclick="openOCRSettings()" type="button" title="OCR Settings">SET</button>
      </div>

      <div class="ocr-preview-inner">
        <img id="ocr-img" alt="preview">
        <div class="ocr-status" id="ocr-status"></div>
      </div>
      <div id="ocr-result-area" class="ocr-audit-desk" style="display:none;margin-top:14px;">
        <div class="ocr-audit-head">
          <div>
            <div class="ocr-audit-kicker" data-i18n="OCR Import Review Desk">OCR Import Review Desk</div>
            <div class="ocr-audit-title" data-i18n="Review before import">Review before import</div>
          </div>
          <div class="ocr-audit-badges">
            <span id="ocr-confidence-badge"></span>
            <span id="ocr-strategy-badge" class="ocr-meta"></span>
          </div>
        </div>
        <div id="ocr-audit-summary" class="ocr-audit-summary"></div>
        <div id="ocr-result-grid" class="ocr-result-grid"></div>
      </div>
      <div class="ocr-tips" id="ocr-tips" style="display:none;margin-top:14px;"></div>
    </div>
    <div class="modal-footer">
      <div class="modal-footer-right">
        <button class="btn-ghost btn" onclick="closeOCRModal()">Cancel</button>
        <button class="btn" id="ocr-confirm-btn" onclick="confirmOCR()" disabled data-i18n="Confirm Import">Confirm Import</button>
      </div>
    </div>
  </div>
</div>`.trim();

  registry.ocrSettingsModal = `
<div class="modal-overlay" id="ocr-settings-modal">
  <div class="modal" style="max-width:560px;" role="dialog" aria-modal="true" aria-labelledby="ocr-settings-modal-title">
    <div class="modal-header">
      <div class="modal-title" id="ocr-settings-modal-title">OCR Settings</div>
      <button class="modal-close" type="button" onclick="closeOCRSettings()" aria-label="Close">x</button>
    </div>
    <div class="modal-body">
      <div class="form-section-title">Default Engine</div>
      <div class="form-row">
        <div class="form-group">
          <label>Default OCR Engine</label>
          <select id="ocr-default-engine">
            <option value="zhipu" data-i18n="Zhipu GLM-4.6V-Flash Free Recommended">Zhipu GLM-4.6V-Flash Free Recommended</option>
            <option value="openai" data-i18n="OpenAI Vision Paid Optional">OpenAI Vision Paid Optional</option>
            <option value="tesseract" data-i18n="Tesseract.js Local Fallback">Tesseract.js Local Fallback</option>
          </select>
        </div>
      </div>

      <div class="form-section-title" style="margin-top:24px;">OpenAI Vision Config</div>
      <div class="form-row">
        <div class="form-group">
          <label>OpenAI API Key <button type="button" class="inline-action" onclick="testOpenAIKey()">Test</button></label>
          <input type="password" id="openai-api-key" placeholder="Paste your OpenAI API Key. Stored only in this browser." autocomplete="off">
          <div id="openai-key-status" class="key-status"></div>
        </div>
      </div>

      <div class="setup-guide">
        <div class="setup-guide-title" data-i18n="OpenAI Vision extraction (optional paid fallback)">OpenAI Vision extraction (optional paid fallback)</div>
        <ol class="setup-guide-list">
          <li data-i18n="Create or copy an API key from the OpenAI API dashboard.">Create or copy an API key from the OpenAI API dashboard.</li>
          <li data-i18n="Use OpenAI only if you intentionally want a paid fallback outside the Zhipu free/quota path.">Use OpenAI only if you intentionally want a paid fallback outside the Zhipu free/quota path.</li>
          <li data-i18n="Paste the key above, save, then rerun OCR on the screenshot.">Paste the key above, save, then rerun OCR on the screenshot.</li>
        </ol>
        <div class="setup-guide-warn">
          <strong data-i18n="Important: this page stores the key in browser local storage.">Important: this page stores the key in browser local storage.</strong><br>
          Use it only on your own machine. A later local proxy can move the key into a server-side environment variable.
        </div>
      </div>

      <div class="form-section-title" style="margin-top:24px;">Zhipu OCR Config</div>
      <div class="form-row">
        <div class="form-group">
          <label>Zhipu API Key <button type="button" class="inline-action" onclick="testZhipuKey()">Test</button></label>
          <input type="password" id="zhipu-api-key" placeholder="Paste your Zhipu API Key. Stored only in this browser." autocomplete="off">
          <div id="zhipu-key-status" class="key-status"></div>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Zhipu Vision Fallback Model</label>
          <select id="zhipu-model">
            <option value="glm-4.6v-flash" data-i18n="GLM-4.6V-Flash Free Recommended">GLM-4.6V-Flash Free Recommended</option>
            <option value="glm-4v-flash" data-i18n="GLM-4V-Flash Free Simple Fallback">GLM-4V-Flash Free Simple Fallback</option>
            <option value="glm-4v-plus-0111" data-i18n="GLM-4V-Plus-0111 Legacy Quota Fallback">GLM-4V-Plus-0111 Legacy Quota Fallback</option>
          </select>
        </div>
      </div>

      <div class="setup-guide">
        <div class="setup-guide-title" data-i18n="Zhipu two-pass OCR path">Zhipu two-pass OCR path</div>
        <ol class="setup-guide-list">
          <li><span data-i18n="Open">Open</span> <a href="https://open.bigmodel.cn/usercenter/apikeys" target="_blank" rel="noopener">Zhipu API Keys</a> <span data-i18n="and create or copy a key.">and create or copy a key.</span></li>
          <li data-i18n="The app reads tables with GLM-OCR first, then uses GLM-4.7-Flash to structure the recognized text.">The app reads tables with GLM-OCR first, then uses GLM-4.7-Flash to structure the recognized text.</li>
          <li data-i18n="The selected vision model is used only as a fallback when the OCR text pass fails.">The selected vision model is used only as a fallback when the OCR text pass fails.</li>
        </ol>
        <div class="setup-guide-warn">
          <strong data-i18n="Important: this page stores the key in browser local storage.">Important: this page stores the key in browser local storage.</strong><br>
          Use it only on your own machine. A later local proxy can move the key into a server-side environment variable.
        </div>
      </div>

      <div class="form-section-title" style="margin-top:24px;" data-i18n="My Player Identity">My Player Identity</div>
      <div class="form-row">
        <div class="form-group">
          <label data-i18n="In-Game Player Name">In-Game Player Name</label>
          <input type="text" id="ocr-player-name" placeholder="e.g. 克托古" maxlength="40" autocomplete="off">
          <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">
            Your NBA 2K in-game display name exactly as it appears in the box score. OCR will use this to identify your row and correct team classification mistakes even when the AI picks the wrong player.
          </div>
        </div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn-ghost btn" onclick="clearOCRKeys()" style="color:var(--red);border-color:var(--red);">Clear Keys</button>
      <div class="modal-footer-right">
        <button class="btn-ghost btn" onclick="closeOCRSettings()">Cancel</button>
        <button class="btn" onclick="saveOCRSettings()">Save</button>
      </div>
    </div>
  </div>
</div>`.trim();
})(window);
