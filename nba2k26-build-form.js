// NBA 2K26 build form helpers.
// Owns build modal setup, save/delete, and duplicate flows.
(function(window) {
  'use strict';

  const basicFields = [
    'b-name', 'b-archetype', 'b-height', 'b-weight', 'b-wingspan', 'b-ovr',
    'b-jumpshot-base', 'b-jumpshot-release', 'b-notes',
  ];
  const selectFields = ['b-position', 'b-position-2', 'b-body-type', 'b-takeover-1', 'b-takeover-2', 'b-specialization'];

  function activateBuildTab(tabName) {
    document.querySelectorAll('.build-tab').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.build-tab-pane').forEach(pane => pane.classList.remove('active'));
    document.querySelector(`.build-tab[data-tab="${tabName}"]`)?.classList.add('active');
    document.querySelector(`.build-tab-pane[data-pane="${tabName}"]`)?.classList.add('active');
  }

  function setupBuildTabs(deps) {
    const { updateGroupAvg } = deps;
    document.querySelectorAll('.build-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        activateBuildTab(tab.dataset.tab);
      });
    });

    document.querySelectorAll('.attr-input').forEach(input => {
      input.addEventListener('input', () => {
        const value = parseInt(input.value) || 0;
        input.classList.remove('high', 'mid', 'low');
        if (value >= 85) input.classList.add('high');
        else if (value >= 70) input.classList.add('mid');
        else if (value > 0) input.classList.add('low');
        updateGroupAvg(input.dataset.group);
      });
    });
  }

  function loadBadgesFromBuild(build, deps) {
    const { setCurrentBadges, TIER_ORDER, BADGE_CATEGORIES } = deps;
    const nextBadges = {};
    const badges = build.badges || {};

    if (badges._format === 'v2' || (typeof badges === 'object' && !badges.legend && !badges.hof && !badges.gold && !badges.silver && !badges.bronze)) {
      Object.keys(badges).forEach(key => {
        if (key !== '_format' && TIER_ORDER[badges[key]]) {
          nextBadges[key] = badges[key];
        }
      });
    } else {
      const allBadges = BADGE_CATEGORIES.flatMap(category => category.badges);
      ['legend', 'hof', 'gold', 'silver', 'bronze'].forEach(tier => {
        const value = badges[tier] || '';
        value.split(/[,，;；]/).map(item => item.trim()).filter(Boolean).forEach(name => {
          const match = allBadges.find(badge => badge.name.toLowerCase() === name.toLowerCase());
          if (match) nextBadges[match.id] = tier;
        });
      });
    }

    setCurrentBadges(nextBadges);
  }

  function openBuildModal(id, deps) {
    const { state, setCurrentBadges, renderBadgeList, ATTR_GROUPS, updateGroupAvg } = deps;
    state.editingBuildId = id || null;

    const title = document.getElementById('build-modal-title');
    const delBtn = document.getElementById('b-delete-btn');
    activateBuildTab('basics');

    if (id) {
      const build = state.builds.find(x => x.id === id);
      if (!build) return;

      title.textContent = typeof t === 'function' ? t('Edit Build') : 'Edit Build';
      document.getElementById('b-name').value = build.name || '';
      document.getElementById('b-archetype').value = build.archetype || '';
      document.getElementById('b-position').value = build.position || 'PG';
      document.getElementById('b-position-2').value = build.position2 || '';
      document.getElementById('b-body-type').value = build.bodyType || '';
      document.getElementById('b-height').value = build.height || '';
      document.getElementById('b-weight').value = build.weight || '';
      document.getElementById('b-wingspan').value = build.wingspan || '';
      document.getElementById('b-ovr').value = build.ovr || '';
      document.getElementById('b-takeover-1').value = build.takeover1 || '';
      document.getElementById('b-takeover-2').value = build.takeover2 || '';
      document.getElementById('b-specialization').value = build.specialization || '';
      document.getElementById('b-jumpshot-base').value = build.jumpshotBase || '';
      document.getElementById('b-jumpshot-release').value = build.jumpshotRelease || '';
      document.getElementById('b-notes').value = build.notes || '';

      loadBadgesFromBuild(build, deps);
      renderBadgeList();

      const attrs = build.attrs || {};
      document.querySelectorAll('.attr-input').forEach(input => {
        const row = input.closest('.attr-row');
        const key = row?.dataset.attr;
        input.value = key && attrs[key] != null ? attrs[key] : '';
        input.dispatchEvent(new Event('input'));
      });

      delBtn.style.display = 'block';
    } else {
      title.textContent = typeof t === 'function' ? t('New Build') : 'New Build';
      basicFields.forEach(fieldId => {
        document.getElementById(fieldId).value = '';
      });
      selectFields.forEach(fieldId => {
        document.getElementById(fieldId).value = fieldId === 'b-position' ? 'PG' : '';
      });
      document.querySelectorAll('.attr-input').forEach(input => {
        input.value = '';
        input.classList.remove('high', 'mid', 'low');
      });
      Object.keys(ATTR_GROUPS).forEach(group => updateGroupAvg(group));
      setCurrentBadges({});
      renderBadgeList();
      delBtn.style.display = 'none';
    }

    document.getElementById('build-modal').classList.add('active');
    if (typeof window.refreshLanguage === 'function') window.refreshLanguage();
  }

  function closeBuildModal(state) {
    document.getElementById('build-modal').classList.remove('active');
    state.editingBuildId = null;
  }

  function collectAttrs() {
    const attrs = {};
    document.querySelectorAll('.attr-input').forEach(input => {
      const row = input.closest('.attr-row');
      const key = row?.dataset.attr;
      if (!key) return;
      const value = parseInt(input.value);
      if (!isNaN(value) && value > 0) attrs[key] = value;
    });
    return attrs;
  }

  async function saveBuild(deps) {
    const {
      state,
      getCurrentBadges,
      saveToStorage,
      toast,
      closeBuildModal,
      renderBuilds,
      renderBuildDetail,
    } = deps;

    const name = document.getElementById('b-name').value.trim();
    if (!name) {
      toast(typeof t === 'function' ? t('Please enter a build name') : 'Please enter a build name', true);
      activateBuildTab('basics');
      return;
    }

    const data = {
      id: state.editingBuildId || ('b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6)),
      name,
      archetype: document.getElementById('b-archetype').value.trim(),
      position: document.getElementById('b-position').value,
      position2: document.getElementById('b-position-2').value,
      bodyType: document.getElementById('b-body-type').value,
      height: document.getElementById('b-height').value.trim(),
      weight: parseInt(document.getElementById('b-weight').value) || null,
      wingspan: document.getElementById('b-wingspan').value.trim(),
      ovr: parseInt(document.getElementById('b-ovr').value) || null,
      takeover1: document.getElementById('b-takeover-1').value,
      takeover2: document.getElementById('b-takeover-2').value,
      specialization: document.getElementById('b-specialization').value,
      jumpshotBase: document.getElementById('b-jumpshot-base').value.trim(),
      jumpshotRelease: document.getElementById('b-jumpshot-release').value.trim(),
      badges: { _format: 'v2', ...getCurrentBadges() },
      attrs: collectAttrs(),
      notes: document.getElementById('b-notes').value.trim(),
      createdAt: state.editingBuildId
        ? (state.builds.find(x => x.id === state.editingBuildId)?.createdAt || Date.now())
        : Date.now(),
    };

    const ok = await saveToStorage('build:' + data.id, data);
    if (ok) {
      const idx = state.builds.findIndex(x => x.id === data.id);
      if (idx >= 0) state.builds[idx] = data;
      else state.builds.unshift(data);
      toast(typeof t === 'function' ? t('Build saved') : 'Build saved');
      closeBuildModal();
      if (document.getElementById('page-builds').classList.contains('active')) renderBuilds();
      if (document.getElementById('page-detail').classList.contains('active') && state.currentBuildId === data.id) renderBuildDetail();
    } else {
      toast(typeof t === 'function' ? t('Save failed') : 'Save failed', true);
    }
  }

  async function deleteBuild(deps) {
    const { state, customConfirm, deleteFromStorage, toast, closeBuildModal, showPage, escapeHtml } = deps;
    const id = state.editingBuildId;
    if (!id) return;

    const games = state.games.filter(game => game.buildId === id);
    const build = state.builds.find(item => item.id === id);
    const ok = await customConfirm(
      `${t('Delete build')} <strong style="color:var(--orange);">${escapeHtml(build?.name || '')}</strong>?<br><br>${games.length > 0 ? `${t('This also deletes')} <strong style="color:var(--red);">${games.length}</strong> ${t('linked game records')}.<br><br><span style="color:var(--yellow);">${t('This cannot be undone.')}</span>` : t('No linked game records.')}`,
      t('Delete Build')
    );
    if (!ok) return;

    for (const game of games) {
      await deleteFromStorage('game:' + game.id);
    }
    const okDel = await deleteFromStorage('build:' + id);
    if (okDel) {
      state.builds = state.builds.filter(item => item.id !== id);
      state.games = state.games.filter(game => game.buildId !== id);
      toast(typeof t === 'function' ? t('Deleted') : 'Deleted');
      closeBuildModal();
      showPage('builds');
    }
  }

  async function duplicateBuild(id, deps) {
    const { state, saveToStorage, toast, renderBuilds } = deps;
    const original = state.builds.find(item => item.id === id);
    if (!original) return;

    const copy = JSON.parse(JSON.stringify(original));
    copy.id = 'b_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
    copy.name = original.name + ' (Copy)';
    copy.createdAt = Date.now();

    const ok = await saveToStorage('build:' + copy.id, copy);
    if (ok) {
      state.builds.unshift(copy);
      toast(`${typeof t === 'function' ? t('Build copied') : 'Build copied'}: ${copy.name}`);
      renderBuilds();
    } else {
      toast(typeof t === 'function' ? t('Copy failed') : 'Copy failed', true);
    }
  }

  window.NBA2K26_BUILD_FORM = {
    setupBuildTabs,
    openBuildModal,
    closeBuildModal,
    saveBuild,
    deleteBuild,
    duplicateBuild,
  };
})(window);
