/**
 * Balanced Forces (Hanging Mass Statics) Physics Engine
 * Pure mathematical functions for 2D equilibrium, vector resolution,
 * and experimental calculation analysis.
 * Zero DOM dependencies for full unit testability.
 */

class BalancedForcesPhysics {
  static get GRAVITY_STANDARD() {
    return 9.80; // N/kg (or m/s^2)
  }

  /**
   * Calculates cord angles (in radians and degrees) with respect to the horizontal.
   * 
   * @param {Object} p - Knot position { x, y } (y increases downwards)
   * @param {Object} s1 - Left support anchor position { x, y }
   * @param {Object} s2 - Right support anchor position { x, y }
   * @returns {Object} Angles with respect to horizontal and vertical in degrees and radians
   */
  static calculateCordGeometry(p, s1, s2) {
    const dx1 = s1.x - p.x;
    const dy1 = p.y - s1.y;
    const len1 = Math.hypot(dx1, dy1);

    const dx2 = s2.x - p.x;
    const dy2 = p.y - s2.y;
    const len2 = Math.hypot(dx2, dy2);

    const theta1Rad = len1 > 1e-6 ? Math.atan2(dy1, Math.abs(dx1)) : 0;
    const theta2Rad = len2 > 1e-6 ? Math.atan2(dy2, Math.abs(dx2)) : 0;

    const theta1Deg = (theta1Rad * 180) / Math.PI;
    const theta2Deg = (theta2Rad * 180) / Math.PI;

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
   * @param {number} massKg - Hanging mass in kilograms
   * @param {Object} p - Knot position { x, y }
   * @param {Object} s1 - Left support anchor position { x, y }
   * @param {Object} s2 - Right support anchor position { x, y }
   * @param {number} [g=9.80] - Gravitational field strength (N/kg)
   * @returns {Object} Statics equilibrium force values and components
   */
  static calculateStaticEquilibrium(massKg, p, s1, s2, g = 9.80) {
    const geom = BalancedForcesPhysics.calculateCordGeometry(p, s1, s2);
    const fg = massKg * g;

    const sinSum = Math.sin(geom.theta1Rad + geom.theta2Rad);

    let t1 = 0;
    let t2 = 0;

    if (sinSum > 1e-4) {
      t1 = (fg * Math.cos(geom.theta2Rad)) / sinSum;
      t2 = (fg * Math.cos(geom.theta1Rad)) / sinSum;
    } else {
      t1 = fg / 2;
      t2 = fg / 2;
    }

    const t1x = -t1 * Math.cos(geom.theta1Rad);
    const t1y = t1 * Math.sin(geom.theta1Rad);

    const t2x = t2 * Math.cos(geom.theta2Rad);
    const t2y = t2 * Math.sin(geom.theta2Rad);

    const fgx = 0;
    const fgy = -fg;

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
   */
  static calculateMassFromMeasurements(t1, t2, theta1Deg, theta2Deg, g = 9.80) {
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

  static calculatePercentError(experimental, actual) {
    if (Math.abs(actual) < 1e-6) return 0;
    const error = (Math.abs(experimental - actual) / actual) * 100;
    return Number(error.toFixed(2));
  }

  static evaluateStudentCalculation(studentMassG, actualMassG) {
    const percentErr = BalancedForcesPhysics.calculatePercentError(studentMassG, actualMassG);
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
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = BalancedForcesPhysics;
}
