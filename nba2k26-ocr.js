// NBA 2K26 OCR image processing, parsing, and settings helpers.
// Loaded mid-page after core UI helpers are defined because it depends on toast/customConfirm/escapeHtml.
// ====================== OCR (Enhanced Tesseract.js) ======================
const OCR = {
  fileInput: null,
  modal: null,
  img: null,
  status: null,
  tips: null,
  confirmBtn: null,
  pendingResult: null,
  resultArea: null,
  resultGrid: null,
  auditSummary: null,
  confidenceBadge: null,
  strategyBadge: null,
  // Engine settings
  currentEngine: 'zhipu',
  pendingFile: null,
  openAIApiKey: null,
  zhipuApiKey: null,
  zhipuModel: 'glm-4.6v-flash',
  myPlayerName: null,

  // OCR text parsing is delegated to nba2k26-ocr-parser.js.
  FIELDS: OCRParser.FIELDS,
  parseAll(results) { return OCRParser.parseAll(results); },
  parseKeyValue(text) { return OCRParser.parseKeyValue(text); },
  parseStructured(text) { return OCRParser.parseStructured(text); },
  parseLineByLine(text) { return OCRParser.parseLineByLine(text); },
  parseWithKeywords(text) { return OCRParser.parseWithKeywords(text); },
  parseFallback(text) { return OCRParser.parseFallback(text); },
  scoreCandidate(candidate) { return OCRParser.scoreCandidate(candidate); },
  validateCandidate(candidate) { return OCRParser.validateCandidate(candidate); },


  init() {
    this.fileInput = document.getElementById('ocr-file');
    this.modal = document.getElementById('ocr-modal');
    this.img = document.getElementById('ocr-img');
    this.status = document.getElementById('ocr-status');
    this.tips = document.getElementById('ocr-tips');
    this.confirmBtn = document.getElementById('ocr-confirm-btn');
    this.resultArea = document.getElementById('ocr-result-area');
    this.resultGrid = document.getElementById('ocr-result-grid');
    this.auditSummary = document.getElementById('ocr-audit-summary');
    this.confidenceBadge = document.getElementById('ocr-confidence-badge');
    this.strategyBadge = document.getElementById('ocr-strategy-badge');

    this.fileInput.addEventListener('change', e => {
      const f = e.target.files?.[0];
      if (f) this.processFile(f);
      this.fileInput.value = '';
    });

    // Paste from clipboard support
    document.addEventListener('paste', e => {
      if (!document.getElementById('game-modal').classList.contains('active')) return;
      if (document.getElementById('ocr-modal').classList.contains('active')) return;
      const items = e.clipboardData?.items || [];
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) { this.processFile(f); e.preventDefault(); break; }
        }
      }
    });

    // Drag & drop
    document.querySelectorAll('.ocr-entry').forEach(entry => {
      entry.addEventListener('dragover', e => { e.preventDefault(); entry.classList.add('drag-over'); });
      entry.addEventListener('dragleave', () => { entry.classList.remove('drag-over'); });
      entry.addEventListener('drop', e => {
        e.preventDefault(); entry.classList.remove('drag-over');
        const f = e.dataTransfer?.files?.[0];
        if (f && f.type.startsWith('image/')) this.processFile(f);
      });
    });

    this.detectSandbox();

    // Engine tab clicks
    document.querySelectorAll('.ocr-engine-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (tab.classList.contains('disabled')) return;
        this.setEngine(tab.dataset.engine);
        if (this.pendingFile) this.processFile(this.pendingFile);
      });
    });

    this.loadSettings();
    this.applyEngineUI();
  },

  loadSettings() {
    try {
      this.openAIApiKey = localStorage.getItem('ocr_openai_key') || null;
      this.zhipuApiKey = localStorage.getItem('ocr_zhipu_key') || null;
      this.myPlayerName = localStorage.getItem('ocr_player_name') || null;
      const savedZhipuModel = localStorage.getItem('ocr_zhipu_model');
      if (this.isSupportedZhipuModel(savedZhipuModel)) this.zhipuModel = savedZhipuModel;
      const savedEngine = localStorage.getItem('ocr_engine');
      if (savedEngine === 'tesseract' || savedEngine === 'zhipu' || savedEngine === 'openai') {
        this.currentEngine = savedEngine;
      }
    } catch (e) {}
  },

  saveSettings() {
    try {
      if (this.openAIApiKey) localStorage.setItem('ocr_openai_key', this.openAIApiKey);
      else localStorage.removeItem('ocr_openai_key');
      if (this.zhipuApiKey) localStorage.setItem('ocr_zhipu_key', this.zhipuApiKey);
      else localStorage.removeItem('ocr_zhipu_key');
      if (this.myPlayerName) localStorage.setItem('ocr_player_name', this.myPlayerName);
      else localStorage.removeItem('ocr_player_name');
      localStorage.setItem('ocr_zhipu_model', this.zhipuModel || 'glm-4.6v-flash');
      localStorage.setItem('ocr_engine', this.currentEngine);
    } catch (e) {}
  },

  setEngine(engine) {
    this.currentEngine = engine;
    this.applyEngineUI();
    this.saveSettings();
  },

  applyEngineUI() {
    document.querySelectorAll('.ocr-engine-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.engine === this.currentEngine);
    });
  },

  detectSandbox() {
    const isSandboxed = location.hostname.includes('claudeusercontent') ||
                        location.hostname.includes('artifacts') ||
                        location.protocol === 'blob:' ||
                        window !== window.top;
    this.isSandboxed = isSandboxed;
    if (isSandboxed) {
      // Disable Tesseract tab when its Web Worker is blocked by sandbox CSP.
      const tess = document.querySelector('.ocr-engine-tab[data-engine="tesseract"]');
      if (tess) {
        tess.classList.add('disabled');
        tess.title = t('Sandbox blocks Tesseract Worker. Use Zhipu GLM Vision, OpenAI Vision, or run the file locally.');
      }
      // Force cloud engine in sandbox
      if (this.currentEngine === 'tesseract') this.currentEngine = 'zhipu';
    }
  },

  open() { this.modal.classList.add('active'); },
  close() {
    this.modal.classList.remove('active');
    this.pendingResult = null;
    this.confirmBtn.disabled = true;
    this.confirmBtn.style.opacity = '0.5';
    this.resultArea.style.display = 'none';
  },

  resetUI() {
    this.tips.style.display = 'none';
    this.tips.innerHTML = '';
    this.status.innerHTML = '';
    this.confirmBtn.disabled = true;
    this.confirmBtn.style.opacity = '0.5';
    this.pendingResult = null;
    this.resultArea.style.display = 'none';
    this.resultGrid.innerHTML = '';
    if (this.auditSummary) this.auditSummary.innerHTML = '';
    this.confidenceBadge.innerHTML = '';
    this.strategyBadge.innerHTML = '';
  },

  setStep(key, label, state) {
    const normalizedState = ['done', 'err', 'active'].includes(state) ? state : '';
    const existing = [...this.status.querySelectorAll('[data-step]')]
      .find(step => step.dataset.step === key);
    const icon = normalizedState === 'done' ? 'OK' : normalizedState === 'err' ? 'ERR' : normalizedState === 'active' ? '...' : '-';
    const step = document.createElement('div');
    step.classList.add('step');
    if (normalizedState) step.classList.add(normalizedState);
    step.dataset.step = key;
    const iconEl = document.createElement('span');
    iconEl.textContent = icon;
    const labelEl = document.createElement('span');
    labelEl.textContent = label;
    step.append(iconEl, labelEl);
    if (existing) existing.replaceWith(step);
    else this.status.appendChild(step);
  },

  setProgress(pct) {
    let bar = this.status.querySelector('.ocr-progress-bar');
    if (!bar) {
      this.status.insertAdjacentHTML('beforeend', '<div class="ocr-progress-bar"><div class="ocr-progress-fill"></div></div>');
      bar = this.status.querySelector('.ocr-progress-bar');
    }
    bar.querySelector('.ocr-progress-fill').style.width = pct + '%';
  },

  // ─── Multi-strategy preprocessing ───
  preprocessVariants(img) {
    const variants = [];
    const targetW = Math.max(img.naturalWidth, 1600);
    const scale = targetW / img.naturalWidth;
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    // Base canvas
    const baseCanvas = document.createElement('canvas');
    baseCanvas.width = w; baseCanvas.height = h;
    const baseCtx = baseCanvas.getContext('2d');
    baseCtx.imageSmoothingEnabled = true;
    baseCtx.imageSmoothingQuality = 'high';
    const source = img._isBitmap ? img._bitmap : img;
    baseCtx.drawImage(source, 0, 0, w, h);
    if (img._isBitmap && img._bitmap.close) img._bitmap.close();

    const imgData = baseCtx.getImageData(0, 0, w, h);
    const d = imgData.data;

    // Compute brightness stats
    let sum = 0, sumSq = 0, min = 255, max = 0;
    const sampleStep = 8;
    let sampleCount = 0;
    for (let i = 0; i < d.length; i += 4 * sampleStep) {
      const v = (d[i] + d[i+1] + d[i+2]) / 3;
      sum += v; sumSq += v * v;
      if (v < min) min = v;
      if (v > max) max = v;
      sampleCount++;
    }
    const avg = sum / sampleCount;
    const variance = sumSq / sampleCount - avg * avg;
    const darkBg = avg < 128;

    // Strategy 1: Adaptive threshold (Otsu-like)
    variants.push(this._makeVariant(d, w, h, 'adaptive', darkBg, avg, variance));

    // Strategy 2: Aggressive threshold (for noisy screenshots)
    variants.push(this._makeVariant(d, w, h, 'aggressive', darkBg, avg, variance));

    // Strategy 3: Gentle threshold (for clean screenshots)
    variants.push(this._makeVariant(d, w, h, 'gentle', darkBg, avg, variance));

    // Strategy 4: High contrast (for low-contrast screenshots)
    if (variance < 1500) {
      variants.push(this._makeVariant(d, w, h, 'highcontrast', darkBg, avg, variance));
    }

    return variants;
  },

  _makeVariant(srcData, w, h, strategy, darkBg, avg, variance) {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(w, h);
    const d = imgData.data;

    // Copy source
    for (let i = 0; i < srcData.length; i++) d[i] = srcData[i];

    let threshold, contrastMult, contrastAdd;

    switch (strategy) {
      case 'adaptive':
        // Otsu-like: compute optimal threshold from histogram
        threshold = this._otsuThreshold(d, w, h);
        contrastMult = 1.0; contrastAdd = 0;
        break;
      case 'aggressive':
        // Higher threshold to catch faint text
        threshold = darkBg ? 100 : 180;
        contrastMult = 1.5; contrastAdd = -30;
        break;
      case 'gentle':
        // Lower threshold to avoid noise
        threshold = darkBg ? 160 : 120;
        contrastMult = 0.8; contrastAdd = 20;
        break;
      case 'highcontrast':
        // Stretch contrast then threshold
        threshold = avg;
        contrastMult = 2.0; contrastAdd = -128;
        break;
    }

    // Apply contrast stretch + grayscale + threshold
    for (let i = 0; i < d.length; i += 4) {
      let gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      gray = Math.max(0, Math.min(255, gray * contrastMult + contrastAdd));
      let v;
      if (darkBg) {
        v = gray > threshold ? 0 : 255;
      } else {
        v = gray > threshold ? 255 : 0;
      }
      d[i] = d[i+1] = d[i+2] = v;
    }

    ctx.putImageData(imgData, 0, 0);
    return { canvas, strategy, threshold, darkBg };
  },

  _otsuThreshold(d, w, h) {
    // Build histogram
    const hist = new Array(256).fill(0);
    for (let i = 0; i < d.length; i += 4) {
      const gray = Math.round(0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2]);
      hist[gray]++;
    }
    const total = w * h;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];

    let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += hist[t];
      if (wB === 0) continue;
      const wF = total - wB;
      if (wF === 0) break;
      sumB += t * hist[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);
      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }
    return threshold;
  },

  // ─── Lazy-load Tesseract.js on first use ───
  loadTesseract() {
    if (typeof Tesseract !== 'undefined') return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Tesseract.js 加载失败 (CDN 拉取失败 · 检查网络)'));
      document.head.appendChild(s);
    });
  },

  // ─── Multi-strategy OCR runner ───
  async runOCR(variants) {
    if (typeof Tesseract === 'undefined') {
      this.setStep('load_tess', t('Loading Tesseract.js engine'), 'active');
      await this.loadTesseract();
      this.setStep('load_tess', t('Tesseract.js ready'), 'done');
    }

    const results = [];
    for (const v of variants) {
      this.setStep('ocr_' + v.strategy, `策略 [${v.strategy}] 识别中`, 'active');
      try {
        const result = await Tesseract.recognize(v.canvas, 'eng', {
          workerBlobURL: false,
          workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js',
          corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5/',
          langPath: 'https://tessdata.projectnaptha.com/4.0.0',
          logger: m => {
            if (m.status === 'recognizing text') {
              this.setProgress(Math.round(m.progress * 100));
            }
          },
        });
        const text = result.data.text;
        const confidence = result.data.confidence;
        results.push({ text, confidence, strategy: v.strategy });
        this.setStep('ocr_' + v.strategy, `${t('Strategy')} [${v.strategy}] ${t('complete')} (${t('Confidence')} ${confidence.toFixed(0)}%)`, 'done');
      } catch (e) {
        this.setStep('ocr_' + v.strategy, `${t('Strategy')} [${v.strategy}] ${t('failed')}: ${e.message}`, 'err');
      }
    }
    return results;
  },


  auditFieldLabel(id) {
    const labels = {
      'g-pts': 'PTS',
      'g-reb': 'REB',
      'g-ast': 'AST',
      'g-stl': 'STL',
      'g-blk': 'BLK',
      'g-pf': 'FLS',
      'g-to': 'TO',
      'g-pm': '+/-',
      'g-fg2m': 'FGM',
      'g-fg2a': 'FGA',
      'g-fg3m': '3PM',
      'g-fg3a': '3PA',
      'g-ftm': 'FTM',
      'g-fta': 'FTA',
      'g-score-own': 'Own Score',
      'g-score-opp': 'Opp Score',
      'g-result': 'Result',
      'g-grade': 'Grade',
      'g-date': 'Date',
      'g-mode': 'Mode',
      'g-opponent': 'Opponent',
      'g-teammate': 'Teammate',
    };
    return t(labels[id] || this.FIELDS[id]?.label || id.replace(/^g-/, '').toUpperCase());
  },

  hasAuditValue(values, id) {
    return values && values[id] !== undefined && values[id] !== null && values[id] !== '';
  },

  buildAuditSummary(staged) {
    const values = staged.values || {};
    const roster = staged.roster || { teammates: [], opponents: [] };
    const rosterCount = (roster.teammates?.length || 0) + (roster.opponents?.length || 0);
    const fieldCount = Object.keys(values).filter(id => this.hasAuditValue(values, id)).length;
    const warnings = staged.warnings || [];
    const requiredIds = ['g-pts', 'g-reb', 'g-ast', 'g-score-own', 'g-score-opp'];
    const missingIds = requiredIds.filter(id => !this.hasAuditValue(values, id));
    const risks = [];

    warnings.forEach(warning => {
      if (warning?.message) risks.push(warning.message);
    });
    if (missingIds.length) {
      risks.push(`${t('Missing core fields')}: ${missingIds.map(id => this.auditFieldLabel(id)).join(', ')}`);
    }

    [
      ['g-fg2m', 'g-fg2a', 'FG'],
      ['g-fg3m', 'g-fg3a', '3PT'],
      ['g-ftm', 'g-fta', 'FT'],
    ].forEach(([madeId, attId, label]) => {
      if (!this.hasAuditValue(values, madeId) || !this.hasAuditValue(values, attId)) return;
      const made = Number(values[madeId]);
      const att = Number(values[attId]);
      if (Number.isFinite(made) && Number.isFinite(att) && made > att) {
        risks.push(`${label}: ${t('made cannot exceed attempts')}`);
      }
    });

    const result = values['g-result'];
    const own = Number(values['g-score-own']);
    const opp = Number(values['g-score-opp']);
    if (this.hasAuditValue(values, 'g-score-own') && this.hasAuditValue(values, 'g-score-opp') && Number.isFinite(own) && Number.isFinite(opp) && own !== opp) {
      if (result === 'W' && own < opp) risks.push(t('Score conflicts with win result'));
      if (result === 'L' && own > opp) risks.push(t('Score conflicts with loss result'));
    }

    ['teammates', 'opponents'].forEach(side => {
      const seen = new Set();
      (roster[side] || []).forEach(player => {
        const name = String(player?.name || '').trim().toLowerCase();
        if (!name) return;
        if (seen.has(name)) risks.push(`${t(side === 'teammates' ? 'Teammates' : 'Opponents')}: ${t('duplicate player name')} (${player.name})`);
        seen.add(name);
      });
    });

    const score = Number(staged.score) || 0;
    const status = fieldCount + rosterCount === 0
      ? 'blocked'
      : (risks.length || score < 50 ? 'review' : 'ready');
    const statusLabel = status === 'ready'
      ? t('Ready to import')
      : status === 'blocked'
        ? t('Low data')
        : t('Needs review');
    const statusHint = status === 'ready'
      ? t('No review flags detected.')
      : t('Review these before importing.');

    return { status, statusLabel, statusHint, risks, fieldCount, rosterCount, warningCount: risks.length, score };
  },

  renderAuditSummary(staged) {
    if (!this.auditSummary) return;
    const summary = this.buildAuditSummary(staged);
    const riskHtml = summary.risks.length
      ? `<div class="ocr-audit-risk-list">${summary.risks.slice(0, 6).map(risk => `<span>${escapeHtml(risk)}</span>`).join('')}</div>`
      : `<div class="ocr-audit-clear">${t('No review flags detected.')}</div>`;
    this.auditSummary.innerHTML = `
      <div class="ocr-audit-scoreline">
        <div class="ocr-audit-status ${summary.status}">
          <span>${t('Audit Status')}</span>
          <strong>${summary.statusLabel}</strong>
          <small>${summary.statusHint}</small>
        </div>
        <div class="ocr-audit-stat">
          <span>${t('Recognized fields')}</span>
          <strong>${summary.fieldCount}</strong>
        </div>
        <div class="ocr-audit-stat">
          <span>${t('Roster players')}</span>
          <strong>${summary.rosterCount}</strong>
        </div>
        <div class="ocr-audit-stat ${summary.warningCount ? 'warn' : 'ok'}">
          <span>${t('Review flags')}</span>
          <strong>${summary.warningCount}</strong>
        </div>
      </div>
      ${riskHtml}
    `;
  },

  renderAuditFieldGroup(title, subtitle, fieldIds, warningFieldIds, staged, options = {}) {
    const values = staged.values || {};
    const items = fieldIds.map(id => {
      const val = values[id] ?? '';
      const isWarn = warningFieldIds.has(id);
      const isMissing = val === '' || val === undefined || val === null;
      const state = isWarn ? t('Review required') : isMissing ? t('Missing') : t('Field ready');
      return `
        <div class="ocr-result-item audit${isWarn ? ' warn' : ''}${isMissing ? ' missing' : ''}">
          <label>${this.auditFieldLabel(id)}</label>
          <input type="number" data-field="${id}" value="${escapeHtml(val)}">
          <small>${state}</small>
        </div>
      `;
    }).join('');
    this.resultGrid.insertAdjacentHTML('beforeend', `
      <details class="ocr-review-section"${options.open ? ' open' : ''}>
        <summary class="ocr-review-section-head">
          <span>${escapeHtml(title)}</span>
          <small>${escapeHtml(subtitle)}</small>
        </summary>
        <div class="ocr-review-field-grid">${items}</div>
      </details>
    `);
  },

  renderContextResultEditors(staged, warningFieldIds) {
    const values = staged.values || {};
    const gradeOptions = ['', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'];
    const resultVal = values['g-result'] || '';
    const gradeVal = values['g-grade'] || '';
    const contextItems = `
      <div class="ocr-result-item audit${warningFieldIds.has('g-result') ? ' warn' : ''}">
        <label>${this.auditFieldLabel('g-result')}</label>
        <select data-field="g-result">
          <option value=""></option>
          <option value="W"${resultVal === 'W' ? ' selected' : ''}>W</option>
          <option value="L"${resultVal === 'L' ? ' selected' : ''}>L</option>
        </select>
        <small>${resultVal ? t('Field ready') : t('Optional')}</small>
      </div>
      <div class="ocr-result-item audit${warningFieldIds.has('g-grade') ? ' warn' : ''}">
        <label>${this.auditFieldLabel('g-grade')}</label>
        <select data-field="g-grade">
          ${gradeOptions.map(grade => `<option value="${grade}"${grade === gradeVal ? ' selected' : ''}>${grade}</option>`).join('')}
        </select>
        <small>${gradeVal ? t('Field ready') : t('Optional')}</small>
      </div>
      <div class="ocr-result-item audit${warningFieldIds.has('g-date') ? ' warn' : ''}">
        <label>${this.auditFieldLabel('g-date')}</label>
        <input type="date" data-field="g-date" value="${escapeHtml(values['g-date'] || '')}">
        <small>${values['g-date'] ? t('Field ready') : t('Optional')}</small>
      </div>
      <div class="ocr-result-item audit${warningFieldIds.has('g-mode') ? ' warn' : ''}">
        <label>${this.auditFieldLabel('g-mode')}</label>
        <input type="text" data-field="g-mode" value="${escapeHtml(values['g-mode'] || '')}">
        <small>${values['g-mode'] ? t('Field ready') : t('Optional')}</small>
      </div>
      <div class="ocr-result-item audit${warningFieldIds.has('g-opponent') ? ' warn' : ''}">
        <label>${this.auditFieldLabel('g-opponent')}</label>
        <input type="text" data-field="g-opponent" value="${escapeHtml(values['g-opponent'] || '')}">
        <small>${values['g-opponent'] ? t('Field ready') : t('Optional')}</small>
      </div>
      <div class="ocr-result-item audit${warningFieldIds.has('g-teammate') ? ' warn' : ''}">
        <label>${this.auditFieldLabel('g-teammate')}</label>
        <input type="text" data-field="g-teammate" value="${escapeHtml(values['g-teammate'] || '')}">
        <small>${values['g-teammate'] ? t('Field ready') : t('Optional')}</small>
      </div>
    `;
    const hasContextWarning = ['g-result', 'g-grade', 'g-date', 'g-mode', 'g-opponent', 'g-teammate']
      .some(id => warningFieldIds.has(id));
    this.resultGrid.insertAdjacentHTML('beforeend', `
      <details class="ocr-review-section"${hasContextWarning ? ' open' : ''}>
        <summary class="ocr-review-section-head">
          <span>${t('Context')}</span>
          <small>${t('Optional fields are safe to leave blank.')}</small>
        </summary>
        <div class="ocr-review-field-grid">${contextItems}</div>
      </details>
    `);
  },

  // Show editable result grid.
  showEditableResult(staged) {
    this.resultArea.style.display = 'block';
    this.resultGrid.innerHTML = '';

    // Confidence badge
    const conf = staged.score;
    let confClass = 'low', confLabel = t('Low');
    if (conf >= 80) { confClass = 'high'; confLabel = t('High'); }
    else if (conf >= 50) { confClass = 'medium'; confLabel = t('Medium'); }
    this.confidenceBadge.innerHTML = `<span class="ocr-confidence ${confClass}">${t('Confidence')}: ${confLabel} (${Math.round(conf)})</span>`;

    // Strategy badge
    this.strategyBadge.textContent = staged.strategy;

    // Build editable grid
    const warningFieldIds = new Set((staged.warnings || []).flatMap(w => w.fieldIds || []));
    this.renderAuditSummary(staged);
    if (staged.warnings?.length) {
      const warningBox = document.createElement('div');
      warningBox.className = 'ocr-result-warnings';
      warningBox.innerHTML = staged.warnings
        .map(w => `<div>! ${escapeHtml(w.message)}</div>`)
        .join('');
      this.resultGrid.appendChild(warningBox);
    }

    const displayOrder = ['g-pts', 'g-reb', 'g-ast', 'g-stl', 'g-blk', 'g-pf', 'g-to', 'g-pm',
                          'g-fg2m', 'g-fg2a', 'g-fg3m', 'g-fg3a', 'g-ftm', 'g-fta',
                          'g-score-own', 'g-score-opp'];

    this.renderAuditFieldGroup(
      t('Core box score'),
      t('Player production and possession stats.'),
      displayOrder.slice(0, 8),
      warningFieldIds,
      staged,
      { open: true }
    );
    this.renderAuditFieldGroup(
      t('Shooting splits'),
      t('Confirm makes never exceed attempts.'),
      displayOrder.slice(8, 14),
      warningFieldIds,
      staged,
      { open: displayOrder.slice(8, 14).some(id => warningFieldIds.has(id)) }
    );
    this.renderAuditFieldGroup(
      t('Score check'),
      t('Score drives win/loss and plus-minus sync.'),
      displayOrder.slice(14),
      warningFieldIds,
      staged,
      { open: true }
    );
    this.renderContextResultEditors(staged, warningFieldIds);

    this.renderRosterResultEditors(staged.roster || { teammates: [], opponents: [] });
  },

  renderRosterResultEditors(roster) {
    const fields = ['pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'pm'];
    const labels = { teammates: t('Teammates'), opponents: t('Opponents') };
    ['teammates', 'opponents'].forEach(side => {
      const players = Array.isArray(roster[side]) ? roster[side] : [];
      if (!players.length) return;
      const wrap = document.createElement('details');
      wrap.className = 'ocr-roster-review';
      wrap.dataset.ocrRosterSide = side;
      wrap.innerHTML = `
        <summary class="ocr-roster-review-title">
          <span>${labels[side]} (${players.length})</span>
          <small>${t('Edit names and stats before import.')}</small>
        </summary>
        <div class="ocr-roster-review-scroll">
          ${players.map(player => `
            <div class="ocr-roster-row" data-ocr-roster-row>
              <input data-roster-field="name" value="${escapeHtml(player.name || '')}" placeholder="Player">
              <select data-roster-field="position">
                ${['', 'PG', 'SG', 'SF', 'PF', 'C'].map(pos => `<option value="${pos}"${pos === (player.position || '') ? ' selected' : ''}>${pos || '--'}</option>`).join('')}
              </select>
              ${fields.map(field => `<input type="number" data-roster-field="${field}" value="${player[field] ?? ''}" placeholder="${field.toUpperCase()}">`).join('')}
              <select data-roster-field="grade">
                ${['', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F'].map(grade => `<option value="${grade}"${grade === (player.grade || '') ? ' selected' : ''}>${grade || '--'}</option>`).join('')}
              </select>
            </div>
          `).join('')}
        </div>
      `;
      this.resultGrid.appendChild(wrap);
    });
  },

  // Main processing pipeline.
  async processFile(file) {
    this.open();
    this.resetUI();
    this.pendingFile = file;

    if (!file.type || !file.type.startsWith('image/')) {
      this.setStep('load', `${t('Unsupported file type')}: ${file.type || t('Unknown')}`, 'err');
      this.tips.style.display = 'block';
      this.tips.innerHTML = `<strong style="color:var(--red);">! ${t('File is not an image')}</strong><br>${t('Choose a PNG, JPG, or WebP screenshot.')}`;
      return;
    }
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > 20) {
      this.setStep('load', `${t('File too large')}: ${sizeMB.toFixed(1)} MB`, 'err');
      this.tips.style.display = 'block';
      this.tips.innerHTML = `<strong style="color:var(--red);">! ${t('File exceeds 20 MB')}</strong><br>${t('Compress or crop the screenshot.')}`;
      return;
    }

    const url = URL.createObjectURL(file);

    try {
      this.setStep('load', `${t('Read image')} (${sizeMB.toFixed(2)} MB)`, 'active');
      const img = await this.loadImage(url, file);
      this.img.src = url;
      this.setStep('load', `${t('Read image')} (${img.naturalWidth}x${img.naturalHeight})`, 'done');

      if (img.naturalWidth < 200 || img.naturalHeight < 100) {
        this.setStep('prep', `${t('Image too small')} (${img.naturalWidth}x${img.naturalHeight})`, 'err');
        this.tips.style.display = 'block';
        this.tips.innerHTML = `<strong style="color:var(--red);">! ${t('Image resolution is too low')}</strong><br>${t('Use at least 800x400 pixels.')}`;
        return;
      }

      let results = [];

      if (this.currentEngine === 'openai') {
        // === OPENAI VISION STRUCTURED OCR ===
        if (!this.openAIApiKey) {
          throw new Error(t('Configure the OpenAI API Key first from OCR Settings.'));
        }
        this.setStep('prep', t('Optimizing image for OCR'), 'active');
        const optimized = await this.prepareVisionImage(img, file);
        this.setStep('prep', `${t('Image optimized')} (${optimized.width}x${optimized.height}, ${Math.round(optimized.base64.length / 1024)} KB)`, 'done');

        this.setStep('ocr', t('Calling OpenAI Vision'), 'active');
        this.setProgress(10);
        const extracted = await this.runOpenAIVision(optimized.base64);
        this.setProgress(100);
        this.setStep('ocr', `${t('OpenAI Vision complete')} (${extracted.rawText.length} chars)`, 'done');

        const best = this.normalizeVisionExtraction(extracted.data, 'openai-vision-json', extracted.rawText);
        this.setStep('parse', t('Normalize structured data + validation'), 'active');
        best.warnings = [...(best.warnings || []), ...this.validateCandidate(best)];
        best.score = this.scoreCandidate(best);
        this.pendingResult = best;
        const rosterCount = (best.roster?.teammates?.length || 0) + (best.roster?.opponents?.length || 0);
        this.setStep('parse', `${t('Strategy')}: ${best.strategy} / ${t('Recognized')} ${best.fields.length} ${t('fields')} / ${rosterCount} players`, best.fields.length > 0 || rosterCount > 0 ? 'done' : 'err');

        if (best.fields.length > 0 || rosterCount > 0) {
          this.showEditableResult(best);
          this.confirmBtn.disabled = false;
          this.confirmBtn.style.opacity = '1';
        }

        this.tips.style.display = 'block';
        this.tips.innerHTML = `
          <strong>! ${t('Recognition complete. Review the audit desk before importing.')}</strong>
          ${best.fields.length > 0 || rosterCount > 0 ? `<div class="filled-list">${best.fields.map(f => `<span>${f}</span>`).join('')} ${rosterCount ? `<span>${rosterCount} roster players</span>` : ''}</div>` : `<div style="color:var(--red);margin-top:4px;">! ${t('No reliable data recognized. Try cropping to the stats row only.')}</div>`}
          <div class="raw-preview">${escapeHtml(extracted.rawText.slice(0, 600))}</div>
        `;
        return;
      } else if (this.currentEngine === 'zhipu') {
        // === ZHIPU GLM-4V OCR ===
        if (!this.zhipuApiKey) {
          throw new Error(t('Configure the Zhipu API Key first from OCR Settings.'));
        }
        this.setStep('prep', t('Optimizing image for OCR'), 'active');
        const optimized = await this.prepareVisionImage(img, file);
        this.setStep('prep', `${t('Image optimized')} (${optimized.width}x${optimized.height}, ${Math.round(optimized.base64.length / 1024)} KB)`, 'done');

        this.setStep('ocr', t('Calling Zhipu GLM-OCR + structured extraction'), 'active');
        this.setProgress(10);
        const extracted = await this.runZhipuVision(optimized.base64);
        this.setProgress(100);
        this.setStep('ocr', `${t('Zhipu GLM Vision complete')} (${extracted.rawText.length} chars)`, 'done');

        if (extracted.data) {
          const best = this.normalizeVisionExtraction(extracted.data, extracted.strategy, extracted.rawText);
          this.setStep('parse', t('Normalize structured data + validation'), 'active');
          best.warnings = [...(best.warnings || []), ...this.validateCandidate(best)];
          best.score = this.scoreCandidate(best);
          this.pendingResult = best;
          const rosterCount = (best.roster?.teammates?.length || 0) + (best.roster?.opponents?.length || 0);
          this.setStep('parse', `${t('Strategy')}: ${best.strategy} / ${t('Recognized')} ${best.fields.length} ${t('fields')} / ${rosterCount} players`, best.fields.length > 0 || rosterCount > 0 ? 'done' : 'err');

          if (best.fields.length > 0 || rosterCount > 0) {
            this.showEditableResult(best);
            this.confirmBtn.disabled = false;
            this.confirmBtn.style.opacity = '1';
          }

          this.tips.style.display = 'block';
          this.tips.innerHTML = `
            <strong>! ${t('Recognition complete. Review the audit desk before importing.')}</strong>
            ${best.fields.length > 0 || rosterCount > 0 ? `<div class="filled-list">${best.fields.map(f => `<span>${f}</span>`).join('')} ${rosterCount ? `<span>${rosterCount} roster players</span>` : ''}</div>` : `<div style="color:var(--red);margin-top:4px;">! ${t('No reliable data recognized. Try cropping to the stats row only.')}</div>`}
            <div class="raw-preview">${escapeHtml(extracted.rawText.slice(0, 600))}</div>
          `;
          if (best.fields.length > 0 || rosterCount > 0) return;
          results = [{ strategy: `${extracted.strategy || 'zhipu-json'}+text-parse`, confidence: 82, text: extracted.rawText }];
        } else {
          results = [{ strategy: extracted.strategy || 'zhipu-glm-vision-lines', confidence: extracted.confidence || 90, text: extracted.rawText }];
        }
      } else {
        // === TESSERACT LOCAL OCR ===
        this.setStep('prep', t('Preprocessing image variants'), 'active');
        const variants = this.preprocessVariants(img);
        this.setStep('prep', `${t('Preprocessing complete')} / ${variants.length} variants`, 'done');

        this.setStep('ocr', t('Running OCR strategies'), 'active');
        this.setProgress(0);
        results = await this.runOCR(variants);

        if (results.length === 0) {
          throw new Error(t('All OCR strategies failed'));
        }
      }

      // Parse and rank
      this.setStep('parse', t('Parse data + confidence scoring'), 'active');
      const best = this.parseAll(results);
      this.applyGamertagToResult(best);
      this.pendingResult = best;
      const rosterCount = (best.roster?.teammates?.length || 0) + (best.roster?.opponents?.length || 0);
      this.setStep('parse', `${t('Strategy')}: ${best.strategy} / ${t('Recognized')} ${best.fields.length} ${t('fields')} / ${rosterCount} players`, best.fields.length > 0 || rosterCount > 0 ? 'done' : 'err');

      if (best.fields.length > 0 || rosterCount > 0) {
        this.showEditableResult(best);
        this.confirmBtn.disabled = false;
        this.confirmBtn.style.opacity = '1';
      }

      this.tips.style.display = 'block';
      const rawTexts = results.map(r => `[${r.strategy}] (${r.confidence.toFixed(0)}%)\n${r.text.slice(0, 200)}`).join('\n\n');
      this.tips.innerHTML = `
        <strong>! ${t('Recognition complete. Review the audit desk before importing.')}</strong>
        ${best.fields.length > 0 || rosterCount > 0 ? `<div class="filled-list">${best.fields.map(f => `<span>${f}</span>`).join('')} ${rosterCount ? `<span>${rosterCount} roster players</span>` : ''}</div>` : `<div style="color:var(--red);margin-top:4px;">! ${t('No reliable data recognized. Try cropping to the stats row only.')}</div>`}
        <div class="raw-preview">${escapeHtml(rawTexts.slice(0, 600))}</div>
      `;

    } catch (err) {
      console.error('OCR error:', err);
      const errMsg = this.formatError(err);
      this.setStep('err', `${t('Processing failed')}: ${errMsg}`, 'err');
      this.tips.style.display = 'block';
      this.renderErrorTips(errMsg);
    } finally {
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    }
  },

  getCurrentBuildHint() {
    const appState = typeof state !== 'undefined' ? state : null;
    const currentBuild = Array.isArray(appState?.builds)
      ? appState.builds.find(build => build.id === appState.currentBuildId)
      : null;
    const parts = [];
    if (this.myPlayerName) {
      parts.push(`My in-game player name is "${this.myPlayerName}" — if you can clearly see this name in the player list, that row is the controlled player (self=true).`);
    }
    if (currentBuild) {
      parts.push(`Current build: name=${currentBuild.name || 'unknown'} position=${currentBuild.position || 'unknown'} archetype=${currentBuild.archetype || 'unknown'}.`);
    } else {
      parts.push('Current build hint unavailable.');
    }
    return parts.join(' ');
  },

  // Fuzzy player-name matching: case-insensitive, strips spaces/punctuation, allows substring.
  _playerNameMatches(candidateName) {
    if (!this.myPlayerName || !candidateName) return false;
    const norm = s => String(s || '').toLowerCase().replace(/[\s\-_.,·•··]+/g, '').trim();
    const target = norm(this.myPlayerName);
    const cand = norm(candidateName);
    if (!target || !cand) return false;
    // Primary: exact match after normalization
    if (cand === target) return true;
    // Secondary: OCR added extra characters after the real name (e.g. "克托古GG" vs "克托古").
    // Only allow cand.includes(target), NOT target.includes(cand) — that direction
    // would make opponent names that are substrings of the gamertag (e.g. "托古")
    // incorrectly match, causing the opponent to be treated as the controlled player.
    if (target.length >= 3 && cand.length > target.length && cand.includes(target)) return true;
    return false;
  },

  // Post-process any OCR result (Tesseract / text-parse paths) with gamertag detection.
  // Fixes roster team-side errors and fills missing main-player stats from the named row.
  applyGamertagToResult(result) {
    if (!this.myPlayerName || !result?.roster) return;
    const roster = result.roster;
    let gp = (roster.teammates || []).find(p => this._playerNameMatches(p.name));
    if (!gp) {
      gp = (roster.opponents || []).find(p => this._playerNameMatches(p.name));
      if (gp) {
        // Gamertag player was misclassified as opponent — move to teammates
        roster.opponents = roster.opponents.filter(p => p !== gp);
        gp.self = true;
        roster.teammates.unshift(gp);
        result.warnings = result.warnings || [];
        result.warnings.push({ fieldIds: [], message: `"${gp.name}" matched gamertag "${this.myPlayerName}" but was in opponents — corrected to teammates.` });
      }
    } else {
      gp.self = true;
    }
    // Fill missing main-player stat values from the gamertag roster row
    if (!gp || !OCRParser.hasAnyRosterNumber?.(gp)) return;
    const values = result.values || {};
    const fields = result.fields || [];
    const fill = (rk, gk) => {
      if (Number.isFinite(gp[rk]) && values[gk] === undefined) {
        values[gk] = gp[rk];
        fields.push(`${gk.replace(/^g-/, '').toUpperCase()}=${gp[rk]}`);
      }
    };
    fill('pts', 'g-pts'); fill('reb', 'g-reb'); fill('ast', 'g-ast');
    fill('stl', 'g-stl'); fill('blk', 'g-blk'); fill('pf', 'g-pf');
    fill('to', 'g-to'); fill('pm', 'g-pm');
    fill('fgm', 'g-fg2m'); fill('fga', 'g-fg2a');
    fill('fg3m', 'g-fg3m'); fill('fg3a', 'g-fg3a');
    fill('ftm', 'g-ftm'); fill('fta', 'g-fta');
    result.values = values;
    result.fields = fields;
  },

  isSupportedZhipuModel(model) {
    return ['glm-4.6v-flash', 'glm-4v-flash', 'glm-4v-plus-0111', 'glm-4v', 'glm-4v-plus', 'glm-4.1v-flash'].includes(model);
  },

  zhipuSupportsThinking(model) {
    return /glm-(5v|4\.6v|4\.5v|4\.1v)/i.test(String(model || ''));
  },

  isVisionTotalRow(player) {
    const text = [
      player?.name,
      player?.evidence,
      player?.role,
      player?.label,
      player?.type,
    ].filter(Boolean).join(' ');
    return /\b(TOTALS?|TEAM TOTALS?|TEAM STATS?|ALL PLAYERS?|COMBINED|BOX SCORE TOTAL)\b/i.test(text)
      || /(\u603b\u8ba1|\u5408\u8ba1|\u5168\u961f)/.test(text);
  },

  parseVisionJsonText(text, providerName) {
    const cleaned = String(text || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    const first = cleaned.indexOf('{');
    const last = cleaned.lastIndexOf('}');
    const jsonText = first >= 0 && last > first ? cleaned.slice(first, last + 1) : cleaned;
    if (!jsonText) throw new Error(`${providerName} returned empty JSON`);
    try {
      return JSON.parse(jsonText);
    } catch (firstErr) {
      const relaxed = jsonText
        .replace(/,\s*([}\]])/g, '$1')
        .replace(/[\u201c\u201d]/g, '"')
        .replace(/[\u2018\u2019]/g, "'");
      try {
        return JSON.parse(relaxed);
      } catch (secondErr) {
        throw new Error(`${providerName} returned invalid JSON: ${firstErr.message}`);
      }
    }
  },

  visionExtractionSchema() {
    const nullableInt = { type: ['integer', 'null'] };
    const nullableString = { type: ['string', 'null'] };
    const playerSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: nullableString,
        position: { type: ['string', 'null'], enum: ['PG', 'SG', 'SF', 'PF', 'C', null] },
        self: { type: 'boolean' },
        pts: nullableInt,
        reb: nullableInt,
        ast: nullableInt,
        stl: nullableInt,
        blk: nullableInt,
        pf: nullableInt,
        to: nullableInt,
        fgm: nullableInt,
        fga: nullableInt,
        fg3m: nullableInt,
        fg3a: nullableInt,
        ftm: nullableInt,
        fta: nullableInt,
        pm: nullableInt,
        grade: { type: ['string', 'null'], enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F', null] },
        confidence: nullableInt,
        evidence: nullableString,
      },
      required: ['name', 'position', 'self', 'pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'pm', 'grade', 'confidence', 'evidence'],
    };

    return {
      type: 'object',
      additionalProperties: false,
      properties: {
        controlledPlayer: playerSchema,
        score: {
          type: 'object',
          additionalProperties: false,
          properties: {
            own: nullableInt,
            opp: nullableInt,
            result: { type: ['string', 'null'], enum: ['W', 'L', null] },
            evidence: nullableString,
          },
          required: ['own', 'opp', 'result', 'evidence'],
        },
        teammates: { type: 'array', items: playerSchema },
        opponents: { type: 'array', items: playerSchema },
        warnings: { type: 'array', items: { type: 'string' } },
      },
      required: ['controlledPlayer', 'score', 'teammates', 'opponents', 'warnings'],
    };
  },

  visionSystemPrompt() {
    return [
      'Extract NBA 2K postgame box-score data from a screenshot.',
      'Return only data visible in the screenshot.',
      'NBA 2K box score column order: PTS REB AST STL BLK PF TO FG(made-att) 3PT(made-att) FT(made-att) +/- GRADE.',
      'The controlledPlayer is the user/MyPLAYER/current build row, not a team total, opponent total, or all-player total.',
      'Identify controlledPlayer by: grade badge (large A+/A/B+/B/C/D/F letter), highlighted/selected row, MyPLAYER label, or match with current build hint.',
      'If controlledPlayer also appears in teammates, set that teammate row self=true.',
      'Keep teammates and opponents strictly separate. NBA 2K always shows exactly two team sections: MY TEAM (home / left / top / first table — 我方, 队友) followed by OPPONENT (away / right / bottom / second table — 对手, 对手方). The sections are visually divided by a section header label, background color block, jersey/team color change, or a dividing line.',
      'Assign each player to teammates or opponents based solely on the visual section their row physically appears in — NOT based on their name, stats, or any other heuristic. Players in the first/upper section are teammates. Players in the second/lower section are opponents. Never move a player from one section to the other unless a visible header explicitly places them there.',
      'If the hint names an in-game player, look for that exact name in the player list; if clearly visible, that row is the controlled player and must appear in teammates.',
      'Use null for cells that are not visible or uncertain. Do not invent stats.',
      'fgm/fga = total field goals including 3-pointers. fg3m/fg3a = three-pointers only. pf = personal fouls (0-6). pm = plus/minus.',
      'Score own/opp must be from the user perspective. If result is L, own is the lower score unless the visible scoreboard clearly says otherwise.',
      'If a stat column appears cut off or partially visible, read only the digits you can confirm. Use null for uncertain digits.',
    ].join('\n');
  },

  // === OpenAI Vision API ===
  async runOpenAIVision(base64) {
    const endpoint = 'https://api.openai.com/v1/chat/completions';
    const prompt = `${this.getCurrentBuildHint()}\nAnalyze this screenshot and return the requested JSON schema.`;
    const body = {
      model: 'gpt-4.1',
      messages: [
        { role: 'system', content: this.visionSystemPrompt() },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'high',
              },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
      temperature: 0,
      max_tokens: 2200,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'nba2k26_box_score_extract',
          strict: true,
          schema: this.visionExtractionSchema(),
        },
      },
    };
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.openAIApiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const errMsg = errBody.error?.message || errBody.message || `HTTP ${resp.status}`;
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`OpenAI API ${resp.status}: ${errMsg}\nPossible causes: invalid key, missing model permission, or insufficient project access.`);
      }
      throw new Error(`OpenAI API: ${errMsg}`);
    }
    const json = await resp.json();
    const message = json.choices?.[0]?.message;
    if (message?.refusal) throw new Error(`OpenAI refused the OCR request: ${message.refusal}`);
    const text = Array.isArray(message?.content)
      ? message.content.map(part => part.text || '').join('\n').trim()
      : (message?.content || '').trim();
    if (!text) throw new Error('OpenAI Vision did not return usable JSON');
    const data = this.parseVisionJsonText(text, 'OpenAI Vision');
    return { data, rawText: text };
  },

  /*
  normalizeVisionExtractionBroken(data, strategy, rawText) {
    const rootData = data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data;
    const values = {};
    const fields = [];
    const keyToken = key => String(key || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
    const getAny = (obj, aliases) => {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(obj, alias)) return obj[alias];
      }
      const wanted = new Set(aliases.map(keyToken));
      const foundKey = Object.keys(obj).find(key => wanted.has(keyToken(key)));
      return foundKey ? obj[foundKey] : undefined;
    };
    const pickObject = (...aliases) => {
      const direct = getAny(rootData, aliases);
      return direct && typeof direct === 'object' && !Array.isArray(direct) ? direct : {};
    };
    const pickArray = (...aliases) => {
      const direct = getAny(rootData, aliases);
      if (Array.isArray(direct)) return direct;
      if (direct && typeof direct === 'object') return Object.values(direct).filter(item => item && typeof item === 'object');
      return [];
    };
    const modelWarnings = (Array.isArray(getAny(rootData, ['warnings', 'warning', 'issues', 'notes', '警告', '提示'])) ? getAny(rootData, ['warnings', 'warning', 'issues', 'notes', '警告', '提示']) : [])
      .map(message => ({ fieldIds: [], message: String(message || '').trim() }))
      .filter(item => item.message);
    const stage = (id, value, label) => {
      if (value === undefined || value === null || value === '' || Number.isNaN(value)) return;
      values[id] = value;
      fields.push(label);
    };
    const intOrUndef = value => {
      if (value === null || value === undefined || value === '') return undefined;
      const n = parseInt(String(value).replace(/[^\d+-]/g, ''), 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const splitPair = value => {
      const match = String(value ?? '').match(/([+-]?\d{1,3})\s*[-/]\s*([+-]?\d{1,3})/);
      return match ? [parseInt(match[1], 10), parseInt(match[2], 10)] : [];
    };
    const boolValue = value => value === true || /^(1|y|yes|true|self|user)$/i.test(String(value || '').trim());
    const cleanGrade = value => OCRParser.cleanGrade ? OCRParser.cleanGrade(value) : (value || '');
    const normalizePlayer = item => {
      const fg = splitPair(getAny(item, ['fg', 'fieldGoals', 'field_goals', 'fieldGoal', '投篮', '命中投篮']));
      const fg3 = splitPair(getAny(item, ['3pt', '3p', 'threePointers', 'three_pointers', 'threePoint', '三分', '三分球']));
      const ft = splitPair(getAny(item, ['ft', 'freeThrows', 'free_throws', 'freeThrow', '罚球']));
      const out = {
        name: String(getAny(item, ['name', 'player', 'playerName', 'player_name', '球员', '姓名']) || '').trim(),
        position: OCRParser.cleanPosition ? OCRParser.cleanPosition(getAny(item, ['position', 'pos', '位置'])) : (getAny(item, ['position', 'pos', '位置']) || ''),
        self: boolValue(getAny(item, ['self', 'isSelf', 'is_self', 'controlled', 'isControlled', 'myPlayer', 'isMyPlayer', '本人', '自己', '我'])),
        grade: cleanGrade(getAny(item, ['grade', '评分', '评级'])),
      };
      const numberAliases = {
        pts: ['pts', 'points', '得分'],
        reb: ['reb', 'rebounds', '篮板'],
        ast: ['ast', 'assists', '助攻'],
        stl: ['stl', 'steals', '抢断'],
        blk: ['blk', 'blocks', '盖帽'],
        pf: ['pf', 'fls', 'fouls', '犯规'],
        to: ['to', 'tov', 'turnovers', '失误'],
        fgm: ['fgm', 'fieldGoalsMade', 'field_goals_made', '投篮命中'],
        fga: ['fga', 'fieldGoalsAttempted', 'field_goals_attempted', '投篮出手'],
        fg3m: ['fg3m', '3pm', 'threePointersMade', 'three_pointers_made', '三分命中'],
        fg3a: ['fg3a', '3pa', 'threePointersAttempted', 'three_pointers_attempted', '三分出手'],
        ftm: ['ftm', 'freeThrowsMade', 'free_throws_made', '罚球命中'],
        fta: ['fta', 'freeThrowsAttempted', 'free_throws_attempted', '罚球出手'],
        pm: ['pm', 'plusMinus', 'plus_minus', '+/-', '正负值'],
        confidence: ['confidence', '置信度'],
      };
      Object.keys(numberAliases).forEach(key => {
        const n = intOrUndef(getAny(item, numberAliases[key]));
        if (n !== undefined) out[key] = n;
      });
      if (fg.length === 2) { if (out.fgm === undefined) out.fgm = fg[0]; if (out.fga === undefined) out.fga = fg[1]; }
      if (fg3.length === 2) { if (out.fg3m === undefined) out.fg3m = fg3[0]; if (out.fg3a === undefined) out.fg3a = fg3[1]; }
      if (ft.length === 2) { if (out.ftm === undefined) out.ftm = ft[0]; if (out.fta === undefined) out.fta = ft[1]; }
      return out;
    };
    const splitPlayersBySide = (players) => {
      const sides = { teammates: [], opponents: [] };
      players.forEach(item => {
        const side = String(getAny(item, ['side', 'teamSide', 'team_side', 'team', 'role', '阵营', '队伍']) || '').toLowerCase();
        if (/opp|enemy|rival|away|visitor|对手|敌方|客队/.test(side)) sides.opponents.push(item);
        else if (/tm|team|teammate|my|our|home|user|队友|我方|主队/.test(side)) sides.teammates.push(item);
      });
      return sides;
    };
    const rosterObject = pickObject('roster', 'playersBySide', 'boxScore', 'players_by_side', '名单', '球员数据');
    const loosePlayers = pickArray('players', 'playerRows', 'player_rows', 'rows', '球员列表', '球员');
    const looseSides = splitPlayersBySide(loosePlayers);
    const roster = {
      teammates: [
        ...pickArray('teammates', 'myTeam', 'my_team', 'team', 'tm', 'allies', 'homeTeam', 'home_team', '队友', '我方', '主队'),
        ...pickArray.call({ rootData: rosterObject }, 'teammates'),
        ...pickArray('rosterTeammates'),
        ...looseSides.teammates,
      ].map(normalizePlayer).filter(item => item.name || OCRParser.hasAnyRosterNumber?.(item)),
      opponents: [
        ...pickArray('opponents', 'opponentTeam', 'opponent_team', 'opp', 'otherTeam', 'other_team', 'awayTeam', 'away_team', '对手', '敌方', '客队'),
        ...(Array.isArray(rosterObject?.opponents) ? rosterObject.opponents : []),
        ...pickArray('rosterOpponents'),
        ...looseSides.opponents,
      ].map(normalizePlayer).filter(item => item.name || OCRParser.hasAnyRosterNumber?.(item)),
    };

    const rawPlayer = pickObject('controlledPlayer', 'controlled_player', 'myPlayer', 'my_player', 'userPlayer', 'user_player', 'mainPlayer', 'main_player', 'player', '本人', '自己', '我的球员', '受控球员');
    const selfRosterPlayer = roster.teammates.find(item => item.self && OCRParser.hasAnyRosterNumber?.(item));
    let player = rawPlayer;
    if (this.isVisionTotalRow(rawPlayer)) {
      if (selfRosterPlayer) {
        player = selfRosterPlayer;
        modelWarnings.push({ fieldIds: [], message: 'Controlled player looked like a total row; used SELF teammate row instead.' });
      } else {
        player = {};
        modelWarnings.push({ fieldIds: [], message: 'Controlled player looked like a total row; main player stats were left for review.' });
      }
    } else if (!OCRParser.hasAnyRosterNumber?.(normalizePlayer(rawPlayer)) && selfRosterPlayer) {
      player = selfRosterPlayer;
      modelWarnings.push({ fieldIds: [], message: 'Controlled player row was incomplete; used SELF teammate row.' });
    }

    player = normalizePlayer(player);
    stage('g-pts', intOrUndef(player.pts), `PTS=${player.pts}`);
    stage('g-reb', intOrUndef(player.reb), `REB=${player.reb}`);
    stage('g-ast', intOrUndef(player.ast), `AST=${player.ast}`);
    stage('g-stl', intOrUndef(player.stl), `STL=${player.stl}`);
    stage('g-blk', intOrUndef(player.blk), `BLK=${player.blk}`);
    stage('g-pf', intOrUndef(player.pf), `FLS=${player.pf}`);
    stage('g-to', intOrUndef(player.to), `TO=${player.to}`);
    stage('g-pm', intOrUndef(player.pm), `+/-=${player.pm}`);
    stage('g-fg2m', intOrUndef(player.fgm), `FGM=${player.fgm}`);
    stage('g-fg2a', intOrUndef(player.fga), `FGA=${player.fga}`);
    stage('g-fg3m', intOrUndef(player.fg3m), `3PM=${player.fg3m}`);
    stage('g-fg3a', intOrUndef(player.fg3a), `3PA=${player.fg3a}`);
    stage('g-ftm', intOrUndef(player.ftm), `FTM=${player.ftm}`);
    stage('g-fta', intOrUndef(player.fta), `FTA=${player.fta}`);
    const scoreObject = pickObject('score', 'finalScore', 'final_score', '比分', '最终比分');
    const scorePair = splitPair(scoreObject?.score || scoreObject?.final || scoreObject?.text || rootData?.score);
    const own = intOrUndef(getAny(scoreObject, ['own', 'my', 'myScore', 'my_score', 'userScore', 'user_score', 'home', 'our', '我方', '自己', '主队'])) ?? scorePair[0];
    const opp = intOrUndef(getAny(scoreObject, ['opp', 'opponent', 'opponentScore', 'opponent_score', 'away', 'other', '对手', '敌方', '客队'])) ?? scorePair[1];
    stage('g-score-own', own, `OWN=${own}`);
    stage('g-score-opp', opp, `OPP=${opp}`);
    const grade = cleanGrade(player.grade);
    if (grade) stage('g-grade', grade, `GRADE=${grade}`);
    const resultText = String(getAny(scoreObject, ['result', 'outcome', 'winLoss', 'win_loss', '结果', '胜负']) || rootData?.result || '').toUpperCase();
    const result = /^(W|WIN|VICTORY|胜|赢)$/.test(resultText) ? 'W' : /^(L|LOSS|LOSE|DEFEAT|负|输)$/.test(resultText) ? 'L' : '';
    if (result) stage('g-result', result, `RESULT=${result}`);

    return {
      values,
      fields,
      roster,
      strategy,
      baseConfidence: Math.max(80, Math.min(99, intOrUndef(player.confidence) || 94)),
      rawText,
      warnings: modelWarnings,
    };
  },

  */

  normalizeVisionExtraction(data, strategy, rawText) {
    const sourceData = data?.data && typeof data.data === 'object' && !Array.isArray(data.data)
      ? data.data
      : data;
    const rootData = Array.isArray(sourceData) ? { players: sourceData } : (sourceData || {});
    const values = {};
    const fields = [];
    const keyToken = key => String(key || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fff]/g, '');
    const getAny = (obj, aliases) => {
      if (!obj || typeof obj !== 'object') return undefined;
      for (const alias of aliases) {
        if (Object.prototype.hasOwnProperty.call(obj, alias)) return obj[alias];
      }
      const wanted = new Set(aliases.map(keyToken));
      const foundKey = Object.keys(obj).find(key => wanted.has(keyToken(key)));
      return foundKey ? obj[foundKey] : undefined;
    };
    const getObject = (obj, aliases) => {
      const value = getAny(obj, aliases);
      return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
    };
    const getArray = (obj, aliases) => {
      const value = getAny(obj, aliases);
      if (Array.isArray(value)) return value;
      if (value && typeof value === 'object') return Object.values(value).filter(item => item && typeof item === 'object');
      return [];
    };
    const intOrUndef = value => {
      if (value === null || value === undefined || value === '') return undefined;
      const n = parseInt(String(value).replace(/[^\d+-]/g, ''), 10);
      return Number.isFinite(n) ? n : undefined;
    };
    const splitPair = value => {
      if (value && typeof value === 'object') {
        const made = intOrUndef(getAny(value, ['made', 'm', 'fgm', '3pm', 'ftm', '\u547d\u4e2d']));
        const att = intOrUndef(getAny(value, ['attempted', 'attempts', 'a', 'fga', '3pa', 'fta', '\u51fa\u624b']));
        return made !== undefined && att !== undefined ? [made, att] : [];
      }
      const match = String(value ?? '').match(/([+-]?\d{1,3})\s*[-/]\s*([+-]?\d{1,3})/);
      return match ? [parseInt(match[1], 10), parseInt(match[2], 10)] : [];
    };
    const boolValue = value => value === true || /^(1|y|yes|true|self|user|controlled)$/i.test(String(value || '').trim());
    const cleanGrade = value => OCRParser.cleanGrade ? OCRParser.cleanGrade(value) : (value || '');
    const stage = (id, value, label) => {
      if (value === undefined || value === null || value === '' || Number.isNaN(value)) return;
      values[id] = value;
      fields.push(label);
    };

    const warningRaw = getAny(rootData, ['warnings', 'warning', 'issues', 'notes', '\u8b66\u544a', '\u63d0\u793a']);
    const modelWarnings = (Array.isArray(warningRaw) ? warningRaw : [])
      .map(message => ({ fieldIds: [], message: String(message || '').trim() }))
      .filter(item => item.message);

    const normalizePlayer = item => {
      const source = item && typeof item === 'object' ? item : {};
      const stats = getObject(source, ['stats', 'statistics', 'boxScore', 'box_score', 'data', '\u6570\u636e']);
      const read = aliases => getAny(source, aliases) ?? getAny(stats, aliases);
      const fg = splitPair(read(['fg', 'fieldGoals', 'field_goals', 'fieldGoal', '\u6295\u7bee']));
      const fg3 = splitPair(read(['3pt', '3p', 'threePointers', 'three_pointers', 'threePoint', '\u4e09\u5206']));
      const ft = splitPair(read(['ft', 'freeThrows', 'free_throws', 'freeThrow', '\u7f5a\u7403']));
      const out = {
        name: String(read(['name', 'player', 'playerName', 'player_name', '\u7403\u5458', '\u59d3\u540d']) || '').trim(),
        position: OCRParser.cleanPosition ? OCRParser.cleanPosition(read(['position', 'pos', '\u4f4d\u7f6e'])) : (read(['position', 'pos', '\u4f4d\u7f6e']) || ''),
        self: boolValue(read(['self', 'isSelf', 'is_self', 'controlled', 'isControlled', 'myPlayer', 'isMyPlayer', '\u672c\u4eba', '\u81ea\u5df1', '\u6211'])),
        grade: cleanGrade(read(['grade', '\u8bc4\u5206', '\u8bc4\u7ea7'])),
      };
      const numberAliases = {
        pts: ['pts', 'points', '\u5f97\u5206'],
        reb: ['reb', 'rebounds', '\u7bee\u677f'],
        ast: ['ast', 'assists', '\u52a9\u653b'],
        stl: ['stl', 'steals', '\u62a2\u65ad'],
        blk: ['blk', 'blocks', '\u76d6\u5e3d'],
        pf: ['pf', 'fls', 'fouls', '\u72af\u89c4'],
        to: ['to', 'tov', 'turnovers', '\u5931\u8bef'],
        fgm: ['fgm', 'fieldGoalsMade', 'field_goals_made', '\u6295\u7bee\u547d\u4e2d'],
        fga: ['fga', 'fieldGoalsAttempted', 'field_goals_attempted', '\u6295\u7bee\u51fa\u624b'],
        fg3m: ['fg3m', '3pm', 'threePointersMade', 'three_pointers_made', '\u4e09\u5206\u547d\u4e2d'],
        fg3a: ['fg3a', '3pa', 'threePointersAttempted', 'three_pointers_attempted', '\u4e09\u5206\u51fa\u624b'],
        ftm: ['ftm', 'freeThrowsMade', 'free_throws_made', '\u7f5a\u7403\u547d\u4e2d'],
        fta: ['fta', 'freeThrowsAttempted', 'free_throws_attempted', '\u7f5a\u7403\u51fa\u624b'],
        pm: ['pm', 'plusMinus', 'plus_minus', '+/-', '\u6b63\u8d1f\u503c'],
        confidence: ['confidence', '\u7f6e\u4fe1\u5ea6'],
      };
      Object.keys(numberAliases).forEach(key => {
        const n = intOrUndef(read(numberAliases[key]));
        if (n !== undefined) out[key] = n;
      });
      if (fg.length === 2) { if (out.fgm === undefined) out.fgm = fg[0]; if (out.fga === undefined) out.fga = fg[1]; }
      if (fg3.length === 2) { if (out.fg3m === undefined) out.fg3m = fg3[0]; if (out.fg3a === undefined) out.fg3a = fg3[1]; }
      if (ft.length === 2) { if (out.ftm === undefined) out.ftm = ft[0]; if (out.fta === undefined) out.fta = ft[1]; }
      return out;
    };

    const splitPlayersBySide = players => {
      const sides = { teammates: [], opponents: [] };
      players.forEach(item => {
        const side = String(getAny(item, ['side', 'teamSide', 'team_side', 'team', 'role', '\u9635\u8425', '\u961f\u4f0d']) || '').toLowerCase();
        if (/opp|enemy|rival|away|visitor|\u5bf9\u624b|\u654c\u65b9|\u5ba2\u961f/.test(side)) sides.opponents.push(item);
        else if (/tm|teammate|my|our|home|user|\u961f\u53cb|\u6211\u65b9|\u4e3b\u961f/.test(side)) sides.teammates.push(item);
      });
      return sides;
    };

    const rosterObject = getObject(rootData, ['roster', 'playersBySide', 'players_by_side', 'boxScore', 'box_score', '\u540d\u5355', '\u7403\u5458\u6570\u636e']);
    const loosePlayers = getArray(rootData, ['players', 'playerRows', 'player_rows', 'rows', '\u7403\u5458\u5217\u8868', '\u7403\u5458']);
    const looseSides = splitPlayersBySide(loosePlayers);
    const roster = {
      teammates: [
        ...getArray(rootData, ['teammates', 'myTeam', 'my_team', 'team', 'tm', 'allies', 'homeTeam', 'home_team', '\u961f\u53cb', '\u6211\u65b9', '\u4e3b\u961f']),
        ...getArray(rosterObject, ['teammates', 'myTeam', 'my_team', 'team', 'tm', '\u961f\u53cb', '\u6211\u65b9', '\u4e3b\u961f']),
        ...looseSides.teammates,
      ].map(normalizePlayer).filter(item => item.name || OCRParser.hasAnyRosterNumber?.(item)),
      opponents: [
        ...getArray(rootData, ['opponents', 'opponentTeam', 'opponent_team', 'opp', 'otherTeam', 'other_team', 'awayTeam', 'away_team', '\u5bf9\u624b', '\u654c\u65b9', '\u5ba2\u961f']),
        ...getArray(rosterObject, ['opponents', 'opponentTeam', 'opponent_team', 'opp', 'otherTeam', 'awayTeam', '\u5bf9\u624b', '\u654c\u65b9', '\u5ba2\u961f']),
        ...looseSides.opponents,
      ].map(normalizePlayer).filter(item => item.name || OCRParser.hasAnyRosterNumber?.(item)),
    };

    // === Gamertag-based roster correction ===
    // Must run BEFORE rawPlayer resolution so selfRosterPlayer reflects the fix.
    let gamertagRosterPlayer = null;
    if (this.myPlayerName) {
      gamertagRosterPlayer = roster.teammates.find(p => this._playerNameMatches(p.name));
      if (!gamertagRosterPlayer) {
        const gpOpp = roster.opponents.find(p => this._playerNameMatches(p.name));
        if (gpOpp) {
          // Model put the controlled player in the wrong team \u2014 correct it
          roster.opponents = roster.opponents.filter(p => p !== gpOpp);
          gpOpp.self = true;
          roster.teammates.unshift(gpOpp);
          modelWarnings.push({ fieldIds: [], message: `"${gpOpp.name}" matched gamertag "${this.myPlayerName}" but was placed in opponents \u2014 corrected to teammates.` });
          gamertagRosterPlayer = gpOpp;
        }
      } else {
        gamertagRosterPlayer.self = true;
      }
    }

    const rawPlayer = getObject(rootData, ['controlledPlayer', 'controlled_player', 'myPlayer', 'my_player', 'userPlayer', 'user_player', 'mainPlayer', 'main_player', 'player', '\u672c\u4eba', '\u81ea\u5df1', '\u6211\u7684\u7403\u5458', '\u53d7\u63a7\u7403\u5458']);
    const selfRosterPlayer = roster.teammates.find(item => item.self && OCRParser.hasAnyRosterNumber?.(item));
    let player = rawPlayer;

    if (gamertagRosterPlayer && OCRParser.hasAnyRosterNumber?.(gamertagRosterPlayer)) {
      // High-confidence: gamertag name found in roster with stats.
      // Use it unless the AI's controlledPlayer already names the same person.
      const rawNorm = normalizePlayer(rawPlayer);
      if (!this._playerNameMatches(rawNorm.name)) {
        player = gamertagRosterPlayer;
        if (!this.isVisionTotalRow(rawPlayer) && OCRParser.hasAnyRosterNumber?.(rawNorm)) {
          modelWarnings.push({ fieldIds: [], message: `Controlled player overridden with gamertag match "${gamertagRosterPlayer.name}".` });
        }
      }
    } else if (this.isVisionTotalRow(rawPlayer)) {
      if (selfRosterPlayer) {
        player = selfRosterPlayer;
        modelWarnings.push({ fieldIds: [], message: 'Controlled player looked like a total row; used SELF teammate row instead.' });
      } else {
        player = {};
        modelWarnings.push({ fieldIds: [], message: 'Controlled player looked like a total row; main player stats were left for review.' });
      }
    } else if (!OCRParser.hasAnyRosterNumber?.(normalizePlayer(rawPlayer)) && selfRosterPlayer) {
      player = selfRosterPlayer;
      modelWarnings.push({ fieldIds: [], message: 'Controlled player row was incomplete; used SELF teammate row.' });
    }

    player = normalizePlayer(player);
    stage('g-pts', intOrUndef(player.pts), `PTS=${player.pts}`);
    stage('g-reb', intOrUndef(player.reb), `REB=${player.reb}`);
    stage('g-ast', intOrUndef(player.ast), `AST=${player.ast}`);
    stage('g-stl', intOrUndef(player.stl), `STL=${player.stl}`);
    stage('g-blk', intOrUndef(player.blk), `BLK=${player.blk}`);
    stage('g-pf', intOrUndef(player.pf), `FLS=${player.pf}`);
    stage('g-to', intOrUndef(player.to), `TO=${player.to}`);
    stage('g-pm', intOrUndef(player.pm), `+/-=${player.pm}`);
    stage('g-fg2m', intOrUndef(player.fgm), `FGM=${player.fgm}`);
    stage('g-fg2a', intOrUndef(player.fga), `FGA=${player.fga}`);
    stage('g-fg3m', intOrUndef(player.fg3m), `3PM=${player.fg3m}`);
    stage('g-fg3a', intOrUndef(player.fg3a), `3PA=${player.fg3a}`);
    stage('g-ftm', intOrUndef(player.ftm), `FTM=${player.ftm}`);
    stage('g-fta', intOrUndef(player.fta), `FTA=${player.fta}`);

    const scoreRaw = getAny(rootData, ['score', 'finalScore', 'final_score', '\u6bd4\u5206', '\u6700\u7ec8\u6bd4\u5206']);
    const scoreObject = scoreRaw && typeof scoreRaw === 'object' && !Array.isArray(scoreRaw) ? scoreRaw : {};
    const scorePair = splitPair(scoreRaw);
    const own = intOrUndef(getAny(scoreObject, ['own', 'my', 'myScore', 'my_score', 'userScore', 'user_score', 'home', 'our', '\u6211\u65b9', '\u81ea\u5df1', '\u4e3b\u961f'])) ?? scorePair[0];
    const opp = intOrUndef(getAny(scoreObject, ['opp', 'opponent', 'opponentScore', 'opponent_score', 'away', 'other', '\u5bf9\u624b', '\u654c\u65b9', '\u5ba2\u961f'])) ?? scorePair[1];
    stage('g-score-own', own, `OWN=${own}`);
    stage('g-score-opp', opp, `OPP=${opp}`);
    const grade = cleanGrade(player.grade);
    if (grade) stage('g-grade', grade, `GRADE=${grade}`);
    const resultText = String(getAny(scoreObject, ['result', 'outcome', 'winLoss', 'win_loss', '\u7ed3\u679c', '\u80dc\u8d1f']) || getAny(rootData, ['result', 'outcome', '\u7ed3\u679c']) || '').toUpperCase();
    const result = /^(W|WIN|VICTORY|\u80dc|\u8d62)$/.test(resultText) ? 'W' : /^(L|LOSS|LOSE|DEFEAT|\u8d1f|\u8f93)$/.test(resultText) ? 'L' : '';
    if (result) stage('g-result', result, `RESULT=${result}`);

    return {
      values,
      fields,
      roster,
      strategy,
      baseConfidence: Math.max(80, Math.min(99, intOrUndef(player.confidence) || 94)),
      rawText,
      warnings: modelWarnings,
    };
  },

  zhipuVisionSystemPrompt() {
    return [
      'You extract NBA 2K postgame box-score data from screenshots.',
      'Return only valid JSON when asked for JSON. No markdown or commentary.',
      'NBA 2K box score column order: PTS REB AST STL BLK PF TO FG(made-att) 3PT(made-att) FT(made-att) +/- GRADE.',
      'The controlled player is the user/MyPLAYER/current build row. It is never a team total, opponent total, all-player total, or summary row.',
      'Identify controlledPlayer by: grade badge (large A+/A/B+/B/C/D/F letter near the row), highlighted/selected row, MyPLAYER label, or current build hint.',
      'Use visual evidence such as highlight, selected row, MyPLAYER marker, player card focus, grade panel, cursor, and current build hint.',
      'Keep teammates and opponents strictly separate. NBA 2K always shows exactly two team sections: MY TEAM (home / left / top / first table — 我方, 队友) then OPPONENT (away / right / bottom / second table — 对手, 对手方). Sections are divided by a section header label, background color block, jersey/team color change, or a dividing line.',
      'Assign each player to teammates or opponents based solely on which visual section their row physically appears in. First/upper section rows are teammates. Second/lower section rows are opponents. Do not reassign any player between sections based on their name, stats, or any other reasoning. If two complete tables are visible, every row in the first table is a teammate and every row in the second table is an opponent.',
      'If the hint names an in-game player, look for that exact name in the player list; if clearly visible, that row is the controlled player and must be in teammates.',
      'Use null for uncertain cells. Do not guess hidden stats.',
      'fgm/fga = total field goals (includes 3-pointers). fg3m/fg3a = three-pointers only. pf = fouls (0-6). pm = plus/minus.',
    ].join('\n');
  },

  zhipuJsonPrompt() {
    return [
      this.getCurrentBuildHint(),
      'Analyze the screenshot and return exactly one JSON object with this shape:',
      '{"controlledPlayer":{"name":null,"position":null,"self":true,"pts":null,"reb":null,"ast":null,"stl":null,"blk":null,"pf":null,"to":null,"fgm":null,"fga":null,"fg3m":null,"fg3a":null,"ftm":null,"fta":null,"pm":null,"grade":null,"confidence":0,"evidence":null},"score":{"own":null,"opp":null,"result":null,"evidence":null},"teammates":[],"opponents":[],"warnings":[]}',
      'Player objects in teammates/opponents use the same fields as controlledPlayer.',
      'Set self=true only on the controlled player row inside teammates. All opponents must have self=false.',
      'Team assignment rule: put every player in the section their row physically appears in. First/upper table rows → teammates. Second/lower table rows → opponents. Never move a player between sections based on name or stats.',
      'Do not put TOTAL, TEAM TOTAL, ALL PLAYERS, or summary rows in controlledPlayer or roster arrays.',
      'NBA 2K box score column order: PTS REB AST STL BLK PF TO FG(made-att) 3PT(made-att) FT(made-att) +/- GRADE.',
      'fgm/fga = TOTAL field goals including 3-pointers. fg3m/fg3a = three-pointers only. pf = personal fouls (0-6). pm = plus/minus.',
      'score.own and score.opp are from the user perspective. If result is L, own is normally the lower score unless the screenshot clearly says otherwise.',
      'Identify controlledPlayer by: grade badge (large letter A+/A/B+/B/C/D/F), highlighted row, MyPLAYER label, or current build hint name/position match.',
      'If a cell is blurry or not visible, use null and add a short warning.',
    ].join('\n');
  },

  zhipuTextExtractionPrompt(ocrText) {
    return [
      this.getCurrentBuildHint(),
      'Extract NBA 2K postgame stats from the OCR text below.',
      'Return exactly one JSON object with this shape:',
      '{"controlledPlayer":{"name":null,"position":null,"self":true,"pts":null,"reb":null,"ast":null,"stl":null,"blk":null,"pf":null,"to":null,"fgm":null,"fga":null,"fg3m":null,"fg3a":null,"ftm":null,"fta":null,"pm":null,"grade":null,"confidence":0,"evidence":null},"score":{"own":null,"opp":null,"result":null,"evidence":null},"teammates":[],"opponents":[],"warnings":[]}',
      'Important rules:',
      '- controlledPlayer is the user/MyPLAYER/current build row, never TOTAL, TEAM TOTAL, ALL PLAYERS, or summary rows.',
      '- If a row is marked MY, SELF, USER, controlled, highlighted, or matches the current build hint, use it as controlledPlayer and set the matching teammate self=true.',
      '- Keep my team and opponent rows strictly separate. Each player belongs to the section their row appears in: first/upper section = teammates, second/lower section = opponents. Use section headings (MY TEAM / OPPONENT / HOME / AWAY / 我方 / 对手), background color blocks, jersey color groups, and table order. Never reassign a player between sections based on their name or stats.',
      '- For shooting splits like 7-13 or 7/13, set made and attempts separately. fgm/fga are total field goals; fg3m/fg3a are three-pointers; ftm/fta are free throws.',
      '- If uncertain, use null and add a warning. Do not invent stats.',
      'OCR text:',
      String(ocrText || '').slice(0, 12000),
    ].join('\n');
  },

  zhipuLineSystemPrompt() {
    return [
      'You are a thorough NBA 2K box-score reader.',
      'You MUST list every player visible in the screenshot — both teams, all rows.',
      'A standard 5-on-5 game has approximately 5 TM lines and 5 OPP lines.',
      'Do NOT stop after the controlled player. Continue until every visible player has been output.',
      'Output plain lines only. No markdown, no JSON, no commentary.',
    ].join(' ');
  },

  zhipuLinePrompt() {
    return [
      'NBA2K box score OCR. Output plain lines only.',
      this.getCurrentBuildHint(),
      'CRITICAL: You must output a TM row for EVERY visible player on my team and an OPP row for EVERY visible player on the opponent team. A 5-on-5 game has ~5 TM lines and ~5 OPP lines. Do not stop after the controlled player — enumerate the entire roster.',
      'NBA 2K column order: PTS REB AST STL BLK PF TO FG(made-att) 3PT(made-att) FT(made-att) +/-.',
      'Main line keys: PTS REB AST STL BLK FLS TO PM FG 3PT FT SCORE GRADE RESULT.',
      'Main line must be the controlled player / MyPLAYER stats only. Never use team total, opponent total, or all-player total for main keys.',
      'Always output one MY line for the controlled player. If the controlled player also appears in the teammate roster, include SELF=1 on that TM row.',
      'Use user highlight, MyPLAYER marker, current build hint, player-card focus, grade panel (A+/A/B+/B/C/D/F), cursor/selection, or camera focus to locate the controlled player.',
      'If a TOTAL, Team Total, or All Players row is visible, ignore it for main keys. You may omit totals entirely.',
      'Rows: TM or OPP NAME=<name> POS=<PG/SG/SF/PF/C> SELF=<1 only for controlled player> PTS REB AST STL BLK FLS TO FGM FGA 3PM 3PA FTM FTA PM GRADE.',
      'Every roster player line must start with TM or OPP. Never leave roster side unlabeled.',
      'TM means my team / teammates / user side. OPP means opponent / enemy / other side.',
      'Use visible section headers, scoreboard sides, jersey/team blocks, and table position to keep the two rosters separate.',
      'If the screenshot shows two player tables, keep the entire my-team table as TM and the other table as OPP. Do not mix rows between sides.',
      'FGM/FGA = total field goals. 3PM/3PA = three-pointers. FTM/FTA = free throws. If FT is 0-0 or not visible, omit FT entirely.',
      'Read every visible TM/OPP player. Omit invisible cells. No markdown/no JSON.',
      'Example output (all players listed — do not stop early):',
      'MY PTS=22 REB=3 AST=8 STL=2 BLK=0 FLS=2 TO=2 PM=+10 FG=9-15 3PT=3-7 FT=1-1 SCORE=78-70 RESULT=W GRADE=A',
      'TM NAME=Jay Hoops POS=SG SELF=1 PTS=22 REB=3 AST=8 STL=2 BLK=0 FLS=2 TO=2 FGM=9 FGA=15 3PM=3 3PA=7 FTM=1 FTA=1 PM=+10 GRADE=A',
      'TM NAME=Big Man POS=C PTS=14 REB=12 AST=1 STL=0 BLK=3 FLS=4 TO=1 FGM=6 FGA=9 3PM=0 3PA=0 FTM=2 FTA=3 PM=+8 GRADE=B+',
      'TM NAME=Point Guard POS=PG PTS=18 REB=4 AST=11 STL=3 BLK=0 FLS=2 TO=2 FGM=7 FGA=14 3PM=2 3PA=5 PM=+6 GRADE=A-',
      'OPP NAME=Rival Guard POS=PG PTS=16 REB=2 AST=9 STL=1 BLK=0 FLS=1 TO=3 FGM=6 FGA=13 3PM=2 3PA=6 FTM=2 FTA=2 PM=-8',
      'OPP NAME=Rival Big POS=PF PTS=20 REB=8 AST=2 STL=0 BLK=2 FLS=3 TO=1 FGM=8 FGA=14 3PM=1 3PA=3 FTM=3 FTA=4 PM=-5',
      'OPP NAME=Rival Wing POS=SF PTS=12 REB=5 AST=3 STL=2 BLK=1 FLS=2 TO=2 FGM=5 FGA=11 3PM=2 3PA=4 PM=-6',
    ].join('\n');
  },

  createZhipuVisionBody(base64, options = {}) {
    const model = this.isSupportedZhipuModel(this.zhipuModel) ? this.zhipuModel : 'glm-4.6v-flash';
    const wantJson = options.mode !== 'lines';
    const body = {
      model,
      messages: [
        { role: 'system', content: wantJson ? this.zhipuVisionSystemPrompt() : this.zhipuLineSystemPrompt() },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } },
            { type: 'text', text: wantJson ? this.zhipuJsonPrompt() : this.zhipuLinePrompt() },
          ],
        },
      ],
      stream: false,
      temperature: 0,
      do_sample: false,
      max_tokens: wantJson ? 2200 : 2000,
    };
    if (wantJson && options.responseFormat !== false) {
      body.response_format = { type: 'json_object' };
    }
    if (this.zhipuSupportsThinking(model)) {
      body.thinking = { type: 'disabled' };
    }
    return body;
  },

  createZhipuTextExtractionBody(ocrText, options = {}) {
    const body = {
      model: 'glm-4.7-flash',
      messages: [
        {
          role: 'system',
          content: 'You convert noisy OCR text into strict NBA 2K box-score JSON. Return only valid JSON.',
        },
        {
          role: 'user',
          content: this.zhipuTextExtractionPrompt(ocrText),
        },
      ],
      stream: false,
      temperature: 0,
      do_sample: false,
      max_tokens: 2200,
    };
    if (options.responseFormat !== false) {
      body.response_format = { type: 'json_object' };
    }
    return body;
  },

  // === ZHIPU GLM Vision API ===
  async callZhipuChatCompletion(body) {
    const endpoint = 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.zhipuApiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const errMsg = errBody.error?.message || errBody.message || errBody.msg || `HTTP ${resp.status}`;
      if (resp.status === 401 || resp.status === 403) {
        throw new Error(`Zhipu API ${resp.status}: ${errMsg}\nPossible causes: invalid key, missing permission, insufficient balance, or model unavailable.`);
      }
      throw new Error(`Zhipu API: ${errMsg}`);
    }
    const json = await resp.json();
    const content = json.choices?.[0]?.message?.content;
    const text = Array.isArray(content)
      ? content.map(part => part.text || '').join('\n').trim()
      : (content || '').trim();
    if (!text) throw new Error('Zhipu GLM-4V did not return usable text');
    return text;
  },

  async runZhipuLayoutOCR(base64) {
    const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/layout_parsing', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.zhipuApiKey}`,
      },
      body: JSON.stringify({
        model: 'glm-ocr',
        file: base64,
        return_crop_images: false,
        need_layout_visualization: false,
      }),
    });
    if (!resp.ok) {
      const errBody = await resp.json().catch(() => ({}));
      const errMsg = errBody.error?.message || errBody.message || errBody.msg || `HTTP ${resp.status}`;
      throw new Error(`Zhipu GLM-OCR: ${errMsg}`);
    }
    const json = await resp.json();
    const layoutText = [];
    (Array.isArray(json.layout_details) ? json.layout_details.flat(3) : []).forEach(item => {
      if (item?.content) layoutText.push(String(item.content));
    });
    const markdown = Array.isArray(json.md_results) ? json.md_results.join('\n') : json.md_results;
    const text = [markdown, ...layoutText].filter(Boolean).join('\n').trim();
    if (!text) throw new Error('Zhipu GLM-OCR did not return usable text');
    return text;
  },

  async runZhipuTextExtraction(ocrText, strategy) {
    try {
      const rawText = await this.callZhipuChatCompletion(this.createZhipuTextExtractionBody(ocrText, { responseFormat: true }));
      const data = this.parseVisionJsonText(rawText, 'Zhipu GLM text extraction');
      return {
        data,
        rawText: `${rawText}\n\n--- GLM-OCR TEXT ---\n${ocrText}`.trim(),
        strategy,
      };
    } catch (err) {
      const message = String(err?.message || err || '');
      const canRetryWithoutResponseFormat = /response_format|json|JSON|schema|unsupported|not support|\u4e0d\u652f\u6301|\u53c2\u6570/i.test(message);
      if (!canRetryWithoutResponseFormat) throw err;
      const rawText = await this.callZhipuChatCompletion(this.createZhipuTextExtractionBody(ocrText, { responseFormat: false }));
      const data = this.parseVisionJsonText(rawText, 'Zhipu GLM text extraction');
      return {
        data,
        rawText: `${rawText}\n\n--- GLM-OCR TEXT ---\n${ocrText}`.trim(),
        strategy: `${strategy}-prompt-json`,
      };
    }
  },

  async runZhipuVision(base64) {
    const model = this.isSupportedZhipuModel(this.zhipuModel) ? this.zhipuModel : 'glm-4.6v-flash';
    let layoutText = '';
    try {
      layoutText = await this.runZhipuLayoutOCR(base64);
      if (layoutText) {
        try {
          return await this.runZhipuTextExtraction(layoutText, 'zhipu-glm-ocr+glm-4.7-flash-json');
        } catch (err) {
          console.warn('Zhipu GLM-OCR text extraction fallback:', err);
        }
      }
    } catch (err) {
      console.warn('Zhipu GLM-OCR first pass skipped:', err);
    }

    try {
      const rawText = await this.callZhipuChatCompletion(this.createZhipuVisionBody(base64, { mode: 'json', responseFormat: true }));
      const data = this.parseVisionJsonText(rawText, 'Zhipu GLM Vision');
      return { data, rawText: [rawText, layoutText && `--- GLM-OCR TEXT ---\n${layoutText}`].filter(Boolean).join('\n\n'), strategy: `zhipu-${model}-json` };
    } catch (err) {
      const message = String(err?.message || err || '');
      const canRetryWithoutResponseFormat = /response_format|json|JSON|schema|unsupported|not support|\u4e0d\u652f\u6301|\u53c2\u6570/i.test(message);
      if (!canRetryWithoutResponseFormat) throw err;
      console.warn('Zhipu structured OCR fallback:', err);
    }

    try {
      const rawText = await this.callZhipuChatCompletion(this.createZhipuVisionBody(base64, { mode: 'json', responseFormat: false }));
      const data = this.parseVisionJsonText(rawText, 'Zhipu GLM Vision');
      return { data, rawText: [rawText, layoutText && `--- GLM-OCR TEXT ---\n${layoutText}`].filter(Boolean).join('\n\n'), strategy: `zhipu-${model}-json-prompt` };
    } catch (err) {
      console.warn('Zhipu JSON prompt fallback:', err);
    }

    const rawText = await this.callZhipuChatCompletion(this.createZhipuVisionBody(base64, { mode: 'lines', responseFormat: false }));
    if (layoutText) {
      return {
        rawText: `${rawText}\n\n${layoutText}`.trim(),
        strategy: `zhipu-${model}-lines+glm-ocr`,
        confidence: 93,
      };
    }
    return { rawText, strategy: `zhipu-${model}-lines`, confidence: model.includes('flash') ? 88 : 92 };
  },

  _sharpenImageData(ctx, w, h) {
    const src = ctx.getImageData(0, 0, w, h);
    const dst = ctx.createImageData(w, h);
    const s = src.data;
    const d = dst.data;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          // Laplacian sharpening blended 40% sharp + 60% original
          const sharpened = 5 * s[i + c]
            - s[((y - 1) * w + x) * 4 + c]
            - s[((y + 1) * w + x) * 4 + c]
            - s[(y * w + x - 1) * 4 + c]
            - s[(y * w + x + 1) * 4 + c];
          d[i + c] = Math.max(0, Math.min(255, (sharpened + s[i + c]) >> 1));
        }
        d[i + 3] = 255;
      }
    }
    for (let x = 0; x < w; x++) {
      let i = x * 4; d[i] = s[i]; d[i+1] = s[i+1]; d[i+2] = s[i+2]; d[i+3] = 255;
      i = ((h - 1) * w + x) * 4; d[i] = s[i]; d[i+1] = s[i+1]; d[i+2] = s[i+2]; d[i+3] = 255;
    }
    for (let y = 1; y < h - 1; y++) {
      let i = y * w * 4; d[i] = s[i]; d[i+1] = s[i+1]; d[i+2] = s[i+2]; d[i+3] = 255;
      i = (y * w + w - 1) * 4; d[i] = s[i]; d[i+1] = s[i+1]; d[i+2] = s[i+2]; d[i+3] = 255;
    }
    ctx.putImageData(dst, 0, 0);
  },

  prepareVisionImage(img, file) {
    const source = img._isBitmap ? img._bitmap : img;
    const naturalW = img.naturalWidth || source.width;
    const naturalH = img.naturalHeight || source.height;
    const maxSide = 2000;
    const minSide = 900;
    let scale = Math.min(1, maxSide / Math.max(naturalW, naturalH));
    if (Math.max(naturalW, naturalH) < minSide) {
      scale = Math.min(2, minSide / Math.max(naturalW, naturalH));
    }
    const width = Math.max(1, Math.round(naturalW * scale));
    const height = Math.max(1, Math.round(naturalH * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(source, 0, 0, width, height);
    if (img._isBitmap && source.close) source.close();
    this._sharpenImageData(ctx, width, height);

    const asBase64 = (dataUrl) => {
      const idx = dataUrl.indexOf(',');
      return idx >= 0 ? dataUrl.slice(idx + 1) : dataUrl;
    };
    const jpeg = canvas.toDataURL('image/jpeg', 0.90);
    const base64 = asBase64(jpeg);
    const originalSize = file?.size || 0;
    return Promise.resolve({
      base64,
      width,
      height,
      compressionRatio: originalSize ? base64.length / originalSize : 0,
    });
  },


  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const idx = result.indexOf(',');
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () => reject(new Error(t('File read failed')));
      reader.readAsDataURL(file);
    });
  },

  renderErrorTips(errMsg) {
    const isApiKey = /API Key|OpenAI API|Zhipu API|401|403|permission|balance|model unavailable|project access|config/i.test(errMsg);
    const isSandbox = /Worker|SecurityError|Content Security Policy|blob/i.test(errMsg);
    const isNetwork = /Failed to fetch|NetworkError|ERR_|CORS/i.test(errMsg);

    if (isApiKey) {
      this.tips.innerHTML = `
        <strong style="color:var(--yellow);">! ${escapeHtml(errMsg)}</strong>
        <div style="margin-top:10px;padding:10px;background:var(--yellow-soft);border-left:3px solid var(--yellow);border-radius:0 4px 4px 0;">
          ${t('Open OCR Settings, enter an OpenAI or Zhipu API Key, then try again. Confirm account balance, model permission, and key status.')}
        </div>`;
    } else if (isSandbox && this.currentEngine === 'tesseract') {
      this.tips.innerHTML = `
        <strong style="color:var(--yellow);">! ${t('Sandbox does not support Tesseract')}</strong>
        <div style="margin-top:10px;padding:10px;background:var(--green-soft);border-left:3px solid var(--green);border-radius:0 4px 4px 0;">
          <strong style="color:var(--green);">OK</strong><br>
          ${t('Switch to OpenAI Vision or Zhipu GLM-4V, or download the HTML and run it locally.')}
        </div>`;
    } else if (isNetwork) {
      this.tips.innerHTML = `
        <strong style="color:var(--red);">! ${t('Network request failed')}</strong>
        <div style="margin-top:8px;line-height:1.7;color:var(--text-dim);">
          ${t('Possible causes: network interruption, firewall blocking, Zhipu API unavailable, or browser cross-origin restrictions.')}
        </div>`;
    } else {
      this.tips.innerHTML = `<strong style="color:var(--red);">! ${escapeHtml(errMsg)}</strong><div style="margin-top:8px;color:var(--text-dim);font-size:11px;">${t('Suggestion: check image format and clarity, or switch OCR engines and retry.')}</div>`;
    }
  },


  formatError(err) {
    if (!err) return t('Unknown error');
    if (typeof err === 'string') return err;
    if (err.message) return err.message;
    try { return JSON.stringify(err); } catch { return String(err); }
  },

  // Apply: read from editable grid (not just pendingResult)
  applyStaged() {
    let count = 0;
    const applied = [];
    const review = [];
    const coreFields = ['g-pts', 'g-reb', 'g-ast', 'g-score-own', 'g-score-opp'];
    const warningFieldIds = new Set((this.pendingResult?.warnings || []).flatMap(w => w.fieldIds || []));
    const labelFor = id => this.auditFieldLabel(id);
    const appliedIds = new Set();

    document.querySelectorAll('.ocr-filled').forEach(el => el.classList.remove('ocr-filled'));
    // Read from editable grid first
    const inputs = this.resultGrid.querySelectorAll('input[data-field], select[data-field]');
    inputs.forEach(inp => {
      const id = inp.dataset.field;
      const val = inp.value.trim();
      if (val !== '') {
        const el = document.getElementById(id);
        if (el) {
          el.value = val;
          el.classList.add('ocr-filled');
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          applied.push(labelFor(id));
          if (warningFieldIds.has(id)) review.push(labelFor(id));
          appliedIds.add(id);
          count++;
        }
      }
    });

    // Also apply grade and result from pendingResult (not in grid)
    if (this.pendingResult?.values) {
      ['g-grade', 'g-result', 'g-date', 'g-mode', 'g-opponent', 'g-teammate'].forEach(id => {
        if (this.pendingResult.values[id] && !appliedIds.has(id)) {
          const el = document.getElementById(id);
          if (el) {
            el.value = this.pendingResult.values[id];
            el.classList.add('ocr-filled');
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            applied.push(labelFor(id));
            if (warningFieldIds.has(id)) review.push(labelFor(id));
            count++;
          }
        }
      });
    }

    const rosterApplied = this.applyRosterFromEditors();
    count += rosterApplied.count;
    applied.push(...rosterApplied.labels);

    coreFields.forEach(id => {
      if (!this.pendingResult?.values?.[id] && !applied.includes(labelFor(id))) review.push(labelFor(id));
    });
    if (window.NBA2K26_GAME_FORM?.refreshGameModalPreview) {
      window.NBA2K26_GAME_FORM.refreshGameModalPreview();
    }
    this.renderApplyStatus(applied, review);
    this.close();
    toast(`${t('Applied')} ${count} ${t('data fields')}`);
    return count;
  },

  applyRosterFromEditors() {
    const labels = [];
    let count = 0;
    ['teammates', 'opponents'].forEach(side => {
      const wrap = this.resultGrid.querySelector(`[data-ocr-roster-side="${side}"]`);
      if (!wrap) return;
      const players = [...wrap.querySelectorAll('[data-ocr-roster-row]')].map(row => this.readRosterEditorRow(row))
        .filter(player => player.name || Object.keys(player).some(key => key !== 'position' && key !== 'grade' && player[key]));
      if (!players.length) return;
      const container = document.getElementById(`g-${side}-rows`);
      if (!container) return;
      container.innerHTML = '';
      players.forEach(player => {
        window.NBA2K26_GAME_FORM?.addRosterRow?.(side, player);
      });
      window.NBA2K26_GAME_FORM?.setRosterDetail?.(side, true);
      labels.push(`${side === 'teammates' ? t('Teammates') : t('Opponents')} x${players.length}`);
      count += players.length;
    });
    return { count, labels };
  },

  readRosterEditorRow(row) {
    const numberFields = ['pts', 'reb', 'ast', 'stl', 'blk', 'pf', 'to', 'fgm', 'fga', 'fg3m', 'fg3a', 'ftm', 'fta', 'pm'];
    const player = {
      name: row.querySelector('[data-roster-field="name"]')?.value.trim() || '',
      position: row.querySelector('[data-roster-field="position"]')?.value || '',
      grade: row.querySelector('[data-roster-field="grade"]')?.value || '',
    };
    numberFields.forEach(field => {
      const raw = row.querySelector(`[data-roster-field="${field}"]`)?.value;
      if (raw !== '' && raw !== undefined) player[field] = parseInt(raw, 10) || 0;
    });
    return player;
  },

  renderApplyStatus(applied, review) {
    const box = document.getElementById('ocr-apply-status');
    if (!box) return;
    const uniqueApplied = [...new Set(applied)].slice(0, 18);
    const uniqueReview = [...new Set(review)].filter(Boolean).slice(0, 10);
    const warnings = this.pendingResult?.warnings || [];
    box.classList.add('active');
    box.innerHTML = `
      <div class="ocr-apply-title">${t('OCR APPLIED')}</div>
      <div class="ocr-apply-meta">
        ${uniqueApplied.length} ${t('fields filled from')} ${escapeHtml(this.pendingResult?.strategy || 'OCR')}.
        ${uniqueReview.length ? `${uniqueReview.length} ${t('fields need review before saving.')}` : t('No required review flags from the parser.')}
      </div>
      ${uniqueApplied.length ? `<div class="ocr-apply-chip-row">${uniqueApplied.map(label => `<span class="ocr-apply-chip">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
      ${uniqueReview.length ? `<div class="ocr-apply-chip-row">${uniqueReview.map(label => `<span class="ocr-apply-chip warn">${escapeHtml(label)}</span>`).join('')}</div>` : ''}
      ${warnings.length ? `<div class="ocr-apply-meta" style="margin-top:8px;">${warnings.map(w => escapeHtml(w.message)).join(' / ')}</div>` : ''}
    `;
  },

  loadImage(src, file) {
    return new Promise((resolve, reject) => {
      if (file && typeof createImageBitmap === 'function') {
        createImageBitmap(file).then(bitmap => {
          resolve({ naturalWidth: bitmap.width, naturalHeight: bitmap.height, _bitmap: bitmap, _isBitmap: true });
        }).catch(() => { this._loadImageEl(src, resolve, reject); });
      } else {
        this._loadImageEl(src, resolve, reject);
      }
    });
  },

  _loadImageEl(src, resolve, reject) {
    const img = new Image();
    let timer = setTimeout(() => reject(new Error(t('Image load timed out'))), 10000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error(t('Browser could not decode this image format'))); };
    img.src = src;
  },
};

