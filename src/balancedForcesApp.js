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

      // State
      this.state = {
        activeScenario: 'symmetric',
        workflowStep: 'measure',
        massKg: 0.500,
        g: 9.80,

        // Geometry in virtual canvas space [0..900, 0..520]
        s1: { x: 160, y: 120 },
        s2: { x: 740, y: 120 },
        p: { x: 450, y: 310 },

        // Interactive Protractor
        protractor: {
          visible: true,
          x: 450,
          y: 310,
          rotationDeg: 0,
          radius: 120,
          isSnapped: true
        },

        // Interactive Ruler
        ruler: {
          visible: false,
          x: 280,
          y: 390,
          length: 260,
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
      setTimeout(handleResize, 300);

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
        const w = rect.width > 0 ? rect.width : (canvas.clientWidth || 800);
        const h = rect.height > 0 ? rect.height : (canvas.clientHeight || 450);
        
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

    updateEquilibrium() {
      const massKg = this.getActiveMassKg();
      this.equilibrium = BalancedForcesPhysics.calculateStaticEquilibrium(
        massKg,
        this.state.p,
        this.state.s1,
        this.state.s2,
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
        this.dom.valKnotX.textContent = `${Math.round(this.state.p.x)} px`;
      }
      if (this.dom.valKnotY) {
        this.dom.valKnotY.textContent = `${Math.round(this.state.p.y)} px`;
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

      // Knot X & Y Sliders
      if (this.dom.sliderKnotX) {
        this.dom.sliderKnotX.addEventListener('input', (e) => {
          this.state.p.x = parseFloat(e.target.value);
          if (this.state.protractor.isSnapped) {
            this.state.protractor.x = this.state.p.x;
          }
          this.updateEquilibrium();
          this.render();
        });
      }

      if (this.dom.sliderKnotY) {
        this.dom.sliderKnotY.addEventListener('input', (e) => {
          this.state.p.y = parseFloat(e.target.value);
          if (this.state.protractor.isSnapped) {
            this.state.protractor.y = this.state.p.y;
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
          this.state.protractor.x = this.state.p.x;
          this.state.protractor.y = this.state.p.y;
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
        this.state.p = { x: 450, y: 310 };
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
        this.state.showAngles = true;
      } else if (scenarioId === 'asymmetric') {
        this.dom.bannerTitle.textContent = '2. Asymmetric Angles & Tensions';
        this.dom.bannerDesc.textContent = 'The knot is shifted horizontally toward the left stand. The steeper cord carries more vertical load.';
        this.state.massKg = 0.600;
        this.state.p = { x: 340, y: 310 };
        if (this.dom.mysteryBox) this.dom.mysteryBox.style.display = 'none';
        if (this.dom.massControlItem) this.dom.massControlItem.style.display = 'flex';
        this.state.showAngles = true;
      } else if (scenarioId === 'mystery') {
        this.dom.bannerTitle.textContent = '3. Mystery Mass Challenge';
        this.dom.bannerDesc.textContent = 'The hanging mass is unknown. Measure cord tensions and angles with the protractor to determine the load.';
        this.state.p = { x: 410, y: 320 };
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
      if (this.dom.sliderKnotX) this.dom.sliderKnotX.value = this.state.p.x;
      if (this.dom.sliderKnotY) this.dom.sliderKnotY.value = this.state.p.y;

      this.state.protractor.x = this.state.p.x;
      this.state.protractor.y = this.state.p.y;
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

      const getCanvasPos = (e) => {
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const w = rect.width;
        const h = rect.height;
        const scale = Math.min(w / 900, h / 520);
        const offsetX = (w - 900 * scale) / 2;
        const offsetY = (h - 520 * scale) / 2;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;

        const mouseCanvasX = clientX - rect.left;
        const mouseCanvasY = clientY - rect.top;

        return {
          x: (mouseCanvasX - offsetX) / scale,
          y: (mouseCanvasY - offsetY) / scale
        };
      };

      const handleDown = (e) => {
        const pos = getCanvasPos(e);

        if (this.state.protractor.visible) {
          const prot = this.state.protractor;
          const rad = (prot.rotationDeg * Math.PI) / 180;
          const rotHandleX = prot.x + (prot.radius + 18) * Math.cos(rad);
          const rotHandleY = prot.y + (prot.radius + 18) * Math.sin(rad);
          if (Math.hypot(pos.x - rotHandleX, pos.y - rotHandleY) < 20) {
            this.state.dragTarget = 'protractor_rot';
            e.preventDefault();
            return;
          }

          const distToProt = Math.hypot(pos.x - prot.x, pos.y - prot.y);
          if (distToProt <= prot.radius) {
            this.state.dragTarget = 'protractor';
            this.state.dragOffset = { x: pos.x - prot.x, y: pos.y - prot.y };
            this.state.protractor.isSnapped = false;
            e.preventDefault();
            return;
          }
        }

        const distToKnot = Math.hypot(pos.x - this.state.p.x, pos.y - this.state.p.y);
        if (distToKnot < 26) {
          this.state.dragTarget = 'knot';
          this.state.dragOffset = { x: pos.x - this.state.p.x, y: pos.y - this.state.p.y };
          e.preventDefault();
          return;
        }

        if (this.state.ruler.visible) {
          const r = this.state.ruler;
          if (pos.x >= r.x && pos.x <= r.x + r.length && pos.y >= r.y - 20 && pos.y <= r.y + 40) {
            this.state.dragTarget = 'ruler';
            this.state.dragOffset = { x: pos.x - r.x, y: pos.y - r.y };
            e.preventDefault();
            return;
          }
        }
      };

      const handleMove = (e) => {
        const pos = getCanvasPos(e);

        if (!this.state.dragTarget) {
          const distToKnot = Math.hypot(pos.x - this.state.p.x, pos.y - this.state.p.y);
          this.state.isHoveringKnot = distToKnot < 26;
          canvas.style.cursor = this.state.isHoveringKnot ? 'grab' : 'crosshair';
          return;
        }

        canvas.style.cursor = 'grabbing';

        if (this.state.dragTarget === 'knot') {
          const newX = Math.max(220, Math.min(680, pos.x - this.state.dragOffset.x));
          const newY = Math.max(180, Math.min(430, pos.y - this.state.dragOffset.y));
          
          this.state.p.x = newX;
          this.state.p.y = newY;

          if (this.dom.sliderKnotX) this.dom.sliderKnotX.value = newX;
          if (this.dom.sliderKnotY) this.dom.sliderKnotY.value = newY;

          if (this.state.protractor.isSnapped) {
            this.state.protractor.x = newX;
            this.state.protractor.y = newY;
          }

          this.updateEquilibrium();
          this.render();
        } else if (this.state.dragTarget === 'protractor') {
          this.state.protractor.x = pos.x - this.state.dragOffset.x;
          this.state.protractor.y = pos.y - this.state.dragOffset.y;

          if (Math.hypot(this.state.protractor.x - this.state.p.x, this.state.protractor.y - this.state.p.y) < 16) {
            this.state.protractor.x = this.state.p.x;
            this.state.protractor.y = this.state.p.y;
            this.state.protractor.isSnapped = true;
          }

          this.render();
        } else if (this.state.dragTarget === 'protractor_rot') {
          const prot = this.state.protractor;
          const rad = Math.atan2(pos.y - prot.y, pos.x - prot.x);
          let deg = (rad * 180) / Math.PI;
          if (deg < 0) deg += 360;
          prot.rotationDeg = Math.round(deg);
          this.render();
        } else if (this.state.dragTarget === 'ruler') {
          this.state.ruler.x = pos.x - this.state.dragOffset.x;
          this.state.ruler.y = pos.y - this.state.dragOffset.y;
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
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : (canvas.clientWidth || 800);
      const h = rect.height > 0 ? rect.height : (canvas.clientHeight || 450);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const scale = Math.min(w / 900, h / 520);
      const offsetX = (w - 900 * scale) / 2;
      const offsetY = (h - 520 * scale) / 2;

      ctx.translate(offsetX, offsetY);
      ctx.scale(scale, scale);

      this.drawLabGrid(ctx);
      this.drawRingStands(ctx);

      if (this.state.showLevelLines) {
        this.drawLevelLines(ctx);
      }

      this.drawSpringScales(ctx);
      this.drawCordsAndKnot(ctx);
      this.drawHangingMass(ctx);

      if (this.state.showVectors) {
        this.drawForceVectors(ctx);
      }

      if (this.state.showAngles) {
        this.drawAngleVisualizers(ctx);
      }

      if (this.state.protractor.visible) {
        this.drawProtractor(ctx);
      }

      if (this.state.ruler.visible) {
        this.drawRuler(ctx);
      }

      ctx.restore();
    }

    drawLabGrid(ctx) {
      ctx.save();
      ctx.strokeStyle = '#e2edf2';
      ctx.lineWidth = 1;
      for (let x = 0; x <= 900; x += 30) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, 520);
        ctx.stroke();
      }
      for (let y = 0; y <= 520; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(900, y);
        ctx.stroke();
      }

      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(0, 480, 900, 40);
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 480);
      ctx.lineTo(900, 480);
      ctx.stroke();
      ctx.restore();
    }

    drawRingStands(ctx) {
      ctx.save();
      const drawStand = (baseX, clampY) => {
        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, baseX - 45, 465, 90, 15, 3, true, true);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const grad = ctx.createLinearGradient(baseX - 5, 0, baseX + 5, 0);
        grad.addColorStop(0, '#cbd5e1');
        grad.addColorStop(0.5, '#ffffff');
        grad.addColorStop(1, '#94a3b8');
        ctx.fillStyle = grad;
        ctx.fillRect(baseX - 5, 60, 10, 405);
        ctx.strokeRect(baseX - 5, 60, 10, 405);

        ctx.fillStyle = '#334155';
        ctx.beginPath();
        ctx.arc(baseX, 60, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, baseX - 12, clampY - 10, 24, 20, 3, true, true);
        ctx.strokeStyle = '#0a576b';
        ctx.stroke();

        ctx.fillStyle = '#d67b19';
        ctx.beginPath();
        ctx.arc(baseX + (baseX < 450 ? -14 : 14), clampY, 5, 0, Math.PI * 2);
        ctx.fill();
      };

      drawStand(this.state.s1.x - 30, this.state.s1.y);
      drawStand(this.state.s2.x + 30, this.state.s2.y);

      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      
      ctx.beginPath();
      ctx.moveTo(this.state.s1.x - 30, this.state.s1.y);
      ctx.lineTo(this.state.s1.x, this.state.s1.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.state.s2.x + 30, this.state.s2.y);
      ctx.lineTo(this.state.s2.x, this.state.s2.y);
      ctx.stroke();

      ctx.restore();
    }

    drawLevelLines(ctx) {
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 126, 155, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 5]);

      ctx.beginPath();
      ctx.moveTo(50, this.state.p.y);
      ctx.lineTo(850, this.state.p.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.state.s1.x - 20, this.state.s1.y);
      ctx.lineTo(this.state.s2.x + 20, this.state.s2.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.state.p.x, this.state.p.y - 40);
      ctx.lineTo(this.state.p.x, this.state.p.y + 110);
      ctx.stroke();

      ctx.restore();
    }

    drawSpringScales(ctx) {
      const eq = this.equilibrium;
      if (!eq) return;

      const drawScale = (anchor, tension, angleRad, isLeft) => {
        ctx.save();
        ctx.translate(anchor.x, anchor.y);
        ctx.rotate(angleRad + (isLeft ? Math.PI : 0));

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();

        const scaleLen = 70;
        const barrelW = 20;

        ctx.fillStyle = 'rgba(240, 248, 250, 0.9)';
        drawRoundedRect(ctx, 8, -barrelW / 2, scaleLen, barrelW, 4, true, true);
        ctx.strokeStyle = '#0f7e9b';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, 8, -barrelW / 2, 8, barrelW, 2, true, false);
        drawRoundedRect(ctx, 8 + scaleLen - 8, -barrelW / 2, 8, barrelW, 2, true, false);

        ctx.fillStyle = '#0a576b';
        ctx.font = '7px Inter, sans-serif';
        ctx.textAlign = 'center';
        for (let n = 0; n <= 10; n += 2) {
          const tickX = 18 + (n / 10) * (scaleLen - 28);
          ctx.beginPath();
          ctx.moveTo(tickX, -barrelW / 2 + 2);
          ctx.lineTo(tickX, -barrelW / 2 + 6);
          ctx.stroke();
          ctx.fillText(n.toString(), tickX, 7);
        }

        const maxExtension = scaleLen - 28;
        const extension = Math.min(maxExtension, (tension / 10) * maxExtension);
        const indicatorX = 18 + extension;

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(18, 0);
        const coils = 8;
        for (let i = 0; i <= coils; i++) {
          const cx = 18 + (i / coils) * extension;
          const cy = (i % 2 === 0 ? -3 : 3);
          ctx.lineTo(cx, cy);
        }
        ctx.lineTo(indicatorX, 0);
        ctx.stroke();

        ctx.fillStyle = '#dc2626';
        ctx.fillRect(indicatorX - 1.5, -barrelW / 2 + 2, 3, barrelW - 4);

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(indicatorX, 0);
        ctx.lineTo(8 + scaleLen + 10, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(8 + scaleLen + 14, 4, 4, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        if (this.state.showSpringDials) {
          ctx.save();
          ctx.rotate(-(angleRad + (isLeft ? Math.PI : 0)));
          ctx.fillStyle = '#ffffff';
          drawRoundedRect(ctx, -26, isLeft ? -45 : 25, 52, 22, 4, true, true);
          ctx.strokeStyle = '#0f7e9b';
          ctx.lineWidth = 1.5;
          ctx.stroke();

          ctx.fillStyle = '#0f7e9b';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${tension.toFixed(2)} N`, 0, isLeft ? -30 : 40);
          ctx.restore();
        }

        ctx.restore();
      };

      const angleLeft = Math.atan2(this.state.p.y - this.state.s1.y, this.state.p.x - this.state.s1.x);
      drawScale(this.state.s1, eq.t1, angleLeft, false);

      const angleRight = Math.atan2(this.state.p.y - this.state.s2.y, this.state.p.x - this.state.s2.x);
      drawScale(this.state.s2, eq.t2, angleRight, false);
    }

    drawCordsAndKnot(ctx) {
      ctx.save();
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(this.state.s1.x, this.state.s1.y);
      ctx.lineTo(this.state.p.x, this.state.p.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.state.s2.x, this.state.s2.y);
      ctx.lineTo(this.state.p.x, this.state.p.y);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.state.p.x, this.state.p.y);
      ctx.lineTo(this.state.p.x, this.state.p.y + 40);
      ctx.stroke();

      const ringX = this.state.p.x;
      const ringY = this.state.p.y;

      if (this.state.isHoveringKnot || this.state.dragTarget === 'knot') {
        ctx.fillStyle = 'rgba(214, 123, 25, 0.3)';
        ctx.beginPath();
        ctx.arc(ringX, ringY, 18, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(ringX, ringY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b86510';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(ringX, ringY, 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    drawHangingMass(ctx) {
      const kX = this.state.p.x;
      const topY = this.state.p.y + 40;
      const massKg = this.getActiveMassKg();

      ctx.save();

      if (this.state.activeScenario === 'mystery') {
        const boxW = 54;
        const boxH = 65;
        const boxX = kX - boxW / 2;
        const boxY = topY + 8;

        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(kX, topY + 4, 5, -Math.PI / 2, Math.PI / 2);
        ctx.stroke();

        ctx.fillStyle = '#d67b19';
        drawRoundedRect(ctx, boxX, boxY, boxW, boxH, 6, true, true);
        ctx.strokeStyle = '#b86510';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 26px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', kX, boxY + boxH / 2 - 4);

        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.fillText(`MASS ${this.state.currentMystery}`, kX, boxY + boxH - 12);
      } else {
        const hangerW = 44;
        const discH = 10;
        const massG = Math.round(massKg * 1000);

        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(kX, topY + 4, 4, 0, Math.PI * 2);
        ctx.moveTo(kX, topY + 8);
        ctx.lineTo(kX, topY + 70);
        ctx.stroke();

        ctx.fillStyle = '#475569';
        drawRoundedRect(ctx, kX - 22, topY + 68, 44, 6, 2, true, false);

        const numDiscs = Math.max(1, Math.min(6, Math.ceil(massG / 150)));
        for (let i = 0; i < numDiscs; i++) {
          const discY = topY + 68 - (i + 1) * (discH + 1);
          const grad = ctx.createLinearGradient(kX - hangerW / 2, discY, kX + hangerW / 2, discY);
          grad.addColorStop(0, '#d67b19');
          grad.addColorStop(0.5, '#fef5ea');
          grad.addColorStop(1, '#b86510');
          ctx.fillStyle = grad;
          drawRoundedRect(ctx, kX - hangerW / 2, discY, hangerW, discH, 2, true, true);
          ctx.strokeStyle = '#8c4805';
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = '#ffffff';
          ctx.fillRect(kX - 2, discY, 4, discH);
        }

        ctx.fillStyle = '#0f7e9b';
        drawRoundedRect(ctx, kX - 32, topY + 80, 64, 20, 4, true, false);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${massG} g`, kX, topY + 90);
      }

      ctx.restore();
    }

    drawForceVectors(ctx) {
      const eq = this.equilibrium;
      if (!eq) return;

      ctx.save();
      const pX = this.state.p.x;
      const pY = this.state.p.y;
      const scale = 20;

      const t1EndX = pX + eq.t1x * scale;
      const t1EndY = pY - eq.t1y * scale;
      drawArrow(ctx, pX, pY, t1EndX, t1EndY, 10, '#0f7e9b', 3.5);

      const t2EndX = pX + eq.t2x * scale;
      const t2EndY = pY - eq.t2y * scale;
      drawArrow(ctx, pX, pY, t2EndX, t2EndY, 10, '#d67b19', 3.5);

      const fgEndY = pY - eq.fgy * scale;
      drawArrow(ctx, pX, pY, pX, fgEndY, 10, '#dc2626', 3.5);

      if (this.state.showComponents) {
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1.5;

        ctx.strokeStyle = 'rgba(15, 126, 155, 0.6)';
        ctx.beginPath();
        ctx.moveTo(t1EndX, t1EndY);
        ctx.lineTo(pX, t1EndY);
        ctx.lineTo(pX, pY);
        ctx.stroke();

        ctx.strokeStyle = 'rgba(214, 123, 25, 0.6)';
        ctx.beginPath();
        ctx.moveTo(t2EndX, t2EndY);
        ctx.lineTo(pX, t2EndY);
        ctx.lineTo(pX, pY);
        ctx.stroke();
      }

      ctx.restore();
    }

    drawAngleVisualizers(ctx) {
      const eq = this.equilibrium;
      if (!eq) return;

      ctx.save();
      const pX = this.state.p.x;
      const pY = this.state.p.y;
      const radius = 45;

      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(15, 126, 155, 0.15)';
      ctx.beginPath();
      ctx.moveTo(pX, pY);
      ctx.arc(pX, pY, radius, Math.PI, Math.PI + eq.geometry.theta1Rad, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`θ₁ = ${eq.geometry.theta1Deg.toFixed(1)}°`, pX - radius - 8, pY - 14);

      ctx.strokeStyle = '#d67b19';
      ctx.fillStyle = 'rgba(214, 123, 25, 0.15)';
      ctx.beginPath();
      ctx.moveTo(pX, pY);
      ctx.arc(pX, pY, radius, 0, -eq.geometry.theta2Rad, true);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText(`θ₂ = ${eq.geometry.theta2Deg.toFixed(1)}°`, pX + radius + 8, pY - 14);

      ctx.restore();
    }

    drawProtractor(ctx) {
      const prot = this.state.protractor;
      ctx.save();
      ctx.translate(prot.x, prot.y);
      ctx.rotate((prot.rotationDeg * Math.PI) / 180);

      const r = prot.radius;

      ctx.fillStyle = 'rgba(224, 242, 247, 0.72)';
      ctx.strokeStyle = '#0f7e9b';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.arc(0, 0, r, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, Math.PI, 0, false);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(-15, 0);
      ctx.lineTo(15, 0);
      ctx.moveTo(0, -15);
      ctx.lineTo(0, 15);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0a576b';
      ctx.strokeStyle = '#0f7e9b';
      ctx.font = '8px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      for (let deg = 0; deg <= 180; deg += 1) {
        const rad = Math.PI - (deg * Math.PI) / 180;
        let tickLen = 4;

        if (deg % 10 === 0) {
          tickLen = 12;
        } else if (deg % 5 === 0) {
          tickLen = 8;
        }

        const x1 = (r - 2) * Math.cos(rad);
        const y1 = -(r - 2) * Math.sin(rad);
        const x2 = (r - 2 - tickLen) * Math.cos(rad);
        const y2 = -(r - 2 - tickLen) * Math.sin(rad);

        ctx.lineWidth = (deg % 10 === 0) ? 1.4 : 0.7;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();

        if (deg % 10 === 0) {
          const textR = r - 20;
          const tx = textR * Math.cos(rad);
          const ty = -textR * Math.sin(rad);
          ctx.fillText(deg.toString(), tx, ty);
        }
      }

      const rotX = (r + 18);
      const rotY = 0;
      ctx.fillStyle = '#d67b19';
      ctx.beginPath();
      ctx.arc(rotX, rotY, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      drawRoundedRect(ctx, -40, -r - 18, 80, 16, 3, true, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.fillText('PROTRACTOR', 0, -r - 10);

      ctx.restore();
    }

    drawRuler(ctx) {
      const ruler = this.state.ruler;
      ctx.save();
      ctx.translate(ruler.x, ruler.y);
      ctx.rotate((ruler.rotationDeg * Math.PI) / 180);

      const len = ruler.length;
      const h = 32;

      ctx.fillStyle = 'rgba(254, 245, 234, 0.88)';
      drawRoundedRect(ctx, 0, 0, len, h, 3, true, true);
      ctx.strokeStyle = '#d67b19';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#b86510';
      ctx.font = '8px Inter, sans-serif';
      ctx.textAlign = 'center';

      const mmSpacing = 4;
      const totalCm = Math.floor(len / (mmSpacing * 10));

      for (let cm = 0; cm <= totalCm; cm++) {
        const cmX = cm * mmSpacing * 10;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(cmX, 0);
        ctx.lineTo(cmX, 12);
        ctx.stroke();

        if (cm > 0) {
          ctx.fillText(cm.toString(), cmX, 22);
        }

        for (let mm = 1; mm < 10; mm++) {
          const mmX = cmX + mm * mmSpacing;
          if (mmX < len) {
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(mmX, 0);
            ctx.lineTo(mmX, mm === 5 ? 8 : 5);
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
      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : (canvas.clientWidth || 380);
      const h = rect.height > 0 ? rect.height : (canvas.clientHeight || 240);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const cX = w / 2;
      const cY = h / 2 + 18;

      ctx.strokeStyle = '#e2edf2';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cX, 15);
      ctx.lineTo(cX, h - 15);
      ctx.moveTo(15, cY);
      ctx.lineTo(w - 15, cY);
      ctx.stroke();

      ctx.fillStyle = '#0f7e9b';
      ctx.beginPath();
      ctx.arc(cX, cY, 6, 0, Math.PI * 2);
      ctx.fill();

      const eq = this.equilibrium;
      if (!eq) {
        ctx.restore();
        return;
      }

      const scale = 22;

      const t1X = cX + eq.t1x * scale;
      const t1Y = cY - eq.t1y * scale;
      drawArrow(ctx, cX, cY, t1X, t1Y, 10, '#0f7e9b', 3);

      const t2X = cX + eq.t2x * scale;
      const t2Y = cY - eq.t2y * scale;
      drawArrow(ctx, cX, cY, t2X, t2Y, 10, '#d67b19', 3);

      const fgY = cY - eq.fgy * scale;
      drawArrow(ctx, cX, cY, cX, fgY, 10, '#dc2626', 3);

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
      ctx.font = 'bold 10px Inter, sans-serif';

      ctx.fillStyle = '#0f7e9b';
      ctx.textAlign = 'right';
      ctx.fillText(`T₁ = ${eq.t1.toFixed(2)} N`, t1X - 6, t1Y - 4);
      ctx.fillText(`T₁x = ${Math.abs(eq.t1x).toFixed(2)} N`, t1X - 6, cY + 14);

      ctx.fillStyle = '#d67b19';
      ctx.textAlign = 'left';
      ctx.fillText(`T₂ = ${eq.t2.toFixed(2)} N`, t2X + 6, t2Y - 4);
      ctx.fillText(`T₂x = ${eq.t2x.toFixed(2)} N`, t2X + 6, cY + 14);

      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Fg = ${eq.fg.toFixed(2)} N`, cX + 8, fgY);

      ctx.restore();
    }

    renderPolygon() {
      const canvas = this.dom.polyCanvas;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width > 0 ? rect.width : (canvas.clientWidth || 380);
      const h = rect.height > 0 ? rect.height : (canvas.clientHeight || 240);

      ctx.save();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const eq = this.equilibrium;
      if (!eq) {
        ctx.restore();
        return;
      }

      const startX = w * 0.35;
      const startY = h * 0.72;
      const scale = 22;

      const tip1X = startX + eq.t1x * scale;
      const tip1Y = startY - eq.t1y * scale;
      drawArrow(ctx, startX, startY, tip1X, tip1Y, 9, '#0f7e9b', 3);

      const tip2X = tip1X + eq.t2x * scale;
      const tip2Y = tip1Y - eq.t2y * scale;
      drawArrow(ctx, tip1X, tip1Y, tip2X, tip2Y, 9, '#d67b19', 3);

      drawArrow(ctx, tip2X, tip2Y, startX, startY, 9, '#dc2626', 3);

      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = '#0f7e9b';
      ctx.fillText(`T₁ = ${eq.t1.toFixed(2)} N`, (startX + tip1X) / 2 - 35, (startY + tip1Y) / 2);

      ctx.fillStyle = '#d67b19';
      ctx.fillText(`T₂ = ${eq.t2.toFixed(2)} N`, (tip1X + tip2X) / 2 + 10, (tip1Y + tip2Y) / 2);

      ctx.fillStyle = '#dc2626';
      ctx.fillText(`Fg = ${eq.fg.toFixed(2)} N`, tip2X + 8, (tip2Y + startY) / 2);

      ctx.fillStyle = '#64748b';
      ctx.font = '10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Closed Polygon: ΣF = T₁ + T₂ + Fg = 0', w / 2, h - 10);

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
