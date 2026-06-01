/* ================================================================
   NBA2K26 — PREMIUM INTERACTIONS v2.0
   Ripple · Card tilt · Scroll reveal · Number counters
   ================================================================ */
(function () {
  'use strict';

  /* ---- Ripple on primary buttons ---- */
  function createRipple(e) {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;
    const ripple = document.createElement('span');
    ripple.className = 'ripple';
    ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;position:absolute;border-radius:50%;pointer-events:none;`;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
  }

  function initRipple() {
    document.querySelectorAll('.btn:not([data-ripple]), .context-action.primary:not([data-ripple])').forEach(btn => {
      btn.setAttribute('data-ripple', '1');
      btn.addEventListener('click', createRipple);
    });
  }

  /* ---- 3-D card tilt on build cards ---- */
  function initCardTilt() {
    document.querySelectorAll('.build-card:not([data-tilt])').forEach(card => {
      card.setAttribute('data-tilt', '1');

      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const dx = (e.clientX - (r.left + r.width  / 2)) / (r.width  / 2);
        const dy = (e.clientY - (r.top  + r.height / 2)) / (r.height / 2);
        card.style.transform = `
          translateY(-6px)
          perspective(900px)
          rotateX(${(dy * -3.5).toFixed(2)}deg)
          rotateY(${(dx *  3.5).toFixed(2)}deg)
          scale(1.012)
        `;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ---- Scroll-driven entrance animations ---- */
  let revealObserver = null;

  function initScrollReveal() {
    if (revealObserver) revealObserver.disconnect();

    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('revealed');
      });
    }, { threshold: 0.07, rootMargin: '0px 0px -24px 0px' });

    /* Stagger grids */
    document.querySelectorAll(
      '.builds-grid, .home-action-grid, .home-snapshot-grid, .perf-grid, .lab-kpi-grid, .build-command-grid'
    ).forEach(el => {
      if (!el.classList.contains('reveal-stagger')) {
        el.classList.add('reveal-stagger');
      }
      revealObserver.observe(el);
    });

    /* Individual panels */
    document.querySelectorAll(
      '.home-dashboard, .build-command, .performance-dashboard, ' +
      '.viz-lab, .analysis-drawer, .lab-panel, .table-section, ' +
      '.build-compare-panel, .detail-command, .home-panel'
    ).forEach(el => {
      if (!el.classList.contains('reveal')) {
        el.classList.add('reveal');
      }
      revealObserver.observe(el);
    });
  }

  /* ---- Number counter animation ---- */
  let numObserver = null;

  function animateNumber(el, target, duration) {
    const start = performance.now();
    const isFloat = String(target).includes('.');
    const decimals = isFloat ? (String(target).split('.')[1] || '').length : 0;

    (function step(now) {
      const t = Math.min((now - start) / duration, 1);
      const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
      const cur = target * eased;
      el.textContent = isFloat ? cur.toFixed(decimals) : Math.round(cur).toString();
      if (t < 1) requestAnimationFrame(step);
    })(start);
  }

  function initNumberAnimations() {
    if (numObserver) numObserver.disconnect();

    numObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        if (el.dataset.counted) return;
        el.dataset.counted = '1';
        const text = el.textContent.trim();
        // Only animate plain numbers or "NN.N%" — skip compound strings like "4W-2L"
        if (!/^\d+(\.\d+)?%?$/.test(text)) { numObserver.unobserve(el); return; }
        const num = parseFloat(text);
        if (!isNaN(num) && num > 0 && num < 9999) {
          animateNumber(el, num, 700);
        }
        numObserver.unobserve(el);
      });
    }, { threshold: 0.6 });

    document.querySelectorAll(
      '.account-bar-value, .stat-mini-value, .perf-value, ' +
      '.lab-kpi strong, .home-kpi strong, .lab-count, .lab-record'
    ).forEach(el => {
      numObserver.observe(el);
    });
  }

  /* ---- Stagger-reveal build cards on page switch ---- */
  function staggerCards() {
    const cards = document.querySelectorAll('.build-card');
    cards.forEach((c, i) => {
      c.style.opacity = '0';
      c.style.transform = 'translateY(14px)';
      setTimeout(() => {
        c.style.transition = 'opacity 0.38s ease, transform 0.38s cubic-bezier(0.16,1,0.3,1)';
        c.style.opacity = '';
        c.style.transform = '';
        setTimeout(() => { c.style.transition = ''; }, 450);
      }, i * 55);
    });
  }

  /* ---- Master reinit (called after DOM mutations) ---- */
  function reinit() {
    initRipple();
    initCardTilt();
    initScrollReveal();
    initNumberAnimations();
  }

  /* ---- Bootstrap ---- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', reinit);
  } else {
    reinit();
  }

  /* Watch for page/content changes (SPA routing) */
  const root = document.querySelector('.main') || document.body;
  let debounce = null;
  new MutationObserver(() => {
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      reinit();
      staggerCards();
    }, 160);
  }).observe(root, { childList: true, subtree: true });

  window.NBA2K26_Interactions = { reinit, staggerCards };
})();