// Global helpers wired to onclick attributes
function closeOCRModal() { OCR.close(); }
function confirmOCR() { OCR.applyStaged(); }

// === OCR SETTINGS MODAL ===
function openOCRSettings() {
  document.getElementById('ocr-default-engine').value = OCR.currentEngine;
  document.getElementById('openai-api-key').value = OCR.openAIApiKey || '';
  document.getElementById('zhipu-api-key').value = OCR.zhipuApiKey || '';
  const modelSelect = document.getElementById('zhipu-model');
  if (modelSelect) modelSelect.value = OCR.isSupportedZhipuModel(OCR.zhipuModel) ? OCR.zhipuModel : 'glm-4.6v-flash';
  const openAIStatus = document.getElementById('openai-key-status');
  openAIStatus.className = 'key-status';
  openAIStatus.textContent = OCR.openAIApiKey ? `${t('Saved')} / ${t('Length')} ${OCR.openAIApiKey.length}` : t('Not configured');
  const status = document.getElementById('zhipu-key-status');
  status.className = 'key-status';
  status.textContent = OCR.zhipuApiKey ? `${t('Saved')} / ${t('Length')} ${OCR.zhipuApiKey.length}` : t('Not configured');
  const playerNameEl = document.getElementById('ocr-player-name');
  if (playerNameEl) playerNameEl.value = OCR.myPlayerName || '';
  document.getElementById('ocr-settings-modal').classList.add('active');
}

