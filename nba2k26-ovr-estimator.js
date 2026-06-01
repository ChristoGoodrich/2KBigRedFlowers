// NBA 2K26 OVR estimator.
// Owns position-weighted overall estimation from build attributes.
(function(window) {
  'use strict';

  const OVR_WEIGHTS = {
    PG: {
      threePoint: 1.5, midRange: 1.2, freeThrow: 0.8,
      ballHandle: 1.5, passAccuracy: 1.5, speedWithBall: 1.5,
      perimeterDefense: 1.2, steal: 1.0,
      drivingLayup: 1.2, drivingDunk: 0.8, closeShot: 0.8,
      speed: 1.3, agility: 1.2, vertical: 0.6, strength: 0.4,
      defensiveRebound: 0.5, offensiveRebound: 0.3,
      interiorDefense: 0.4, block: 0.3, postControl: 0.2, standingDunk: 0.3,
    },
    SG: {
      threePoint: 1.5, midRange: 1.3, freeThrow: 0.9,
      ballHandle: 1.2, passAccuracy: 1.0, speedWithBall: 1.3,
      perimeterDefense: 1.3, steal: 1.0,
      drivingLayup: 1.3, drivingDunk: 1.2, closeShot: 0.9,
      speed: 1.2, agility: 1.2, vertical: 1.0, strength: 0.5,
      defensiveRebound: 0.6, offensiveRebound: 0.4,
      interiorDefense: 0.4, block: 0.4, postControl: 0.3, standingDunk: 0.4,
    },
    SF: {
      threePoint: 1.3, midRange: 1.2, freeThrow: 0.9,
      ballHandle: 1.0, passAccuracy: 0.9, speedWithBall: 1.0,
      perimeterDefense: 1.3, steal: 0.9,
      drivingLayup: 1.3, drivingDunk: 1.4, closeShot: 1.0, postControl: 0.7,
      speed: 1.1, agility: 1.1, vertical: 1.1, strength: 0.9,
      defensiveRebound: 0.9, offensiveRebound: 0.6,
      interiorDefense: 0.7, block: 0.6, standingDunk: 0.6,
    },
    PF: {
      threePoint: 1.0, midRange: 1.1, freeThrow: 0.8,
      ballHandle: 0.7, passAccuracy: 0.7, speedWithBall: 0.7,
      perimeterDefense: 1.0, steal: 0.7,
      drivingLayup: 1.1, drivingDunk: 1.4, closeShot: 1.1, postControl: 1.2, postFade: 0.8, standingDunk: 1.1,
      speed: 0.9, agility: 0.9, vertical: 1.1, strength: 1.3,
      defensiveRebound: 1.3, offensiveRebound: 1.0,
      interiorDefense: 1.2, block: 1.1,
    },
    C: {
      threePoint: 0.6, midRange: 0.8, freeThrow: 0.7,
      ballHandle: 0.5, passAccuracy: 0.6, speedWithBall: 0.5,
      perimeterDefense: 0.6, steal: 0.5,
      drivingLayup: 0.9, drivingDunk: 1.2, closeShot: 1.3, postControl: 1.5, standingDunk: 1.4,
      speed: 0.7, agility: 0.7, vertical: 1.0, strength: 1.4,
      defensiveRebound: 1.5, offensiveRebound: 1.2,
      interiorDefense: 1.5, block: 1.4,
    },
  };

  function collectAttrsFromForm() {
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

  function estimate(attrs, position) {
    const weights = OVR_WEIGHTS[position] || OVR_WEIGHTS.PG;
    let total = 0;
    let totalWeight = 0;
    Object.keys(weights).forEach(key => {
      if (attrs[key] != null) {
        total += attrs[key] * weights[key];
        totalWeight += weights[key];
      }
    });
    if (totalWeight === 0) return null;
    return Math.max(60, Math.min(99, Math.round(total / totalWeight)));
  }

  function autoCalcOVR(deps) {
    const { toast } = deps;
    const attrs = collectAttrsFromForm();
    if (Object.keys(attrs).length < 5) {
      toast(t('Fill at least 5 attributes first'), true);
      return;
    }

    const position = document.getElementById('b-position').value || 'PG';
    const ovr = estimate(attrs, position);
    if (ovr == null) {
      toast(t('Not enough attribute data'), true);
      return;
    }

    document.getElementById('b-ovr').value = ovr;
    toast(`${t('OVR estimate')}: ${ovr}`);
  }

  window.NBA2K26_OVR_ESTIMATOR = {
    OVR_WEIGHTS,
    collectAttrsFromForm,
    estimate,
    autoCalcOVR,
  };
})(window);
