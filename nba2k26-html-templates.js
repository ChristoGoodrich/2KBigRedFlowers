// Injects registered static HTML fragments before bootstrapApp runs.
(function(window, document) {
  'use strict';

  const templates = window.NBA2K26_TEMPLATE_PARTS || {};
  const slots = [
    ['build-modal', 'buildModal'],
    ['game-modal', 'gameModal'],
    ['game-detail-modal', 'gameDetailModal'],
    ['ocr-processing-modal', 'ocrProcessingModal'],
    ['ocr-settings-modal', 'ocrSettingsModal'],
    ['confirm-modal', 'confirmModal'],
    ['data-menu-modal', 'dataMenuModal'],
    ['account-center-modal', 'accountCenterModal'],
  ];

  function injectTemplate(slotName, html) {
    const slot = document.querySelector(`[data-template-slot="${slotName}"]`);
    if (slot) slot.innerHTML = html;
  }

  function injectStaticTemplates() {
    slots.forEach(([slotName, templateKey]) => {
      const html = templates[templateKey];
      if (!html) throw new Error(`Missing static template: ${templateKey}`);
      injectTemplate(slotName, html);
    });
  }

  window.NBA2K26_HTML_TEMPLATES = {
    templates,
    injectStaticTemplates,
  };

  injectStaticTemplates();
})(window, document);
