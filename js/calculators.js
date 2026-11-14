// Calculife — Calculator Logic
// Pure math & calculus functions for real-world rate-of-change modeling

const Calculators = {};

/**
 * 1. Tank Fill Rate Calculator
 * Models a tank filling under constant pump flow rate Q.
 *
 * Calculus equations:
 *   Differential equation: dV/dt = Q
 *   Definite Integral:     V(t) = V0 + ∫[0 to t] Q dt = V0 + Q·t
 *   Fluid Height:          h(t) = V(t) / (1000·A)  [where 1 m³ = 1000 L]
 *   Height rate of change: dh/dt = (dV/dt) / (1000·A) = Q / (1000·A)
 */
Calculators.tankFill = function (inputs) {
  const Q = Math.max(0, parseFloat(inputs.pumpRate) || 0);          // L/min
  const capacity = Math.max(0.1, parseFloat(inputs.tankCapacity) || 1000); // Liters
  const V0 = Math.min(capacity, Math.max(0, parseFloat(inputs.initialLevel) || 0)); // Liters
  const t = Math.max(0, parseFloat(inputs.elapsedTime) || 0);        // minutes
  const A = Math.max(0.01, parseFloat(inputs.tankArea) || 1.0);     // m^2

  // Volume accumulation
  const unclampedVolume = V0 + Q * t;
  const currentVolume = Math.min(unclampedVolume, capacity);
  const isFull = unclampedVolume >= capacity;

  // Real world fluid height (1 m³ = 1000 L, so Volume in m³ = V / 1000)
  // Height in meters = Volume(m³) / Area(m²) = V / (1000 * A)
  const fillHeight = (currentVolume / (1000 * A));
  const maxHeight = (capacity / (1000 * A));
  const fillPercent = Math.min(100, Math.max(0, (currentVolume / capacity) * 100));

  // Instantaneous rate of volume change dV/dt (0 once full)
  const rate = isFull && t > 0 ? 0 : Q;
  const dh_dt = isFull ? 0 : (Q / (1000 * A)); // m/min

  // Time metrics
  const timeToFull = Q > 0 ? Math.max(0, (capacity - V0) / Q) : Infinity;
  const timeRemaining = Q > 0 ? Math.max(0, (capacity - currentVolume) / Q) : Infinity;

  return {
    Q,
    capacity,
    V0,
    t,
    A,
    currentVolume,
    fillHeight,
    maxHeight,
    fillPercent,
    rate,
    dh_dt,
    timeToFull: isFinite(timeToFull) ? timeToFull : 0,
    timeRemaining: isFinite(timeRemaining) ? timeRemaining : 0,
    isFull,
    overflowVolume: Math.max(0, unclampedVolume - capacity),
  };
};

/**
 * 2. Newton's Law of Cooling Calculator (The Coffee/Thermodynamics Problem)
 * Rate of heat loss is proportional to temperature difference from environment.
 *
 * Calculus equations:
 *   Differential equation: dT/dt = -k · (T - T_env)
 *   General Solution:      T(t) = T_env + (T_0 - T_env) · e^(-k·t)
 *   Instantaneous Cooling: dT/dt = -k · (T(t) - T_env)
 */
Calculators.cooling = function (inputs) {
  const T0 = parseFloat(inputs.initialTemp) ?? 90;       // °C (initial liquid temp)
  const Tenv = parseFloat(inputs.ambientTemp) ?? 22;     // °C (room temp)
  const k = Math.max(0.001, parseFloat(inputs.coolingRate) ?? 0.045); // min^-1
  const t = Math.max(0, parseFloat(inputs.coolingTime) ?? 15);        // minutes

  const tempDiff0 = T0 - Tenv;
  const currentTemp = Tenv + tempDiff0 * Math.exp(-k * t);
  const currentDiff = currentTemp - Tenv;
  const instantaneousRate = -k * currentDiff; // °C/min

  // Time to reach specific drinking temp threshold (e.g. 58°C - optimal drinking temp)
  const targetDrinkTemp = 58;
  let timeToDrinkable = null;
  if (T0 > targetDrinkTemp && Tenv < targetDrinkTemp) {
    timeToDrinkable = -Math.log((targetDrinkTemp - Tenv) / (T0 - Tenv)) / k;
  }

  // Thermal half-life (time to close half the temperature gap)
  const halfLife = Math.LN2 / k;

  // Temperature status description
  let status = 'Ideal Drinking Temp ☕';
  let statusColor = 'text-amber-500';
  if (currentTemp > 75) {
    status = 'Scalding Hot ⚠️';
    statusColor = 'text-red-500';
  } else if (currentTemp > 65) {
    status = 'Very Hot (Sip with care) 🔥';
    statusColor = 'text-orange-500';
  } else if (currentTemp >= 50) {
    status = 'Perfect Drinking Zone ☕';
    statusColor = 'text-emerald-500';
  } else if (currentTemp >= 35) {
    status = 'Lukewarm';
    statusColor = 'text-sky-500';
  } else {
    status = 'Room Temperature ❄️';
    statusColor = 'text-indigo-400';
  }

  return {
    T0,
    Tenv,
    k,
    t,
    currentTemp,
    instantaneousRate,
    timeToDrinkable,
    halfLife,
    status,
    statusColor,
  };
};

