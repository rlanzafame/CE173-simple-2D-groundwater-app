(function (App) {
  'use strict';

  const D = App.DOCS;

  function heading(t) {
    return t.label + (t.symbol ? ` (${t.symbol})` : '') + (t.units ? ` [${t.units}]` : '');
  }

  // Columns: [header, factor from the stored SI unit]. 1 m/s = 86,400 m/d = 283,465 ft/d = 2.1204e6 gal/d/ft²; 1/m = 0.3048 /ft.
  const TABLE_UNITS = {
    K: [['m/s', 1], ['m/d', 86400], ['ft/d', 86400 / 0.3048], ['gal/d/ft<sup>2</sup>', 86400 * 24.5424]],
    Ss: [['1/m', 1], ['1/ft', 0.3048]],
  };

  function sci(v) {
    const e = Math.floor(Math.log10(v) + 1e-9);
    if (e >= -2 && e <= 4) return String(parseFloat(v.toPrecision(2))).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const m = parseFloat((v / Math.pow(10, e)).toPrecision(2));
    return (m === 1 ? '' : m + '&times;') + `10<sup>${e}</sup>`;
  }

  function tableHTML(key) {
    const tb = D.tables[key];
    const units = TABLE_UNITS[key];
    let html = `<h3>${tb.title}</h3><table class="doc-table"><thead><tr><th>Material</th>` +
      units.map((u) => `<th>${u[0]}</th>`).join('') + '</tr></thead><tbody>';
    for (const [name, lo, hi] of tb.rows) {
      html += `<tr><td>${name}</td>` + units.map(([, f]) =>
        `<td>${lo === null ? '&lt; ' + sci(hi * f) : sci(lo * f) + ' &ndash; ' + sci(hi * f)}</td>`).join('') + '</tr>';
    }
    return html + `</tbody></table><p class="note">${tb.source}</p>`;
  }

  // Documentation tab
  function renderDocs() {
    let html = '<h2>Overview</h2>' + D.overview.map((p) => `<p>${p}</p>`).join('');
    html += '<h2>Conventions</h2><ul>' + D.conventions.map((c) => `<li>${c}</li>`).join('') + '</ul>';
    html += '<h2>Numerical method</h2>' + D.numerics.map((s) => `<h3>${s.title}</h3>${s.html}`).join('');
    for (const g of D.groups) {
      html += `<h2>${g.title}</h2><dl>`;
      for (const key of g.keys) {
        const t = D.terms[key];
        html += `<dt>${heading(t)}</dt><dd>${t.text}</dd>`;
      }
      html += '</dl>';
      if (g.tables) html += g.tables.map(tableHTML).join('');
    }
    document.getElementById('docs-content').innerHTML = html;
  }

  // Hover/focus help bubbles for any element (or its label) carrying data-help="<term key>"
  const bubble = document.createElement('div');
  bubble.className = 'help-bubble';
  bubble.hidden = true;
  document.body.appendChild(bubble);
  let anchor = null;
  let timer = null;

  function helpTarget(el) {
    if (!(el instanceof Element)) return null;
    const lbl = el.closest('label');
    if (lbl && lbl.control && lbl.control.dataset.help) return { el: lbl, key: lbl.control.dataset.help };
    const h = el.closest('[data-help]');
    return h ? { el: h, key: h.dataset.help } : null;
  }

  function show(el, key) {
    const t = D.terms[key];
    if (!t) return;
    bubble.innerHTML = `<div class="help-title">${heading(t)}</div><div>${t.text}</div>`;
    bubble.hidden = false;
    const r = el.getBoundingClientRect();
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    let y = r.bottom + 6;
    if (y + bh > window.innerHeight - 4) y = Math.max(4, r.top - bh - 6);
    const x = Math.max(4, Math.min(r.left, window.innerWidth - bw - 8));
    bubble.style.left = x + 'px';
    bubble.style.top = y + 'px';
  }

  function hide() {
    clearTimeout(timer);
    anchor = null;
    bubble.hidden = true;
  }

  function onEnter(e, delay) {
    const h = helpTarget(e.target);
    if (!h) return hide();
    if (h.el === anchor) return;
    hide();
    anchor = h.el;
    timer = setTimeout(() => show(h.el, h.key), delay);
  }

  document.addEventListener('mouseover', (e) => onEnter(e, 350));
  document.addEventListener('focusin', (e) => onEnter(e, 0));
  document.addEventListener('focusout', hide);
  document.addEventListener('mousedown', hide);

  renderDocs();
  document.querySelectorAll('[data-help]').forEach((el) => {
    if (el.labels) el.labels.forEach((l) => l.classList.add('has-help'));
  });
})(window.App = window.App || {});
