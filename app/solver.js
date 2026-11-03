(function (App) {
  'use strict';

  // Cell-centred finite-volume discretisation (unit thickness), backward Euler in time.
  function assemble(m, dt) {
    const { nx, nz, dx, dz, K } = m;
    const n = nx * nz;
    const V = dx * dz;
    const cE = new Float64Array(n); // conductance to the cell at i+1
    const cS = new Float64Array(n); // conductance to the cell at k+1
    const cond = new Float64Array(n);
    const rhs = new Float64Array(n);
    const stor = new Float64Array(n);
    const hmean = (a, b) => (a > 0 && b > 0 ? (2 * a * b) / (a + b) : 0);

    for (let k = 0, p = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++, p++) {
        stor[p] = (m.Ss[p] * V) / dt;
        rhs[p] = m.W[p] * V;
        if (i < nx - 1) {
          const c = (hmean(K[p], K[p + 1]) * dz) / dx;
          cE[p] = c; cond[p] += c; cond[p + 1] += c;
        }
        if (k < nz - 1) {
          const c = (hmean(K[p], K[p + nx]) * dx) / dz;
          cS[p] = c; cond[p] += c; cond[p + nx] += c;
        }
      }
    }

    let nDirichlet = 0;
    const face = (p, len, dist, type, val) => {
      if (type === App.DIRICHLET) {
        const c = (K[p] * len) / dist;
        cond[p] += c;
        rhs[p] += c * val;
        nDirichlet++;
      } else {
        rhs[p] += val * len;
      }
    };
    for (let i = 0; i < nx; i++) {
      face(i, dx, dz / 2, m.bc.top.type[i], m.bc.top.value[i]);
      face((nz - 1) * nx + i, dx, dz / 2, m.bc.bottom.type[i], m.bc.bottom.value[i]);
    }
    for (let k = 0; k < nz; k++) {
      face(k * nx, dz, dx / 2, m.bc.left.type[k], m.bc.left.value[k]);
      face(k * nx + nx - 1, dz, dx / 2, m.bc.right.type[k], m.bc.right.value[k]);
    }

    const diag = new Float64Array(n);
    let hasStorage = false;
    for (let p = 0; p < n; p++) {
      diag[p] = stor[p] + cond[p];
      if (stor[p] > 0) hasStorage = true;
    }
    return { nx, nz, n, cE, cS, cond, diag, rhs, stor, nDirichlet, hasStorage };
  }

  function matvec(sys, x, y) {
    const { nx, nz, cE, cS, diag } = sys;
    for (let k = 0, p = 0; k < nz; k++) {
      for (let i = 0; i < nx; i++, p++) {
        let v = diag[p] * x[p];
        if (i < nx - 1) v -= cE[p] * x[p + 1];
        if (i > 0) v -= cE[p - 1] * x[p - 1];
        if (k < nz - 1) v -= cS[p] * x[p + nx];
        if (k > 0) v -= cS[p - nx] * x[p - nx];
        y[p] = v;
      }
    }
  }

  // Jacobi-preconditioned conjugate gradient; x is used as the initial guess and overwritten.
  function pcg(sys, b, x, w, tol, maxIt) {
    const { n, diag } = sys;
    const { r, z, p, Ap } = w;
    matvec(sys, x, Ap);
    let bnorm = 0;
    for (let j = 0; j < n; j++) {
      r[j] = b[j] - Ap[j];
      bnorm += b[j] * b[j];
    }
    bnorm = Math.sqrt(bnorm) || 1;
    let rz = 0;
    for (let j = 0; j < n; j++) {
      z[j] = r[j] / diag[j];
      p[j] = z[j];
      rz += r[j] * z[j];
    }
    for (let it = 0; it < maxIt; it++) {
      let rn = 0;
      for (let j = 0; j < n; j++) rn += r[j] * r[j];
      if (Math.sqrt(rn) / bnorm < tol) return it;
      matvec(sys, p, Ap);
      let pAp = 0;
      for (let j = 0; j < n; j++) pAp += p[j] * Ap[j];
      const alpha = rz / pAp;
      for (let j = 0; j < n; j++) {
        x[j] += alpha * p[j];
        r[j] -= alpha * Ap[j];
      }
      let rzNew = 0;
      for (let j = 0; j < n; j++) {
        z[j] = r[j] / diag[j];
        rzNew += r[j] * z[j];
      }
      const beta = rzNew / rz;
      rz = rzNew;
      for (let j = 0; j < n; j++) p[j] = z[j] + beta * p[j];
    }
    return maxIt;
  }

  // Forward Euler stability limit: min over cells of Ss*V / (sum of face conductances).
  App.explicitDtLimit = function (model) {
    const sys = assemble(model, 1);
    let lim = Infinity;
    for (let p = 0; p < sys.n; p++) {
      if (sys.cond[p] > 0) lim = Math.min(lim, sys.stor[p] / sys.cond[p]);
    }
    return lim;
  };

  App.solve = async function (model, opts) {
    const { tEnd, nSteps, onProgress } = opts;
    const explicit = opts.method === 'explicit';
    const tol = opts.tol || 1e-10;
    const m = model.clone();
    const dt = tEnd / nSteps;
    const sys = assemble(m, dt);
    if (explicit) {
      for (let p = 0; p < sys.n; p++) {
        if (!(m.Ss[p] > 0)) throw new Error('Explicit time stepping requires Ss > 0 in every cell.');
      }
    } else if (!sys.hasStorage && sys.nDirichlet === 0) {
      throw new Error('Problem is singular: with Ss = 0 everywhere at least one Dirichlet boundary is required.');
    }
    const n = sys.n;
    const work = { r: new Float64Array(n), z: new Float64Array(n), p: new Float64Array(n), Ap: new Float64Array(n) };
    const flowOp = { nx: sys.nx, nz: sys.nz, cE: sys.cE, cS: sys.cS, diag: sys.cond };
    const h = Float64Array.from(m.h0);
    const b = new Float64Array(n);
    const times = [0];
    const heads = [Float32Array.from(h)];
    const maxIt = Math.max(100, 5 * n);
    let maxIter = 0;
    let diverged = 0;
    let last = performance.now();

    for (let s = 1; s <= nSteps; s++) {
      if (explicit) {
        matvec(flowOp, h, work.Ap);
        let ok = true;
        for (let p = 0; p < n; p++) {
          h[p] += (sys.rhs[p] - work.Ap[p]) / sys.stor[p];
          if (!(Math.abs(h[p]) < 1e30)) ok = false;
        }
        if (!ok) {
          diverged = s;
          break;
        }
      } else {
        for (let p = 0; p < n; p++) b[p] = sys.stor[p] * h[p] + sys.rhs[p];
        maxIter = Math.max(maxIter, pcg(sys, b, h, work, tol, maxIt));
      }
      heads.push(Float32Array.from(h));
      times.push(s * dt);
      if (performance.now() - last > 50) {
        if (onProgress) onProgress(s / nSteps);
        await new Promise((res) => setTimeout(res, 0));
        last = performance.now();
      }
    }

    let min = Infinity;
    let max = -Infinity;
    for (const H of heads) {
      for (let p = 0; p < n; p++) {
        if (H[p] < min) min = H[p];
        if (H[p] > max) max = H[p];
      }
    }
    return { model: m, times, heads, dt, maxIter, range: [min, max], method: explicit ? 'explicit' : 'implicit', diverged };
  };
})(window.App = window.App || {});
