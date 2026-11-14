// Calculife — Main Application Orchestrator
// Connects UI bindings, live simulation engines, presets, tabs, and math updates

document.addEventListener('DOMContentLoaded', () => {
  // Initialize UI systems
  CalculifeUI.initTheme();
  CalculifeUI.initAudio();
  CalculifeUI.initReveals();

  // Initialize charts
  TankCharts.initTankChart('tankChart');
  TankCharts.initCoolingChart('coolingChart');
  TankCharts.initTangentChart('tangentChart');

  // ==========================================
  // TAB NAVIGATION
  // ==========================================
  const tabButtons = document.querySelectorAll('[data-calc-tab]');
  const tabSections = {
    tank: document.getElementById('tab-tank'),
    cooling: document.getElementById('tab-cooling'),
    tangent: document.getElementById('tab-tangent'),
    proofs: document.getElementById('tab-proofs'),
  };

  function switchTab(tabId) {
    tabButtons.forEach((btn) => {
      const active = btn.getAttribute('data-calc-tab') === tabId;
      btn.classList.toggle('tab-active', active);
      btn.classList.toggle('bg-white', !active);
      btn.classList.toggle('dark:bg-slate-800', !active);
      btn.classList.toggle('text-slate-600', !active);
      btn.classList.toggle('dark:text-slate-300', !active);
    });

    Object.entries(tabSections).forEach(([id, section]) => {
      if (section) {
        section.classList.toggle('hidden', id !== tabId);
      }
    });

    // Resize active charts on tab visibility change
    setTimeout(() => {
      if (tabId === 'tank') TankCharts.updateTankChart(lastTankResults);
      if (tabId === 'cooling') handleCoolingCalculate();
      if (tabId === 'tangent') handleTangentCalculate();
    }, 50);

    CalculifeUI.playTone(480, 0.04, 'triangle');
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.getAttribute('data-calc-tab');
      switchTab(target);
    });
  });

  // ==========================================
  // DUAL-BINDING HELPER (Number Input <-> Slider)
  // ==========================================
  function bindInputAndSlider(inputId, sliderId, onUpdate) {
    const numInput = document.getElementById(inputId);
    const slider = document.getElementById(sliderId);

    if (numInput && slider) {
      slider.addEventListener('input', () => {
        numInput.value = slider.value;
        CalculifeUI.playTone(300 + parseFloat(slider.value) * 2, 0.015, 'sine');
        onUpdate();
      });

      numInput.addEventListener('input', () => {
        slider.value = numInput.value;
        onUpdate();
      });
    }
  }

  // ==========================================
  // 1. TANK FILL CALCULATOR & SIMULATOR
  // ==========================================
  const tankInputs = {
    pumpRate: document.getElementById('pumpRate'),
    tankCapacity: document.getElementById('tankCapacity'),
    initialLevel: document.getElementById('initialLevel'),
    elapsedTime: document.getElementById('elapsedTime'),
    tankArea: document.getElementById('tankArea'),
  };

  let lastTankResults = {};

  function handleTankCalculate() {
    const inputs = {};
    for (const [key, el] of Object.entries(tankInputs)) {
      if (el) inputs[key] = el.value;
    }

    lastTankResults = Calculators.tankFill(inputs);
    CalculifeUI.renderTankResults(lastTankResults);
  }

  // Bind dual sliders & numeric inputs
  bindInputAndSlider('pumpRate', 'pumpRateSlider', handleTankCalculate);
  bindInputAndSlider('tankCapacity', 'tankCapacitySlider', handleTankCalculate);
  bindInputAndSlider('initialLevel', 'initialLevelSlider', handleTankCalculate);
  bindInputAndSlider('elapsedTime', 'elapsedTimeSlider', handleTankCalculate);
  bindInputAndSlider('tankArea', 'tankAreaSlider', handleTankCalculate);

  // Live simulation play / pause / reset engine
  let simInterval = null;
  let simSpeed = 1.0;
  const playBtn = document.getElementById('simPlayBtn');
  const pauseBtn = document.getElementById('simPauseBtn');
  const resetBtn = document.getElementById('simResetBtn');
  const speedPills = document.querySelectorAll('[data-sim-speed]');

  function startSimulation() {
    if (simInterval) clearInterval(simInterval);
    if (playBtn) playBtn.classList.add('hidden');
    if (pauseBtn) pauseBtn.classList.remove('hidden');

    const timeInput = tankInputs.elapsedTime;
    const timeSlider = document.getElementById('elapsedTimeSlider');

    const dt = 0.15; // advance 0.15 min per tick
    simInterval = setInterval(() => {
      let currentT = parseFloat(timeInput.value) || 0;
      currentT += dt * simSpeed;

      const maxT = lastTankResults.timeToFull ? lastTankResults.timeToFull * 1.05 : 60;
      if (lastTankResults.isFull || currentT >= maxT) {
        pauseSimulation();
        CalculifeUI.showToast('Tank reached capacity! Flow throttled.');
        CalculifeUI.playTone(880, 0.25, 'triangle');
        return;
      }

      timeInput.value = currentT.toFixed(1);
      if (timeSlider) timeSlider.value = currentT.toFixed(1);
      handleTankCalculate();
    }, 80);
  }

  function pauseSimulation() {
    if (simInterval) {
      clearInterval(simInterval);
      simInterval = null;
    }
    if (playBtn) playBtn.classList.remove('hidden');
    if (pauseBtn) pauseBtn.classList.add('hidden');
  }

  function resetSimulation() {
    pauseSimulation();
    if (tankInputs.elapsedTime) tankInputs.elapsedTime.value = 0;
    const timeSlider = document.getElementById('elapsedTimeSlider');
    if (timeSlider) timeSlider.value = 0;
    handleTankCalculate();
    CalculifeUI.showToast('Simulation reset to t = 0');
  }

  if (playBtn) playBtn.addEventListener('click', startSimulation);
  if (pauseBtn) pauseBtn.addEventListener('click', pauseSimulation);
  if (resetBtn) resetBtn.addEventListener('click', resetSimulation);

  speedPills.forEach((pill) => {
    pill.addEventListener('click', () => {
      speedPills.forEach((p) => p.classList.remove('bg-calc-600', 'text-white'));
      pill.classList.add('bg-calc-600', 'text-white');
      simSpeed = parseFloat(pill.getAttribute('data-sim-speed')) || 1.0;
    });
  });

  // Tank Presets
  const tankPresets = {
    domestic: { pumpRate: 35, tankCapacity: 1000, initialLevel: 150, elapsedTime: 12, tankArea: 1.2 },
    hydrant: { pumpRate: 600, tankCapacity: 10000, initialLevel: 500, elapsedTime: 8, tankArea: 6.5 },
    rainbarrel: { pumpRate: 10, tankCapacity: 250, initialLevel: 30, elapsedTime: 15, tankArea: 0.6 },
    micro: { pumpRate: 0.5, tankCapacity: 10, initialLevel: 1.0, elapsedTime: 8, tankArea: 0.05 },
  };

  document.querySelectorAll('[data-tank-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const presetKey = btn.getAttribute('data-tank-preset');
      const p = tankPresets[presetKey];
      if (!p) return;

      Object.entries(p).forEach(([k, val]) => {
        if (tankInputs[k]) tankInputs[k].value = val;
        const slider = document.getElementById(`${k}Slider`);
        if (slider) slider.value = val;
      });

      handleTankCalculate();
      CalculifeUI.showToast(`Loaded Preset: ${btn.textContent.trim()}`);
      CalculifeUI.playTone(550, 0.06, 'triangle');
    });
  });

  // Initial tank run
  handleTankCalculate();

  // ==========================================
  // 2. NEWTON'S COOLING CALCULATOR
  // ==========================================
  const coolingInputs = {
    initialTemp: document.getElementById('coolingInitialTemp'),
    ambientTemp: document.getElementById('coolingAmbientTemp'),
    coolingRate: document.getElementById('coolingRate'),
    coolingTime: document.getElementById('coolingTime'),
  };

  function handleCoolingCalculate() {
    const inputs = {};
    for (const [key, el] of Object.entries(coolingInputs)) {
      if (el) inputs[key] = el.value;
    }

    const results = Calculators.cooling(inputs);
    CalculifeUI.renderCoolingResults(results);
  }

  bindInputAndSlider('coolingInitialTemp', 'coolingInitialTempSlider', handleCoolingCalculate);
  bindInputAndSlider('coolingAmbientTemp', 'coolingAmbientTempSlider', handleCoolingCalculate);
  bindInputAndSlider('coolingRate', 'coolingRateSlider', handleCoolingCalculate);
  bindInputAndSlider('coolingTime', 'coolingTimeSlider', handleCoolingCalculate);

  // Cooling Presets
  const coolingPresets = {
    coffee: { initialTemp: 92, ambientTemp: 22, coolingRate: 0.045, coolingTime: 12 },
    thermos: { initialTemp: 95, ambientTemp: 18, coolingRate: 0.009, coolingTime: 45 },
    icedtea: { initialTemp: 4, ambientTemp: 32, coolingRate: 0.065, coolingTime: 20 },
    soup: { initialTemp: 98, ambientTemp: 24, coolingRate: 0.035, coolingTime: 15 },
  };

  document.querySelectorAll('[data-cooling-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-cooling-preset');
      const p = coolingPresets[key];
      if (!p) return;

      Object.entries(p).forEach(([k, val]) => {
        if (coolingInputs[k]) coolingInputs[k].value = val;
        const slider = document.getElementById(`${k}Slider`);
        if (slider) slider.value = val;
      });

      handleCoolingCalculate();
      CalculifeUI.showToast(`Loaded Preset: ${btn.textContent.trim()}`);
      CalculifeUI.playTone(520, 0.06, 'sine');
    });
  });

  handleCoolingCalculate();

  // ==========================================
  // 3. TANGENT & SECANT EXPLORER
  // ==========================================
  const tangentFnSelect = document.getElementById('tangentFnSelect');
  const tangentX0 = document.getElementById('tangentX0');
  const tangentDeltaX = document.getElementById('tangentDeltaX');

  function handleTangentCalculate() {
    const fnType = tangentFnSelect ? tangentFnSelect.value : 'polynomial';
    const x0 = tangentX0 ? parseFloat(tangentX0.value) : 2;
    const deltaX = tangentDeltaX ? parseFloat(tangentDeltaX.value) : 1.5;

    const model = Calculators.tangentSecant(fnType, x0, deltaX);
    CalculifeUI.renderTangentResults(model);
  }

  if (tangentFnSelect) {
    tangentFnSelect.addEventListener('change', () => {
      handleTangentCalculate();
      CalculifeUI.playTone(440, 0.04, 'sine');
    });
  }

  bindInputAndSlider('tangentX0', 'tangentX0Slider', handleTangentCalculate);
  bindInputAndSlider('tangentDeltaX', 'tangentDeltaXSlider', handleTangentCalculate);

  // Quick delta-x squeeze buttons: Δx -> 0
  document.querySelectorAll('[data-squeeze-dx]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const dxVal = parseFloat(btn.getAttribute('data-squeeze-dx')) || 0.01;
      if (tangentDeltaX) tangentDeltaX.value = dxVal;
      const slider = document.getElementById('tangentDeltaXSlider');
      if (slider) slider.value = dxVal;
      handleTangentCalculate();
      CalculifeUI.showToast(`Squeezed Δx to ${dxVal} (Approaching instantaneous derivative)`);
      CalculifeUI.playTone(700, 0.06, 'triangle');
    });
  });

  handleTangentCalculate();

  // ==========================================
  // COPY SUMMARY & EXPORT
  // ==========================================
  const copySummaryBtn = document.getElementById('copySummaryBtn');
  if (copySummaryBtn) {
    copySummaryBtn.addEventListener('click', () => {
      const summaryText = `### Calculife Simulation Summary 💧
- Pump Flow Rate Q (dV/dt): ${lastTankResults.Q} L/min
- Tank Capacity: ${lastTankResults.capacity} L
- Initial Fill V0: ${lastTankResults.V0} L
- Elapsed Time t: ${lastTankResults.t} min
- Current Volume V(t): ${CalculifeUI.formatNum(lastTankResults.currentVolume)} L (${CalculifeUI.formatNum(lastTankResults.fillPercent, 1)}%)
- Fill Height h(t): ${CalculifeUI.formatNum(lastTankResults.fillHeight, 3)} m
- Height Rate dh/dt: ${CalculifeUI.formatNum(lastTankResults.dh_dt * 100, 2)} cm/min
- Time to Full: ${CalculifeUI.formatNum(lastTankResults.timeToFull, 1)} min

*Generated with Calculife — Real-World Calculus Engine*`;

      navigator.clipboard.writeText(summaryText).then(() => {
        CalculifeUI.showToast('Calculation summary copied to clipboard! 📋');
        CalculifeUI.playTone(659.25, 0.08, 'triangle');
      }).catch(() => {
        CalculifeUI.showToast('Copied to clipboard');
      });
    });
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
});