function closeOCRSettings() {
  document.getElementById('ocr-settings-modal').classList.remove('active');
}

function saveOCRSettings() {
  const engine = document.getElementById('ocr-default-engine').value;
  const openAIKey = document.getElementById('openai-api-key').value.trim();
  const key = document.getElementById('zhipu-api-key').value.trim();
  const model = document.getElementById('zhipu-model')?.value;
  OCR.currentEngine = engine;
  OCR.openAIApiKey = openAIKey || null;
  OCR.zhipuApiKey = key || null;
  OCR.myPlayerName = document.getElementById('ocr-player-name')?.value.trim() || null;
  OCR.zhipuModel = OCR.isSupportedZhipuModel(model) ? model : (OCR.isSupportedZhipuModel(OCR.zhipuModel) ? OCR.zhipuModel : 'glm-4.6v-flash');
  OCR.saveSettings();
  OCR.applyEngineUI();
  toast(t('OCR settings saved'));
  closeOCRSettings();
}

async function testOpenAIKey() {
  const key = document.getElementById('openai-api-key').value.trim();
  const status = document.getElementById('openai-key-status');
  if (!key) {
    status.className = 'key-status err';
    status.textContent = t('Enter a key first');
    return;
  }
  status.className = 'key-status';
  status.textContent = `${t('Testing')}...`;
  try {
    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [{ role: 'user', content: 'Reply only: OK' }],
        max_tokens: 10,
      }),
    });
    if (resp.ok) {
      status.className = 'key-status ok';
      status.textContent = t('Key is valid. OpenAI API is available.');
    } else {
      const err = await resp.json().catch(() => ({}));
      const msg = err.error?.message || err.message || `HTTP ${resp.status}`;
      status.className = 'key-status err';
      status.textContent = msg.slice(0, 100);
    }
  } catch (e) {
    status.className = 'key-status err';
    status.textContent = `${t('Network error')}: ${(e.message || e).toString().slice(0, 100)}`;
  }
}

