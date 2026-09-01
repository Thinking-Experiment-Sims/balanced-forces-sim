import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  calculateCordGeometry,
  calculateStaticEquilibrium,
  calculateMassFromMeasurements,
  calculatePercentError,
  evaluateStudentCalculation,
  GRAVITY_STANDARD
} from '../src/balancedForcesPhysics.js';

describe('Balanced Forces Physics Engine Tests', () => {

  test('Symmetric Geometry: angles and tensions match perfectly', () => {
    const p = { x: 500, y: 350 };
    const s1 = { x: 200, y: 150 };
    const s2 = { x: 800, y: 150 };
    const massKg = 0.5; // 500g

    const geom = calculateCordGeometry(p, s1, s2);
    // dx1 = -300, dy1 = 200 -> theta1
    // dx2 = 300, dy2 = 200 -> theta2
    assert.strictEqual(Math.round(geom.theta1Deg * 100), Math.round(geom.theta2Deg * 100));
    assert.ok(geom.theta1Deg > 0 && geom.theta1Deg < 90);

    const eq = calculateStaticEquilibrium(massKg, p, s1, s2, GRAVITY_STANDARD);
    
    // In symmetric setup, T1 must equal T2
    assert.ok(Math.abs(eq.t1 - eq.t2) < 1e-4, 'T1 should equal T2 in symmetric geometry');

    // Horizontal net force must be zero
    assert.ok(Math.abs(eq.netFx) < 1e-4, 'Net Fx must be 0');

    // Vertical net force must be zero
    assert.ok(Math.abs(eq.netFy) < 1e-4, 'Net Fy must be 0');

    // Upward vertical force component sum equals Fg
    const upwardForce = eq.t1y + eq.t2y;
    assert.ok(Math.abs(upwardForce - eq.fg) < 1e-4, 'Upward tension components must equal Fg');
  });

  test('Asymmetric Geometry: balances x and y components exactly', () => {
    // Knot shifted towards the left
    const p = { x: 350, y: 380 };
    const s1 = { x: 200, y: 150 }; // closer to left
    const s2 = { x: 800, y: 150 }; // farther from right
    const massKg = 0.8; // 800g

    const eq = calculateStaticEquilibrium(massKg, p, s1, s2, GRAVITY_STANDARD);

    // Knot is closer to left, so left cord is steeper (larger theta1) -> higher vertical share
    assert.ok(eq.geometry.theta1Deg > eq.geometry.theta2Deg, 'Left angle is steeper');

    // Net forces must balance
    assert.ok(Math.abs(eq.netFx) < 1e-4, `Net Fx was ${eq.netFx}, expected ~0`);
    assert.ok(Math.abs(eq.netFy) < 1e-4, `Net Fy was ${eq.netFy}, expected ~0`);

    // Left horizontal pull equals right horizontal pull
    assert.ok(Math.abs(Math.abs(eq.t1x) - eq.t2x) < 1e-4, 'Left and right horizontal forces must balance');
  });

  test('Mass Reconstruction from Measured Forces and Angles', () => {
    const p = { x: 400, y: 320 };
    const s1 = { x: 150, y: 100 };
    const s2 = { x: 750, y: 120 };
    const actualMassKg = 0.350; // 350g

    const eq = calculateStaticEquilibrium(actualMassKg, p, s1, s2, GRAVITY_STANDARD);
    
    // Simulate student reading spring scales and protractor
    const measuredT1 = eq.t1;
    const measuredT2 = eq.t2;
    const measuredTheta1 = eq.geometry.theta1Deg;
    const measuredTheta2 = eq.geometry.theta2Deg;

    const calc = calculateMassFromMeasurements(measuredT1, measuredT2, measuredTheta1, measuredTheta2, GRAVITY_STANDARD);
    
    assert.ok(Math.abs(calc.calculatedMassKg - actualMassKg) < 1e-4, 'Calculated mass should match actual mass');
    assert.ok(Math.abs(calc.calculatedMassG - 350) < 0.1, 'Calculated mass in grams should match');
  });

  test('Percent Error and Student Evaluation', () => {
    assert.strictEqual(calculatePercentError(500, 500), 0);
    assert.strictEqual(calculatePercentError(510, 500), 2);
    assert.strictEqual(calculatePercentError(475, 500), 5);

    const evalExcellent = evaluateStudentCalculation(502, 500);
    assert.strictEqual(evalExcellent.status, 'excellent');

    const evalGood = evaluateStudentCalculation(520, 500);
    assert.strictEqual(evalGood.status, 'good');

    const evalNeedsWork = evaluateStudentCalculation(650, 500);
    assert.strictEqual(evalNeedsWork.status, 'needs_work');
  });

});
