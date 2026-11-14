// Calculife — Chart.js Visualizations
// Manages responsive, dark-mode aware charts for Tank Fill, Cooling, and Tangent curves

const TankCharts = {};

let tankChartInstance = null;
let coolingChartInstance = null;
let tangentChartInstance = null;

/** Helper to detect dark mode */
function isDarkMode() {
  return document.documentElement.classList.contains('dark');
}

/** Theme color helper */
function getChartTheme() {
  const dark = isDarkMode();
  return {
    textColor: dark ? '#94a3b8' : '#64748b',
    gridColor: dark ? 'rgba(51, 65, 85, 0.4)' : 'rgba(226, 232, 240, 0.7)',
    tooltipBg: dark ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
    tooltipText: dark ? '#f8fafc' : '#0f172a',
    tooltipBorder: dark ? '#334155' : '#cbd5e1',
  };
}

// ==========================================
// 1. TANK FILL CHART
// ==========================================
TankCharts.initTankChart = function (canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  if (tankChartInstance) {
    tankChartInstance.destroy();
  }

  const theme = getChartTheme();

  tankChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Water Volume V(t)',
          data: [],
          borderColor: '#0ea5e9',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(14, 165, 233, 0.15)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(14, 165, 233, 0.45)');
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0.0)');
            return gradient;
          },
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#0ea5e9',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          fill: true,
          tension: 0.1,
        },
        {
          label: 'Tank Capacity Limit',
          data: [],
          borderColor: '#ef4444',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Current Point (t, V)',
          data: [],
          borderColor: '#0284c7',
          backgroundColor: '#38bdf8',
          pointRadius: 7,
          pointHoverRadius: 9,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 3,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300, easing: 'easeOutQuad' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: theme.textColor, font: { family: 'Inter', size: 12, weight: '500' } },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Time t (minutes)',
            color: theme.textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor, maxTicksLimit: 12 },
          grid: { color: theme.gridColor },
        },
        y: {
          title: {
            display: true,
            text: 'Volume V (Liters)',
            color: theme.textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor },
          grid: { color: theme.gridColor },
          beginAtZero: true,
        },
      },
    },
  });

  return tankChartInstance;
};

TankCharts.updateTankChart = function (results, timePoints = 60) {
  if (!tankChartInstance) return;

  const { Q, V0, currentVolume, capacity, t } = results;
  const timeToFull = results.timeToFull || 0;
  const maxPlotTime = Math.max(t * 1.3, timeToFull > 0 ? timeToFull * 1.15 : 30, 10);

  const labels = [];
  const volumeData = [];
  const capacityData = [];
  const currentPointData = [];

  for (let i = 0; i <= timePoints; i++) {
    const curT = (maxPlotTime / timePoints) * i;
    const vol = Math.min(V0 + Q * curT, capacity);
    labels.push(curT.toFixed(1));
    volumeData.push(vol);
    capacityData.push(capacity);

    // If close to current t, place current point
    if (Math.abs(curT - t) < (maxPlotTime / timePoints) * 0.75) {
      currentPointData.push(currentVolume);
    } else {
      currentPointData.push(null);
    }
  }

  // Ensure current point is pinned
  const closestIdx = Math.round((t / maxPlotTime) * timePoints);
  if (closestIdx >= 0 && closestIdx <= timePoints) {
    currentPointData[closestIdx] = currentVolume;
  }

  tankChartInstance.data.labels = labels;
  tankChartInstance.data.datasets[0].data = volumeData;
  tankChartInstance.data.datasets[1].data = capacityData;
  tankChartInstance.data.datasets[2].data = currentPointData;
  tankChartInstance.options.scales.y.max = Math.ceil(capacity * 1.15);
  tankChartInstance.update('none');
};

