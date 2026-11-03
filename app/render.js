(function (App) {
  'use strict';

  const VIRIDIS = [
    [68, 1, 84], [72, 40, 120], [62, 74, 137], [49, 104, 142], [38, 130, 142],
    [31, 158, 137], [53, 183, 121], [109, 205, 89], [180, 222, 44], [253, 231, 37],
  ];

  function colormap(t) {
    if (!(t >= 0)) t = 0;
    if (t > 1) t = 1;
    const s = t * (VIRIDIS.length - 1);
    const i = Math.min(Math.floor(s), VIRIDIS.length - 2);
    const f = s - i;
    const a = VIRIDIS[i];
    const b = VIRIDIS[i + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
  }

  function fmt(v) {
    if (!Number.isFinite(v)) return String(v);
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) return v.toExponential(2);
    return String(parseFloat(v.toPrecision(4)));
  }

  function niceTicks(min, max, count) {
    const span = max - min;
    if (!(span > 0)) return [min];
    const raw = span / Math.max(1, count);
    const mag = Math.pow(10, Math.floor(Math.log10(raw)));
    const r = raw / mag;
    const step = (r < 1.5 ? 1 : r < 3 ? 2 : r < 7 ? 5 : 10) * mag;
    const start = Math.ceil(min / step - 1e-9);
    const out = [];
    for (let j = start; j * step <= max + step * 1e-9; j++) out.push(j === 0 ? 0 : j * step);
    return out;
  }

  function range(data) {
    let min = Infinity;
    let max = -Infinity;
    for (let p = 0; p < data.length; p++) {
      const v = data[p];
      if (v < min) min = v;
      if (v > max) max = v;
    }
    return [min, max];
  }

  function fitCanvas(canvas) {
    const r = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(r.width * dpr));
    const h = Math.max(1, Math.round(r.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, r.width, r.height);
    return { ctx, w: r.width, h: r.height };
  }

  function bcColor(type, value) {
    if (type === App.DIRICHLET) return '#d62728';
    return value === 0 ? '#b0b0b0' : '#1f77b4';
  }

  function outline(ctx, x, y, w, h, color) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.strokeRect(x, y, w, h);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, w, h);
  }

  class GridView {
    constructor(canvas) {
      this.canvas = canvas;
      this.margin = { left: 64, top: 46, right: 112, bottom: 20 };
      this.band = 8;
      this.equalAspect = true;
      this.layout = null;
      this.img = document.createElement('canvas');
    }

    computeLayout(m, w, h) {
      const M = this.margin;
      const aw = Math.max(10, w - M.left - M.right);
      const ah = Math.max(10, h - M.top - M.bottom);
      let pw = aw;
      let ph = ah;
      if (this.equalAspect) {
        const s = Math.min(aw / m.Lx, ah / m.Lz);
        pw = m.Lx * s;
        ph = m.Lz * s;
      }
      return { x0: M.left, y0: M.top, pw, ph };
    }

    // Returns the cell under the pointer; points within `tol` px outside the grid are clamped to it.
    cellAt(evt, m, tol) {
      const L = this.layout;
      if (!L) return null;
      const r = this.canvas.getBoundingClientRect();
      const px = evt.clientX - r.left - L.x0;
      const py = evt.clientY - r.top - L.y0;
      if (px < -tol || py < -tol || px > L.pw + tol || py > L.ph + tol) return null;
      const i = Math.min(m.nx - 1, Math.max(0, Math.floor((px / L.pw) * m.nx)));
      const k = Math.min(m.nz - 1, Math.max(0, Math.floor((py / L.ph) * m.nz)));
      return { i, k };
    }

    message(text) {
      const { ctx, w, h } = fitCanvas(this.canvas);
      this.layout = null;
      ctx.fillStyle = '#666';
      ctx.font = '15px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text, w / 2, h / 2);
    }

    draw(m, data, o) {
      const { ctx, w, h } = fitCanvas(this.canvas);
      const L = (this.layout = this.computeLayout(m, w, h));
      const { x0, y0, pw, ph } = L;
      const { nx, nz } = m;
      const { vmin, vmax } = o;
      const span = vmax - vmin;
      const b = this.band;

      // Heat map
      const img = this.img;
      img.width = nx;
      img.height = nz;
      const ictx = img.getContext('2d');
      const id = ictx.createImageData(nx, nz);
      for (let p = 0; p < nx * nz; p++) {
        const c = colormap(span > 0 ? (data[p] - vmin) / span : 0.5);
        id.data[4 * p] = c[0];
        id.data[4 * p + 1] = c[1];
        id.data[4 * p + 2] = c[2];
        id.data[4 * p + 3] = 255;
      }
      ictx.putImageData(id, 0, 0);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(img, x0, y0, pw, ph);

      const cw = pw / nx;
      const ch = ph / nz;
      if (cw >= 6 && ch >= 6) {
        ctx.strokeStyle = 'rgba(255,255,255,0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 1; i < nx; i++) { ctx.moveTo(x0 + i * cw, y0); ctx.lineTo(x0 + i * cw, y0 + ph); }
        for (let k = 1; k < nz; k++) { ctx.moveTo(x0, y0 + k * ch); ctx.lineTo(x0 + pw, y0 + k * ch); }
        ctx.stroke();
      }
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 1;
      ctx.strokeRect(x0, y0, pw, ph);

      // Boundary condition bands
      const bc = m.bc;
      for (let i = 0; i < nx; i++) {
        ctx.fillStyle = bcColor(bc.top.type[i], bc.top.value[i]);
        ctx.fillRect(x0 + i * cw, y0 - b - 1, cw + 0.5, b);
        ctx.fillStyle = bcColor(bc.bottom.type[i], bc.bottom.value[i]);
        ctx.fillRect(x0 + i * cw, y0 + ph + 1, cw + 0.5, b);
      }
      for (let k = 0; k < nz; k++) {
        ctx.fillStyle = bcColor(bc.left.type[k], bc.left.value[k]);
        ctx.fillRect(x0 - b - 1, y0 + k * ch, b, ch + 0.5);
        ctx.fillStyle = bcColor(bc.right.type[k], bc.right.value[k]);
        ctx.fillRect(x0 + pw + 1, y0 + k * ch, b, ch + 0.5);
      }

      const s = o.selection;
      if (s) outline(ctx, x0 + s.i0 * cw, y0 + s.k0 * ch, (s.i1 - s.i0 + 1) * cw, (s.k1 - s.k0 + 1) * ch, '#fff');
      const hl = o.highlight;
      if (hl) outline(ctx, x0 + hl.i * cw, y0 + hl.k * ch, cw, ch, '#ff3b8d');

      // Axes: x along the top, z downward on the left
      ctx.fillStyle = '#222';
      ctx.strokeStyle = '#222';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.beginPath();
      for (const t of niceTicks(0, m.Lx, Math.max(2, Math.floor(pw / 70)))) {
        const X = x0 + (t / m.Lx) * pw;
        ctx.moveTo(X, y0 - b - 1);
        ctx.lineTo(X, y0 - b - 5);
        ctx.fillText(fmt(t), X, y0 - b - 6);
      }
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      for (const t of niceTicks(0, m.Lz, Math.max(2, Math.floor(ph / 40)))) {
        const Y = y0 + (t / m.Lz) * ph;
        ctx.moveTo(x0 - b - 1, Y);
        ctx.lineTo(x0 - b - 5, Y);
        ctx.fillText(fmt(t), x0 - b - 7, Y);
      }
      ctx.stroke();
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText('x', x0 + pw / 2, 2);
      ctx.save();
      ctx.translate(12, y0 + ph / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('z (down)', 0, -8);
      ctx.restore();

      // Colour bar
      const cbx = x0 + pw + b + 16;
      const cbw = 14;
      const grad = ctx.createLinearGradient(0, y0 + ph, 0, y0);
      VIRIDIS.forEach((c, j) => grad.addColorStop(j / (VIRIDIS.length - 1), `rgb(${c[0]},${c[1]},${c[2]})`));
      ctx.fillStyle = grad;
      ctx.fillRect(cbx, y0, cbw, ph);
      ctx.strokeStyle = '#333';
      ctx.strokeRect(cbx, y0, cbw, ph);
      ctx.fillStyle = '#222';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      for (const t of niceTicks(vmin, vmax, 5)) {
        const Y = span > 0 ? y0 + ph - ((t - vmin) / span) * ph : y0 + ph / 2;
        ctx.fillRect(cbx + cbw, Y, 3, 1);
        ctx.fillText(fmt(t), cbx + cbw + 5, Y);
      }
      ctx.font = 'bold 12px sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(o.label || '', cbx, y0 - 6);
    }
  }

  function drawSeries(canvas, t, y, cur, ylabel) {
    const { ctx, w, h } = fitCanvas(canvas);
    if (!t || !t.length) return;
    const M = { l: 58, r: 12, t: 12, b: 34 };
    const pw = w - M.l - M.r;
    const ph = h - M.t - M.b;
    let [ymin, ymax] = range(y);
    if (ymax - ymin < 1e-9 * Math.max(1, Math.abs(ymax))) {
      ymin -= 0.5;
      ymax += 0.5;
    } else {
      const pad = 0.05 * (ymax - ymin);
      ymin -= pad;
      ymax += pad;
    }
    const tmax = t[t.length - 1] || 1;
    const X = (v) => M.l + (v / tmax) * pw;
    const Y = (v) => M.t + (1 - (v - ymin) / (ymax - ymin)) * ph;

    ctx.font = '11px sans-serif';
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e3e6ea';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.beginPath();
    for (const tv of niceTicks(0, tmax, Math.max(2, Math.floor(pw / 60)))) {
      ctx.moveTo(X(tv), M.t);
      ctx.lineTo(X(tv), M.t + ph);
      ctx.fillText(fmt(tv), X(tv), M.t + ph + 4);
    }
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (const yv of niceTicks(ymin, ymax, 4)) {
      ctx.moveTo(M.l, Y(yv));
      ctx.lineTo(M.l + pw, Y(yv));
      ctx.fillText(fmt(yv), M.l - 4, Y(yv));
    }
    ctx.stroke();
    ctx.strokeStyle = '#333';
    ctx.strokeRect(M.l, M.t, pw, ph);

    ctx.strokeStyle = '#1f77b4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let j = 0; j < t.length; j++) {
      if (j === 0) ctx.moveTo(X(t[j]), Y(y[j]));
      else ctx.lineTo(X(t[j]), Y(y[j]));
    }
    ctx.stroke();

    const cx = X(t[cur]);
    ctx.strokeStyle = '#ff3b8d';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(cx, M.t);
    ctx.lineTo(cx, M.t + ph);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ff3b8d';
    ctx.beginPath();
    ctx.arc(cx, Y(y[cur]), 4, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#222';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText('t', M.l + pw / 2, h - 2);
    ctx.save();
    ctx.translate(12, M.t + ph / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.textBaseline = 'middle';
    ctx.fillText(ylabel, 0, 0);
    ctx.restore();
  }

  function clearCanvas(canvas) {
    fitCanvas(canvas);
  }

  App.GridView = GridView;
  App.drawSeries = drawSeries;
  App.clearCanvas = clearCanvas;
  App.fmt = fmt;
  App.range = range;
})(window.App = window.App || {});
