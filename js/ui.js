// Calculife — UI Controller, Animations & Audio Synthesizer
// Handles real-time visualizers, dual-bound inputs, presets, and audio cues

const CalculifeUI = {};

// Sound Synthesizer via Web Audio API
let audioCtx = null;
let soundEnabled = false;

CalculifeUI.initAudio = function () {
  const soundBtn = document.getElementById('sound-toggle');
  if (!soundBtn) return;

  soundBtn.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundBtn.classList.toggle('text-calc-500', soundEnabled);
    soundBtn.classList.toggle('text-gray-400', !soundEnabled);
    soundBtn.setAttribute('title', soundEnabled ? 'Audio cues enabled' : 'Audio muted');
    if (soundEnabled && !audioCtx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) audioCtx = new AudioContext();
    }
    if (soundEnabled) CalculifeUI.playTone(523.25, 0.08, 'sine');
  });
};

CalculifeUI.playTone = function (freq = 440, duration = 0.05, type = 'sine') {
  if (!soundEnabled || !audioCtx) return;
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.06, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // Audio context may require explicit user interaction
  }
};

/** Format numbers cleanly */
CalculifeUI.formatNum = function (n, decimals = 2) {
  if (!isFinite(n) || n === null || n === undefined) return '—';
  return parseFloat(n.toFixed(decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

/** KaTeX helper */
CalculifeUI.renderMath = function (element) {
  if (typeof renderMathInElement !== 'undefined' && element) {
    try {
      renderMathInElement(element, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true },
        ],
        throwOnError: false,
      });
    } catch (e) {
      console.warn('KaTeX render error:', e);
    }
  }
};