// ==========================================
// 2. NEWTON'S COOLING CHART
// ==========================================
TankCharts.initCoolingChart = function (canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  if (coolingChartInstance) {
    coolingChartInstance.destroy();
  }

  const theme = getChartTheme();

  coolingChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Temperature T(t) °C',
          data: [],
          borderColor: '#f59e0b',
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx, chartArea } = chart;
            if (!chartArea) return 'rgba(245, 158, 11, 0.15)';
            const gradient = ctx.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, 'rgba(245, 158, 11, 0.4)');
            gradient.addColorStop(1, 'rgba(14, 165, 233, 0.05)');
            return gradient;
          },
          borderWidth: 3,
          pointRadius: 0,
          fill: true,
          tension: 0.35,
        },
        {
          label: 'Room Temp (T_env)',
          data: [],
          borderColor: '#64748b',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Optimal Drink Temp (58°C)',
          data: [],
          borderColor: '#10b981',
          borderWidth: 1.5,
          borderDash: [4, 4],
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'Current State (t, T)',
          data: [],
          borderColor: '#ea580c',
          backgroundColor: '#fbbf24',
          pointRadius: 7,
          pointHoverRadius: 9,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 3,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 300, easing: 'easeOutQuad' },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          display: true,
          labels: { color: theme.textColor, font: { family: 'Inter', size: 12 } },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Elapsed Time t (minutes)',
            color: theme.textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor },
          grid: { color: theme.gridColor },
        },
        y: {
          title: {
            display: true,
            text: 'Temperature (°C)',
            color: theme.textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor },
          grid: { color: theme.gridColor },
        },
      },
    },
  });

  return coolingChartInstance;
};

TankCharts.updateCoolingChart = function (results, timePoints = 60) {
  if (!coolingChartInstance) return;

  const { T0, Tenv, k, t, currentTemp } = results;
  const maxPlotTime = Math.max(t * 1.5, (4 / k), 30);

  const labels = [];
  const tempData = [];
  const roomData = [];
  const idealData = [];
  const currentPointData = [];

  for (let i = 0; i <= timePoints; i++) {
    const curT = (maxPlotTime / timePoints) * i;
    const temp = Tenv + (T0 - Tenv) * Math.exp(-k * curT);
    labels.push(curT.toFixed(1));
    tempData.push(temp);
    roomData.push(Tenv);
    idealData.push(58);
    currentPointData.push(null);
  }

  const closestIdx = Math.round((t / maxPlotTime) * timePoints);
  if (closestIdx >= 0 && closestIdx <= timePoints) {
    currentPointData[closestIdx] = currentTemp;
  }

  coolingChartInstance.data.labels = labels;
  coolingChartInstance.data.datasets[0].data = tempData;
  coolingChartInstance.data.datasets[1].data = roomData;
  coolingChartInstance.data.datasets[2].data = idealData;
  coolingChartInstance.data.datasets[3].data = currentPointData;
  coolingChartInstance.options.scales.y.min = Math.floor(Math.min(Tenv, 0));
  coolingChartInstance.options.scales.y.max = Math.ceil(Math.max(T0, 100) * 1.05);
  coolingChartInstance.update('none');
};

