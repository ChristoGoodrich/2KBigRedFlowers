// NBA 2K26 shared UI helpers.
// Owns toast, escaping, confirm modal, theme, and global modal shortcuts.
(function(window) {
  'use strict';

  function escapeHtml(value) {
    if (value == null) return '';
    return String(value).replace(/[&<>"']/g, char => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[char]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function toast(message, isError) {
    const target = document.getElementById('toast');
    if (!target) return;
    target.textContent = message;
    target.classList.toggle('err', !!isError);
    target.classList.add('show');
    setTimeout(() => target.classList.remove('show'), 2200);
  }

  function customConfirm(message, title) {
    return new Promise(resolve => {
      document.getElementById('confirm-title').textContent = title || (typeof t === 'function' ? t('Confirm') : 'Confirm');
      document.getElementById('confirm-message').innerHTML = message;

      const modal = document.getElementById('confirm-modal');
      const okBtn = document.getElementById('confirm-ok');
      const cancelBtn = document.getElementById('confirm-cancel');
      modal.classList.add('active');

      const cleanup = result => {
        modal.classList.remove('active');
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        resolve(result);
      };

      okBtn.onclick = () => cleanup(true);
      cancelBtn.onclick = () => cleanup(false);
    });
  }

  let systemThemeQuery = null;

  function resolveTheme(mode) {
    if (mode === 'light' || mode === 'dark') return mode;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function getStoredThemeMode() {
    return localStorage.getItem('nba2k-theme-mode') || localStorage.getItem('nba2k-theme') || 'system';
  }

  function updateThemeIcon(theme, mode = getStoredThemeMode()) {
    const label = document.getElementById('theme-mode-label');
    const text = mode === 'system'
      ? `Following system (${theme})`
      : `Locked to ${theme} mode`;
    if (label) label.textContent = text;

    document.querySelectorAll('.theme-choice-btn').forEach(button => {
      button.classList.toggle('active', button.dataset.themeMode === mode);
    });
  }

  function initTheme() {
    const mode = getStoredThemeMode();
    const theme = resolveTheme(mode);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-mode', mode);
    localStorage.setItem('nba2k-theme-mode', mode);
    localStorage.setItem('nba2k-theme', theme);
    updateThemeIcon(theme, mode);

    if (!systemThemeQuery && window.matchMedia) {
      systemThemeQuery = window.matchMedia('(prefers-color-scheme: light)');
      systemThemeQuery.addEventListener('change', () => {
        if (getStoredThemeMode() === 'system') {
          setThemeMode('system');
        }
      });
    }
  }

  function setThemeMode(mode) {
    const nextMode = ['system', 'dark', 'light'].includes(mode) ? mode : 'system';
    const theme = resolveTheme(nextMode);
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.setAttribute('data-theme-mode', nextMode);
    localStorage.setItem('nba2k-theme-mode', nextMode);
    localStorage.setItem('nba2k-theme', theme);
    updateThemeIcon(theme, nextMode);
  }

  function toggleTheme() {
    const order = ['system', 'dark', 'light'];
    const current = getStoredThemeMode();
    const next = order[(order.indexOf(current) + 1) % order.length] || 'system';
    setThemeMode(next);
  }

  function setupThemeToggle() {
    document.querySelectorAll('.theme-choice-btn').forEach(button => {
      button.addEventListener('click', event => {
        event.stopPropagation();
        setThemeMode(button.dataset.themeMode);
      });
    });
    initTheme();
  }

  function setupSettingsMenu(deps) {
    const { openDataModal } = deps;
    const wrap = document.getElementById('settings-wrap');
    const trigger = document.getElementById('btn-settings-menu');
    const menu = document.getElementById('settings-menu');
    const mobileBackdrop = document.getElementById('mobile-sheet-backdrop');
    const mobileClose = document.getElementById('settings-menu-close');
    const theme = document.getElementById('btn-theme-toggle');
    if (!wrap || !trigger || !menu) return;

    const close = () => {
      wrap.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      if (mobileBackdrop && !document.getElementById('mobile-more-sheet')?.classList.contains('open')) {
        mobileBackdrop.hidden = true;
      }
    };
    window.closeSettingsMenu = close;
    const toggle = event => {
      event.stopPropagation();
      const open = !wrap.classList.contains('open');
      wrap.classList.toggle('open', open);
      trigger.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (mobileBackdrop && window.matchMedia?.('(max-width: 820px)').matches) {
        mobileBackdrop.hidden = !open;
      }
    };

    trigger.addEventListener('click', toggle);
    if (mobileClose) mobileClose.addEventListener('click', close);
    if (mobileBackdrop) mobileBackdrop.addEventListener('click', close);
    document.addEventListener('click', event => {
      if (!wrap.contains(event.target)) close();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') close();
    });

    menu.addEventListener('click', event => {
      const item = event.target.closest('.settings-item');
      if (!item) return;
      event.stopPropagation();

      if (item.id === 'settings-backup') {
        if (typeof openDataModal === 'function') openDataModal();
        else document.getElementById('data-modal')?.classList.add('active');
        close();
        return;
      }

      if (item.id === 'settings-ocr' && typeof window.openOCRSettings === 'function') {
        window.openOCRSettings();
        close();
        return;
      }

      if (item.id === 'btn-theme-toggle') close();
    });
  }

  function setupModalShortcuts(deps) {
    const {
      closeBuildModal,
      closeGameModal,
      closeOCRModal,
      closeDataModal,
      saveBuild,
      saveGame,
      openBuildModal,
      openGameModal,
    } = deps;

    const MODAL_IDS = ['build-modal', 'game-modal', 'game-detail-modal', 'ocr-modal', 'ocr-settings-modal', 'data-modal', 'confirm-modal'];
    const anyModalOpen = () => MODAL_IDS.some(id => document.getElementById(id)?.classList.contains('active'));

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        // Shortcuts help panel takes priority — close it first
        const helpPanel = document.getElementById('shortcuts-help-overlay');
        if (helpPanel) { helpPanel.remove(); return; }

        if (document.getElementById('confirm-modal').classList.contains('active')) {
          document.getElementById('confirm-cancel').click();
          return;
        }
        if (document.getElementById('ocr-modal').classList.contains('active')) {
          closeOCRModal();
          return;
        }
        if (document.getElementById('data-modal').classList.contains('active')) {
          closeDataModal();
          return;
        }
        if (document.getElementById('game-detail-modal')?.classList.contains('active')) {
          if (typeof window.closeGameDetail === 'function') window.closeGameDetail();
          return;
        }
        closeBuildModal();
        closeGameModal();
      }

      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        if (document.getElementById('build-modal').classList.contains('active')) {
          event.preventDefault();
          saveBuild();
        } else if (document.getElementById('game-modal').classList.contains('active')) {
          event.preventDefault();
          saveGame();
        }
      }

      // Global page shortcuts — only fire when no modal is open and focus is not in a field
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !anyModalOpen()) {
        const tag = (event.target.tagName || '').toUpperCase();
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target.isContentEditable) return;
        const onDetail = document.getElementById('page-detail')?.classList.contains('active');
        if (event.key === 'n' || event.key === 'N') {
          if (!onDetail && typeof openBuildModal === 'function') { event.preventDefault(); openBuildModal(); }
        }
        if (event.key === 'g' || event.key === 'G') {
          if (onDetail && typeof openGameModal === 'function') { event.preventDefault(); openGameModal(); }
        }
        if (event.key === '?') {
          event.preventDefault();
          toggleShortcutsHelp();
        }
      }
    });
  }

  function toggleShortcutsHelp() {
    const existing = document.getElementById('shortcuts-help-overlay');
    if (existing) { existing.remove(); return; }

    const overlay = document.createElement('div');
    overlay.id = 'shortcuts-help-overlay';
    overlay.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:9999',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.6)', 'backdrop-filter:blur(4px)',
    ].join(';');

    overlay.innerHTML = `
      <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--r-lg);
                  padding:var(--sp-6);min-width:340px;max-width:90vw;box-shadow:var(--sh-3);">
        <div style="font-family:var(--font-display);font-size:1.1rem;letter-spacing:0.08em;
                    color:var(--orange);margin-bottom:var(--sp-4);">KEYBOARD SHORTCUTS</div>
        <div style="display:grid;grid-template-columns:auto 1fr;gap:var(--sp-2) var(--sp-4);
                    font-family:var(--font-mono);font-size:0.8rem;align-items:center;">
          <span style="background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--r-sm);
                       padding:2px 8px;color:var(--text);white-space:nowrap;">N</span>
          <span style="color:var(--text-dim);">New Build <em style="color:var(--text-fade)">(Builds / Overview page)</em></span>
          <span style="background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--r-sm);
                       padding:2px 8px;color:var(--text);white-space:nowrap;">G</span>
          <span style="color:var(--text-dim);">Record Game <em style="color:var(--text-fade)">(Build Detail page)</em></span>
          <span style="background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--r-sm);
                       padding:2px 8px;color:var(--text);white-space:nowrap;">Ctrl+Enter</span>
          <span style="color:var(--text-dim);">Save Build / Save Game</span>
          <span style="background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--r-sm);
                       padding:2px 8px;color:var(--text);white-space:nowrap;">Esc</span>
          <span style="color:var(--text-dim);">Close modal</span>
          <span style="background:var(--bg-elev);border:1px solid var(--border);border-radius:var(--r-sm);
                       padding:2px 8px;color:var(--text);white-space:nowrap;">?</span>
          <span style="color:var(--text-dim);">Show this panel</span>
        </div>
        <div style="margin-top:var(--sp-4);color:var(--text-fade);font-size:0.75rem;
                    font-family:var(--font-mono);">// click anywhere or press Esc to close</div>
      </div>`;

    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function setupModalOverlayClose(deps) {
    const { closeBuildModal, closeGameModal, closeOCRModal, closeDataModal } = deps;
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      if (overlay.id === 'confirm-modal') return;
      overlay.addEventListener('click', event => {
        if (event.target === overlay) {
          if (overlay.id === 'game-modal') return;
          if (overlay.id === 'game-detail-modal' && typeof window.closeGameDetail === 'function') window.closeGameDetail();
          if (overlay.id === 'build-modal') closeBuildModal();
          if (overlay.id === 'ocr-modal') closeOCRModal();
          if (overlay.id === 'ocr-settings-modal' && typeof window.closeOCRSettings === 'function') window.closeOCRSettings();
          if (overlay.id === 'data-modal') closeDataModal();
        }
      });
    });
  }

  // Centralized modal focus management: when a modal gains `.active` we remember
  // the opener, move focus inside, and trap Tab; when it loses `.active` we
  // restore focus. Watching the class avoids touching every open/close path,
  // and a stack handles nested modals (e.g. OCR opened over the game modal).
  function setupModalA11y() {
    const MODAL_IDS = ['build-modal', 'game-modal', 'game-detail-modal', 'ocr-modal', 'ocr-settings-modal', 'data-modal', 'confirm-modal'];
    const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const stack = [];
    const openerFor = new WeakMap();

    const focusableIn = modal =>
      Array.prototype.filter.call(modal.querySelectorAll(FOCUSABLE), el =>
        el.offsetWidth > 0 || el.offsetHeight > 0 || el === document.activeElement);

    const activate = modal => {
      if (stack.indexOf(modal) !== -1) return;
      openerFor.set(modal, document.activeElement);
      stack.push(modal);
      const targets = focusableIn(modal);
      const dialog = modal.querySelector('[role="dialog"],[role="alertdialog"]') || modal;
      (targets[0] || dialog).focus({ preventScroll: true });
    };

    const deactivate = modal => {
      const i = stack.indexOf(modal);
      if (i === -1) return;
      stack.splice(i, 1);
      const opener = openerFor.get(modal);
      openerFor.delete(modal);
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus({ preventScroll: true });
      }
    };

    MODAL_IDS.forEach(id => {
      const modal = document.getElementById(id);
      if (!modal) return;
      new MutationObserver(() => {
        if (modal.classList.contains('active')) activate(modal);
        else deactivate(modal);
      }).observe(modal, { attributes: true, attributeFilter: ['class'] });
    });

    document.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || !stack.length) return;
      const modal = stack[stack.length - 1];
      const targets = focusableIn(modal);
      if (!targets.length) { event.preventDefault(); return; }
      const first = targets[0];
      const last = targets[targets.length - 1];
      const active = document.activeElement;
      if (!modal.contains(active)) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }, true);
  }

  function setupGlobalUi(deps) {
    setupThemeToggle();
    setupSettingsMenu(deps);
    setupModalShortcuts(deps);
    setupModalOverlayClose(deps);
    setupModalA11y();
  }

  window.NBA2K26_UI_CORE = {
    escapeHtml,
    escapeAttr,
    toast,
    customConfirm,
    initTheme,
    setThemeMode,
    toggleTheme,
    updateThemeIcon,
    setupThemeToggle,
    setupSettingsMenu,
    setupModalShortcuts,
    setupModalOverlayClose,
    setupGlobalUi,
  };
})(window);
