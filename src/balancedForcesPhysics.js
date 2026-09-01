/**
 * Balanced Forces (Hanging Mass Statics) Physics Engine
 * Pure mathematical functions for 2D equilibrium, vector resolution,
 * and experimental calculation analysis.
 * Zero DOM dependencies for full unit testability.
 */

export const GRAVITY_STANDARD = 9.80; // N/kg (or m/s^2)

/**
 * Calculates cord angles (in radians and degrees) with respect to the horizontal.
 * Support 1 is left, Support 2 is right.
 * 
 * @param {Object} p - Knot position { x, y } (y increases downwards)
 * @param {Object} s1 - Left support anchor position { x, y }
 * @param {Object} s2 - Right support anchor position { x, y }
 * @returns {Object} Angles with respect to horizontal and vertical in degrees and radians
 */
export function calculateCordGeometry(p, s1, s2) {
  // Vector from knot P to Support 1 (Left)
  const dx1 = s1.x - p.x; // typically negative if s1 is to the left
  const dy1 = p.y - s1.y; // positive if knot is below support
  const len1 = Math.hypot(dx1, dy1);

  // Vector from knot P to Support 2 (Right)
  const dx2 = s2.x - p.x; // typically positive if s2 is to the right
  const dy2 = p.y - s2.y; // positive if knot is below support
  const len2 = Math.hypot(dx2, dy2);

  // Cord angles with horizontal:
  // theta1: angle between left cord and horizontal line directed left (-x)
  // theta2: angle between right cord and horizontal line directed right (+x)
  const theta1Rad = len1 > 1e-6 ? Math.atan2(dy1, Math.abs(dx1)) : 0;
  const theta2Rad = len2 > 1e-6 ? Math.atan2(dy2, Math.abs(dx2)) : 0;

  const theta1Deg = (theta1Rad * 180) / Math.PI;
  const theta2Deg = (theta2Rad * 180) / Math.PI;

  // Angles with vertical (downward or upward):
  const phi1Deg = 90 - theta1Deg;
  const phi2Deg = 90 - theta2Deg;

  return {
    len1,
    len2,
    dx1,
    dy1,
    dx2,
    dy2,
    theta1Rad,
    theta2Rad,
    theta1Deg,
    theta2Deg,
    phi1Deg,
    phi2Deg
  };
}

/**
 * Calculates analytical tension forces T1, T2 and gravity force Fg in static equilibrium.
 * 
 * Equilibrium conditions:
 *   Sigma F_x = T2 * cos(theta2) - T1 * cos(theta1) = 0
 *   Sigma F_y = T1 * sin(theta1) + T2 * sin(theta2) - m * g = 0
 * 
 * Solving:
 *   T1 = m * g * cos(theta2) / sin(theta1 + theta2)
 *   T2 = m * g * cos(theta1) / sin(theta1 + theta2)
 * 
 * @param {number} massKg - Hanging mass in kilograms
 * @param {Object} p - Knot position { x, y }
 * @param {Object} s1 - Left support anchor position { x, y }
 * @param {Object} s2 - Right support anchor position { x, y }
 * @param {number} [g=9.80] - Gravitational field strength (N/kg)
 * @returns {Object} Statics equilibrium force values and components
 */
export function calculateStaticEquilibrium(massKg, p, s1, s2, g = GRAVITY_STANDARD) {
  const geom = calculateCordGeometry(p, s1, s2);
  const fg = massKg * g;

  const sinSum = Math.sin(geom.theta1Rad + geom.theta2Rad);

  let t1 = 0;
  let t2 = 0;

  // If cords are nearly horizontal or collinear, tension diverges. We clamp for safety.
  if (sinSum > 1e-4) {
    t1 = (fg * Math.cos(geom.theta2Rad)) / sinSum;
    t2 = (fg * Math.cos(geom.theta1Rad)) / sinSum;
  } else {
    // Fallback if degenerate geometry
    t1 = fg / 2;
    t2 = fg / 2;
  }

  // Force vector components (Cartesian: +x right, +y up):
  // Cord 1 pulls up and left:
  const t1x = -t1 * Math.cos(geom.theta1Rad);
  const t1y = t1 * Math.sin(geom.theta1Rad);

  // Cord 2 pulls up and right:
  const t2x = t2 * Math.cos(geom.theta2Rad);
  const t2y = t2 * Math.sin(geom.theta2Rad);

  // Gravity pulls straight down:
  const fgx = 0;
  const fgy = -fg;

  // Net force sum (should be ~ 0 in equilibrium):
  const netFx = t1x + t2x + fgx;
  const netFy = t1y + t2y + fgy;

  return {
    massKg,
    massGrams: massKg * 1000,
    g,
    fg,
    geometry: geom,
    t1,
    t2,
    t1x,
    t1y,
    t2x,
    t2y,
    fgx,
    fgy,
    netFx,
    netFy
  };
}