// ==========================================
// 3. TANGENT & SECANT EXPLORER CHART
// ==========================================
TankCharts.initTangentChart = function (canvasId) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return null;

  if (tangentChartInstance) {
    tangentChartInstance.destroy();
  }

  const theme = getChartTheme();

  tangentChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Curve f(x)',
          data: [],
          borderColor: '#0284c7',
          borderWidth: 3.5,
          pointRadius: 0,
          fill: false,
          tension: 0.2,
        },
        {
          label: 'Secant Line (slope Δy/Δx)',
          data: [],
          borderColor: '#a855f7',
          borderWidth: 2,
          borderDash: [6, 4],
          pointRadius: 0,
          fill: false,
        },
        {
          label: "Tangent Line f'(x₀) (exact derivative)",
          data: [],
          borderColor: '#10b981',
          borderWidth: 2.5,
          pointRadius: 0,
          fill: false,
        },
        {
          label: 'P(x₀, y₀)',
          data: [],
          borderColor: '#0284c7',
          backgroundColor: '#38bdf8',
          pointRadius: 7,
          pointHoverRadius: 9,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          showLine: false,
        },
        {
          label: 'Q(x₀+Δx, y₀+Δy)',
          data: [],
          borderColor: '#9333ea',
          backgroundColor: '#c084fc',
          pointRadius: 7,
          pointHoverRadius: 9,
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
          showLine: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 250, easing: 'easeOutQuad' },
      plugins: {
        legend: {
          display: true,
          labels: { color: theme.textColor, font: { family: 'Inter', size: 12 } },
        },
        tooltip: {
          backgroundColor: theme.tooltipBg,
          titleColor: theme.tooltipText,
          bodyColor: theme.tooltipText,
          borderColor: theme.tooltipBorder,
          borderWidth: 1,
          cornerRadius: 10,
          padding: 10,
        },
      },
      scales: {
        x: {
          type: 'linear',
          title: {
            display: true,
            text: 'x',
            color: theme.textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor },
          grid: { color: theme.gridColor },
        },
        y: {
          title: {
            display: true,
            text: 'y = f(x)',
            color: theme.textColor,
            font: { family: 'Inter', size: 12, weight: '600' },
          },
          ticks: { color: theme.textColor },
          grid: { color: theme.gridColor },
        },
      },
    },
  });

  return tangentChartInstance;
};

TankCharts.updateTangentChart = function (model) {
  if (!tangentChartInstance) return;

  const { x0, y0, deltaX, x1, y1, secantSlope, tangentSlope, f } = model;

  const minX = Math.max(-2, Math.min(x0 - 2, 0));
  const maxX = Math.max(x1 + 2.5, 6);
  const steps = 70;

  const curveData = [];
  const secantData = [];
  const tangentData = [];

  const lineSpan = (maxX - minX) * 0.4;
  const secLineStart = x0 - lineSpan;
  const secLineEnd = x1 + lineSpan;

  const tanLineStart = x0 - lineSpan;
  const tanLineEnd = x0 + lineSpan;

  for (let i = 0; i <= steps; i++) {
    const curX = minX + ((maxX - minX) / steps) * i;
    curveData.push({ x: curX, y: f(curX) });

    if (curX >= secLineStart && curX <= secLineEnd) {
      secantData.push({ x: curX, y: y0 + secantSlope * (curX - x0) });
    }

    if (curX >= tanLineStart && curX <= tanLineEnd) {
      tangentData.push({ x: curX, y: y0 + tangentSlope * (curX - x0) });
    }
  }

  tangentChartInstance.data.datasets[0].data = curveData;
  tangentChartInstance.data.datasets[1].data = secantData;
  tangentChartInstance.data.datasets[2].data = tangentData;
  tangentChartInstance.data.datasets[3].data = [{ x: x0, y: y0 }];
  tangentChartInstance.data.datasets[4].data = [{ x: x1, y: y1 }];

  tangentChartInstance.options.scales.x.min = minX;
  tangentChartInstance.options.scales.x.max = maxX;

  tangentChartInstance.update('none');
};

/** Refresh chart styling when theme toggles */
TankCharts.refreshThemes = function () {
  const theme = getChartTheme();
  [tankChartInstance, coolingChartInstance, tangentChartInstance].forEach((inst) => {
    if (!inst) return;
    if (inst.options.plugins.legend) {
      inst.options.plugins.legend.labels.color = theme.textColor;
    }
    if (inst.options.scales.x) {
      inst.options.scales.x.ticks.color = theme.textColor;
      inst.options.scales.x.grid.color = theme.gridColor;
      if (inst.options.scales.x.title) inst.options.scales.x.title.color = theme.textColor;
    }
    if (inst.options.scales.y) {
      inst.options.scales.y.ticks.color = theme.textColor;
      inst.options.scales.y.grid.color = theme.gridColor;
      if (inst.options.scales.y.title) inst.options.scales.y.title.color = theme.textColor;
    }
    inst.update();
  });
};

window.TankCharts = TankCharts;
