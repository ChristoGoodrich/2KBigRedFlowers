// Public runtime defaults for hosted and packaged builds.
// The staging script replaces these blanks from NBA2K_SUPABASE_* env vars.
(function(window) {
  'use strict';

  window.NBA2K_RUNTIME_CONFIG = Object.freeze({
    appVersion: '1.1.0',
    supabaseUrl: '',
    supabaseAnonKey: '',
  });
})(window);