async function testZhipuKey() {
  const key = document.getElementById('zhipu-api-key').value.trim();
  const model = document.getElementById('zhipu-model')?.value || OCR.zhipuModel || 'glm-4.6v-flash';
  const status = document.getElementById('zhipu-key-status');
  if (!key) {
    status.className = 'key-status err';
    status.textContent = t('Enter a key first');
    return;
  }
  status.className = 'key-status';
  status.textContent = `${t('Testing')}...`;
  try {
    const resp = await fetch('https://open.bigmodel.cn/api/paas/v4/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: OCR.isSupportedZhipuModel(model) ? model : 'glm-4.6v-flash',
        messages: [{ role: 'user', content: [{ type: 'text', text: 'Reply only: OK' }] }],
        stream: false,
        ...(OCR.zhipuSupportsThinking(model) ? { thinking: { type: 'disabled' } } : {}),
        max_tokens: 10,
      }),
    });
    if (resp.ok) {
      status.className = 'key-status ok';
      status.textContent = t('Key is valid. Zhipu API is available.');
    } else {
      const err = await resp.json().catch(() => ({}));
      const msg = err.error?.message || err.message || err.msg || `HTTP ${resp.status}`;
      status.className = 'key-status err';
      status.textContent = msg.slice(0, 100);
    }
  } catch (e) {
    status.className = 'key-status err';
    status.textContent = `${t('Network error')}: ${(e.message || e).toString().slice(0, 100)}`;
  }
}

