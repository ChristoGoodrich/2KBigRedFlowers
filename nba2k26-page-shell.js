// NBA 2K26 page shell helpers.
// Owns top-level page switching, navigation binding, and build list rendering.
(function(window) {
  'use strict';

  function decodeRoutePart(value) {
    try { return decodeURIComponent(value); }
    catch (e) { return value; }
  }

  function routeFromHash(hash) {
    const value = String(hash || '').replace(/^#/, '');
    if (value === 'intel') return { page: 'players', playersView: 'intel' };
    if (value === 'builds' || value === 'players' || value === 'games' || value === 'overview' || value === 'quality' || value === 'compare') {
      return { page: value };
    }
    if (value.startsWith('compare/')) {
      const compareIds = value.slice(8)
        .split(',')
        .map(part => decodeRoutePart(part).trim())
        .filter(Boolean)
        .slice(0, 4);
      return { page: 'compare', compareIds };
    }
    if (value.startsWith('detail/')) {
      const buildId = value.slice(7);
      if (buildId) return { page: 'detail', buildId };
    }
    if (value.startsWith('player/')) {
      const playerId = value.slice(7);
      if (playerId) return { page: 'player', playerId };
    }
    return { page: 'overview' };
  }

  function routeHash(route) {
    if (route.page === 'detail' && route.buildId) return '#detail/' + route.buildId;
    if (route.page === 'player' && route.playerId) return '#player/' + route.playerId;
    if (route.page === 'players' && route.playersView === 'intel') return '#intel';
    if (route.page === 'compare') {
      const compareIds = Array.isArray(route.compareIds)
        ? route.compareIds.map(id => String(id || '').trim()).filter(Boolean).slice(0, 4)
        : [];
      if (compareIds.length) return '#compare/' + compareIds.map(id => encodeURIComponent(id)).join(',');
    }
    return '#' + (route.page || 'overview');
  }

  function navPageFor(page) {
    if (page === 'detail') return 'builds';
    if (page === 'player') return 'players';
    return page;
  }

  function updateMobileTitle(page) {
    const title = document.getElementById('mobile-app-title');
    if (!title) return;
    const labels = {
      overview: 'Overview',
      builds: 'Builds',
      detail: 'Build Detail',
      players: 'Players',
      player: 'Player Profile',
      games: 'Games',
      quality: 'Data Quality',
      compare: 'Compare Builds',
    };
    const text = labels[page] || labels.overview;
    title.setAttribute('data-i18n', text);
    title.textContent = text;
  }

  function setActiveShellPage(page) {
    const target = document.getElementById('page-' + page);
    if (!target) return false;
    const navPage = navPageFor(page);

    document.querySelectorAll('.page').forEach(panel => panel.classList.remove('active'));
    target.classList.add('active');

    document.querySelectorAll('.nav-btn[data-view], .mobile-tab-btn[data-view], .mobile-more-item[data-view]').forEach(button => {
      button.classList.remove('active');
      button.removeAttribute('aria-current');
    });
    document.querySelectorAll(`.nav-btn[data-view="${navPage}"], .mobile-tab-btn[data-view="${navPage}"], .mobile-more-item[data-view="${navPage}"]`).forEach(button => {
      button.classList.add('active');
      button.setAttribute('aria-current', 'page');
    });

    const mobileMore = document.getElementById('mobile-tab-more');
    if (mobileMore) {
      mobileMore.classList.toggle('active', navPage === 'quality' || navPage === 'compare');
    }
    updateMobileTitle(page);
    return true;
  }

  function showPage(page, deps) {
    const { renderAccountBar, renderBuilds, renderOverview, renderPlayers, renderGames, renderPlayerPage, renderBuildCompare, renderDataQuality } = deps;
    renderAccountBar(page);

    if (!setActiveShellPage(page)) return;

    if (page === 'builds')   renderBuilds();
    if (page === 'overview') renderOverview();
    if (page === 'players'  && renderPlayers)       renderPlayers();
    if (page === 'games'    && renderGames)         renderGames();
    if (page === 'quality'  && renderDataQuality)   renderDataQuality();
    if (page === 'player'   && renderPlayerPage)    renderPlayerPage();
    if (page === 'compare'  && renderBuildCompare)  renderBuildCompare();
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  }

  function setupNavigation(deps) {
    const { showPage } = deps;
    const mobileMore = document.getElementById('mobile-tab-more');
    const mobileMoreSheet = document.getElementById('mobile-more-sheet');
    const mobileBackdrop = document.getElementById('mobile-sheet-backdrop');
    const mobileMoreClose = document.getElementById('mobile-more-close');
    const mobileAccount = document.getElementById('mobile-more-account');
    const mobileSettings = document.getElementById('mobile-more-settings');

    const setMobileMoreOpen = open => {
      if (!mobileMore || !mobileMoreSheet) return;
      mobileMore.classList.toggle('open', open);
      mobileMore.setAttribute('aria-expanded', open ? 'true' : 'false');
      mobileMoreSheet.classList.toggle('open', open);
      mobileMoreSheet.setAttribute('aria-hidden', open ? 'false' : 'true');
      if (mobileBackdrop) mobileBackdrop.hidden = !open;
    };
    window.closeMobileMoreMenu = () => setMobileMoreOpen(false);

    document.querySelectorAll('.nav-btn[data-view], .mobile-tab-btn[data-view], .mobile-more-item[data-view]').forEach(button => {
      button.addEventListener('click', () => {
        setMobileMoreOpen(false);
        showPage(button.dataset.view);
      });
    });
    if (mobileMore) {
      mobileMore.addEventListener('click', () => {
        if (typeof window.closeSettingsMenu === 'function') window.closeSettingsMenu();
        setMobileMoreOpen(!mobileMoreSheet.classList.contains('open'));
      });
    }
    if (mobileMoreClose) mobileMoreClose.addEventListener('click', () => setMobileMoreOpen(false));
    if (mobileBackdrop) mobileBackdrop.addEventListener('click', () => setMobileMoreOpen(false));
    if (mobileAccount) {
      mobileAccount.addEventListener('click', () => {
        setMobileMoreOpen(false);
        window.setTimeout(() => window.openAccountModal?.(), 0);
      });
    }
    if (mobileSettings) {
      mobileSettings.addEventListener('click', () => {
        setMobileMoreOpen(false);
        window.setTimeout(() => document.getElementById('btn-settings-menu')?.click(), 0);
      });
    }
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') setMobileMoreOpen(false);
    });

    const logo = document.querySelector('.logo');
    if (logo) {
      logo.addEventListener('click', () => showPage('overview'));
    }

    // Seed history state so back/forward work from the first page load
    const initialRoute = routeFromHash(location.hash);
    setActiveShellPage(initialRoute.page);
    history.replaceState(initialRoute, '', routeHash(initialRoute));

    window.addEventListener('popstate', event => {
      const s = event.state;
      if (!s) return;
      window._historyNavInProgress = true;
      if (s.page === 'detail' && s.buildId && typeof window.openBuildDetail === 'function') {
        window.openBuildDetail(s.buildId);
      } else if (s.page === 'player' && s.playerId && typeof window.openPlayerPage === 'function') {
        window.openPlayerPage(s.playerId);
      } else if (s.page) {
        showPage(s);
      }
      window._historyNavInProgress = false;
    });
  }

  function renderBuilds(deps) {
    const { state, aggregate, groupAvg, attrGroups, t, escapeHtml, renderAccountBar } = deps;
    renderAccountBar('builds');

    const container = document.getElementById('builds-container');
    if (!container) return;
    if (!window.NBA2K26_RENDER || !window.NBA2K26_RENDER.buildsHtml) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-text">${t('// render module unavailable')}</div></div>`;
      return;
    }

    container.innerHTML = window.NBA2K26_RENDER.buildsHtml({
      state,
      aggregate,
      groupAvg,
      attrGroups,
      t,
      escapeHtml,
    });
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  }

  window.NBA2K26_PAGE_SHELL = {
    showPage,
    setupNavigation,
    renderBuilds,
    routeFromHash,
    routeHash,
  };
})(window);
