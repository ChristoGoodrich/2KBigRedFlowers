// In-app version display and manual GitHub release checks.
(function(window, document) {
  'use strict';

  const RELEASES_API = 'https://api.github.com/repos/ChristoGoodrich/2KBigRedFlowers/releases?per_page=12';
  const RELEASES_PAGE = 'https://github.com/ChristoGoodrich/2KBigRedFlowers/releases';

  function tr(key) {
    return typeof window.t === 'function' ? window.t(key) : key;
  }

  function parseVersion(value) {
    const match = String(value || '').trim().match(/^v?(\d+)\.(\d+)\.(\d+)/);
    return match ? match.slice(1).map(Number) : [0, 0, 0];
  }

  function compareVersions(left, right) {
    const a = parseVersion(left);
    const b = parseVersion(right);
    for (let index = 0; index < 3; index += 1) {
      if (a[index] !== b[index]) return a[index] - b[index];
    }
    return 0;
  }

  function getCurrentVersion() {
    return window.NBA2K26_RUNTIME_CONFIG?.appVersion || '0.0.0';
  }

  function renderStatus(message, tone = '', release = null) {
    const status = document.getElementById('about-update-status');
    if (!status) return;
    status.replaceChildren();
    status.className = `about-update-status${tone ? ` ${tone}` : ''}`;

    const text = document.createElement('span');
    text.textContent = message;
    status.appendChild(text);

    if (release?.html_url) {
      const link = document.createElement('a');
      link.href = release.html_url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = tr('Open download page');
      status.appendChild(link);
    }
  }

  function hydrate() {
    const version = getCurrentVersion();
    const versionLabel = document.getElementById('about-version');
    const mobileSubtitle = document.querySelector('#mobile-more-about .mobile-more-item-sub');
    if (versionLabel) versionLabel.textContent = `v${version}`;
    if (mobileSubtitle) mobileSubtitle.textContent = `${tr('Version')} ${version} · ${tr('Check for updates')}`;
  }

  async function checkForUpdates() {
    const button = document.getElementById('about-check-updates');
    if (button) button.disabled = true;
    renderStatus(tr('Checking for updates...'));

    try {
      const response = await fetch(RELEASES_API, {
        headers: { Accept: 'application/vnd.github+json' },
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(`GitHub releases request failed: ${response.status}`);

      const releases = await response.json();
      const latest = releases
        .filter(release => !release.draft && /^v?\d+\.\d+\.\d+/.test(release.tag_name || ''))
        .sort((a, b) => compareVersions(b.tag_name, a.tag_name))[0];

      if (!latest) throw new Error('No versioned GitHub release found');

      const currentVersion = getCurrentVersion();
      const latestVersion = String(latest.tag_name).replace(/^v/, '');
      if (compareVersions(latestVersion, currentVersion) > 0) {
        renderStatus(`${tr('Update available')}: v${latestVersion}`, 'available', latest);
      } else {
        renderStatus(`${tr('You are up to date')}: v${currentVersion}`, 'ok');
      }
    } catch (error) {
      console.warn('update check failed', error);
      renderStatus(tr('Could not check for updates. Open the release page instead.'), 'error', {
        html_url: RELEASES_PAGE,
      });
    } finally {
      if (button) button.disabled = false;
    }
  }

  window.NBA2K26_APP_UPDATE = {
    RELEASES_PAGE,
    checkForUpdates,
    compareVersions,
    getCurrentVersion,
    hydrate,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', hydrate);
  } else {
    hydrate();
  }
})(window, document);