async function clearZhipuKey() {
  const ok = await customConfirm(`${t('Clear Zhipu API Key?')}<br><br>${t('After clearing it, Zhipu GLM-4V OCR cannot be used until it is configured again.')}`, t('Clear API Key'));
  if (!ok) return;
  document.getElementById('zhipu-api-key').value = '';
  OCR.zhipuApiKey = null;
  OCR.saveSettings();
  document.getElementById('zhipu-key-status').textContent = t('Cleared');
  document.getElementById('zhipu-key-status').className = 'key-status';
  toast(`${t('Cleared')} API Key`);
}

async function clearOCRKeys() {
  const ok = await customConfirm(`${t('Clear OCR API Keys?')}<br><br>${t('After clearing them, OpenAI Vision and Zhipu GLM-4V OCR cannot be used until configured again.')}`, t('Clear API Keys'));
  if (!ok) return;
  document.getElementById('openai-api-key').value = '';
  document.getElementById('zhipu-api-key').value = '';
  OCR.openAIApiKey = null;
  OCR.zhipuApiKey = null;
  OCR.saveSettings();
  const openAIStatus = document.getElementById('openai-key-status');
  if (openAIStatus) {
    openAIStatus.textContent = t('Cleared');
    openAIStatus.className = 'key-status';
  }
  const zhipuStatus = document.getElementById('zhipu-key-status');
  if (zhipuStatus) {
    zhipuStatus.textContent = t('Cleared');
    zhipuStatus.className = 'key-status';
  }
  toast(`${t('Cleared')} OCR API Keys`);
}

// Initialize OCR when DOM is ready
window.NBA2K26_OCR = OCR;
OCR.init();
