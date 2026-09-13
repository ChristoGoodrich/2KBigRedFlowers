// App bootstrap.
// Owns startup sequencing and top-level data menu bindings.
(function(window) {
  'use strict';

  // The header carries the game year the active dataset describes, so the
  // shell never claims a year the badge catalog is not for.
  function applyGameYearLabels() {
    const data = window.NBA2K_GAMEDATA && window.NBA2K_GAMEDATA.active;
    if (!data) return;
    const sub = document.getElementById('app-game-year-sub');
    if (sub) sub.textContent = `${data.label} // 2KBIGREDFLOWERS`;
  }

  async function bootstrapApp(deps) {
    const {
      setupGlobalUi,
      setupPageShell,
      setupBuildTabs,
      loadData,
      importData,
    } = deps;

    applyGameYearLabels();
    setupGlobalUi();
    setupPageShell();
    setupBuildTabs();
    await loadData();

    const importInput = document.getElementById('import-file-modal');
    if (importInput) {
      importInput.addEventListener('change', event => {
        const file = event.target.files?.[0];
        if (file) importData(file);
        event.target.value = '';
      });
    }
  }

  window.NBA2K_APP_BOOTSTRAP = {
    bootstrapApp,
  };
})(window);
