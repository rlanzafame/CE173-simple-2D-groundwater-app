(function (App) {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const val = (id) => parseFloat($(id).value);
  const fmt = App.fmt;

  const state = {
    tab: 'domain',
    model: null,
    sel: null,
    sol: null,
    rev: 0,
    step: 0,
    probe: null,
    timer: null,
  };

  const edView = new App.GridView($('ed-canvas'));
  const soView = new App.GridView($('so-canvas'));

  function setMsg(id, text, isError) {
    const el = $(id);
    el.textContent = text;
    el.classList.toggle('err', !!isError);
  }

  // ---------- Tabs ----------
  const tabButtons = document.querySelectorAll('.tabs button');
  tabButtons.forEach((btn) =>
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      tabButtons.forEach((b) => b.classList.toggle('active', b === btn));
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.id === 'tab-' + state.tab));
      redraw();
    })
  );

  function redraw() {
    if (state.tab === 'editor') drawEditor();
    else if (state.tab === 'solution') {
      updateStability();
      drawSolution();
    }
  }
  window.addEventListener('resize', redraw);

  // Any model edit makes the current solution stale.
  function invalidate() {
    state.rev++;
    if (!state.sol) return;
    stopPlay();
    state.sol = null;
    state.step = 0;
    $('so-slider').disabled = true;
    $('so-play').disabled = true;
    $('so-time').textContent = 't = –';
    setMsg('so-msg', 'Model changed – run the solver again.');
  }

  // ---------- Domain tab ----------
  function readDomain() {
    const d = {
      Lx: val('d-Lx'), Lz: val('d-Lz'),
      nx: parseInt($('d-nx').value, 10), nz: parseInt($('d-nz').value, 10),
      K: val('d-K'), Ss: val('d-Ss'), W: val('d-W'), h0: val('d-h0'),
    };
    if (!(d.Lx > 0) || !(d.Lz > 0)) throw new Error('Domain lengths must be positive.');
    if (!(d.nx >= 1 && d.nx <= 400) || !(d.nz >= 1 && d.nz <= 400)) throw new Error('Cell counts must be integers between 1 and 400.');
    if (!(d.K > 0)) throw new Error('K must be positive.');
    if (!(d.Ss >= 0)) throw new Error('Ss must be zero or positive.');
    if (!Number.isFinite(d.W) || !Number.isFinite(d.h0)) throw new Error('W and h0 must be numbers.');
    return d;
  }

  function createGrid() {
    let d;
    try {
      d = readDomain();
    } catch (e) {
      setMsg('d-msg', e.message, true);
      return false;
    }
    state.model = new App.Model(d);
    state.sel = null;
    state.probe = null;
    invalidate();
    updateSelInfo();
    setMsg('d-msg', `Grid created: ${d.nx} × ${d.nz} cells, Δx = ${fmt(state.model.dx)}, Δz = ${fmt(state.model.dz)}.`);
    return true;
  }

  $('d-create').addEventListener('click', () => {
    if (!confirm('Creating a new grid resets all cell properties, sources and boundary conditions. Continue?')) return;
    createGrid();
  });

  // ---------- Editor tab ----------
  function fieldInfo(name) {
    const m = state.model;
    switch (name) {
      case 'logK': return { data: m.K.map(Math.log10), label: 'log10 K' };
      case 'Ss': return { data: m.Ss, label: 'Ss' };
      case 'W': return { data: m.W, label: 'W' };
      case 'h0': return { data: m.h0, label: 'h0' };
      default: return { data: m.K, label: 'K' };
    }
  }

  function drawEditor() {
    const f = fieldInfo($('ed-field').value);
    const [vmin, vmax] = App.range(f.data);
    edView.equalAspect = $('ed-aspect').checked;
    edView.draw(state.model, f.data, { vmin, vmax, label: f.label, selection: state.sel });
  }

  function cellText(m, i, k) {
    const p = m.idx(i, k);
    let s = `cell (i=${i}, k=${k})  x = ${fmt((i + 0.5) * m.dx)}, z = ${fmt((k + 0.5) * m.dz)}\n` +
      `K = ${fmt(m.K[p])}, Ss = ${fmt(m.Ss[p])}, W = ${fmt(m.W[p])}, h0 = ${fmt(m.h0[p])}`;
    const bcs = m.cellBCs(i, k).map((b) => `${b.edge}: ${b.type === App.DIRICHLET ? 'h = ' : 'q = '}${fmt(b.value)}`);
    if (bcs.length) s += `\nBC  ${bcs.join(', ')}`;
    return s;
  }

  function updateSelInfo() {
    const s = state.sel;
    const el = $('ed-selinfo');
    if (!s) {
      el.textContent = 'No cells selected. Drag on the grid to select.';
      return;
    }
    const count = (s.i1 - s.i0 + 1) * (s.k1 - s.k0 + 1);
    if (count === 1) {
      el.textContent = cellText(state.model, s.i0, s.k0);
      return;
    }
    const edges = [];
    if (s.k0 === 0) edges.push('top');
    if (s.k1 === state.model.nz - 1) edges.push('bottom');
    if (s.i0 === 0) edges.push('left');
    if (s.i1 === state.model.nx - 1) edges.push('right');
    el.textContent = `${count} cells: i = ${s.i0}…${s.i1}, k = ${s.k0}…${s.k1}\n` +
      `Touches edges: ${edges.length ? edges.join(', ') : 'none'}`;
  }

  function setSel(a, b) {
    state.sel = {
      i0: Math.min(a.i, b.i), i1: Math.max(a.i, b.i),
      k0: Math.min(a.k, b.k), k1: Math.max(a.k, b.k),
    };
    updateSelInfo();
    drawEditor();
  }

  let dragFrom = null;
  $('ed-canvas').addEventListener('mousedown', (e) => {
    const c = edView.cellAt(e, state.model, edView.band + 4);
    if (!c) return;
    e.preventDefault();
    dragFrom = c;
    setSel(c, c);
  });
  window.addEventListener('mousemove', (e) => {
    if (!dragFrom) return;
    const c = edView.cellAt(e, state.model, Infinity);
    if (c) setSel(dragFrom, c);
  });
  window.addEventListener('mouseup', () => { dragFrom = null; });
  $('ed-canvas').addEventListener('mousemove', (e) => {
    const c = edView.cellAt(e, state.model, 0);
    $('ed-status').textContent = c ? cellText(state.model, c.i, c.k).replace(/\n/g, '  |  ') : '\u00a0';
  });
  $('ed-canvas').addEventListener('mouseleave', () => { $('ed-status').textContent = '\u00a0'; });

  $('ed-field').addEventListener('change', drawEditor);
  $('ed-aspect').addEventListener('change', drawEditor);
  $('ed-selall').addEventListener('click', () => setSel({ i: 0, k: 0 }, { i: state.model.nx - 1, k: state.model.nz - 1 }));
  $('ed-selnone').addEventListener('click', () => {
    state.sel = null;
    updateSelInfo();
    drawEditor();
  });

  $('ed-applycell').addEventListener('click', () => {
    const s = state.sel;
    const m = state.model;
    if (!s) return setMsg('ed-cellmsg', 'Select cells first.', true);
    const props = {};
    for (const key of ['K', 'Ss', 'W', 'h0']) {
      if (!$('ed-use' + key).checked) continue;
      const v = val('ed-' + key);
      if (!Number.isFinite(v)) return setMsg('ed-cellmsg', `Invalid value for ${key}.`, true);
      props[key] = v;
    }
    const keys = Object.keys(props);
    if (!keys.length) return setMsg('ed-cellmsg', 'Tick at least one property to apply.', true);
    if ('K' in props && !(props.K > 0)) return setMsg('ed-cellmsg', 'K must be positive.', true);
    if ('Ss' in props && props.Ss < 0) return setMsg('ed-cellmsg', 'Ss must be zero or positive.', true);
    for (let k = s.k0; k <= s.k1; k++) {
      for (let i = s.i0; i <= s.i1; i++) {
        const p = m.idx(i, k);
        for (const key of keys) m[key][p] = props[key];
      }
    }
    invalidate();
    updateSelInfo();
    drawEditor();
    setMsg('ed-cellmsg', `Set ${keys.join(', ')} on ${(s.i1 - s.i0 + 1) * (s.k1 - s.k0 + 1)} cell(s).`);
  });

  function bcValueLabel(selectId, labelId) {
    const update = () => {
      $(labelId).innerHTML = $(selectId).value === '1'
        ? 'Head h<sub>b</sub> [L]'
        : 'Flux q into domain [L/T]';
    };
    $(selectId).addEventListener('change', update);
    update();
  }
  bcValueLabel('ed-bctype', 'ed-bcvallbl');
  bcValueLabel('ed-setype', 'ed-sevallbl');

  $('ed-applybc').addEventListener('click', () => {
    const s = state.sel;
    const m = state.model;
    if (!s) return setMsg('ed-bcmsg', 'Select cells first.', true);
    const edge = $('ed-bcedge').value;
    const type = parseInt($('ed-bctype').value, 10);
    const v = val('ed-bcval');
    if (!Number.isFinite(v)) return setMsg('ed-bcmsg', 'Invalid value.', true);
    const touches = { top: s.k0 === 0, bottom: s.k1 === m.nz - 1, left: s.i0 === 0, right: s.i1 === m.nx - 1 }[edge];
    if (!touches) return setMsg('ed-bcmsg', `Selection does not touch the ${edge} edge.`, true);
    const horiz = edge === 'top' || edge === 'bottom';
    const a = horiz ? s.i0 : s.k0;
    const b = horiz ? s.i1 : s.k1;
    for (let pos = a; pos <= b; pos++) m.setBC(edge, pos, type, v);
    invalidate();
    updateSelInfo();
    drawEditor();
    setMsg('ed-bcmsg', `Set ${type === App.DIRICHLET ? 'Dirichlet h' : 'Neumann q'} = ${fmt(v)} on ${b - a + 1} ${edge} face(s).`);
  });

  $('ed-setedge').addEventListener('click', () => {
    const edge = $('ed-seedge').value;
    const type = parseInt($('ed-setype').value, 10);
    const v = val('ed-seval');
    if (!Number.isFinite(v)) return setMsg('ed-semsg', 'Invalid value.', true);
    state.model.setEdge(edge, type, v);
    invalidate();
    updateSelInfo();
    drawEditor();
    setMsg('ed-semsg', `Entire ${edge} edge set to ${type === App.DIRICHLET ? 'Dirichlet h' : 'Neumann q'} = ${fmt(v)}.`);
  });

  // ---------- Solution tab ----------
  function updateStability() {
    const dt = val('so-tend') / parseInt($('so-nsteps').value, 10);
    const lim = App.explicitDtLimit(state.model);
    const explicit = $('so-method').value === 'explicit';
    const dtText = Number.isFinite(dt) && dt > 0 ? fmt(dt) : '–';
    if (!explicit) {
      setMsg('so-stab', `Δt = ${dtText}; explicit limit Δt_max = ${fmt(lim)} (implicit is stable for any Δt).`);
    } else if (!(lim > 0)) {
      setMsg('so-stab', 'Explicit stepping needs Ss > 0 in every cell.', true);
    } else {
      const bad = !(dt <= lim);
      setMsg('so-stab', `Δt = ${dtText}; explicit limit Δt_max = ${fmt(lim)}` +
        (bad ? ` – UNSTABLE: use at least ${Math.ceil(val('so-tend') / lim)} steps.` : ' – stable.'), bad);
    }
  }
  ['so-tend', 'so-nsteps'].forEach((id) => $(id).addEventListener('input', updateStability));
  $('so-method').addEventListener('change', updateStability);
  function drawSolution() {
    const sol = state.sol;
    if (!sol) {
      soView.message('Run the solver to see h(x, z, t).');
      updateProbe();
      return;
    }
    const h = sol.heads[state.step];
    const [vmin, vmax] = $('so-scale').value === 'global' ? sol.range : App.range(h);
    soView.equalAspect = $('so-aspect').checked;
    soView.draw(sol.model, h, { vmin, vmax, label: 'h', highlight: state.probe });
    $('so-time').textContent = `t = ${fmt(sol.times[state.step])}  (step ${state.step}/${sol.times.length - 1})`;
    updateProbe();
  }

  function updateProbe() {
    const sol = state.sol;
    const pr = state.probe;
    if (!sol || !pr) {
      $('so-probe').textContent = sol ? 'Click a cell in the head plot.' : 'No solution yet.';
      App.clearCanvas($('so-series'));
      return;
    }
    const m = sol.model;
    const p = m.idx(pr.i, pr.k);
    const series = sol.heads.map((H) => H[p]);
    $('so-probe').textContent =
      `cell (i=${pr.i}, k=${pr.k})  x = ${fmt((pr.i + 0.5) * m.dx)}, z = ${fmt((pr.k + 0.5) * m.dz)}\n` +
      `h(t = ${fmt(sol.times[state.step])}) = ${fmt(series[state.step])}\n` +
      `K = ${fmt(m.K[p])}, Ss = ${fmt(m.Ss[p])}, W = ${fmt(m.W[p])}`;
    App.drawSeries($('so-series'), sol.times, series, state.step, 'h');
  }

  async function run() {
    const tEnd = val('so-tend');
    const nSteps = parseInt($('so-nsteps').value, 10);
    if (!(tEnd > 0)) return setMsg('so-msg', 'End time must be positive.', true);
    if (!(nSteps >= 1 && nSteps <= 5000)) return setMsg('so-msg', 'Number of steps must be between 1 and 5000.', true);
    stopPlay();
    const rev = state.rev;
    $('so-run').disabled = true;
    setMsg('so-msg', 'Solving…');
    const t0 = performance.now();
    try {
      const sol = await App.solve(state.model, {
        tEnd,
        nSteps,
        method: $('so-method').value,
        onProgress: (f) => setMsg('so-msg', `Solving… ${Math.round(f * 100)}%`),
      });
      if (rev !== state.rev) {
        setMsg('so-msg', 'Model changed during the run – run the solver again.', true);
        return;
      }
      state.sol = sol;
      state.step = 0;
      if (state.probe && (state.probe.i >= sol.model.nx || state.probe.k >= sol.model.nz)) state.probe = null;
      const slider = $('so-slider');
      slider.max = String(sol.times.length - 1);
      slider.value = '0';
      slider.disabled = false;
      $('so-play').disabled = false;
      const ms = Math.round(performance.now() - t0);
      if (sol.diverged) {
        setMsg('so-msg', `Explicit scheme diverged at step ${sol.diverged}; showing steps 0–${sol.diverged - 1}. ` +
          'Reduce Δt below Δt_max or use implicit.', true);
      } else {
        setMsg('so-msg', `Done (${sol.method}): ${nSteps} steps, Δt = ${fmt(sol.dt)}` +
          (sol.method === 'implicit' ? `, max CG iterations/step = ${sol.maxIter}` : '') + `, ${ms} ms.`);
      }
    } catch (e) {
      setMsg('so-msg', e.message, true);
    } finally {
      $('so-run').disabled = false;
      drawSolution();
    }
  }
  $('so-run').addEventListener('click', run);

  $('so-slider').addEventListener('input', (e) => {
    state.step = parseInt(e.target.value, 10);
    drawSolution();
  });
  $('so-scale').addEventListener('change', drawSolution);
  $('so-aspect').addEventListener('change', drawSolution);

  $('so-canvas').addEventListener('click', (e) => {
    if (!state.sol) return;
    const c = soView.cellAt(e, state.sol.model, 0);
    if (!c) return;
    state.probe = c;
    drawSolution();
  });
  $('so-canvas').addEventListener('mousemove', (e) => {
    const sol = state.sol;
    const c = sol && soView.cellAt(e, sol.model, 0);
    if (!c) {
      $('so-status').textContent = '\u00a0';
      return;
    }
    const m = sol.model;
    $('so-status').textContent = `cell (i=${c.i}, k=${c.k})  x = ${fmt((c.i + 0.5) * m.dx)}, z = ${fmt((c.k + 0.5) * m.dz)}` +
      `  |  h = ${fmt(sol.heads[state.step][m.idx(c.i, c.k)])}`;
  });
  $('so-canvas').addEventListener('mouseleave', () => { $('so-status').textContent = '\u00a0'; });

  function stopPlay() {
    if (state.timer) clearInterval(state.timer);
    state.timer = null;
    $('so-play').textContent = 'Play';
  }

  $('so-play').addEventListener('click', () => {
    if (state.timer) return stopPlay();
    const sol = state.sol;
    if (!sol) return;
    const last = sol.times.length - 1;
    if (state.step >= last) state.step = 0;
    $('so-play').textContent = 'Pause';
    state.timer = setInterval(() => {
      state.step = Math.min(state.step + 1, last);
      $('so-slider').value = String(state.step);
      drawSolution();
      if (state.step >= last) stopPlay();
    }, 80);
  });

  // ---------- Initial example: confined section between two fixed-head edges ----------
  createGrid();
  state.model.setEdge('left', App.DIRICHLET, 10);
  state.model.setEdge('right', App.DIRICHLET, 5);
  updateSelInfo();
})(window.App = window.App || {});
