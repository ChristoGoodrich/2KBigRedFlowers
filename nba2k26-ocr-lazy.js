// NBA 2K26 OCR lazy loader.
//
// The OCR engine (nba2k26-ocr.js ~104KB + nba2k26-ocr-parser.js ~35KB) is the
// heaviest part of the app but is only needed when the user actually scans a
// screenshot. This shim keeps those two files OUT of the initial download and
// pulls them in on first OCR intent, then hands control to the real engine.
//
// Every OCR entry point ultimately routes through one of:
//   1. the #ocr-file <input> (clicked by the Choose Screenshot label and the
//      overview Start OCR Scan / Drop screenshots here / Scan New Screenshot
//      buttons, which all call document.getElementById('ocr-file').click()),
//   2. pasting an image while the game modal is open,
//   3. dropping an image on an .ocr-entry zone,
//   4. opening OCR settings (window.openOCRSettings).
//
// The shim binds light capture-phase listeners for those. On the FIRST such
// event it loads the engine; nba2k26-ocr.js ends with `OCR.init()`, which binds
// the engine's own steady-state listeners. Each shim handler bails once
// window.NBA2K26_OCR exists, so it never competes with the real engine.
(function (window) {
  'use strict';

  var document = window.document;
  var loading = null;

  function injectScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }

  // Idempotent: resolves with the OCR engine, loading parser + engine once.
  function loadOCR() {
    if (window.NBA2K26_OCR) return Promise.resolve(window.NBA2K26_OCR);
    if (loading) return loading;
    loading = injectScript('./nba2k26-ocr-parser.js')
      .then(function () { return injectScript('./nba2k26-ocr.js'); })
      .then(function () { return window.NBA2K26_OCR; });
    return loading;
  }

  function loaded() { return !!window.NBA2K26_OCR; }

  function imageFromItems(items) {
    for (var i = 0; i < items.length; i++) {
      if (items[i].type && items[i].type.indexOf('image/') === 0) {
        var f = items[i].getAsFile && items[i].getAsFile();
        if (f) return f;
      }
    }
    return null;
  }

  // 1. File picker — clicking the hidden #ocr-file input (label or buttons).
  // Kick off the load early; the OS file dialog gives the engine time to arrive.
  document.addEventListener('click', function (e) {
    var t = e.target;
    if (t && t.id === 'ocr-file') loadOCR();
  }, true);

  // 1b. Safety net: if the file is chosen before the engine finished loading,
  // its own change listener isn't bound yet — forward the file ourselves.
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (!t || t.id !== 'ocr-file' || loaded()) return;
    var f = t.files && t.files[0];
    if (!f) return;
    loadOCR().then(function (ocr) { if (ocr && ocr.processFile) ocr.processFile(f); });
  }, true);

  // 2. Paste an image while the game modal is open (and OCR modal is not).
  document.addEventListener('paste', function (e) {
    if (loaded()) return;
    var gm = document.getElementById('game-modal');
    var om = document.getElementById('ocr-modal');
    if (!gm || !gm.classList.contains('active')) return;
    if (om && om.classList.contains('active')) return;
    var f = imageFromItems((e.clipboardData && e.clipboardData.items) || []);
    if (!f) return;
    e.preventDefault();
    loadOCR().then(function (ocr) { if (ocr && ocr.processFile) ocr.processFile(f); });
  }, true);

  // 3. Drag & drop onto an .ocr-entry zone. dragover must preventDefault so the
  // drop is allowed even before the engine's own dragover handler is bound.
  document.addEventListener('dragover', function (e) {
    if (loaded()) return;
    if (e.target && e.target.closest && e.target.closest('.ocr-entry')) {
      e.preventDefault();
      loadOCR();
    }
  }, true);

  document.addEventListener('drop', function (e) {
    if (loaded()) return;
    if (!(e.target && e.target.closest && e.target.closest('.ocr-entry'))) return;
    var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!f || f.type.indexOf('image/') !== 0) return;
    e.preventDefault();
    loadOCR().then(function (ocr) { if (ocr && ocr.processFile) ocr.processFile(f); });
  }, true);

  // 4. OCR settings entry. nba2k26-ocr.js defines a global openOCRSettings();
  // once it loads, that real function replaces this shim, so we just forward.
  function shimOpenOCRSettings() {
    loadOCR().then(function () {
      if (window.openOCRSettings && window.openOCRSettings !== shimOpenOCRSettings) {
        window.openOCRSettings();
      }
    });
  }
  window.openOCRSettings = shimOpenOCRSettings;

  window.NBA2K26_OCR_LAZY = { loadOCR: loadOCR };
})(window);
