(function (App) {
  'use strict';

  const NEUMANN = 0;
  const DIRICHLET = 1;
  const EDGES = ['top', 'bottom', 'left', 'right'];

  // Cell (i, k): i is the x index (0 = left), k is the z index (0 = top).
  class Model {
    constructor(p) {
      this.Lx = p.Lx;
      this.Lz = p.Lz;
      this.nx = p.nx;
      this.nz = p.nz;
      this.dx = p.Lx / p.nx;
      this.dz = p.Lz / p.nz;
      const n = p.nx * p.nz;
      this.K = new Float64Array(n).fill(p.K);
      this.Ss = new Float64Array(n).fill(p.Ss);
      this.W = new Float64Array(n).fill(p.W);
      this.h0 = new Float64Array(n).fill(p.h0);
      // Boundary faces: top/bottom indexed by i, left/right indexed by k. Default is no-flow.
      this.bc = {};
      for (const e of EDGES) {
        const len = this.edgeLength(e);
        this.bc[e] = { type: new Uint8Array(len).fill(NEUMANN), value: new Float64Array(len) };
      }
    }

    edgeLength(edge) {
      return edge === 'top' || edge === 'bottom' ? this.nx : this.nz;
    }

    idx(i, k) {
      return k * this.nx + i;
    }

    setBC(edge, pos, type, value) {
      this.bc[edge].type[pos] = type;
      this.bc[edge].value[pos] = value;
    }

    setEdge(edge, type, value) {
      this.bc[edge].type.fill(type);
      this.bc[edge].value.fill(value);
    }

    cellBCs(i, k) {
      const out = [];
      const add = (edge, pos) => out.push({ edge, type: this.bc[edge].type[pos], value: this.bc[edge].value[pos] });
      if (k === 0) add('top', i);
      if (k === this.nz - 1) add('bottom', i);
      if (i === 0) add('left', k);
      if (i === this.nx - 1) add('right', k);
      return out;
    }

    clone() {
      const c = Object.create(Model.prototype);
      for (const key of Object.keys(this)) {
        const v = this[key];
        c[key] = ArrayBuffer.isView(v) ? v.slice() : v;
      }
      c.bc = {};
      for (const e of EDGES) {
        c.bc[e] = { type: this.bc[e].type.slice(), value: this.bc[e].value.slice() };
      }
      return c;
    }
  }

  App.Model = Model;
  App.NEUMANN = NEUMANN;
  App.DIRICHLET = DIRICHLET;
  App.EDGES = EDGES;
})(window.App = window.App || {});
