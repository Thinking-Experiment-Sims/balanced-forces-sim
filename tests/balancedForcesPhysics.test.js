import { test, describe } from 'node:test';
import assert from 'node:assert';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const BalancedForcesPhysics = require('../src/balancedForcesPhysics.js');

describe('Balanced Forces Physics Engine Tests', () => {

  test('Symmetric Geometry: angles and tensions match perfectly', () => {
    const p = { x: 500, y: 350 };
    const s1 = { x: 200, y: 150 };
    const s2 = { x: 800, y: 150 };
    const massKg = 0.5;

    const geom = BalancedForcesPhysics.calculateCordGeometry(p, s1, s2);
    assert.strictEqual(Math.round(geom.theta1Deg * 100), Math.round(geom.theta2Deg * 100));
    assert.ok(geom.theta1Deg > 0 && geom.theta1Deg < 90);

    const eq = BalancedForcesPhysics.calculateStaticEquilibrium(massKg, p, s1, s2, BalancedForcesPhysics.GRAVITY_STANDARD);
    assert.ok(Math.abs(eq.t1 - eq.t2) < 1e-4);
    assert.ok(Math.abs(eq.netFx) < 1e-4);
    assert.ok(Math.abs(eq.netFy) < 1e-4);
  });

  test('Asymmetric Geometry: balances x and y components exactly', () => {
    const p = { x: 350, y: 380 };
    const s1 = { x: 200, y: 150 };
    const s2 = { x: 800, y: 150 };
    const massKg = 0.8;

    const eq = BalancedForcesPhysics.calculateStaticEquilibrium(massKg, p, s1, s2, BalancedForcesPhysics.GRAVITY_STANDARD);
    assert.ok(eq.geometry.theta1Deg > eq.geometry.theta2Deg);
    assert.ok(Math.abs(eq.netFx) < 1e-4);
    assert.ok(Math.abs(eq.netFy) < 1e-4);
    assert.ok(Math.abs(Math.abs(eq.t1x) - eq.t2x) < 1e-4);
  });

  test('Mass Reconstruction from Measured Forces and Angles', () => {
    const p = { x: 400, y: 320 };
    const s1 = { x: 150, y: 100 };
    const s2 = { x: 750, y: 120 };
    const actualMassKg = 0.350;

    const eq = BalancedForcesPhysics.calculateStaticEquilibrium(actualMassKg, p, s1, s2, BalancedForcesPhysics.GRAVITY_STANDARD);
    const calc = BalancedForcesPhysics.calculateMassFromMeasurements(eq.t1, eq.t2, eq.geometry.theta1Deg, eq.geometry.theta2Deg, BalancedForcesPhysics.GRAVITY_STANDARD);
    
    assert.ok(Math.abs(calc.calculatedMassKg - actualMassKg) < 1e-4);
    assert.ok(Math.abs(calc.calculatedMassG - 350) < 0.1);
  });

  test('Percent Error and Student Evaluation', () => {
    assert.strictEqual(BalancedForcesPhysics.calculatePercentError(500, 500), 0);
    assert.strictEqual(BalancedForcesPhysics.calculatePercentError(510, 500), 2);

    const evalExcellent = BalancedForcesPhysics.evaluateStudentCalculation(502, 500);
    assert.strictEqual(evalExcellent.status, 'excellent');
  });

  test('Equilibrium Knot Y from Constant Total String Length L = L1 + L2', () => {
    const s1 = { x: 100, y: 150 };
    const s2 = { x: 700, y: 150 };
    const totalLength = 750;

    // Symmetric center (x = 400)
    const eqCenter = BalancedForcesPhysics.calculateEquilibriumY(400, s1, s2, totalLength);
    assert.ok(Math.abs(eqCenter.totalLength - totalLength) < 1e-4);
    assert.ok(Math.abs(eqCenter.len1 - eqCenter.len2) < 1e-4);
    assert.ok(eqCenter.y > s1.y);

    // Asymmetric positions (x = 250 and x = 550)
    const eqLeft = BalancedForcesPhysics.calculateEquilibriumY(250, s1, s2, totalLength);
    assert.ok(Math.abs(eqLeft.totalLength - totalLength) < 1e-4);
    assert.ok(eqLeft.len1 < eqLeft.len2);

    const eqRight = BalancedForcesPhysics.calculateEquilibriumY(550, s1, s2, totalLength);
    assert.ok(Math.abs(eqRight.totalLength - totalLength) < 1e-4);
    assert.ok(eqRight.len1 > eqRight.len2);
    assert.ok(Math.abs(eqLeft.y - eqRight.y) < 1e-4); // Symmetry about center
  });

});