/** Toast notification */
CalculifeUI.showToast = function (message) {
  let toast = document.getElementById('calc-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'calc-toast';
    toast.className = 'fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl bg-slate-900/90 text-white font-medium text-sm backdrop-blur-md shadow-2xl border border-slate-700 transition-all duration-300 transform translate-y-12 opacity-0 flex items-center gap-2';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span>✨</span><span>${message}</span>`;
  toast.classList.remove('translate-y-12', 'opacity-0');
  setTimeout(() => {
    toast.classList.add('translate-y-12', 'opacity-0');
  }, 2400);
};

// ==========================================
// TANK FILL UI RENDERER
// ==========================================
CalculifeUI.renderTankResults = function (results) {
  // Update metric numbers
  const volEl = document.getElementById('resultVolume');
  const hEl = document.getElementById('resultHeight');
  const rateEl = document.getElementById('resultRate');
  const pctEl = document.getElementById('resultPercent');
  const fullEl = document.getElementById('timeToFull');
  const remEl = document.getElementById('timeRemaining');
  const dhdtEl = document.getElementById('resultDhDt');

  if (volEl) volEl.textContent = `${CalculifeUI.formatNum(results.currentVolume)} L`;
  if (hEl) hEl.textContent = `${CalculifeUI.formatNum(results.fillHeight, 3)} m`;
  if (rateEl) rateEl.textContent = `${CalculifeUI.formatNum(results.rate)} L/min`;
  if (pctEl) pctEl.textContent = `${CalculifeUI.formatNum(results.fillPercent, 1)}%`;
  if (fullEl) fullEl.textContent = results.timeToFull === Infinity ? 'Never' : `${CalculifeUI.formatNum(results.timeToFull, 1)} min`;
  if (remEl) remEl.textContent = results.timeRemaining === Infinity ? 'Never' : `${CalculifeUI.formatNum(results.timeRemaining, 1)} min`;
  if (dhdtEl) dhdtEl.textContent = `${CalculifeUI.formatNum(results.dh_dt * 100, 2)} cm/min`;

  // Status badge
  const statusBadge = document.getElementById('tankStatusBadge');
  if (statusBadge) {
    if (results.isFull) {
      statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> 100% Full (Valve Closed)';
      statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
    } else if (results.rate > 0) {
      statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-calc-500 animate-ping"></span> Actively Filling';
      statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-calc-500/10 text-calc-500 border border-calc-500/20';
    } else {
      statusBadge.innerHTML = '<span class="w-2 h-2 rounded-full bg-slate-400"></span> Pump Idle';
      statusBadge.className = 'inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  }

  // Formula renderings
  const fVol = document.getElementById('resultVolumeFormula');
  const fHeight = document.getElementById('resultHeightFormula');
  const fRate = document.getElementById('resultRateFormula');

  if (fVol) {
    fVol.innerHTML = `\\( V(t) = ${results.V0} + ${results.Q} \\cdot ${results.t} = ${CalculifeUI.formatNum(results.currentVolume)} \\text{ L} \\)`;
    CalculifeUI.renderMath(fVol);
  }
  if (fHeight) {
    fHeight.innerHTML = `\\( h(t) = \\frac{${CalculifeUI.formatNum(results.currentVolume)}}{1000 \\times ${results.A}} = ${CalculifeUI.formatNum(results.fillHeight, 3)} \\text{ m} \\)`;
    CalculifeUI.renderMath(fHeight);
  }
  if (fRate) {
    fRate.innerHTML = `\\( \\frac{dV}{dt} = ${results.isFull ? '0 \\text{ (capped)}' : results.Q + ' \\text{ L/min}'} \\)`;
    CalculifeUI.renderMath(fRate);
  }

  // Visual Tank SVG updates
  CalculifeUI.updateTankVisual(results);

  // Chart update
  TankCharts.updateTankChart(results);
};

CalculifeUI.updateTankVisual = function (results) {
  const tankWater = document.getElementById('tankWater');
  const waterSurface = document.getElementById('waterSurface');
  const waterStream = document.getElementById('waterStream');
  const tankFillPercent = document.getElementById('tankFillPercent');
  const tankFillBar = document.getElementById('tankFillBar');
  const tankWaterLevelText = document.getElementById('tankWaterLevelText');

  // Height coordinate range: Tank bottom is y=220, Tank top is y=50 (170 height)
  const tankBottomY = 220;
  const tankHeightPx = 160;
  const fillFrac = results.fillPercent / 100;
  const waterHeightPx = fillFrac * tankHeightPx;
  const waterTopY = tankBottomY - waterHeightPx;

  if (tankWater) {
    tankWater.setAttribute('height', Math.max(0, waterHeightPx));
    tankWater.setAttribute('y', waterTopY);
  }

  if (waterSurface) {
    if (results.fillPercent > 0.5) {
      waterSurface.setAttribute('d', `M20 ${waterTopY} Q60 ${waterTopY - 2} 100 ${waterTopY} T180 ${waterTopY}`);
      waterSurface.style.display = 'block';
    } else {
      waterSurface.style.display = 'none';
    }
  }

  // Inflow stream: active when pumping and not yet full
  if (waterStream) {
    if (results.Q > 0 && !results.isFull) {
      waterStream.setAttribute('y2', waterTopY);
      waterStream.style.display = 'block';
    } else {
      waterStream.style.display = 'none';
    }
  }

  if (tankFillPercent) tankFillPercent.textContent = `${CalculifeUI.formatNum(results.fillPercent, 1)}%`;
  if (tankFillBar) tankFillBar.style.width = `${results.fillPercent}%`;
  if (tankWaterLevelText) tankWaterLevelText.textContent = `${CalculifeUI.formatNum(results.currentVolume)} / ${results.capacity} L`;
  const heroRateBadge = document.getElementById('heroRateBadge');
  if (heroRateBadge) heroRateBadge.textContent = `Q = ${results.Q} L/min`;
};

// ==========================================
// NEWTON'S COOLING UI RENDERER
// ==========================================
CalculifeUI.renderCoolingResults = function (results) {
  const tempEl = document.getElementById('coolingResultTemp');
  const rateEl = document.getElementById('coolingResultRate');
  const drinkEl = document.getElementById('coolingTimeToDrink');
  const halfEl = document.getElementById('coolingHalfLife');
  const statusEl = document.getElementById('coolingStatus');

  if (tempEl) tempEl.textContent = `${CalculifeUI.formatNum(results.currentTemp, 1)} °C`;
  if (rateEl) rateEl.textContent = `${CalculifeUI.formatNum(results.instantaneousRate, 2)} °C/min`;
  if (halfEl) halfEl.textContent = `${CalculifeUI.formatNum(results.halfLife, 1)} min`;
  if (drinkEl) {
    drinkEl.textContent = results.timeToDrinkable !== null
      ? `${CalculifeUI.formatNum(results.timeToDrinkable, 1)} min`
      : (results.T0 <= 58 ? 'Ready immediately' : 'Never (Room > 58°C)');
  }

  if (statusEl) {
    statusEl.textContent = results.status;
    statusEl.className = `text-sm font-semibold ${results.statusColor}`;
  }

  // Coffee Mug Visualizer Color & Steam
  const coffeeLiquid = document.getElementById('coffeeLiquid');
  const steamContainer = document.getElementById('steamContainer');

  if (coffeeLiquid) {
    // Dynamic color gradient based on temperature
    // >80°C fiery crimson/amber; 55-65°C coffee caramel; <30°C iced blue/slate
    let color = '#78350f'; // rich coffee
    if (results.currentTemp > 80) color = '#b91c1c'; // scalding red
    else if (results.currentTemp > 65) color = '#ea580c'; // hot amber
    else if (results.currentTemp > 45) color = '#92400e'; // warm brown
    else if (results.currentTemp > 30) color = '#78716c'; // cooling stone
    else color = '#38bdf8'; // iced cool

    coffeeLiquid.setAttribute('fill', color);
  }

  if (steamContainer) {
    // Scale steam opacity and presence with temperature
    if (results.currentTemp > 50) {
      const steamOpacity = Math.min(1, (results.currentTemp - 45) / 45);
      steamContainer.style.opacity = steamOpacity;
      steamContainer.style.display = 'block';
    } else {
      steamContainer.style.display = 'none';
    }
  }

  // Formula rendering
  const fCool = document.getElementById('coolingFormula');
  if (fCool) {
    fCool.innerHTML = `\\( T(${results.t}) = ${results.Tenv} + (${results.T0} - ${results.Tenv}) e^{-${results.k} \\cdot ${results.t}} = ${CalculifeUI.formatNum(results.currentTemp, 1)}^\\circ\\text{C} \\)`;
    CalculifeUI.renderMath(fCool);
  }

  TankCharts.updateCoolingChart(results);
};

// ==========================================
// TANGENT & SECANT UI RENDERER
// ==========================================
CalculifeUI.renderTangentResults = function (model) {
  const secSlopeEl = document.getElementById('tangentSecantSlope');
  const tanSlopeEl = document.getElementById('tangentExactSlope');
  const errorEl = document.getElementById('tangentError');
  const formulaEl = document.getElementById('tangentFnFormula');
  const deltaXEl = document.getElementById('tangentDeltaXDisp');

  if (secSlopeEl) secSlopeEl.textContent = CalculifeUI.formatNum(model.secantSlope, 4);
  if (tanSlopeEl) tanSlopeEl.textContent = CalculifeUI.formatNum(model.tangentSlope, 4);
  if (errorEl) errorEl.textContent = CalculifeUI.formatNum(model.error, 4);
  if (deltaXEl) deltaXEl.textContent = CalculifeUI.formatNum(model.deltaX, 3);

  if (formulaEl) {
    formulaEl.innerHTML = `\\( ${model.formulaLatex} \\quad \\implies \\quad ${model.derivLatex} \\)`;
    CalculifeUI.renderMath(formulaEl);
  }

  const limitExplanation = document.getElementById('tangentLimitExplanation');
  if (limitExplanation) {
    limitExplanation.innerHTML = `
      \\( \\frac{\\Delta y}{\\Delta x} = \\frac{${CalculifeUI.formatNum(model.y1, 2)} - ${CalculifeUI.formatNum(model.y0, 2)}}{${CalculifeUI.formatNum(model.deltaX, 3)}} = ${CalculifeUI.formatNum(model.secantSlope, 4)} \\)
      <span class="mx-3 text-slate-400">⟶</span>
      \\( f'(${model.x0}) = ${CalculifeUI.formatNum(model.tangentSlope, 4)} \\)
    `;
    CalculifeUI.renderMath(limitExplanation);
  }

  TankCharts.updateTangentChart(model);
};

// ==========================================
// THEME & REVEALS
// ==========================================
CalculifeUI.initTheme = function () {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const sunIcon = btn.querySelector('.theme-sun');
  const moonIcon = btn.querySelector('.theme-moon');

  const savedTheme = localStorage.getItem('calculife-theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

  if (isDark) {
    document.documentElement.classList.add('dark');
    if (sunIcon) sunIcon.classList.remove('hidden');
    if (moonIcon) moonIcon.classList.add('hidden');
  } else {
    document.documentElement.classList.remove('dark');
    if (sunIcon) sunIcon.classList.add('hidden');
    if (moonIcon) moonIcon.classList.remove('hidden');
  }

  btn.addEventListener('click', () => {
    const isNowDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('calculife-theme', isNowDark ? 'dark' : 'light');
    if (sunIcon) sunIcon.classList.toggle('hidden', !isNowDark);
    if (moonIcon) moonIcon.classList.toggle('hidden', isNowDark);
    CalculifeUI.playTone(600, 0.05, 'triangle');
    TankCharts.refreshThemes();
  });
};

CalculifeUI.initReveals = function () {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
        }
      });
    },
    { threshold: 0.1 }
  );
  document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
};

window.CalculifeUI = CalculifeUI;
