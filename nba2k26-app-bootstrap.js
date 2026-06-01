// NBA 2K26 app bootstrap.
// Owns startup sequencing and top-level data menu bindings.
(function(window) {
  'use strict';

  async function bootstrapApp(deps) {
    const {
      setupGlobalUi,
      setupPageShell,
      setupBuildTabs,
      loadData,
      importData,
    } = deps;

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

  window.NBA2K26_APP_BOOTSTRAP = {
    bootstrapApp,
  };
})(window);
