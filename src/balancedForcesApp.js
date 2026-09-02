/**
 * The Thinking Experiment - Balanced Forces Simulation Application
 * Compliant with "The Thinking Experiment" Design System & Modeling Instruction.
 */

(function () {
  "use strict";

  // Safe Rounded Rect Helper (Strictly avoiding ctx.roundRect as per Design System)
  function drawRoundedRect(ctx, x, y, width, height, radius, fill = true, stroke = false) {
    if (width < 2 * radius) radius = width / 2;
    if (height < 2 * radius) radius = height / 2;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + width, y, x + width, y + height, radius);
    ctx.arcTo(x + width, y + height, x, y + height, radius);
    ctx.arcTo(x, y + height, x, y, radius);
    ctx.arcTo(x, y, x + width, y, radius);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
  }

  // Draw Arrow Helper
  function drawArrow(ctx, fromX, fromY, toX, toY, headLength = 10, color = '#0f7e9b', lineWidth = 3) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    const length = Math.hypot(dx, dy);

    if (length < 2) return;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  class BalancedForcesApp {
    constructor() {
      this.dom = {
        apparatusCanvas: document.getElementById('apparatusCanvas'),
        fbdCanvas: document.getElementById('fbdCanvas'),
        polyCanvas: document.getElementById('polyCanvas'),
        scenarioTabs: document.querySelectorAll('.scenario-tab'),
        bannerTitle: document.getElementById('bannerTitle'),
        bannerDesc: document.getElementById('bannerDesc'),
        sandboxSettings: document.getElementById('sandboxSettings'),
        mysteryBox: document.getElementById('mysteryBox'),
        massControlItem: document.getElementById('massControlItem'),
        sliderMass: document.getElementById('sliderMass'),
        valMass: document.getElementById('valMass'),
        valLen1: document.getElementById('valLen1'),
        valLen2: document.getElementById('valLen2'),
        meterLen1: document.getElementById('meterLen1'),
        meterLen2: document.getElementById('meterLen2'),
        sliderKnotX: document.getElementById('sliderKnotX'),
        valKnotX: document.getElementById('valKnotX'),
        valKnotY: document.getElementById('valKnotY'),
        valLenTotal: document.getElementById('valLenTotal'),
        meterLenTotal: document.getElementById('meterLenTotal'),
        telemT1: document.getElementById('telemT1'),
        telemT2: document.getElementById('telemT2'),
        telemKnotPos: document.getElementById('telemKnotPos'),
        telemState: document.getElementById('telemState'),
        studentMassInput: document.getElementById('studentMassInput'),
        btnCheckMystery: document.getElementById('btnCheckMystery'),
        mysteryFeedback: document.getElementById('mysteryFeedback'),
        trialsTableBody: document.getElementById('trialsTableBody'),

        // Force Table Elements
        tblT1x: document.getElementById('tblT1x'),
        tblT1y: document.getElementById('tblT1y'),
        tblT2x: document.getElementById('tblT2x'),
        tblT2y: document.getElementById('tblT2y'),
        tblFgy: document.getElementById('tblFgy'),
        tblSumFx: document.getElementById('tblSumFx'),
        tblSumFy: document.getElementById('tblSumFy'),
        wbTheta1: document.getElementById('wbTheta1'),
        wbTheta2: document.getElementById('wbTheta2'),
        btnSolveWorkbench: document.getElementById('btnSolveWorkbench'),
        workbenchResults: document.getElementById('workbenchResults'),

        // Export & Print Elements
        btnExportDiagram: document.getElementById('btnExportDiagram'),
        exportModal: document.getElementById('exportModal'),
        btnCloseExportModal: document.getElementById('btnCloseExportModal'),
        exportCanvas: document.getElementById('exportCanvas'),
        btnDownloadPNG: document.getElementById('btnDownloadPNG'),
        btnPrintSheet: document.getElementById('btnPrintSheet'),
        printDiagramImg: document.getElementById('printDiagramImg'),
        printSetupTitle: document.getElementById('printSetupTitle'),
        printValT1: document.getElementById('printValT1'),
        printValT2: document.getElementById('printValT2'),

        // Simulation Mode Elements
        chkRealLabMode: document.getElementById('chkRealLabMode'),
        modeSelectorCard: document.getElementById('modeSelectorCard'),
        modeBadge: document.getElementById('modeBadge'),
        modeDescText: document.getElementById('modeDescText'),
        realLabForceInputsRow: document.getElementById('realLabForceInputsRow'),
        wbForce1: document.getElementById('wbForce1'),
        wbForce2: document.getElementById('wbForce2')
      };

      // State (Normalized Coordinates for Resolution Independence)
      this.state = {
        activeScenario: 'symmetric',
        massKg: 0.500,
        g: 9.80,

        // Mode: Ideal Scenario (Default) vs. Real Lab Mode (Elastic Stretch & Uncertainty)
        isRealLabMode: false,

        // Normalized knot horizontal position [0..1] relative to apparatus canvas
        normKnotX: 0.50,
        normKnotY: 0.58, // Strictly calculated from equilibrium string constraint!
        bobbingOffset: 0, // Dynamic harmonic oscillation when settling into equilibrium

        // Protractor Tool
        protractor: {
          visible: false,
          normX: 0.50,
          normY: 0.58,
          rotationDeg: 0,
          radius: 122,
          isSnapped: true
        },

        // Ruler Tool
        ruler: {
          visible: false,
          normX: 0.32,
          normY: 0.75,
          length: 220,
          rotationDeg: 0
        },

        // Toggles
        showLevelLines: true,
        showSpringDials: true,
        showZoomScales: true,

        // Dragging
        dragTarget: null,
        dragOffset: { x: 0, y: 0 },
        isHoveringKnot: false,

        // Mystery Masses
        currentMystery: 'A',
        mysteryMasses: {
          A: 0.245,
          B: 0.480,
          C: 0.675,
          D: 0.850
        },

        trials: []
      };

      this.init();
    }

    init() {
      this.bindEvents();
      this.updateModeUI();
      this.setScenario('symmetric');

      const handleResize = () => {
        this.resizeCanvases();
        this.updateEquilibrium();
        this.render();
      };

      window.addEventListener('resize', handleResize);
      setTimeout(handleResize, 40);
      setTimeout(handleResize, 150);

      this.resizeCanvases();
      this.updateEquilibrium();
      this.render();
    }

    resizeCanvases() {
      const canvases = [
        this.dom.apparatusCanvas,
        this.dom.fbdCanvas,
        this.dom.polyCanvas
      ];

      canvases.forEach(canvas => {
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width > 0 ? rect.width : (canvas.clientWidth || 600);
        const h = rect.height > 0 ? rect.height : (canvas.clientHeight || 360);
        
        canvas.width = Math.floor(w * dpr);
        canvas.height = Math.floor(h * dpr);
      });
    }

    getActiveMassKg() {
      if (this.state.activeScenario === 'mystery') {
        return this.state.mysteryMasses[this.state.currentMystery] || 0.500;
      }
      return this.state.massKg;
    }

    getApparatusCoords() {
      const canvas = this.dom.apparatusCanvas;
      const dpr = window.devicePixelRatio || 1;
      const w = canvas ? canvas.width / dpr : 600;
      const h = canvas ? canvas.height / dpr : 380;

      const s1 = { x: w * 0.20, y: h * 0.24 };
      const s2 = { x: w * 0.80, y: h * 0.24 };
      const D = s2.x - s1.x;

      // Base string length: in symmetric center (x = 0.50, y = 0.58), drop = h * 0.34
      const baseStringLength = 2 * Math.hypot(D / 2, h * 0.34);

      // In Real Lab Mode: Springs stretch under load (Hooke's Law: Delta L = T / k)
      let effectiveTotalLength = baseStringLength;
      if (this.state.isRealLabMode) {
        const massKg = this.getActiveMassKg();
        const springStretch = (massKg - 0.500) * (h * 0.09);
        effectiveTotalLength += springStretch;
      }

      // Knot horizontal position: freely controlled by user [0.28 .. 0.72]
      const knotX = w * this.state.normKnotX;

      // Knot vertical position: strictly constrained by string equilibrium L1 + L2 = effectiveTotalLength
      const eqGeom = BalancedForcesPhysics.calculateEquilibriumY(knotX, s1, s2, effectiveTotalLength);

      const bobbing = this.state.bobbingOffset || 0;
      const knotY = eqGeom.y + bobbing;

      // Update state normKnotY to stay strictly synchronized with equilibrium
      this.state.normKnotY = eqGeom.y / h;

      const p = { x: knotX, y: knotY };

      return {
        w,
        h,
        s1,
        s2,
        p,
        dpr,
        totalStringLength: effectiveTotalLength,
        baseStringLength,
        eqGeom
      };
    }

    triggerEquilibriumSettling(initialAmp = 6) {
      if (this.settlingAnimationId) {
        cancelAnimationFrame(this.settlingAnimationId);
        this.settlingAnimationId = null;
      }

      const startTime = performance.now();
      const durationMs = 550;
      const omega = 18;
      const gamma = 5.5;

      if (this.dom.telemState) {
        this.dom.telemState.innerHTML = '<span style="color: var(--accent-amber);">⏳ Settling into Equilibrium...</span>';
      }

      const step = (now) => {
        const t = (now - startTime) / 1000;
        if (t >= durationMs / 1000) {
          this.state.bobbingOffset = 0;
          this.updateEquilibrium();
          this.render();
          if (this.dom.telemState) {
            this.dom.telemState.innerHTML = '<span style="color: var(--success);">⚖️ Balanced at Equilibrium</span>';
          }
          this.settlingAnimationId = null;
          return;
        }

        this.state.bobbingOffset = initialAmp * Math.exp(-gamma * t) * Math.cos(omega * t);
        this.updateEquilibrium();
        this.render();
        this.settlingAnimationId = requestAnimationFrame(step);
      };

      this.settlingAnimationId = requestAnimationFrame(step);
    }

    updateEquilibrium() {
      const { s1, s2, p } = this.getApparatusCoords();
      const massKg = this.getActiveMassKg();

      this.equilibrium = BalancedForcesPhysics.calculateStaticEquilibrium(
        massKg,
        p,
        s1,
        s2,
        this.state.g
      );

      this.updateTelemetry();
    }

    updateTelemetry() {
      const eq = this.equilibrium;
      if (!eq) return;

      // Forces Display (Ideal = exact digital readout; Real Lab = read from graduated scale)
      if (this.state.isRealLabMode) {
        const estT1 = (Math.round(eq.t1 * 10) / 10).toFixed(1);
        const estT2 = (Math.round(eq.t2 * 10) / 10).toFixed(1);
        if (this.dom.telemT1) this.dom.telemT1.innerHTML = `<span style="font-size: 0.9rem; color: var(--accent-amber-dark);">Read Scale (~${estT1} N)</span>`;
        if (this.dom.telemT2) this.dom.telemT2.innerHTML = `<span style="font-size: 0.9rem; color: var(--accent-amber-dark);">Read Scale (~${estT2} N)</span>`;
      } else {
        if (this.dom.telemT1) this.dom.telemT1.textContent = `${eq.t1.toFixed(2)} N`;
        if (this.dom.telemT2) this.dom.telemT2.textContent = `${eq.t2.toFixed(2)} N`;
      }

      // Knot Horizontal Position & Equilibrium Height
      const knotXPct = Math.round(this.state.normKnotX * 100);
      const knotYPct = Math.round(this.state.normKnotY * 100);

      if (this.dom.valKnotX) {
        let align = 'Center';
        if (knotXPct < 48) align = 'Left';
        else if (knotXPct > 52) align = 'Right';
        this.dom.valKnotX.textContent = `${knotXPct}% (${align})`;
      }
      if (this.dom.sliderKnotX && document.activeElement !== this.dom.sliderKnotX) {
        this.dom.sliderKnotX.value = (this.state.normKnotX * 100).toFixed(1);
      }
      if (this.dom.valKnotY) {
        this.dom.valKnotY.textContent = `${knotYPct}% (Auto)`;
      }

      if (this.dom.telemKnotPos) {
        this.dom.telemKnotPos.textContent = `(${knotXPct}%, ${knotYPct}%)`;
      }

      if (this.dom.valMass) {
        if (this.state.activeScenario === 'mystery') {
          this.dom.valMass.textContent = '??? g (Hidden)';
        } else {
          const massG = Math.round(this.state.massKg * 1000);
          this.dom.valMass.textContent = `${massG} g`;
        }
      }

      // Total String Length & Individual Cord Lengths (35 px = 1 cm)
      const len1Cm = (eq.geometry.len1 / 35).toFixed(1);
      const len2Cm = (eq.geometry.len2 / 35).toFixed(1);
      const lenTotalCm = ((eq.geometry.len1 + eq.geometry.len2) / 35).toFixed(1);

      if (this.dom.valLen1) this.dom.valLen1.textContent = `${len1Cm} cm`;
      if (this.dom.valLen2) this.dom.valLen2.textContent = `${len2Cm} cm`;
      if (this.dom.valLenTotal) {
        this.dom.valLenTotal.textContent = `${lenTotalCm} cm (${this.state.isRealLabMode ? 'Elastic' : 'Constant'})`;
      }
      if (this.dom.meterLenTotal) {
        this.dom.meterLenTotal.style.width = '100%';
      }
    }

    updateModeUI() {
      const isReal = this.state.isRealLabMode;
      if (this.dom.chkRealLabMode) {
        this.dom.chkRealLabMode.checked = isReal;
      }
      if (this.dom.modeSelectorCard) {
        this.dom.modeSelectorCard.classList.toggle('real-mode', isReal);
      }
      if (this.dom.modeBadge) {
        this.dom.modeBadge.classList.toggle('real', isReal);
        this.dom.modeBadge.textContent = isReal ? '🔬 Real Lab Mode' : 'Ideal Scenario';
      }
      if (this.dom.modeDescText) {
        if (isReal) {
          this.dom.modeDescText.innerHTML = `
            <strong>Real Lab Mode (Active):</strong> Internal springs stretch under load (ΔL = T/k), causing knot sag and angle steepening. Enter your read forces (T₁, T₂) into the table; experimental uncertainty shows ΣF<sub>x</sub> ≈ 0 N (authentic scientific error)!
          `;
        } else {
          this.dom.modeDescText.innerHTML = `
            <strong>Ideal Scenario:</strong> Textbook inextensible cords (ΣF<sub>x</sub> = 0 N). Toggle Real Lab Mode for spring stretch &amp; scale uncertainty.
          `;
        }
      }
      const f1Wrap = document.getElementById('wbForce1Wrapper');
      const f2Wrap = document.getElementById('wbForce2Wrapper');
      if (f1Wrap) f1Wrap.style.display = isReal ? 'flex' : 'none';
      if (f2Wrap) f2Wrap.style.display = isReal ? 'flex' : 'none';
      if (this.dom.realLabForceInputsRow) {
        this.dom.realLabForceInputsRow.style.display = isReal ? 'grid' : 'none';
      }
    }

    bindEvents() {
      // Real Lab Mode Checkbox
      if (this.dom.chkRealLabMode) {
        this.dom.chkRealLabMode.addEventListener('change', (e) => {
          this.state.isRealLabMode = e.target.checked;
          this.updateModeUI();
          this.updateEquilibrium();
          this.render();
        });
      }

      // Scenario Tabs
      this.dom.scenarioTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.dom.scenarioTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.setScenario(tab.dataset.scenario);
        });
      });

      // Mass Slider
      if (this.dom.sliderMass) {
        this.dom.sliderMass.addEventListener('input', (e) => {
          this.state.massKg = parseFloat(e.target.value) / 1000;
          this.updateMassPresetChips();
          this.updateEquilibrium();
          this.render();
        });
        this.dom.sliderMass.addEventListener('change', () => {
          this.triggerEquilibriumSettling(6);
        });
      }

      // Knot Horizontal Position (X) Slider
      if (this.dom.sliderKnotX) {
        this.dom.sliderKnotX.addEventListener('input', (e) => {
          this.state.normKnotX = parseFloat(e.target.value) / 100;
          this.updateEquilibrium();
          if (this.state.protractor.isSnapped) {
            this.state.protractor.normX = this.state.normKnotX;
            this.state.protractor.normY = this.state.normKnotY;
          }
          this.render();
        });
        this.dom.sliderKnotX.addEventListener('change', () => {
          this.triggerEquilibriumSettling(4);
        });
      }

      // Preset Chips
      document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          const massG = parseFloat(chip.dataset.mass);
          this.state.massKg = massG / 1000;
          if (this.dom.sliderMass) this.dom.sliderMass.value = massG;
          this.updateMassPresetChips();
          this.updateEquilibrium();
          this.triggerEquilibriumSettling(6);
          this.render();
        });
      });

      // Mystery Chips
      document.querySelectorAll('.mystery-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.mystery-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.state.currentMystery = chip.dataset.mystery;
          if (this.dom.mysteryFeedback) this.dom.mysteryFeedback.className = 'feedback-box';
          this.updateEquilibrium();
          this.triggerEquilibriumSettling(6);
          this.render();
        });
      });

      // Check Mystery Mass Button
      if (this.dom.btnCheckMystery) {
        this.dom.btnCheckMystery.addEventListener('click', () => this.handleCheckMystery());
      }

      // Toolbar Buttons
      const btnProtractor = document.getElementById('btnToggleProtractor');
      if (btnProtractor) {
        btnProtractor.addEventListener('click', () => {
          this.state.protractor.visible = !this.state.protractor.visible;
          btnProtractor.classList.toggle('active', this.state.protractor.visible);
          this.render();
        });
      }

      const btnSnap = document.getElementById('btnSnapProtractor');
      if (btnSnap) {
        btnSnap.addEventListener('click', () => {
          this.state.protractor.visible = true;
          if (btnProtractor) btnProtractor.classList.add('active');
          this.state.protractor.normX = this.state.normKnotX;
          this.state.protractor.normY = this.state.normKnotY;
          this.state.protractor.rotationDeg = 0;
          this.state.protractor.isSnapped = true;
          this.render();
        });
      }

      const btnRuler = document.getElementById('btnToggleRuler');
      if (btnRuler) {
        btnRuler.addEventListener('click', () => {
          this.state.ruler.visible = !this.state.ruler.visible;
          btnRuler.classList.toggle('active', this.state.ruler.visible);
          this.render();
        });
      }

      const btnReset = document.getElementById('btnReset');
      if (btnReset) {
        btnReset.addEventListener('click', () => {
          this.setScenario(this.state.activeScenario);
        });
      }

      // Toggles
      const chkLevel = document.getElementById('chkLevel');
      if (chkLevel) {
        chkLevel.addEventListener('change', (e) => {
          this.state.showLevelLines = e.target.checked;
          this.render();
        });
      }

      const chkDials = document.getElementById('chkDials');
      if (chkDials) {
        chkDials.addEventListener('change', (e) => {
          this.state.showSpringDials = e.target.checked;
          this.render();
        });
      }

      const chkZoom = document.getElementById('chkZoomScales');
      if (chkZoom) {
        chkZoom.addEventListener('change', (e) => {
          this.state.showZoomScales = e.target.checked;
          this.render();
        });
      }

      // Data Logger
      const btnRecord = document.getElementById('btnRecordTrial');
      if (btnRecord) {
        btnRecord.addEventListener('click', () => this.recordTrial());
      }

      const btnClear = document.getElementById('btnClearTable');
      if (btnClear) {
        btnClear.addEventListener('click', () => this.clearTable());
      }

      const btnExport = document.getElementById('btnExportCSV');
      if (btnExport) {
        btnExport.addEventListener('click', () => this.exportCSV());
      }

      const btnCopy = document.getElementById('btnCopyData');
      if (btnCopy) {
        btnCopy.addEventListener('click', () => this.copyData());
      }

      // Solve Force Table / Workbench Button
      if (this.dom.btnSolveWorkbench) {
        this.dom.btnSolveWorkbench.addEventListener('click', () => this.solveForceTable());
      }

      // Export & Print Diagram
      if (this.dom.btnExportDiagram) {
        this.dom.btnExportDiagram.addEventListener('click', () => this.openExportModal());
      }

      if (this.dom.btnCloseExportModal) {
        this.dom.btnCloseExportModal.addEventListener('click', () => this.closeExportModal());
      }

      if (this.dom.btnDownloadPNG) {
        this.dom.btnDownloadPNG.addEventListener('click', () => this.downloadDiagramPNG());
      }

      if (this.dom.btnPrintSheet) {
        this.dom.btnPrintSheet.addEventListener('click', () => this.printWorksheet());
      }

      if (this.dom.exportModal) {
        this.dom.exportModal.addEventListener('click', (e) => {
          if (e.target === this.dom.exportModal) this.closeExportModal();
        });
      }

      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.dom.exportModal && this.dom.exportModal.classList.contains('active')) {
          this.closeExportModal();
        }
      });

      // Tab Navigation
      document.querySelectorAll('.analysis-tab-btn').forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
          document.querySelectorAll('.analysis-tab-btn').forEach(b => b.classList.remove('active'));
          tabBtn.classList.add('active');
          const targetId = tabBtn.dataset.tab;
          document.querySelectorAll('.analysis-tab-pane').forEach(p => p.classList.remove('active'));
          const pane = document.getElementById(targetId);
          if (pane) pane.classList.add('active');
          this.resizeCanvases();
          this.render();
        });
      });

      this.bindCanvasMouse();
    }

    setScenario(scenarioId) {
      this.state.activeScenario = scenarioId;

      if (scenarioId === 'symmetric') {
        if (this.dom.bannerTitle) this.dom.bannerTitle.textContent = '1. Symmetric Balanced Forces';
        if (this.dom.bannerDesc) this.dom.bannerDesc.textContent = 'A load is suspended symmetrically between two stands. Use the protractor to measure the angles and read the spring scales.';
        this.state.massKg = 0.500;
        this.state.normKnotX = 0.50;
        this.state.normKnotY = 0.58;
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
      } else if (scenarioId === 'asymmetric') {
        if (this.dom.bannerTitle) this.dom.bannerTitle.textContent = '2. Asymmetric Setup';
        if (this.dom.bannerDesc) this.dom.bannerDesc.textContent = 'The knot is shifted horizontally. Use the protractor to measure both cord angles and determine how tension is distributed.';
        this.state.massKg = 0.600;
        this.state.normKnotX = 0.38;
        this.state.normKnotY = 0.58;
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
      } else if (scenarioId === 'mystery') {
        if (this.dom.bannerTitle) this.dom.bannerTitle.textContent = '3. Mystery Mass Challenge';
        if (this.dom.bannerDesc) this.dom.bannerDesc.textContent = 'The hanging mass is unknown. Measure cord tensions and angles with the protractor to determine the load.';
        this.state.normKnotX = 0.44;
        this.state.normKnotY = 0.60;
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'block';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'none';
      } else if (scenarioId === 'sandbox') {
        if (this.dom.bannerTitle) this.dom.bannerTitle.textContent = '4. Custom Statics Sandbox';
        if (this.dom.bannerDesc) this.dom.bannerDesc.textContent = 'Freely drag the brass knot on the canvas to set cord lengths and angles, and adjust hanging mass to explore any 2D statics setup.';
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
      }

      if (this.dom.sliderMass) this.dom.sliderMass.value = Math.round(this.state.massKg * 1000);

      this.state.protractor.normX = this.state.normKnotX;
      this.state.protractor.normY = this.state.normKnotY;
      this.state.protractor.rotationDeg = 0;
      this.state.protractor.isSnapped = true;

      this.updateMassPresetChips();
      this.updateEquilibrium();
      this.render();
    }

    updateMassPresetChips() {
      const currentG = Math.round(this.state.massKg * 1000);
      document.querySelectorAll('.preset-chip').forEach(chip => {
        chip.classList.toggle('active', parseInt(chip.dataset.mass) === currentG);
      });
    }

    handleCheckMystery() {
      if (!this.dom.studentMassInput || !this.dom.mysteryFeedback) return;
      const studentG = parseFloat(this.dom.studentMassInput.value);

      if (isNaN(studentG) || studentG <= 0) {
        this.dom.mysteryFeedback.className = 'feedback-box show feedback-needs-work';
        this.dom.mysteryFeedback.innerHTML = '<strong>Please enter a valid positive number</strong> for mass in grams.';
        return;
      }

      const actualKg = this.state.mysteryMasses[this.state.currentMystery];
      const actualG = actualKg * 1000;
      const evalReport = BalancedForcesPhysics.evaluateStudentCalculation(studentG, actualG);

      const badgeClass = evalReport.status === 'excellent' ? 'feedback-excellent' : (evalReport.status === 'good' ? 'feedback-good' : 'feedback-needs-work');
      this.dom.mysteryFeedback.className = `feedback-box show ${badgeClass}`;
      this.dom.mysteryFeedback.innerHTML = `
        <div style="font-size: 0.95rem; font-weight: 700; margin-bottom: 3px;">
          ${evalReport.status === 'excellent' ? '🎯 Outstanding Accuracy!' : (evalReport.status === 'good' ? '✅ Great Lab Work!' : '⚠️ Discrepancy Found')}
        </div>
        <div>${evalReport.message}</div>
        <div style="margin-top: 6px; font-weight: 600;">
          Your Input: <strong>${studentG} g</strong> | Actual Mass: <strong>${actualG.toFixed(1)} g</strong> (${actualKg.toFixed(3)} kg)<br>
          Percent Error: <strong>${evalReport.percentError}%</strong>
        </div>
      `;
    }

    solveForceTable() {
      const eq = this.equilibrium;
      if (!eq) return;

      const th1In = this.dom.wbTheta1;
      const th2In = this.dom.wbTheta2;
      const outDiv = this.dom.workbenchResults;

      if (!th1In || !th2In || !outDiv) return;

      const th1 = parseFloat(th1In.value);
      const th2 = parseFloat(th2In.value);

      if (isNaN(th1) || isNaN(th2) || th1 <= 0 || th2 <= 0) {
        outDiv.innerHTML = '<p style="color:var(--accent-amber); font-weight:700; margin-top:8px;">Please enter measured positive angles for θ₁ and θ₂ (in degrees with horizontal).</p>';
        return;
      }

      let usedT1 = eq.t1;
      let usedT2 = eq.t2;

      if (this.state.isRealLabMode) {
        if (this.dom.wbForce1 && !isNaN(parseFloat(this.dom.wbForce1.value)) && parseFloat(this.dom.wbForce1.value) > 0) {
          usedT1 = parseFloat(this.dom.wbForce1.value);
        } else {
          usedT1 = Math.round(eq.t1 * 10) / 10;
        }

        if (this.dom.wbForce2 && !isNaN(parseFloat(this.dom.wbForce2.value)) && parseFloat(this.dom.wbForce2.value) > 0) {
          usedT2 = parseFloat(this.dom.wbForce2.value);
        } else {
          usedT2 = Math.round(eq.t2 * 10) / 10;
        }
      }

      const calc = BalancedForcesPhysics.calculateMassFromMeasurements(usedT1, usedT2, th1, th2, this.state.g);
      const actualKg = this.getActiveMassKg();
      const actualG = actualKg * 1000;
      const pErr = BalancedForcesPhysics.calculatePercentError(calc.calculatedMassG, actualG);
      const netFx = calc.t2x - calc.t1x;
      const netFxStr = (netFx >= 0 ? '+' : '') + netFx.toFixed(2);

      // Populate Table Cells
      if (this.dom.tblT1x) this.dom.tblT1x.textContent = `-${calc.t1x.toFixed(2)} N`;
      if (this.dom.tblT1y) this.dom.tblT1y.textContent = `+${calc.t1y.toFixed(2)} N`;
      if (this.dom.tblT2x) this.dom.tblT2x.textContent = `+${calc.t2x.toFixed(2)} N`;
      if (this.dom.tblT2y) this.dom.tblT2y.textContent = `+${calc.t2y.toFixed(2)} N`;
      if (this.dom.tblFgy) this.dom.tblFgy.textContent = `-${calc.totalUpwardForce.toFixed(2)} N`;
      if (this.dom.tblSumFx) {
        if (this.state.isRealLabMode) {
          const isClose = Math.abs(netFx) <= 0.20;
          this.dom.tblSumFx.textContent = `ΣFx = ${netFxStr} N ${isClose ? '(Close to 0)' : '(Off)'}`;
        } else {
          this.dom.tblSumFx.textContent = `|T₂x - T₁x| = ${calc.horizontalImbalance.toFixed(2)} N`;
        }
      }
      if (this.dom.tblSumFy) this.dom.tblSumFy.textContent = `T₁y + T₂y = ${calc.totalUpwardForce.toFixed(2)} N`;

      const uncertaintyNote = this.state.isRealLabMode ? `
        <div style="margin-top: 0.5rem; padding: 0.4rem 0.6rem; background: ${Math.abs(netFx) <= 0.20 ? '#ecfdf5' : '#fffbeb'}; border-left: 3px solid ${Math.abs(netFx) <= 0.20 ? 'var(--success)' : 'var(--accent-amber)'}; border-radius: 4px; font-size: 0.8rem;">
          ${Math.abs(netFx) <= 0.20 ?
            '<strong>✅ Net Horizontal Force is close enough to zero (' + netFxStr + ' N)!</strong> In real laboratory experiments, slight reading uncertainty means components do not cancel to exactly 0.00 N, confirming equilibrium within experimental error.' :
            '<strong>⚠️ Noticeable imbalance (' + netFxStr + ' N).</strong> Check your scale reading or verify your angle alignment with the protractor.'}
        </div>
      ` : '';

      outDiv.innerHTML = `
        <div class="math-card" style="margin-top: 0.6rem; padding: 0.65rem 0.85rem; background: #f8fafc; border-left: 4px solid var(--primary-teal);">
          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.4rem; margin-bottom: 0.4rem;">
            <strong style="color: var(--primary-teal-dark); font-size: 0.88rem;">Equilibrium Resolution Summary</strong>
            <span class="meta-badge" style="background: #e6f4f8; color: var(--primary-teal-dark); font-weight: 700; font-size: 0.72rem;">${this.state.isRealLabMode ? '🔬 Real Lab Mode' : 'Ideal Scenario'}</span>
          </div>
          <div style="font-size: 0.8rem; line-height: 1.45; color: var(--ink);">
            <div><strong>Horizontal Balance:</strong> ΣF<sub>x</sub> = ${calc.t2x.toFixed(2)} - ${calc.t1x.toFixed(2)} = <strong>${netFxStr} N</strong></div>
            <div><strong>Vertical Support:</strong> F<sub>g</sub> = ${calc.t1y.toFixed(2)} + ${calc.t2y.toFixed(2)} = <strong>${calc.totalUpwardForce.toFixed(2)} N</strong></div>
            <div style="margin-top: 0.35rem; padding-top: 0.35rem; border-top: 1px dashed var(--border); font-size: 0.88rem;">
              <strong>Calculated Mass:</strong> <span style="color: var(--primary-teal-dark); font-weight: 700;">m = F<sub>g</sub> / g = ${calc.calculatedMassG.toFixed(1)} g</span> &bull; Error: <strong style="color: ${Math.abs(parseFloat(pErr)) <= 5 ? 'var(--success)' : 'var(--accent-amber)'};">${pErr}%</strong>
            </div>
          </div>
          ${uncertaintyNote}
        </div>
      `;
    }

    recordTrial() {
      const eq = this.equilibrium;
      if (!eq) return;

      const trial = {
        id: this.state.trials.length + 1,
        t1: eq.t1.toFixed(2),
        t2: eq.t2.toFixed(2),
        knotPos: `(${Math.round(this.state.normKnotX * 100)}%, ${Math.round(this.state.normKnotY * 100)}%)`
      };

      this.state.trials.push(trial);
      this.renderTable();
    }

    clearTable() {
      this.state.trials = [];
      this.renderTable();
    }

    renderTable() {
      if (!this.dom.trialsTableBody) return;

      if (this.state.trials.length === 0) {
        this.dom.trialsTableBody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align: center; color: var(--muted); padding: 1rem;">
              No trials recorded yet. Click "Log Current Trial" to record.
            </td>
          </tr>
        `;
        return;
      }

      this.dom.trialsTableBody.innerHTML = this.state.trials.map(t => `
        <tr>
          <td><strong>#${t.id}</strong></td>
          <td>${t.t1} N</td>
          <td>${t.t2} N</td>
          <td>${t.knotPos}</td>
          <td><span style="color: var(--muted); font-style: italic;">[Measure]</span></td>
          <td><span style="color: var(--muted); font-style: italic;">[Measure]</span></td>
        </tr>
      `).join('');
    }

    exportCSV() {
      if (this.state.trials.length === 0) {
        alert('No data recorded yet.');
        return;
      }

      const headers = ['Trial', 'T1_N', 'T2_N', 'Knot_Pos', 'Measured_Theta1', 'Measured_Theta2'];
      const rows = this.state.trials.map(t => [
        t.id, t.t1, t.t2, t.knotPos, '', ''
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'balanced_forces_lab_data.csv';
      link.click();
      URL.revokeObjectURL(url);
    }

    copyData() {
      if (this.state.trials.length === 0) {
        alert('No data recorded yet.');
        return;
      }

      const headers = ['Trial', 'T1 (N)', 'T2 (N)', 'Knot Pos', 'Measured θ₁', 'Measured θ₂'];
      const rows = this.state.trials.map(t => [
        t.id, t.t1, t.t2, t.knotPos, '', ''
      ]);

      const text = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('Data copied in tab-separated format! Paste into Google Sheets or Excel.');
      });
    }

    openExportModal() {
      if (!this.dom.exportModal || !this.dom.exportCanvas) return;

      this.dom.exportModal.classList.add('active');
      this.dom.exportModal.setAttribute('aria-hidden', 'false');

      const canvas = this.dom.exportCanvas;
      const ctx = canvas.getContext('2d');
      this.drawExportDiagram(ctx, canvas.width, canvas.height);

      // Generate image for printable worksheet
      if (this.dom.printDiagramImg) {
        this.dom.printDiagramImg.src = canvas.toDataURL('image/png');
      }

      // Update printable sheet metadata
      const eq = this.equilibrium;
      if (eq) {
        if (this.dom.printValT1) this.dom.printValT1.textContent = `${eq.t1.toFixed(2)} N`;
        if (this.dom.printValT2) this.dom.printValT2.textContent = `${eq.t2.toFixed(2)} N`;
      }
      if (this.dom.printSetupTitle && this.dom.bannerTitle) {
        this.dom.printSetupTitle.textContent = this.dom.bannerTitle.textContent;
      }
    }

    closeExportModal() {
      if (!this.dom.exportModal) return;
      this.dom.exportModal.classList.remove('active');
      this.dom.exportModal.setAttribute('aria-hidden', 'true');
    }

    downloadDiagramPNG() {
      if (!this.dom.exportCanvas) return;
      const dataUrl = this.dom.exportCanvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `balanced_forces_lab_diagram_${this.state.activeScenario}.png`;
      link.href = dataUrl;
      link.click();
    }

    printWorksheet() {
      this.openExportModal();
      setTimeout(() => {
        window.print();
      }, 150);
    }

    drawExportDiagram(ctx, w, h) {
      const eq = this.equilibrium;
      if (!eq) return;

      ctx.save();
      // Pure white paper background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      // Clean border frame
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, w - 2, h - 2);

      // Top title and telemetry banner
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(2, 2, w - 4, 60);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(2, 62);
      ctx.lineTo(w - 2, 62);
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 15px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('The Thinking Experiment: Balanced Forces 2D Statics Lab Rig', 20, 26);

      ctx.fillStyle = '#334155';
      ctx.font = '12px Inter, sans-serif';
      ctx.fillText(`Left Force Sensor (T₁) = ${eq.t1.toFixed(2)} N   |   Right Force Sensor (T₂) = ${eq.t2.toFixed(2)} N   |   Scenario: ${this.state.activeScenario.toUpperCase()}`, 20, 48);

      // Physical Coordinates scaled to export canvas
      const s1 = { x: w * 0.20, y: h * 0.28 };
      const s2 = { x: w * 0.80, y: h * 0.28 };
      const p = { x: w * this.state.normKnotX, y: h * this.state.normKnotY };

      // Tabletop Base
      const tableY = h * 0.88;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(10, tableY, w - 20, h - tableY - 10);
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(10, tableY);
      ctx.lineTo(w - 10, tableY);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.font = 'italic 10px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('Lab Tabletop Base', w - 20, tableY + 16);

      // Draw Ring Stands
      const rodTopY = h * 0.14;
      const drawStand = (standX, clampY, isLeft) => {
        // Base plate
        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, standX - 40, tableY - 14, 80, 14, 3, true, true);
        ctx.strokeStyle = '#1e293b';
        ctx.stroke();

        // Rod
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(standX - 5, rodTopY, 10, tableY - rodTopY - 14);
        ctx.strokeRect(standX - 5, rodTopY, 10, tableY - rodTopY - 14);

        // Cap
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(standX, rodTopY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Clamp
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, standX - 12, clampY - 12, 24, 24, 3, true, true);
      };

      const stand1X = s1.x - 28;
      const stand2X = s2.x + 28;
      drawStand(stand1X, s1.y, true);
      drawStand(stand2X, s2.y, false);

      // Support Extension Arms
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(stand1X, s1.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.moveTo(stand2X, s2.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();

      // Extended Ray Lines for Protractor Alignment (Extending through clamps and beyond)
      const ray1Angle = Math.atan2(s1.y - p.y, s1.x - p.x);
      const ray1Len = Math.hypot(s1.x - p.x, s1.y - p.y) + 90;
      const ray1EndX = p.x + ray1Len * Math.cos(ray1Angle);
      const ray1EndY = p.y + ray1Len * Math.sin(ray1Angle);

      const ray2Angle = Math.atan2(s2.y - p.y, s2.x - p.x);
      const ray2Len = Math.hypot(s2.x - p.x, s2.y - p.y) + 90;
      const ray2EndX = p.x + ray2Len * Math.cos(ray2Angle);
      const ray2EndY = p.y + ray2Len * Math.sin(ray2Angle);

      // Draw Extended Guideline Rays
      ctx.setLineDash([6, 5]);
      ctx.lineWidth = 1.8;

      ctx.strokeStyle = '#0f7e9b';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ray1EndX, ray1EndY);
      ctx.stroke();

      ctx.strokeStyle = '#d67b19';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(ray2EndX, ray2EndY);
      ctx.stroke();

      ctx.setLineDash([]);

      // Ray Labels at outer ends
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#0f7e9b';
      ctx.textAlign = 'right';
      ctx.fillText(`↖ Cord 1 Ray (Align Protractor for θ₁)`, ray1EndX - 6, ray1EndY - 6);

      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText(`Cord 2 Ray (Align Protractor for θ₂) ↗`, ray2EndX + 6, ray2EndY - 6);

      // Spring Scales
      const drawExportScale = (anchor, tension, targetPoint, isLeft) => {
        const dx = targetPoint.x - anchor.x;
        const dy = targetPoint.y - anchor.y;
        const angleRad = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate(angleRad);

        // Barrel
        const scaleLen = 76;
        const barrelW = 22;
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, 8, -barrelW / 2, scaleLen, barrelW, 4, true, true);
        ctx.strokeStyle = isLeft ? '#0f7e9b' : '#d67b19';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Graduation ticks
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        for (let n = 0; n <= 10; n += 2) {
          const tx = 18 + (n / 10) * (scaleLen - 30);
          ctx.beginPath();
          ctx.moveTo(tx, -barrelW / 2 + 2);
          ctx.lineTo(tx, -barrelW / 2 + 6);
          ctx.stroke();
        }

        // Spring Deflection
        const maxExtension = scaleLen - 30;
        const extension = Math.min(maxExtension, (tension / 10) * maxExtension);
        const indicatorX = 18 + extension;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        for (let i = 0; i <= 7; i++) {
          const cx = 18 + (i / 7) * extension;
          const cy = (i % 2 === 0 ? -3 : 3);
          ctx.lineTo(cx, cy);
        }
        ctx.lineTo(indicatorX, 0);
        ctx.stroke();

        // Red Indicator
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(indicatorX - 1.5, -barrelW / 2 + 2, 3, barrelW - 4);

        // Hook
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(indicatorX, 0);
        ctx.lineTo(8 + scaleLen + 8, 0);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(8 + scaleLen + 12, 4, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Digital Value Badge
        ctx.save();
        ctx.rotate(-angleRad);
        ctx.fillStyle = '#ffffff';
        drawRoundedRect(ctx, -30, isLeft ? -46 : 26, 60, 24, 4, true, true);
        ctx.strokeStyle = isLeft ? '#0f7e9b' : '#d67b19';
        ctx.lineWidth = 1.6;
        ctx.stroke();
        ctx.fillStyle = isLeft ? '#0f7e9b' : '#d67b19';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${tension.toFixed(2)} N`, 0, isLeft ? -34 : 38);
        ctx.restore();

        ctx.restore();
      };

      drawExportScale(s1, eq.t1, p, true);
      drawExportScale(s2, eq.t2, p, false);

      // Braided Cords
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.8;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(p.x, p.y);
      ctx.moveTo(s2.x, s2.y);
      ctx.lineTo(p.x, p.y);
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + 40);
      ctx.stroke();

      // Hanging Mass Hanger / Load
      const topY = p.y + 40;
      if (this.state.activeScenario === 'mystery') {
        const boxW = 56;
        const boxH = 68;
        ctx.fillStyle = '#d67b19';
        drawRoundedRect(ctx, p.x - boxW / 2, topY + 6, boxW, boxH, 6, true, true);
        ctx.strokeStyle = '#b86510';
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', p.x, topY + 6 + boxH / 2 - 4);
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`MASS ${this.state.currentMystery}`, p.x, topY + boxH - 6);
      } else {
        const massG = Math.round(this.state.massKg * 1000);
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p.x, topY + 4);
        ctx.lineTo(p.x, topY + 64);
        ctx.stroke();
        drawRoundedRect(ctx, p.x - 24, topY + 64, 48, 6, 2, true, false);

        // Stacked weights
        const numDiscs = Math.max(1, Math.min(6, Math.ceil(massG / 150)));
        for (let i = 0; i < numDiscs; i++) {
          const discY = topY + 64 - (i + 1) * 11;
          ctx.fillStyle = '#d67b19';
          drawRoundedRect(ctx, p.x - 22, discY, 44, 10, 2, true, true);
          ctx.strokeStyle = '#9a3412';
          ctx.stroke();
        }
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, p.x - 30, topY + 76, 60, 20, 3, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${massG} g`, p.x, topY + 86);
      }

      // Continuous Horizontal Baseline through Knot
      ctx.save();
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(25, p.y);
      ctx.lineTo(w - 25, p.y);
      ctx.stroke();
      ctx.restore();

      // Baseline labels
      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('0° – 180° Horizontal Baseline (Align flat bottom of protractor along this line)', 30, p.y - 10);

      // Knot Vertex Alignment Target (Crosshair & Circle)
      ctx.save();
      ctx.strokeStyle = '#d67b19';
      ctx.fillStyle = 'rgba(214, 123, 25, 0.15)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(p.x - 24, p.y);
      ctx.lineTo(p.x + 24, p.y);
      ctx.moveTo(p.x, p.y - 24);
      ctx.lineTo(p.x, p.y + 24);
      ctx.stroke();

      // Brass Knot
      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      // Target Label
      ctx.fillStyle = '#1e293b';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('✛ Place Protractor Center Index Here', p.x, p.y + 32);

      // Angle indicator arcs (without numerical spoilers)
      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.fillText('θ₁', p.x - 48, p.y - 12);

      ctx.fillStyle = '#d67b19';
      ctx.fillText('θ₂', p.x + 48, p.y - 12);

      // Vertical Zoomed Scales on Printable Export
      if (this.state.showZoomScales) {
        this.drawVerticalZoomScale(ctx, 14, 75, 78, 290, eq.t1, 'T₁ Scale', '#0f7e9b', s1);
        this.drawVerticalZoomScale(ctx, w - 92, 75, 78, 290, eq.t2, 'T₂ Scale', '#d67b19', s2);
      }

      ctx.restore();
    }

    bindCanvasMouse() {
      const canvas = this.dom.apparatusCanvas;
      if (!canvas) return;

      const getMousePos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = canvas.width / dpr;
        const h = canvas.height / dpr;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const x = ((clientX - rect.left) / rect.width) * w;
        const y = ((clientY - rect.top) / rect.height) * h;

        return { x, y, w, h };
      };

      const handleDown = (e) => {
        const { x, y, w, h } = getMousePos(e);
        const knotX = w * this.state.normKnotX;
        const knotY = h * this.state.normKnotY;

        // Check Protractor Rotation Handle
        if (this.state.protractor.visible) {
          const protX = w * this.state.protractor.normX;
          const protY = h * this.state.protractor.normY;
          const rad = (this.state.protractor.rotationDeg * Math.PI) / 180;
          const rotX = protX + (this.state.protractor.radius + 18) * Math.cos(rad);
          const rotY = protY + (this.state.protractor.radius + 18) * Math.sin(rad);

          if (Math.hypot(x - rotX, y - rotY) < 22) {
            this.state.dragTarget = 'protractor_rot';
            e.preventDefault();
            return;
          }

          if (Math.hypot(x - protX, y - protY) <= this.state.protractor.radius) {
            this.state.dragTarget = 'protractor';
            this.state.dragOffset = { x: x - protX, y: y - protY };
            this.state.protractor.isSnapped = false;
            e.preventDefault();
            return;
          }
        }

        // Check Knot
        if (Math.hypot(x - knotX, y - knotY) < 28) {
          this.state.dragTarget = 'knot';
          this.state.dragOffset = { x: x - knotX, y: 0 };
          this.state.bobbingOffset = 0;
          e.preventDefault();
          return;
        }

        // Check Ruler
        if (this.state.ruler.visible) {
          const rx = w * this.state.ruler.normX;
          const ry = h * this.state.ruler.normY;
          const rlen = this.state.ruler.length;
          if (x >= rx && x <= rx + rlen && y >= ry - 20 && y <= ry + 40) {
            this.state.dragTarget = 'ruler';
            this.state.dragOffset = { x: x - rx, y: y - ry };
            e.preventDefault();
            return;
          }
        }
      };

      const handleMove = (e) => {
        const { x, y, w, h } = getMousePos(e);
        const knotX = w * this.state.normKnotX;
        const knotY = h * this.state.normKnotY;

        if (!this.state.dragTarget) {
          const distToKnot = Math.hypot(x - knotX, y - knotY);
          this.state.isHoveringKnot = distToKnot < 28;
          canvas.style.cursor = this.state.isHoveringKnot ? 'ew-resize' : 'crosshair';
          return;
        }

        if (this.state.dragTarget === 'knot') {
          canvas.style.cursor = 'ew-resize';
          const newX = Math.max(w * 0.28, Math.min(w * 0.72, x - this.state.dragOffset.x));
          this.state.normKnotX = newX / w;
          // Height (normKnotY) is NOT set from mouse Y! It is strictly locked to string equilibrium

          this.updateEquilibrium();
          if (this.state.protractor.isSnapped) {
            this.state.protractor.normX = this.state.normKnotX;
            this.state.protractor.normY = this.state.normKnotY;
          }
          this.render();
        } else if (this.state.dragTarget === 'protractor') {
          const newX = x - this.state.dragOffset.x;
          const newY = y - this.state.dragOffset.y;

          this.state.protractor.normX = newX / w;
          this.state.protractor.normY = newY / h;

          if (Math.hypot(newX - knotX, newY - knotY) < 18) {
            this.state.protractor.normX = this.state.normKnotX;
            this.state.protractor.normY = this.state.normKnotY;
            this.state.protractor.isSnapped = true;
          }

          this.render();
        } else if (this.state.dragTarget === 'protractor_rot') {
          const protX = w * this.state.protractor.normX;
          const protY = h * this.state.protractor.normY;
          const rad = Math.atan2(y - protY, x - protX);
          let deg = (rad * 180) / Math.PI;
          if (deg < 0) deg += 360;
          this.state.protractor.rotationDeg = Math.round(deg);
          this.render();
        } else if (this.state.dragTarget === 'ruler') {
          this.state.ruler.normX = (x - this.state.dragOffset.x) / w;
          this.state.ruler.normY = (y - this.state.dragOffset.y) / h;
          this.render();
        }
      };

      const handleUp = () => {
        if (this.state.dragTarget === 'knot') {
          this.triggerEquilibriumSettling(4);
        }
        this.state.dragTarget = null;
        canvas.style.cursor = 'crosshair';
      };

      canvas.addEventListener('mousedown', handleDown);
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);

      canvas.addEventListener('touchstart', handleDown, { passive: false });
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }

    render() {
      this.renderApparatus();
      this.renderAnalysisCanvases();
    }

    renderApparatus() {
      const canvas = this.dom.apparatusCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const { w, h, s1, s2, p, dpr } = this.getApparatusCoords();

      if (w < 10 || h < 10) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      // 1. Grid & Table
      this.drawApparatusBackground(ctx, w, h);

      // 2. Ring Stands
      this.drawRingStands(ctx, w, h, s1, s2);

      // 3. Level Reference Lines
      if (this.state.showLevelLines) {
        this.drawLevelLines(ctx, w, h, s1, s2, p);
      }

      // 4. Spring Scales
      this.drawSpringScales(ctx, s1, s2, p);

      // 5. Cords & Central Knot Ring
      this.drawCordsAndKnot(ctx, s1, s2, p);

      // 6. Hanging Mass (Prominent & Clear)
      this.drawHangingMass(ctx, p);

      // 7. Interactive Protractor Tool (For student angle measurement)
      if (this.state.protractor.visible) {
        const protX = w * this.state.protractor.normX;
        const protY = h * this.state.protractor.normY;
        this.drawProtractor(ctx, protX, protY);
      }

      // 8. Ruler Tool
      if (this.state.ruler.visible) {
        const rx = w * this.state.ruler.normX;
        const ry = h * this.state.ruler.normY;
        this.drawRuler(ctx, rx, ry);
      }

      // 9. Vertical Zoomed Scales (Left & Right)
      if (this.state.showZoomScales && this.equilibrium) {
        this.drawVerticalZoomScale(ctx, 12, 16, 72, 262, this.equilibrium.t1, 'T₁ Scale', '#0f7e9b', s1);
        this.drawVerticalZoomScale(ctx, w - 84, 16, 72, 262, this.equilibrium.t2, 'T₂ Scale', '#d67b19', s2);
      }

      ctx.restore();
    }

    drawApparatusBackground(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = '#e8f2f7';
      ctx.lineWidth = 1;
      const step = Math.max(24, Math.floor(w / 26));

      for (let x = 0; x <= w; x += step) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y <= h; y += step) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      // Tabletop Base
      const tableY = h * 0.88;
      ctx.fillStyle = '#edf4f8';
      ctx.fillRect(0, tableY, w, h - tableY);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(0, tableY);
      ctx.lineTo(w, tableY);
      ctx.stroke();
      ctx.restore();
    }

    drawRingStands(ctx, w, h, s1, s2) {
      ctx.save();
      const tableY = h * 0.88;
      const rodTopY = h * 0.12;

      const drawStand = (standX, clampY, isLeft) => {
        // Steel Base Plate
        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, standX - 35, tableY - 12, 70, 12, 3, true, true);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vertical Steel Rod
        const grad = ctx.createLinearGradient(standX - 5, 0, standX + 5, 0);
        grad.addColorStop(0, '#cbd5e1');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.fillRect(standX - 5, rodTopY, 10, tableY - rodTopY - 12);
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.strokeRect(standX - 5, rodTopY, 10, tableY - rodTopY - 12);

        // Rod Cap
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(standX, rodTopY, 6, 0, Math.PI * 2);
        ctx.fill();

        // Right-Angle Clamp
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, standX - 11, clampY - 10, 22, 20, 3, true, true);
        ctx.strokeStyle = '#0a576b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Clamp Adjustment Knob
        ctx.fillStyle = '#d67b19';
        ctx.beginPath();
        ctx.arc(standX + (isLeft ? -13 : 13), clampY, 5, 0, Math.PI * 2);
        ctx.fill();
      };

      const stand1X = s1.x - 26;
      const stand2X = s2.x + 26;

      drawStand(stand1X, s1.y, true);
      drawStand(stand2X, s2.y, false);

      // Support Extension Arms
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(stand1X, s1.y);
      ctx.lineTo(s1.x, s1.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(stand2X, s2.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();

      ctx.restore();
    }

    drawLevelLines(ctx, w, h, s1, s2, p) {
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.35)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 4]);

      // Horizontal line through knot
      ctx.beginPath();
      ctx.moveTo(w * 0.05, p.y);
      ctx.lineTo(w * 0.95, p.y);
      ctx.stroke();

      // Horizontal line through clamps
      ctx.beginPath();
      ctx.moveTo(s1.x - 15, s1.y);
      ctx.lineTo(s2.x + 15, s2.y);
      ctx.stroke();

      // Plumb line
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 30);
      ctx.lineTo(p.x, p.y + 90);
      ctx.stroke();

      ctx.restore();
    }

    drawSpringScales(ctx, s1, s2, p) {
      const eq = this.equilibrium;
      if (!eq) return;

      const drawScale = (anchor, tension, targetPoint, isLeft) => {
        const dx = targetPoint.x - anchor.x;
        const dy = targetPoint.y - anchor.y;
        const angleRad = Math.atan2(dy, dx);

        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate(angleRad);

        // Top Suspension Ring
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, 0, 7.5, 0, Math.PI * 2);
        ctx.stroke();

        // Barrel Housing
        const scaleLen = 70;
        const barrelW = 20;

        ctx.fillStyle = 'rgba(240, 248, 250, 0.94)';
        drawRoundedRect(ctx, 8, -barrelW / 2, scaleLen, barrelW, 4, true, true);
        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Caps
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, 8, -barrelW / 2, 8, barrelW, 2, true, false);
        drawRoundedRect(ctx, 8 + scaleLen - 8, -barrelW / 2, 8, barrelW, 2, true, false);

        // Graduated Newton Ticks (Enhanced for analog reading)
        ctx.fillStyle = '#0a576b';
        ctx.strokeStyle = '#0f7e9b';
        ctx.font = '7px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let n = 0; n <= 10; n += 1) {
          const tickX = 18 + (n / 10) * (scaleLen - 28);
          const isMajor = (n % 2 === 0);
          ctx.lineWidth = isMajor ? 1.2 : 0.6;
          ctx.beginPath();
          ctx.moveTo(tickX, -barrelW / 2 + 2);
          ctx.lineTo(tickX, -barrelW / 2 + (isMajor ? 7 : 4));
          ctx.stroke();
          if (isMajor) {
            ctx.fillText(n.toString(), tickX, 7);
          }
        }

        // Spring Deflection
        const maxExtension = scaleLen - 28;
        const extension = Math.min(maxExtension, (tension / 10) * maxExtension);
        const indicatorX = 18 + extension;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        const coils = 7;
        for (let i = 0; i <= coils; i++) {
          const cx = 18 + (i / coils) * extension;
          const cy = (i % 2 === 0 ? -3 : 3);
          ctx.lineTo(cx, cy);
        }
        ctx.lineTo(indicatorX, 0);
        ctx.stroke();

        // Red Indicator Ring
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(indicatorX - 1.5, -barrelW / 2 + 2, 3, barrelW - 4);

        // Hook Rod
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(indicatorX, 0);
        ctx.lineTo(8 + scaleLen + 8, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(8 + scaleLen + 12, 4, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Digital Sensor Force Badge (shown in Ideal Mode, or in Real Lab Mode if vertical zoom is disabled)
        if (this.state.showSpringDials && (!this.state.isRealLabMode || !this.state.showZoomScales)) {
          ctx.save();
          ctx.rotate(-angleRad);
          ctx.fillStyle = '#ffffff';
          const badgeW = 56;
          drawRoundedRect(ctx, -badgeW / 2, isLeft ? -42 : 24, badgeW, 22, 4, true, true);
          ctx.strokeStyle = isLeft ? '#0f7e9b' : '#d67b19';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = isLeft ? '#0f7e9b' : '#d67b19';
          ctx.font = 'bold 9.5px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          if (this.state.isRealLabMode) {
            ctx.fillText('Read Scale', 0, isLeft ? -31 : 35);
          } else {
            ctx.fillText(`${tension.toFixed(2)} N`, 0, isLeft ? -31 : 35);
          }
          ctx.restore();
        }

        ctx.restore();
      };

      drawScale(s1, eq.t1, p, true);
      drawScale(s2, eq.t2, p, false);
    }

    drawVerticalZoomScale(ctx, x, y, width, height, tension, title, themeColor, anchorPoint) {
      ctx.save();

      // Dashed Callout Line connecting tilted spring scale anchor to vertical zoom card
      if (anchorPoint) {
        ctx.strokeStyle = themeColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(anchorPoint.x, anchorPoint.y);
        ctx.lineTo(x + width / 2, y);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Card Container
      ctx.fillStyle = 'rgba(255, 255, 255, 0.96)';
      drawRoundedRect(ctx, x, y, width, height, 7, true, true);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Card Header Banner
      ctx.fillStyle = themeColor;
      drawRoundedRect(ctx, x + 4, y + 4, width - 8, 18, 4, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(title, x + width / 2, y + 13);

      // Subtitle
      ctx.fillStyle = '#475569';
      ctx.font = '7px Inter, sans-serif';
      ctx.fillText('0–10 N (0.2N ticks)', x + width / 2, y + 29);

      // Top Ring / Clamp Cap
      const topRingY = y + 36;
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.arc(x + 22, topRingY, 4, 0, Math.PI * 2);
      ctx.stroke();

      // Barrel Geometry
      const barrelX = x + 8;
      const barrelY = y + 42;
      const barrelW = 26;
      const barrelH = 188; // ~18.8 px per Newton!
      const usableH = barrelH - 8;

      // Barrel Background
      ctx.fillStyle = '#f8fafc';
      drawRoundedRect(ctx, barrelX, barrelY, barrelW, barrelH, 3, true, true);
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Spring Deflection
      const ext = Math.max(0, Math.min(usableH, (tension / 10) * usableH));
      const indY = barrelY + 4 + ext;

      // Helical Spring Coil
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(barrelX + barrelW / 2, barrelY + 2);
      const coils = 12;
      for (let i = 0; i <= coils; i++) {
        const cy = barrelY + 2 + (i / coils) * ext;
        const cx = barrelX + barrelW / 2 + (i % 2 === 0 ? -4 : 4);
        ctx.lineTo(cx, cy);
      }
      ctx.lineTo(barrelX + barrelW / 2, indY);
      ctx.stroke();

      // Hook Rod extending from indicator to bottom
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(barrelX + barrelW / 2, indY);
      ctx.lineTo(barrelX + barrelW / 2, barrelY + barrelH + 6);
      ctx.stroke();

      // Graduated Newton Ticks (Completely Vertical & Upright)
      for (let n = 0; n <= 10; n += 0.2) {
        const val = Math.round(n * 10) / 10;
        const tickY = barrelY + 4 + (val / 10) * usableH;
        const isWhole = Math.abs(val - Math.round(val)) < 0.05;
        const isHalf = Math.abs(val - (Math.floor(val) + 0.5)) < 0.05;

        let tickLen = 3;
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 0.7;

        if (isWhole) {
          tickLen = 8;
          ctx.strokeStyle = '#0f172a';
          ctx.lineWidth = 1.4;
        } else if (isHalf) {
          tickLen = 5;
          ctx.strokeStyle = '#334155';
          ctx.lineWidth = 0.9;
        }

        ctx.beginPath();
        ctx.moveTo(barrelX + barrelW - 1, tickY);
        ctx.lineTo(barrelX + barrelW - 1 - tickLen, tickY);
        ctx.stroke();

        // Numerals for whole Newtons (0, 1, 2, ..., 10)
        if (isWhole) {
          ctx.fillStyle = '#0f172a';
          ctx.font = 'bold 8px Inter, sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(Math.round(val).toString(), barrelX + barrelW + 3, tickY);
        }
      }

      // Red Indicator Bar across the barrel
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(barrelX + 1, indY - 1.5, barrelW - 2, 3);

      // Sharp Red Indicator Pointer on the left
      ctx.beginPath();
      ctx.moveTo(barrelX, indY);
      ctx.lineTo(barrelX - 4, indY - 3);
      ctx.lineTo(barrelX - 4, indY + 3);
      ctx.closePath();
      ctx.fill();

      // Footer Readout
      ctx.fillStyle = this.state.isRealLabMode ? '#b06210' : themeColor;
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      if (this.state.isRealLabMode) {
        ctx.fillText('Read Red Line', x + width / 2, y + height - 10);
      } else {
        ctx.fillText(`${tension.toFixed(2)} N`, x + width / 2, y + height - 10);
      }

      ctx.restore();
    }

    drawCordsAndKnot(ctx, s1, s2, p) {
      ctx.save();
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';

      // Left Cord
      ctx.beginPath();
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // Right Cord
      ctx.beginPath();
      ctx.moveTo(s2.x, s2.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();

      // Vertical Cord
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x, p.y + 35);
      ctx.stroke();

      // Cord Labels: T₁ (left) and T₂ (right) at midpoint of each cord
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textBaseline = 'middle';

      // T₁ label (left cord midpoint, offset above the cord)
      const mid1X = (s1.x + p.x) / 2;
      const mid1Y = (s1.y + p.y) / 2;
      const ang1 = Math.atan2(p.y - s1.y, p.x - s1.x);
      const off1X = mid1X + 14 * Math.cos(ang1 - Math.PI / 2);
      const off1Y = mid1Y + 14 * Math.sin(ang1 - Math.PI / 2);

      ctx.fillStyle = '#ffffff';
      drawRoundedRect(ctx, off1X - 16, off1Y - 9, 32, 18, 4, true, true);
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#0f7e9b';
      ctx.textAlign = 'center';
      ctx.fillText('T₁', off1X, off1Y);

      // T₂ label (right cord midpoint, offset above the cord)
      const mid2X = (s2.x + p.x) / 2;
      const mid2Y = (s2.y + p.y) / 2;
      const ang2 = Math.atan2(p.y - s2.y, p.x - s2.x);
      const off2X = mid2X + 14 * Math.cos(ang2 + Math.PI / 2);
      const off2Y = mid2Y + 14 * Math.sin(ang2 + Math.PI / 2);

      ctx.fillStyle = '#ffffff';
      drawRoundedRect(ctx, off2X - 16, off2Y - 9, 32, 18, 4, true, true);
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'center';
      ctx.fillText('T₂', off2X, off2Y);

      // Fg label on vertical cord
      ctx.fillStyle = '#dc2626';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('Fg', p.x + 8, p.y + 20);

      // θ₁ label near left angle
      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText('θ₁', p.x - 46, p.y - 6);

      // θ₂ label near right angle
      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText('θ₂', p.x + 46, p.y - 6);

      // Knot Ring Glow
      if (this.state.isHoveringKnot || this.state.dragTarget === 'knot') {
        ctx.fillStyle = 'rgba(214, 123, 25, 0.35)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Brass Knot Ring
      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b86510';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
      ctx.fill();

      // Horizontal Drag Guide when active
      if (this.state.dragTarget === 'knot') {
        ctx.save();
        ctx.strokeStyle = 'rgba(214, 123, 25, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(p.x - 36, p.y);
        ctx.lineTo(p.x + 36, p.y);
        ctx.stroke();
        ctx.restore();
      }

      // Drag Hint Tooltip when hovering
      if (this.state.isHoveringKnot && !this.state.dragTarget) {
        ctx.fillStyle = 'rgba(18, 49, 64, 0.90)';
        const tipW = 118;
        drawRoundedRect(ctx, p.x - tipW / 2, p.y - 32, tipW, 18, 3, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8.5px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('↔ Drag X (Height Locked)', p.x, p.y - 23);
      }

      ctx.restore();
    }

    drawHangingMass(ctx, p) {
      const topY = p.y + 35;
      const massKg = this.getActiveMassKg();

      ctx.save();

      if (this.state.activeScenario === 'mystery') {
        const boxW = 54;
        const boxH = 64;
        const boxX = p.x - boxW / 2;
        const boxY = topY + 6;

        // Top Hook
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, topY + 3, 5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Mystery Load Canister
        ctx.fillStyle = '#d67b19';
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6, true, true);
        ctx.strokeStyle = '#b86510';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Bold Question Mark
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', p.x, boxY + boxH / 2 - 4);

        // Mass ID Label
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillText(`MASS ${this.state.currentMystery}`, p.x, boxY + boxH - 12);
      } else {
        const hangerW = 44;
        const discH = 10;
        const massG = Math.round(massKg * 1000);

        // Slotted Mass Hanger Rod
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, topY + 3, 4, 0, Math.PI * 2);
        ctx.moveTo(p.x, topY + 7);
        ctx.lineTo(p.x, topY + 66);
        ctx.stroke();

        // Base Plate
        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, p.x - 22, topY + 64, 44, 6, 2, true, false);

        // Stacked Brass Slotted Weights
        const numDiscs = Math.max(1, Math.min(6, Math.ceil(massG / 150)));
        for (let i = 0; i < numDiscs; i++) {
          const discY = topY + 64 - (i + 1) * (discH + 1);
          const grad = ctx.createLinearGradient(p.x - hangerW / 2, discY, p.x + hangerW / 2, discY);
          grad.addColorStop(0, '#d67b19');
          grad.addColorStop(0.5, '#fef5ea');
          grad.addColorStop(1, '#b86510');
          ctx.fillStyle = grad;
          drawRoundedRect(ctx, p.x - hangerW / 2, discY, hangerW, discH, 2, true, true);
          ctx.strokeStyle = '#8c4805';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Slotted Notch
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x - 2, discY, 4, discH);
        }

        // Hanging Load Value Tag
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, p.x - 30, topY + 76, 60, 20, 4, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${massG} g`, p.x, topY + 86);
      }

      ctx.restore();
    }

    drawProtractor(ctx, protX, protY) {
      ctx.save();
      ctx.translate(protX, protY);
      ctx.rotate((this.state.protractor.rotationDeg * Math.PI) / 180);

      const r = this.state.protractor.radius;

      // Semi-transparent Acrylic Body (180 deg)
      ctx.fillStyle = 'rgba(224, 242, 247, 0.82)';
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Dividing Arc separating Outer Scale and Inner Scale
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.45)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(0, 0, r - 25, Math.PI, 0, false);
      ctx.stroke();

      // Inner Cutout
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.40, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Origin Baseline (Horizontal Alignment Line)
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.6)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.stroke();

      // Center Origin Crosshairs & Sighting Ring
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(16, 0);
      ctx.moveTo(0, -16);
      ctx.lineTo(0, 16);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
      ctx.stroke();

      // Graduated Degree Ticks & Numbers (Dual Scale: Outer & Inner)
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let deg = 0; deg <= 180; deg += 1) {
        const rad = Math.PI - (deg * Math.PI) / 180;

        // Outer rim ticks (every 1°, 5°, 10°)
        let outerTickLen = 3.5;
        if (deg % 10 === 0) outerTickLen = 10;
        else if (deg % 5 === 0) outerTickLen = 6.5;

        const ox1 = (r - 2) * Math.cos(rad);
        const oy1 = -(r - 2) * Math.sin(rad);
        const ox2 = (r - 2 - outerTickLen) * Math.cos(rad);
        const oy2 = -(r - 2 - outerTickLen) * Math.sin(rad);

        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = (deg % 10 === 0) ? 1.3 : 0.65;
        ctx.beginPath();
        ctx.moveTo(ox1, oy1);
        ctx.lineTo(ox2, oy2);
        ctx.stroke();

        // Inner scale ticks extending inward from dividing arc
        if (deg % 5 === 0) {
          const innerTickLen = (deg % 10 === 0) ? 6 : 4;
          const inR1 = r - 25;
          const inR2 = r - 25 - innerTickLen;
          const ix1 = inR1 * Math.cos(rad);
          const iy1 = -inR1 * Math.sin(rad);
          const ix2 = inR2 * Math.cos(rad);
          const iy2 = -inR2 * Math.sin(rad);

          ctx.strokeStyle = (deg % 10 === 0) ? '#d67b19' : 'rgba(214, 123, 25, 0.6)';
          ctx.lineWidth = (deg % 10 === 0) ? 1.1 : 0.65;
          ctx.beginPath();
          ctx.moveTo(ix1, iy1);
          ctx.lineTo(ix2, iy2);
          ctx.stroke();
        }

        // Dual Degree Numbers every 10°
        if (deg % 10 === 0) {
          // 1. Outer Scale: 0° to 180° Left-to-Right (Teal)
          const outTextR = r - 16;
          const otx = outTextR * Math.cos(rad);
          const oty = -outTextR * Math.sin(rad);
          ctx.fillStyle = '#0a576b';
          ctx.font = 'bold 7px Inter, sans-serif';
          ctx.fillText(deg.toString(), otx, oty);

          // 2. Inner Scale: 0° to 180° Right-to-Left (Amber)
          const inTextR = r - 36;
          const itx = inTextR * Math.cos(rad);
          const ity = -inTextR * Math.sin(rad);
          const innerDeg = 180 - deg;
          ctx.fillStyle = '#d67b19';
          ctx.font = 'bold 6.5px Inter, sans-serif';
          ctx.fillText(innerDeg.toString(), itx, ity);
        }
      }

      // Small scale labels near 90° for quick reference
      ctx.fillStyle = '#0a576b';
      ctx.font = 'bold 6px Inter, sans-serif';
      ctx.fillText('OUTER', 0, -r + 21);
      ctx.fillStyle = '#d67b19';
      ctx.fillText('INNER', 0, -r + 43);

      // Rotation Drag Handle
      const rotX = r + 18;
      const rotY = 0;
      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(rotX, rotY, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Tool Label
      ctx.fillStyle = '#0f7e9b';
      drawRoundedRect(ctx, -40, -r - 18, 80, 16, 3, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.fillText('PROTRACTOR', 0, -r - 10);

      ctx.restore();
    }

    drawRuler(ctx, rx, ry) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate((this.state.ruler.rotationDeg * Math.PI) / 180);

      const len = this.state.ruler.length;
      const h = 28;

      ctx.fillStyle = 'rgba(254, 245, 234, 0.92)';
      drawRoundedRect(ctx, 0, 0, len, h, 3, true, true);
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#b86510';
      ctx.font = '8px Inter, sans-serif';
      ctx.textAlign = 'center';

      const mmSpacing = 3.5;
      const totalCm = Math.floor(len / (mmSpacing * 10));

      for (let cm = 0; cm <= totalCm; cm++) {
        const cmX = cm * mmSpacing * 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cmX, 0);
        ctx.lineTo(cmX, 10);
        ctx.stroke();

        if (cm > 0) {
          ctx.fillText(cm.toString(), cmX, 19);
        }

        for (let mm = 1; mm < 10; mm++) {
          const mmX = cmX + mm * mmSpacing;
          if (mmX < len) {
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mmX, 0);
            ctx.lineTo(mmX, mm === 5 ? 7 : 4);
            ctx.stroke();
          }
        }
      }

      ctx.restore();
    }

    renderAnalysisCanvases() {
      this.renderFBD();
      this.renderPolygon();
    }

    renderFBD() {
      const canvas = this.dom.fbdCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (w < 10 || h < 10) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const cX = w / 2;
      const cY = h / 2 + 15;

      ctx.strokeStyle = '#e2edf2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cX, 12);
      ctx.lineTo(cX, h - 12);
      ctx.moveTo(12, cY);
      ctx.lineTo(w - 12, cY);
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.beginPath();
      ctx.arc(cX, cY, 5.5, 0, Math.PI * 2);
      ctx.fill();

      const eq = this.equilibrium;
      if (!eq) {
        ctx.restore();
        return;
      }

      const scale = 20;

      const t1X = cX + eq.t1x * scale;
      const t1Y = cY - eq.t1y * scale;
      drawArrow(ctx, cX, cY, t1X, t1Y, 9, '#0f7e9b', 2.8);

      const t2X = cX + eq.t2x * scale;
      const t2Y = cY - eq.t2y * scale;
      drawArrow(ctx, cX, cY, t2X, t2Y, 9, '#d67b19', 2.8);

      const fgY = cY - eq.fgy * scale;
      drawArrow(ctx, cX, cY, cX, fgY, 9, '#dc2626', 2.8);

      // Dashed Projections
      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.4)';
      ctx.beginPath();
      ctx.moveTo(t1X, t1Y);
      ctx.lineTo(cX, t1Y);
      ctx.lineTo(cX, cY);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(214, 123, 25, 0.4)';
      ctx.beginPath();
      ctx.moveTo(t2X, t2Y);
      ctx.lineTo(cX, t2Y);
      ctx.stroke();

      ctx.setLineDash([]);
      ctx.font = 'bold 9.5px Inter, sans-serif';

      ctx.fillStyle = '#0f7e9b';
      ctx.textAlign = 'right';
      ctx.fillText(`T₁ = ${eq.t1.toFixed(2)} N`, t1X - 5, t1Y - 4);

      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText(`T₂ = ${eq.t2.toFixed(2)} N`, t2X + 5, t2Y - 4);

      // Conceptual gravity label only - NO spoiled numerical Fg or mass!
      ctx.fillStyle = '#dc2626';
      ctx.fillText('Fg (Weight)', cX + 6, fgY);

      ctx.restore();
    }

    renderPolygon() {
      const canvas = this.dom.polyCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const w = canvas.width / dpr;
      const h = canvas.height / dpr;

      if (w < 10 || h < 10) return;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const eq = this.equilibrium;
      if (!eq) {
        ctx.restore();
        return;
      }

      const startX = w * 0.35;
      const startY = h * 0.74;
      const scale = 20;

      const tip1X = startX + eq.t1x * scale;
      const tip1Y = startY - eq.t1y * scale;
      drawArrow(ctx, startX, startY, tip1X, tip1Y, 8.5, '#0f7e9b', 2.8);

      const tip2X = tip1X + eq.t2x * scale;
      const tip2Y = tip1Y - eq.t2y * scale;
      drawArrow(ctx, tip1X, tip1Y, tip2X, tip2Y, 8.5, '#d67b19', 2.8);

      drawArrow(ctx, tip2X, tip2Y, startX, startY, 8.5, '#dc2626', 2.8);

      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillStyle = '#0f7e9b';
      ctx.fillText(`T₁ = ${eq.t1.toFixed(2)} N`, (startX + tip1X) / 2 - 32, (startY + tip1Y) / 2);

      ctx.fillStyle = '#d67b19';
      ctx.fillText(`T₂ = ${eq.t2.toFixed(2)} N`, (tip1X + tip2X) / 2 + 8, (tip1Y + tip2Y) / 2);

      // Conceptual gravity label only - NO numerical Fg
      ctx.fillStyle = '#dc2626';
      ctx.fillText('Fg = m·g', tip2X + 6, (tip2Y + startY) / 2);

      ctx.fillStyle = '#64748b';
      ctx.font = '9.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Closed Polygon: ΣF = T₁ + T₂ + Fg = 0', w / 2, h - 8);

      ctx.restore();
    }
  }

  // Auto initialize on DOM Ready or Window Load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      window.app = new BalancedForcesApp();
    });
  } else {
    window.app = new BalancedForcesApp();
  }
})();