/**
 * Calculates the experimental hanging mass from measured spring scale tensions and measured angles.
 * Formula: m_calc = (T1 * sin(theta1) + T2 * sin(theta2)) / g
 * 
 * @param {number} t1 - Measured tension in Cord 1 (N)
 * @param {number} t2 - Measured tension in Cord 2 (N)
 * @param {number} theta1Deg - Measured angle of Cord 1 relative to horizontal (deg)
 * @param {number} theta2Deg - Measured angle of Cord 2 relative to horizontal (deg)
 * @param {number} [g=9.80] - Gravitational field strength
 * @returns {Object} Calculated mass, component sums, and horizontal balance error
 */
export function calculateMassFromMeasurements(t1, t2, theta1Deg, theta2Deg, g = GRAVITY_STANDARD) {
  const theta1Rad = (theta1Deg * Math.PI) / 180;
  const theta2Rad = (theta2Deg * Math.PI) / 180;

  const t1x = t1 * Math.cos(theta1Rad);
  const t1y = t1 * Math.sin(theta1Rad);

  const t2x = t2 * Math.cos(theta2Rad);
  const t2y = t2 * Math.sin(theta2Rad);

  const totalUpwardForce = t1y + t2y;
  const horizontalImbalance = Math.abs(t2x - t1x);

  const calculatedMassKg = totalUpwardForce / g;
  const calculatedMassG = calculatedMassKg * 1000;

  return {
    t1x,
    t1y,
    t2x,
    t2y,
    totalUpwardForce,
    horizontalImbalance,
    calculatedMassKg,
    calculatedMassG
  };
}

/**
 * Computes the percent error between an experimental value and actual value.
 * Percent Error = |Experimental - Actual| / Actual * 100%
 * 
 * @param {number} experimental 
 * @param {number} actual 
 * @returns {number} Percent error rounded to 2 decimal places
 */
export function calculatePercentError(experimental, actual) {
  if (Math.abs(actual) < 1e-6) return 0;
  const error = (Math.abs(experimental - actual) / actual) * 100;
  return Number(error.toFixed(2));
}

/**
 * Formative evaluation of a student's experimental solution.
 * 
 * @param {number} studentMassG - Student's input mass in grams
 * @param {number} actualMassG - True mass in grams
 * @returns {Object} Evaluation report with score category, percent error, and feedback
 */
export function evaluateStudentCalculation(studentMassG, actualMassG) {
  const percentErr = calculatePercentError(studentMassG, actualMassG);
  let status = "excellent";
  let message = "";

  if (percentErr <= 2.0) {
    status = "excellent";
    message = "Outstanding precision! Your measured angles and force components balance almost perfectly.";
  } else if (percentErr <= 6.0) {
    status = "good";
    message = "Great work! Your calculated mass is well within typical lab measurement uncertainty.";
  } else if (percentErr <= 15.0) {
    status = "acceptable";
    message = "Close, but there is some measurement error. Check your protractor alignment or spring scale reading.";
  } else {
    status = "needs_work";
    message = "Significant discrepancy. Double-check whether you measured angle relative to horizontal vs vertical, and ensure T1·sin(θ1) + T2·sin(θ2) = mg.";
  }

  return {
    percentError: percentErr,
    status,
    message,
    actualMassG
  };
}
