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
    ctx.arcTo(x, y + width, y, radius);
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
        sliderKnotX: document.getElementById('sliderKnotX'),
        valKnotX: document.getElementById('valKnotX'),
        sliderKnotY: document.getElementById('sliderKnotY'),
        valKnotY: document.getElementById('valKnotY'),
        telemT1: document.getElementById('telemT1'),
        telemT2: document.getElementById('telemT2'),
        telemAngle1: document.getElementById('telemAngle1'),
        telemAngle2: document.getElementById('telemAngle2'),
        studentMassInput: document.getElementById('studentMassInput'),
        btnCheckMystery: document.getElementById('btnCheckMystery'),
        mysteryFeedback: document.getElementById('mysteryFeedback'),
        trialsTableBody: document.getElementById('trialsTableBody')
      };

      // State (Normalized Coordinates for Resolution Independence)
      this.state = {
        activeScenario: 'symmetric',
        workflowStep: 'measure',
        massKg: 0.500,
        g: 9.80,

        // Normalized knot position [0..1, 0..1] relative to apparatus canvas
        normKnotX: 0.50,
        normKnotY: 0.58,

        // Protractor Tool
        protractor: {
          visible: true,
          normX: 0.50,
          normY: 0.58,
          rotationDeg: 0,
          radius: 110,
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
        showVectors: true,
        showAngles: true,
        showComponents: false,
        showLevelLines: true,
        showSpringDials: true,

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
      this.setScenario('symmetric');

      const handleResize = () => {
        this.resizeCanvases();
        this.updateEquilibrium();
        this.render();
      };

      window.addEventListener('resize', handleResize);
      setTimeout(handleResize, 50);
      setTimeout(handleResize, 200);

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

      const s1 = { x: w * 0.18, y: h * 0.24 };
      const s2 = { x: w * 0.82, y: h * 0.24 };
      const p = { x: w * this.state.normKnotX, y: h * this.state.normKnotY };

      return { w, h, s1, s2, p, dpr };
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

      if (this.dom.telemT1) this.dom.telemT1.textContent = `${eq.t1.toFixed(2)} N`;
      if (this.dom.telemT2) this.dom.telemT2.textContent = `${eq.t2.toFixed(2)} N`;
      if (this.dom.telemAngle1) this.dom.telemAngle1.textContent = `${eq.geometry.theta1Deg.toFixed(1)}°`;
      if (this.dom.telemAngle2) this.dom.telemAngle2.textContent = `${eq.geometry.theta2Deg.toFixed(1)}°`;

      if (this.dom.valMass) {
        if (this.state.activeScenario === 'mystery') {
          this.dom.valMass.textContent = '??? g (Hidden)';
        } else {
          const massG = Math.round(this.state.massKg * 1000);
          this.dom.valMass.textContent = `${massG} g (${(this.state.massKg * this.state.g).toFixed(2)} N)`;
        }
      }

      if (this.dom.valKnotX) {
        this.dom.valKnotX.textContent = `${Math.round(this.state.normKnotX * 100)}%`;
      }
      if (this.dom.valKnotY) {
        this.dom.valKnotY.textContent = `${Math.round(this.state.normKnotY * 100)}%`;
      }
    }

    bindEvents() {
      // Scenario Tabs
      this.dom.scenarioTabs.forEach(tab => {
        tab.addEventListener('click', () => {
          this.dom.scenarioTabs.forEach(t => t.classList.remove('active'));
          tab.classList.add('active');
          this.setScenario(tab.dataset.scenario);
        });
      });

      // Workflow Pills
      const btnMeasure = document.getElementById('btnModeMeasure');
      const btnVector = document.getElementById('btnModeVector');
      if (btnMeasure && btnVector) {
        btnMeasure.addEventListener('click', () => {
          btnMeasure.classList.add('active');
          btnVector.classList.remove('active');
          this.state.workflowStep = 'measure';
          this.state.showVectors = true;
          this.state.showComponents = false;
          this.render();
        });
        btnVector.addEventListener('click', () => {
          btnVector.classList.add('active');
          btnMeasure.classList.remove('active');
          this.state.workflowStep = 'vector';
          this.state.showVectors = true;
          this.state.showComponents = true;
          const chkComp = document.getElementById('chkComponents');
          if (chkComp) chkComp.checked = true;
          this.render();
        });
      }

      // Mass Slider
      if (this.dom.sliderMass) {
        this.dom.sliderMass.addEventListener('input', (e) => {
          this.state.massKg = parseFloat(e.target.value) / 1000;
          this.updateMassPresetChips();
          this.updateEquilibrium();
          this.render();
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
          this.render();
        });
      });

      // Knot X & Y Sliders (Percentages)
      if (this.dom.sliderKnotX) {
        this.dom.sliderKnotX.min = 28;
        this.dom.sliderKnotX.max = 72;
        this.dom.sliderKnotX.value = Math.round(this.state.normKnotX * 100);
        this.dom.sliderKnotX.addEventListener('input', (e) => {
          this.state.normKnotX = parseFloat(e.target.value) / 100;
          if (this.state.protractor.isSnapped) {
            this.state.protractor.normX = this.state.normKnotX;
          }
          this.updateEquilibrium();
          this.render();
        });
      }

      if (this.dom.sliderKnotY) {
        this.dom.sliderKnotY.min = 38;
        this.dom.sliderKnotY.max = 76;
        this.dom.sliderKnotY.value = Math.round(this.state.normKnotY * 100);
        this.dom.sliderKnotY.addEventListener('input', (e) => {
          this.state.normKnotY = parseFloat(e.target.value) / 100;
          if (this.state.protractor.isSnapped) {
            this.state.protractor.normY = this.state.normKnotY;
          }
          this.updateEquilibrium();
          this.render();
        });
      }

      // Mystery Chips
      document.querySelectorAll('.mystery-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          document.querySelectorAll('.mystery-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          this.state.currentMystery = chip.dataset.mystery;
          if (this.dom.mysteryFeedback) this.dom.mysteryFeedback.className = 'feedback-box';
          this.updateEquilibrium();
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
      const chkVectors = document.getElementById('chkVectors');
      if (chkVectors) {
        chkVectors.addEventListener('change', (e) => {
          this.state.showVectors = e.target.checked;
          this.render();
        });
      }

      const chkAngles = document.getElementById('chkAngles');
      if (chkAngles) {
        chkAngles.addEventListener('change', (e) => {
          this.state.showAngles = e.target.checked;
          this.render();
        });
      }

      const chkComponents = document.getElementById('chkComponents');
      if (chkComponents) {
        chkComponents.addEventListener('change', (e) => {
          this.state.showComponents = e.target.checked;
          this.render();
        });
      }

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

      // Calculation Workbench
      const btnSolveWB = document.getElementById('btnSolveWorkbench');
      if (btnSolveWB) {
        btnSolveWB.addEventListener('click', () => this.solveWorkbench());
      }

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
          this.renderAnalysisCanvases();
        });
      });

      this.bindCanvasMouse();
    }

    setScenario(scenarioId) {
      this.state.activeScenario = scenarioId;

      if (scenarioId === 'symmetric') {
        this.dom.bannerTitle.textContent = '1. Symmetric Balanced Forces';
        this.dom.bannerDesc.textContent = 'A 500 g load is suspended centrally between two ring stands. Equal angles produce equal cord tensions.';
        this.state.massKg = 0.500;
        this.state.normKnotX = 0.50;
        this.state.normKnotY = 0.58;
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
        this.state.showAngles = true;
      } else if (scenarioId === 'asymmetric') {
        this.dom.bannerTitle.textContent = '2. Asymmetric Angles & Tensions';
        this.dom.bannerDesc.textContent = 'The knot is shifted horizontally toward the left stand. The steeper cord carries more vertical load.';
        this.state.massKg = 0.600;
        this.state.normKnotX = 0.38;
        this.state.normKnotY = 0.58;
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
        this.state.showAngles = true;
      } else if (scenarioId === 'mystery') {
        this.dom.bannerTitle.textContent = '3. Mystery Mass Challenge';
        this.dom.bannerDesc.textContent = 'The hanging mass is unknown. Measure cord tensions and angles with the protractor to determine the load.';
        this.state.normKnotX = 0.44;
        this.state.normKnotY = 0.60;
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'block';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'none';
        this.state.showAngles = false;
        const chk = document.getElementById('chkAngles');
        if (chk) chk.checked = false;
      } else if (scenarioId === 'sandbox') {
        this.dom.bannerTitle.textContent = '4. Custom Statics Sandbox';
        this.dom.bannerDesc.textContent = 'Freely manipulate hanging mass, horizontal placement, and vertical drop to explore any 2D concurrent force setup.';
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
      }

      if (this.dom.sliderMass) this.dom.sliderMass.value = Math.round(this.state.massKg * 1000);
      if (this.dom.sliderKnotX) this.dom.sliderKnotX.value = Math.round(this.state.normKnotX * 100);
      if (this.dom.sliderKnotY) this.dom.sliderKnotY.value = Math.round(this.state.normKnotY * 100);

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

    solveWorkbench() {
      const t1In = document.getElementById('wbT1');
      const t2In = document.getElementById('wbT2');
      const th1In = document.getElementById('wbTheta1');
      const th2In = document.getElementById('wbTheta2');
      const outDiv = document.getElementById('workbenchResults');

      if (!t1In || !t2In || !th1In || !th2In || !outDiv) return;

      const t1 = parseFloat(t1In.value);
      const t2 = parseFloat(t2In.value);
      const th1 = parseFloat(th1In.value);
      const th2 = parseFloat(th2In.value);

      if (isNaN(t1) || isNaN(t2) || isNaN(th1) || isNaN(th2)) {
        outDiv.innerHTML = '<p style="color:var(--accent-amber); font-weight:700; margin-top:8px;">Please fill in all 4 measured fields.</p>';
        return;
      }

      const calc = BalancedForcesPhysics.calculateMassFromMeasurements(t1, t2, th1, th2, this.state.g);
      const actualKg = this.getActiveMassKg();
      const actualG = actualKg * 1000;
      const pErr = BalancedForcesPhysics.calculatePercentError(calc.calculatedMassG, actualG);

      outDiv.innerHTML = `
        <div class="math-card" style="margin-top: 0.8rem;">
          <h4>Calculated Equilibrium Resolution</h4>
          <p><strong>Horizontal Balance:</strong><br>
             T₁x = ${t1.toFixed(2)} · cos(${th1.toFixed(1)}°) = <strong>${calc.t1x.toFixed(2)} N</strong> (left)<br>
             T₂x = ${t2.toFixed(2)} · cos(${th2.toFixed(1)}°) = <strong>${calc.t2x.toFixed(2)} N</strong> (right)<br>
             Horizontal Imbalance: |T₂x - T₁x| = <strong>${calc.horizontalImbalance.toFixed(2)} N</strong></p>
          <p style="margin-top: 0.4rem;"><strong>Vertical Support:</strong><br>
             T₁y = ${t1.toFixed(2)} · sin(${th1.toFixed(1)}°) = <strong>${calc.t1y.toFixed(2)} N</strong><br>
             T₂y = ${t2.toFixed(2)} · sin(${th2.toFixed(1)}°) = <strong>${calc.t2y.toFixed(2)} N</strong><br>
             Total Upward Force: ΣF<sub>y</sub> = <strong>${calc.totalUpwardForce.toFixed(2)} N</strong></p>
          <p style="margin-top: 0.4rem;"><strong>Calculated Load Mass:</strong><br>
             m = ΣF<sub>y</sub> / g = ${calc.totalUpwardForce.toFixed(2)} / 9.80 = <strong>${calc.calculatedMassKg.toFixed(3)} kg (${calc.calculatedMassG.toFixed(1)} g)</strong><br>
             Actual Mass: <strong>${actualG.toFixed(1)} g</strong> | Error: <strong>${pErr}%</strong></p>
        </div>
      `;
    }

    recordTrial() {
      const eq = this.equilibrium;
      if (!eq) return;

      const calc = BalancedForcesPhysics.calculateMassFromMeasurements(
        eq.t1,
        eq.t2,
        eq.geometry.theta1Deg,
        eq.geometry.theta2Deg,
        this.state.g
      );

      const trial = {
        id: this.state.trials.length + 1,
        massG: Math.round(eq.massGrams),
        theta1: eq.geometry.theta1Deg.toFixed(1),
        theta2: eq.geometry.theta2Deg.toFixed(1),
        t1: eq.t1.toFixed(2),
        t2: eq.t2.toFixed(2),
        t1x: calc.t1x.toFixed(2),
        t2x: calc.t2x.toFixed(2),
        sumFy: (parseFloat(calc.t1y) + parseFloat(calc.t2y)).toFixed(2),
        calcMassG: calc.calculatedMassG.toFixed(1)
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
            <td colspan="10" style="text-align: center; color: var(--muted); padding: 1rem;">
              No trials recorded yet. Click "Log Current Trial" to record.
            </td>
          </tr>
        `;
        return;
      }

      this.dom.trialsTableBody.innerHTML = this.state.trials.map(t => `
        <tr>
          <td><strong>#${t.id}</strong></td>
          <td>${t.massG} g</td>
          <td>${t.theta1}°</td>
          <td>${t.theta2}°</td>
          <td>${t.t1} N</td>
          <td>${t.t2} N</td>
          <td>${t.t1x} N</td>
          <td>${t.t2x} N</td>
          <td>${t.sumFy} N</td>
          <td><strong>${t.calcMassG} g</strong></td>
        </tr>
      `).join('');
    }

    exportCSV() {
      if (this.state.trials.length === 0) {
        alert('No data recorded yet.');
        return;
      }

      const headers = ['Trial', 'Mass_g', 'Theta1_deg', 'Theta2_deg', 'T1_N', 'T2_N', 'T1x_N', 'T2x_N', 'Sum_Fy_N', 'Calc_Mass_g'];
      const rows = this.state.trials.map(t => [
        t.id, t.massG, t.theta1, t.theta2, t.t1, t.t2, t.t1x, t.t2x, t.sumFy, t.calcMassG
      ]);

      const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'balanced_forces_data.csv';
      link.click();
      URL.revokeObjectURL(url);
    }

    copyData() {
      if (this.state.trials.length === 0) {
        alert('No data recorded yet.');
        return;
      }

      const headers = ['Trial', 'Mass (g)', 'θ₁ (°)', 'θ₂ (°)', 'T₁ (N)', 'T₂ (N)', 'T₁x (N)', 'T₂x (N)', 'ΣFy (N)', 'Calc Mass (g)'];
      const rows = this.state.trials.map(t => [
        t.id, `${t.massG} g`, t.theta1, t.theta2, t.t1, t.t2, t.t1x, t.t2x, t.sumFy, t.calcMassG
      ]);

      const text = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
      navigator.clipboard.writeText(text).then(() => {
        alert('Data copied in tab-separated format! Paste into Google Sheets or Excel.');
      });
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
          this.state.dragOffset = { x: x - knotX, y: y - knotY };
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
          canvas.style.cursor = this.state.isHoveringKnot ? 'grab' : 'crosshair';
          return;
        }

        canvas.style.cursor = 'grabbing';

        if (this.state.dragTarget === 'knot') {
          const newX = Math.max(w * 0.28, Math.min(w * 0.72, x - this.state.dragOffset.x));
          const newY = Math.max(h * 0.38, Math.min(h * 0.76, y - this.state.dragOffset.y));

          this.state.normKnotX = newX / w;
          this.state.normKnotY = newY / h;

          if (this.dom.sliderKnotX) this.dom.sliderKnotX.value = Math.round(this.state.normKnotX * 100);
          if (this.dom.sliderKnotY) this.dom.sliderKnotY.value = Math.round(this.state.normKnotY * 100);

          if (this.state.protractor.isSnapped) {
            this.state.protractor.normX = this.state.normKnotX;
            this.state.protractor.normY = this.state.normKnotY;
          }

          this.updateEquilibrium();
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      // 1. Grid & Table
      this.drawApparatusBackground(ctx, w, h);

      // 2. Ring Stands
      this.drawRingStands(ctx, w, h, s1, s2);

      // 3. Level Lines
      if (this.state.showLevelLines) {
        this.drawLevelLines(ctx, w, h, s1, s2, p);
      }

      // 4. Spring Scales
      this.drawSpringScales(ctx, s1, s2, p);

      // 5. Cords & Knot
      this.drawCordsAndKnot(ctx, s1, s2, p);

      // 6. Hanging Mass
      this.drawHangingMass(ctx, p);

      // 7. Force Vectors
      if (this.state.showVectors) {
        this.drawForceVectors(ctx, p);
      }

      // 8. Angle Visualizers
      if (this.state.showAngles) {
        this.drawAngleVisualizers(ctx, p);
      }

      // 9. Interactive Protractor
      if (this.state.protractor.visible) {
        const protX = w * this.state.protractor.normX;
        const protY = h * this.state.protractor.normY;
        this.drawProtractor(ctx, protX, protY);
      }

      // 10. Ruler
      if (this.state.ruler.visible) {
        const rx = w * this.state.ruler.normX;
        const ry = h * this.state.ruler.normY;
        this.drawRuler(ctx, rx, ry);
      }

      ctx.restore();
    }

    drawApparatusBackground(ctx, w, h) {
      ctx.save();
      ctx.strokeStyle = '#e6f0f5';
      ctx.lineWidth = 1;
      const step = Math.max(24, Math.floor(w / 28));

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
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, tableY, w, h - tableY);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
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
        // Steel Base
        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, standX - 35, tableY - 12, 70, 12, 3, true, true);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Vertical Steel Rod
        const grad = ctx.createLinearGradient(standX - 4, 0, standX + 4, 0);
        grad.addColorStop(0, '#cbd5e1');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.fillRect(standX - 4, rodTopY, 8, tableY - rodTopY - 12);
        ctx.strokeRect(standX - 4, rodTopY, 8, tableY - rodTopY - 12);

        // Rod Cap
        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(standX, rodTopY, 5, 0, Math.PI * 2);
        ctx.fill();

        // Clamp
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, standX - 10, clampY - 9, 20, 18, 3, true, true);
        ctx.strokeStyle = '#0a576b';
        ctx.stroke();

        // Knob
        ctx.fillStyle = '#d67b19';
        ctx.beginPath();
        ctx.arc(standX + (isLeft ? -12 : 12), clampY, 4.5, 0, Math.PI * 2);
        ctx.fill();
      };

      const stand1X = s1.x - 24;
      const stand2X = s2.x + 24;

      drawStand(stand1X, s1.y, true);
      drawStand(stand2X, s2.y, false);

      // Support Arms
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 5;
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

        // Suspension Ring
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.stroke();

        // Housing
        const scaleLen = 65;
        const barrelW = 18;

        ctx.fillStyle = 'rgba(240, 248, 250, 0.92)';
        drawRoundedRect(ctx, 7, -barrelW / 2, scaleLen, barrelW, 3, true, true);
        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = 1.4;
        ctx.stroke();

        // Caps
        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, 7, -barrelW / 2, 7, barrelW, 2, true, false);
        drawRoundedRect(ctx, 7 + scaleLen - 7, -barrelW / 2, 7, barrelW, 2, true, false);

        // Newton Ticks
        ctx.fillStyle = '#0a576b';
        ctx.font = '7px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let n = 0; n <= 10; n += 2) {
          const tickX = 16 + (n / 10) * (scaleLen - 25);
          ctx.beginPath();
          ctx.moveTo(tickX, -barrelW / 2 + 2);
          ctx.lineTo(tickX, -barrelW / 2 + 5);
          ctx.stroke();
          ctx.fillText(n.toString(), tickX, 6);
        }

        // Spring Deflection
        const maxExtension = scaleLen - 25;
        const extension = Math.min(maxExtension, (tension / 10) * maxExtension);
        const indicatorX = 16 + extension;

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(16, 0);
        const coils = 7;
        for (let i = 0; i <= coils; i++) {
          const cx = 16 + (i / coils) * extension;
          const cy = (i % 2 === 0 ? -2.5 : 2.5);
          ctx.lineTo(cx, cy);
        }
        ctx.lineTo(indicatorX, 0);
        ctx.stroke();

        // Red Indicator
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(indicatorX - 1.2, -barrelW / 2 + 2, 2.4, barrelW - 4);

        // Hook Rod
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(indicatorX, 0);
        ctx.lineTo(7 + scaleLen + 8, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(7 + scaleLen + 11, 3.5, 3.5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        // Digital Force Badge
        if (this.state.showSpringDials) {
          ctx.save();
          ctx.rotate(-angleRad); // Keep text horizontal
          ctx.fillStyle = '#ffffff';
          drawRoundedRect(ctx, -24, isLeft ? -38 : 22, 48, 20, 4, true, true);
          ctx.strokeStyle = '#0f7e9b';
          ctx.lineWidth = 1.4;
          ctx.stroke();

          ctx.fillStyle = '#0f7e9b';
          ctx.font = 'bold 9.5px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${tension.toFixed(2)} N`, 0, isLeft ? -25 : 35);
          ctx.restore();
        }

        ctx.restore();
      };

      drawScale(s1, eq.t1, p, true);
      drawScale(s2, eq.t2, p, false);
    }

    drawCordsAndKnot(ctx, s1, s2, p) {
      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.4;
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

      // Knot Ring
      if (this.state.isHoveringKnot || this.state.dragTarget === 'knot') {
        ctx.fillStyle = 'rgba(214, 123, 25, 0.3)';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 7.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b86510';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawHangingMass(ctx, p) {
      const topY = p.y + 35;
      const massKg = this.getActiveMassKg();

      ctx.save();

      if (this.state.activeScenario === 'mystery') {
        const boxW = 50;
        const boxH = 58;
        const boxX = p.x - boxW / 2;
        const boxY = topY + 6;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, topY + 3, 4.5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.fillStyle = '#d67b19';
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 5, true, true);
        ctx.strokeStyle = '#b86510';
        ctx.lineWidth = 1.8;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 22px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', p.x, boxY + boxH / 2 - 3);

        ctx.font = 'bold 9.5px Inter, sans-serif';
        ctx.fillText(`MASS ${this.state.currentMystery}`, p.x, boxY + boxH - 10);
      } else {
        const hangerW = 40;
        const discH = 9;
        const massG = Math.round(massKg * 1000);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(p.x, topY + 3, 3.5, 0, Math.PI * 2);
        ctx.moveTo(p.x, topY + 7);
        ctx.lineTo(p.x, topY + 60);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, p.x - 20, topY + 58, 40, 5, 2, true, false);

        const numDiscs = Math.max(1, Math.min(6, Math.ceil(massG / 150)));
        for (let i = 0; i < numDiscs; i++) {
          const discY = topY + 58 - (i + 1) * (discH + 1);
          const grad = ctx.createLinearGradient(p.x - hangerW / 2, discY, p.x + hangerW / 2, discY);
          grad.addColorStop(0, '#d67b19');
          grad.addColorStop(0.5, '#fef5ea');
          grad.addColorStop(1, '#b86510');
          ctx.fillStyle = grad;
          drawRoundedRect(ctx, p.x - hangerW / 2, discY, hangerW, discH, 2, true, true);
          ctx.strokeStyle = '#8c4805';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(p.x - 2, discY, 4, discH);
        }

        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, p.x - 28, topY + 68, 56, 18, 3, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${massG} g`, p.x, topY + 77);
      }

      ctx.restore();
    }

    drawForceVectors(ctx, p) {
      const eq = this.equilibrium;
      if (!eq) return;

      ctx.save();
      const scale = 18;

      const t1EndX = p.x + eq.t1x * scale;
      const t1EndY = p.y - eq.t1y * scale;
      drawArrow(ctx, p.x, p.y, t1EndX, t1EndY, 9, '#0f7e9b', 3);

      const t2EndX = p.x + eq.t2x * scale;
      const t2EndY = p.y - eq.t2y * scale;
      drawArrow(ctx, p.x, p.y, t2EndX, t2EndY, 9, '#d67b19', 3);

      const fgEndY = p.y - eq.fgy * scale;
      drawArrow(ctx, p.x, p.y, p.x, fgEndY, 9, '#dc2626', 3);

      if (this.state.showComponents) {
        ctx.setLineDash([3, 3]);
        ctx.lineWidth = 1.2;

        ctx.strokeStyle = 'rgba(15, 126, 155, 0.6)';
        ctx.beginPath();
        ctx.moveTo(t1EndX, t1EndY);
        ctx.lineTo(p.x, t1EndY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(214, 123, 25, 0.6)';
        ctx.beginPath();
        ctx.moveTo(t2EndX, t2EndY);
        ctx.lineTo(p.x, t2EndY);
        ctx.lineTo(p.x, p.y);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawAngleVisualizers(ctx, p) {
      const eq = this.equilibrium;
      if (!eq) return;

      ctx.save();
      const radius = 40;

      // Angle 1: Sweep from 180° (-x) upwards by theta1
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.8;
      ctx.fillStyle = 'rgba(15, 126, 155, 0.15)';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, radius, Math.PI, Math.PI - eq.geometry.theta1Rad, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`θ₁ = ${eq.geometry.theta1Deg.toFixed(1)}°`, p.x - radius - 6, p.y - 12);

      // Angle 2: Sweep from 0° (+x) upwards by theta2
      ctx.strokeStyle = '#d67b19';
      ctx.fillStyle = 'rgba(214, 123, 25, 0.15)';
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.arc(p.x, p.y, radius, 0, -eq.geometry.theta2Rad, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText(`θ₂ = ${eq.geometry.theta2Deg.toFixed(1)}°`, p.x + radius + 6, p.y - 12);

      ctx.restore();
    }

    drawProtractor(ctx, protX, protY) {
      ctx.save();
      ctx.translate(protX, protY);
      ctx.rotate((this.state.protractor.rotationDeg * Math.PI) / 180);

      const r = this.state.protractor.radius;

      ctx.fillStyle = 'rgba(224, 242, 247, 0.75)';
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 1.8;

      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(-12, 0);
      ctx.lineTo(12, 0);
      ctx.moveTo(0, -12);
      ctx.lineTo(0, 12);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0a576b';
      ctx.strokeStyle = '#0f7e9b';
      ctx.font = '7.5px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let deg = 0; deg <= 180; deg += 1) {
        const rad = Math.PI - (deg * Math.PI) / 180;
        let tickLen = 3.5;

        if (deg % 10 === 0) {
          tickLen = 10;
        } else if (deg % 5 === 0) {
          tickLen = 6.5;
        }

        const x1 = (r - 2) * Math.cos(rad);
        const y1 = -(r - 2) * Math.sin(rad);
        const x2 = (r - 2 - tickLen) * Math.cos(rad);
        const y2 = -(r - 2 - tickLen) * Math.sin(rad);

        ctx.lineWidth = (deg % 10 === 0) ? 1.2 : 0.6;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (deg % 10 === 0) {
          const textR = r - 16;
          const tx = textR * Math.cos(rad);
          const ty = -textR * Math.sin(rad);
          ctx.fillText(deg.toString(), tx, ty);
        }
      }

      // Rotation Handle
      const rotX = r + 16;
      const rotY = 0;
      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(rotX, rotY, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      drawRoundedRect(ctx, -35, -r - 16, 70, 14, 3, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 8.5px Inter, sans-serif';
      ctx.fillText('PROTRACTOR', 0, -r - 9);

      ctx.restore();
    }

    drawRuler(ctx, rx, ry) {
      ctx.save();
      ctx.translate(rx, ry);
      ctx.rotate((this.state.ruler.rotationDeg * Math.PI) / 180);

      const len = this.state.ruler.length;
      const h = 28;

      ctx.fillStyle = 'rgba(254, 245, 234, 0.9)';
      drawRoundedRect(ctx, 0, 0, len, h, 3, true, true);
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.4;
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#b86510';
      ctx.font = '7.5px Inter, sans-serif';
      ctx.textAlign = 'center';

      const mmSpacing = 3.5;
      const totalCm = Math.floor(len / (mmSpacing * 10));

      for (let cm = 0; cm <= totalCm; cm++) {
        const cmX = cm * mmSpacing * 10;
        ctx.lineWidth = 1.4;
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
            ctx.lineWidth = 0.7;
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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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
      ctx.fillText(`T₁x = ${Math.abs(eq.t1x).toFixed(2)} N`, t1X - 5, cY + 12);

      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText(`T₂ = ${eq.t2.toFixed(2)} N`, t2X + 5, t2Y - 4);
      ctx.fillText(`T₂x = ${eq.t2x.toFixed(2)} N`, t2X + 5, cY + 12);

      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Fg = ${eq.fg.toFixed(2)} N`, cX + 6, fgY);

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
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
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

      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Fg = ${eq.fg.toFixed(2)} N`, tip2X + 6, (tip2Y + startY) / 2);

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