/**
 * 3. Rate of Change & Tangent Secant Visualizer
 * Shows how secant slope Δy/Δx approaches the exact derivative dy/dx as Δx -> 0.
 */
Calculators.tangentSecant = function (fnType, x0, deltaX) {
  x0 = parseFloat(x0) || 2;
  deltaX = Math.max(0.0001, parseFloat(deltaX) || 1.5);

  // Evaluates f(x) and analytical f'(x)
  let f, df, name, formulaLatex, derivLatex;

  switch (fnType) {
    case 'polynomial': // f(x) = x² - 2x + 1
      f = (x) => x * x - 2 * x + 1;
      df = (x) => 2 * x - 2;
      name = 'Parabolic Curve: f(x) = x² - 2x + 1';
      formulaLatex = 'f(x) = x^2 - 2x + 1';
      derivLatex = "f'(x) = 2x - 2";
      break;

    case 'kinetics': // Distance s(t) = 0.5 * a * t² (acceleration = 4 m/s²)
      f = (t) => 2 * t * t;
      df = (t) => 4 * t;
      name = 'Vehicle Motion: s(t) = 2t²';
      formulaLatex = 's(t) = 2t^2';
      derivLatex = "v(t) = s'(t) = 4t";
      break;

    case 'cubic': // f(x) = 0.2x³ - x
      f = (x) => 0.2 * Math.pow(x, 3) - x;
      df = (x) => 0.6 * Math.pow(x, 2) - 1;
      name = 'Cubic Curve: f(x) = 0.2x³ - x';
      formulaLatex = 'f(x) = 0.2x^3 - x';
      derivLatex = "f'(x) = 0.6x^2 - 1";
      break;

    case 'exponential': // f(x) = 2 * e^(0.4x) (growth)
      f = (x) => 2 * Math.exp(0.4 * x);
      df = (x) => 0.8 * Math.exp(0.4 * x);
      name = 'Biological Growth: f(x) = 2e^{0.4x}';
      formulaLatex = 'f(x) = 2e^{0.4x}';
      derivLatex = "f'(x) = 0.8e^{0.4x}";
      break;

    default: // Linear rate fallback: f(x) = 3x + 2
      f = (x) => 3 * x + 2;
      df = () => 3;
      name = 'Linear Rate: f(x) = 3x + 2';
      formulaLatex = 'f(x) = 3x + 2';
      derivLatex = "f'(x) = 3";
  }

  const y0 = f(x0);
  const x1 = x0 + deltaX;
  const y1 = f(x1);
  const deltaY = y1 - y0;

  // Secant slope = Δy / Δx
  const secantSlope = deltaY / deltaX;

  // Exact derivative = dy/dx
  const tangentSlope = df(x0);

  // Absolute & percentage difference
  const error = Math.abs(secantSlope - tangentSlope);

  return {
    fnType,
    name,
    formulaLatex,
    derivLatex,
    x0,
    y0,
    deltaX,
    deltaY,
    x1,
    y1,
    secantSlope,
    tangentSlope,
    error,
    f,
    df,
  };
};

/**
 * 4. General Rate of Change (arbitrary variable Δy / Δx)
 */
Calculators.rateOfChange = function (inputs) {
  const deltaY = parseFloat(inputs.deltaY) || 0;
  const deltaX = parseFloat(inputs.deltaX) || 1;
  const rate = deltaX !== 0 ? deltaY / deltaX : 0;

  return {
    deltaY,
    deltaX,
    rate,
    formula: 'd(y)/d(x) = \\frac{\\Delta y}{\\Delta x}',
  };
};

window.Calculators = Calculators;
