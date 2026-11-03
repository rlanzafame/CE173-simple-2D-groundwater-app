// Single source of documentation text: used by the Documentation tab and the hover help bubbles.
(function (App) {
  'use strict';

  const fr = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
  const eq = (s, n) => `<div class="eqn"><span>${s}</span><span class="eqn-no">(${n})</span></div>`;
  const sum = (s) => `&Sigma;<sub>${s}</sub>`;
  const SsP = 'S<sub>s,P</sub>';

  // SVG helpers for the stencil diagrams
  const ts = (s) => `<tspan baseline-shift="sub" font-size="10">${s}</tspan>`;
  const rect = (x, y, w, h, fill, dash) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="#555"${dash ? ' stroke-dasharray="4 3"' : ''}/>`;
  const txt = (x, y, s, extra) => `<text x="${x}" y="${y}" text-anchor="middle"${extra ? ' ' + extra : ''}>${s}</text>`;
  const arrow = (x1, y1, x2, y2, id, color) =>
    `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="1.6" marker-start="url(#${id})" marker-end="url(#${id})"/>`;
  const marker = (id, color) =>
    `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">` +
    `<path d="M0,0 L10,5 L0,10 z" fill="${color}"/></marker></defs>`;

  function stencilSVG() {
    const W = 160, H = 120, x0 = 60, y0 = 30;
    const nb = '#e3edf9', pc = '#fde3b8', blue = '#1f5f9f';
    let s = `<svg class="diagram" viewBox="0 0 600 430" font-family="Segoe UI, sans-serif" font-size="13">` + marker('arrS', blue);
    for (const [c, r] of [[0, 0], [2, 0], [0, 2], [2, 2]]) {
      s += rect(x0 + c * W, y0 + r * H, W, H, '#f6f6f6', true);
      s += txt(x0 + c * W + W / 2, y0 + r * H + H / 2 + 4, 'diagonal: not used', 'fill="#999" font-size="12"');
    }
    const cell = (c, r, fill, title, vars, ty) => {
      const cx = x0 + c * W + W / 2, y = y0 + r * H;
      return rect(x0 + c * W, y, W, H, fill) + txt(cx, y + ty, title, 'font-weight="600"') + txt(cx, y + ty + 20, vars);
    };
    s += cell(0, 1, nb, 'L (i&#8722;1, k)', `h${ts('L')}, K${ts('L')}`, 42);
    s += cell(2, 1, nb, 'R (i+1, k)', `h${ts('R')}, K${ts('R')}`, 42);
    s += cell(1, 0, nb, 'T (i, k&#8722;1)', `h${ts('T')}, K${ts('T')}`, 42);
    s += cell(1, 2, nb, 'B (i, k+1)', `h${ts('B')}, K${ts('B')}`, 52);
    s += cell(1, 1, pc, 'P (i, k)', `h${ts('P')}, K${ts('P')}, S${ts('s,P')}, W${ts('P')}`, 42);
    // Face exchanges
    s += arrow(195, 245, 245, 245, 'arrS', blue) + `<text x="212" y="236" text-anchor="end" fill="${blue}">C${ts('L')}</text>`;
    s += arrow(355, 245, 405, 245, 'arrS', blue) + `<text x="388" y="236" fill="${blue}">C${ts('R')}</text>`;
    s += arrow(300, 128, 300, 172, 'arrS', blue) + `<text x="308" y="138" fill="${blue}">C${ts('T')}</text>`;
    s += arrow(300, 248, 300, 292, 'arrS', blue) + `<text x="308" y="292" fill="${blue}">C${ts('B')}</text>`;
    // Dimensions and axes
    s += `<line x1="220" y1="405" x2="380" y2="405" stroke="#555" marker-start="url(#arrS)" marker-end="url(#arrS)"/>` + txt(300, 424, '&#916;x');
    s += `<line x1="560" y1="150" x2="560" y2="270" stroke="#555" marker-start="url(#arrS)" marker-end="url(#arrS)"/>` + `<text x="568" y="214">&#916;z</text>`;
    s += `<line x1="14" y1="20" x2="48" y2="20" stroke="#333" marker-end="url(#arrS)"/><text x="30" y="14" text-anchor="middle">x</text>`;
    s += `<line x1="14" y1="20" x2="14" y2="54" stroke="#333" marker-end="url(#arrS)"/><text x="4" y="42" text-anchor="middle">z</text>`;
    return s + '</svg>';
  }

  function boundarySVG() {
    const red = '#c0392b', blue = '#1f5f9f';
    let s = `<svg class="diagram" viewBox="0 0 600 270" font-family="Segoe UI, sans-serif" font-size="13">` +
      marker('arrB', red) + marker('arrB2', blue);
    s += `<rect x="60" y="30" width="480" height="40" fill="#eee"/>` + txt(140, 55, 'outside (z &lt; 0)', 'fill="#888"');
    s += rect(60, 70, 160, 120, '#e3edf9') + rect(220, 70, 160, 120, '#fde3b8') + rect(380, 70, 160, 120, '#e3edf9');
    s += rect(220, 190, 160, 50, '#e3edf9', true);
    s += `<line x1="40" y1="70" x2="560" y2="70" stroke="#222" stroke-width="3"/>` + `<text x="532" y="88" text-anchor="end" font-weight="600">top edge, z = 0</text>`;
    s += txt(140, 135, 'L') + txt(460, 135, 'R') + txt(340, 222, 'B');
    s += txt(250, 105, 'P', 'font-weight="600"') + txt(250, 125, `h${ts('P')}, K${ts('P')}`);
    s += `<circle cx="300" cy="150" r="4" fill="#222"/><circle cx="300" cy="70" r="5" fill="${red}"/>`;
    s += arrow(300, 76, 300, 144, 'arrB', red);
    s += `<text x="310" y="55" fill="${red}">h${ts('b')} (Dirichlet) or q (Neumann)</text>`;
    s += `<line x1="340" y1="150" x2="340" y2="70" stroke="#555" stroke-dasharray="3 2"/>` + `<text x="345" y="128" fill="#555">&#916;z/2</text>`;
    s += arrow(195, 165, 245, 165, 'arrB2', blue) + arrow(355, 165, 405, 165, 'arrB2', blue) + arrow(300, 168, 300, 212, 'arrB2', blue);
    return s + '</svg>';
  }

  App.DOCS = {
    overview: [
      'This tool solves transient groundwater flow in a 2D vertical cross-section for hydraulic head h(x, z, t):',
      '<span class="eq">S<sub>s</sub> &part;h/&part;t = &part;/&part;x(K &part;h/&part;x) + &part;/&part;z(K &part;h/&part;z) + W</span>',
      '<b>Workflow:</b> (1) <b>Domain</b> &ndash; set the size, grid and default properties. ' +
        '(2) <b>Cells &amp; Boundaries</b> &ndash; edit cell properties, sources/sinks and boundary conditions. ' +
        '(3) <b>Solution</b> &ndash; run the solver and explore h over time. Hover over any input for help.',
    ],

    conventions: [
      'x runs from 0 (left) to L<sub>x</sub> (right); z runs from 0 at the <b>top</b> to L<sub>z</sub> at the bottom (down is +z).',
      'The domain is split into n<sub>x</sub> &times; n<sub>z</sub> rectangular cells; head is computed at cell centres (finite volume, unit thickness).',
      'Time integration is backward Euler (implicit, default) or forward Euler (explicit), selectable on the Solution tab. See <i>Numerical method</i> below.',
      'All edges default to no-flow (Neumann, q = 0).',
      'Use any consistent units, e.g. metres (L) and days (T).',
    ],

    numerics: [
      {
        title: '1. Overview',
        html: '<p>The PDE is discretised with the <b>method of lines</b>. In space, a <b>cell-centred finite-volume method</b> ' +
          '(equivalent to the block-centred five-point finite-difference scheme used in MODFLOW) turns the PDE into one ordinary ' +
          'differential equation per cell. In time, these are integrated with <b>backward Euler</b> (implicit, default) or ' +
          '<b>forward Euler</b> (explicit).</p>',
      },
      {
        title: '2. Spatial discretisation: finite-volume water balance',
        html: '<p>The domain is divided into n<sub>x</sub> &times; n<sub>z</sub> cells of size &Delta;x &times; &Delta;z and unit thickness. ' +
          'The unknown head h<sub>P</sub> is stored at the centre of each cell P = (i, k). Integrating the PDE over the cell volume ' +
          'V = &Delta;x&Delta;z and applying the divergence theorem gives the continuity (water-balance) equation for the cell:</p>' +
          eq(`${SsP} V ${fr('dh<sub>P</sub>', 'dt')} = ${sum('faces f')} Q<sub>f</sub> + W<sub>P</sub> V`, 1) +
          '<p>i.e. <i>rate of change of storage = net inflow through the four faces + internal source</i>. ' +
          'The flow through each face is approximated with Darcy&rsquo;s law using a two-point difference between cell centres. ' +
          'For the face shared with neighbour nb &isin; {L, R, T, B}:</p>' +
          eq('Q<sub>nb</sub> = C<sub>nb</sub> (h<sub>nb</sub> &minus; h<sub>P</sub>)', 2) +
          '<p>with face conductances (per unit thickness, units L<sup>2</sup>/T)</p>' +
          eq(`C<sub>L</sub> = K<sub>PL</sub> ${fr('&Delta;z', '&Delta;x')}, &nbsp; C<sub>R</sub> = K<sub>PR</sub> ${fr('&Delta;z', '&Delta;x')}, &nbsp; ` +
            `C<sub>T</sub> = K<sub>PT</sub> ${fr('&Delta;x', '&Delta;z')}, &nbsp; C<sub>B</sub> = K<sub>PB</sub> ${fr('&Delta;x', '&Delta;z')}`, 3) +
          '<p>The face conductivity is the <b>harmonic mean</b> of the two cells, which is exact for steady flow in series through the two half-cells:</p>' +
          eq(`K<sub>P,nb</sub> = ${fr('2 K<sub>P</sub> K<sub>nb</sub>', 'K<sub>P</sub> + K<sub>nb</sub>')}`, 4) +
          stencilSVG() +
          '<p class="caption">Five-point stencil for cell P. From each face neighbour the scheme uses only its <b>head h<sub>nb</sub></b> ' +
          '(at the old or new time level, see section 5) and its <b>conductivity K<sub>nb</sub></b> (through the harmonic mean). ' +
          'S<sub>s</sub> and W are taken from cell P only; diagonal cells are not used. Each arrow is a face flux Q = C(h<sub>nb</sub> &minus; h<sub>P</sub>).</p>' +
          '<p>The scheme is second-order accurate in space on a uniform grid with smooth K.</p>',
      },
      {
        title: '3. Boundary faces',
        html: '<p>Edge cells have one boundary face (two at corners). With A<sub>f</sub> the face length (&Delta;x on top/bottom, &Delta;z on left/right) ' +
          'and d the cell size normal to the face (&Delta;z or &Delta;x):</p>' +
          '<p><b>Dirichlet</b>: the head h<sub>b</sub> is imposed on the face, half a cell from the node:</p>' +
          eq(`Q<sub>b</sub> = C<sub>b</sub> (h<sub>b</sub> &minus; h<sub>P</sub>), &nbsp; C<sub>b</sub> = ${fr('K<sub>P</sub> A<sub>f</sub>', 'd / 2')}`, 5) +
          '<p><b>Neumann</b>: the inward flux q is imposed directly:</p>' +
          eq('Q<sub>b</sub> = q A<sub>f</sub>', 6) +
          boundarySVG() +
          '<p class="caption">Edge cell P on the top boundary. A Dirichlet face acts like an extra neighbour at distance &Delta;z/2 with fixed head h<sub>b</sub>; ' +
          'a Neumann face adds a known inflow. The other faces are treated as in the five-point stencil.</p>',
      },
      {
        title: '4. Semi-discrete system',
        html: '<p>Substituting (2)&ndash;(6) into (1) gives, for every cell P,</p>' +
          eq(`${SsP} V ${fr('dh<sub>P</sub>', 'dt')} = ${sum('nb')} C<sub>nb</sub> (h<sub>nb</sub> &minus; h<sub>P</sub>) + ${sum('b')} Q<sub>b</sub> + W<sub>P</sub> V`, 7) +
          '<p>or in matrix form <b>M</b> d<b>h</b>/dt = &minus;<b>A h</b> + <b>f</b>, with <b>M</b> = diag(S<sub>s</sub>V), ' +
          '<b>A</b> symmetric with five non-zeros per row (diagonal &Sigma;C<sub>nb</sub> + &Sigma;C<sub>b</sub>, off-diagonals &minus;C<sub>nb</sub>), ' +
          'and <b>f</b> collecting W V, C<sub>b</sub>h<sub>b</sub> and q A<sub>f</sub>.</p>',
      },
      {
        title: '5. Time integration',
        html: '<p>Time levels are t<sup>n</sup> = n&Delta;t with &Delta;t = t<sub>end</sub>/N. Superscripts denote the time level.</p>' +
          '<h4>Implicit: backward Euler (default)</h4>' +
          '<p>Face fluxes are evaluated at the <b>new</b> time level n+1:</p>' +
          eq(`(${fr(`${SsP} V`, '&Delta;t')} + ${sum('nb')} C<sub>nb</sub> + ${sum('b')} C<sub>b</sub>) h<sub>P</sub><sup>n+1</sup> &minus; ` +
            `${sum('nb')} C<sub>nb</sub> h<sub>nb</sub><sup>n+1</sup> = ${fr(`${SsP} V`, '&Delta;t')} h<sub>P</sub><sup>n</sup> + ` +
            `${sum('b')} C<sub>b</sub> h<sub>b</sub> + ${sum('b')} q A<sub>f</sub> + W<sub>P</sub> V`, 8) +
          '<p>Each cell&rsquo;s equation contains its neighbours&rsquo; <i>unknown</i> new heads, so the linear system ' +
          '(<b>M</b>/&Delta;t + <b>A</b>) <b>h</b><sup>n+1</sup> = (<b>M</b>/&Delta;t) <b>h</b><sup>n</sup> + <b>f</b> is solved every step. ' +
          'The matrix is symmetric positive definite and is solved with the <b>Jacobi-preconditioned conjugate gradient</b> method ' +
          '(relative residual &lt; 10<sup>&minus;10</sup>, starting from h<sup>n</sup>). Backward Euler is first-order accurate in time and ' +
          '<b>unconditionally stable</b>: any &Delta;t gives a bounded, non-oscillating solution. With S<sub>s</sub> = 0 it returns the steady state.</p>' +
          '<h4>Explicit: forward Euler</h4>' +
          '<p>Face fluxes are evaluated at the <b>old</b> time level n, so each new head follows directly from known values:</p>' +
          eq(`h<sub>P</sub><sup>n+1</sup> = h<sub>P</sub><sup>n</sup> + ${fr('&Delta;t', `${SsP} V`)} ` +
            `[ ${sum('nb')} C<sub>nb</sub> (h<sub>nb</sub><sup>n</sup> &minus; h<sub>P</sub><sup>n</sup>) + ${sum('b')} Q<sub>b</sub>(h<sub>P</sub><sup>n</sup>) + W<sub>P</sub> V ]`, 9) +
          '<p>No system solve is needed, but the scheme is first-order accurate and only <b>conditionally stable</b>. ' +
          'A sufficient condition for stability (which also prevents non-physical oscillations) is</p>' +
          eq(`&Delta;t &le; &Delta;t<sub>max</sub> = min<sub>P</sub> ${fr(`${SsP} V`, `${sum('nb')} C<sub>nb</sub> + ${sum('b')} C<sub>b</sub>`)}`, 10) +
          '<p>For uniform K and S<sub>s</sub> away from boundaries this is the classical limit</p>' +
          eq(`&Delta;t &le; ${fr('S<sub>s</sub>', `2K (1/&Delta;x<sup>2</sup> + 1/&Delta;z<sup>2</sup>)`)}`, 11) +
          '<p>Dirichlet faces (C<sub>b</sub> = 2K<sub>P</sub>A<sub>f</sub>/d) make the limit stricter at edge cells. ' +
          'The Solution tab reports &Delta;t<sub>max</sub>; for &Delta;t above it the explicit solution develops growing checkerboard oscillations. ' +
          'Explicit stepping requires S<sub>s</sub> &gt; 0 in every cell.</p>',
      },
    ],

    groups: [
      { title: 'Domain &amp; grid', keys: ['Lx', 'Lz', 'nx', 'nz', 'createGrid'] },
      { title: 'Material properties', keys: ['K', 'Ss'], tables: ['K', 'Ss'] },
      { title: 'Sources and initial conditions', keys: ['W', 'h0'] },
      { title: 'Boundary conditions', keys: ['bcDirichlet', 'bcNeumann', 'bcEdge', 'bcType', 'bcValue', 'applyBC', 'setEdge'] },
      { title: 'Cell editor', keys: ['selection', 'applyCell', 'field', 'aspect'] },
      { title: 'Model run and solution', keys: ['tEnd', 'nSteps', 'method', 'run', 'scale', 'slider', 'play', 'probe'] },
    ],

    // Typical ranges stored in SI only; other unit columns are converted when rendered. min = null means "less than max".
    tables: {
      K: {
        title: 'Typical hydraulic conductivity, K',
        source: 'Approximate ranges after Freeze &amp; Cherry (1979), <i>Groundwater</i>, Table 2.2. Natural values vary widely; use site data where available.',
        rows: [
          ['Gravel', 1e-3, 1],
          ['Clean sand', 1e-6, 1e-2],
          ['Silty sand', 1e-7, 1e-3],
          ['Silt, loess', 1e-9, 1e-5],
          ['Glacial till', 1e-12, 1e-6],
          ['Unweathered marine clay', 1e-12, 1e-9],
          ['Karst limestone', 1e-6, 1e-2],
          ['Permeable basalt', 1e-7, 1e-2],
          ['Fractured igneous &amp; metamorphic rock', 1e-8, 1e-4],
          ['Limestone &amp; dolomite', 1e-9, 1e-6],
          ['Sandstone', 1e-10, 1e-6],
          ['Shale', 1e-13, 1e-9],
          ['Unfractured igneous &amp; metamorphic rock', 1e-14, 1e-10],
        ],
      },
      Ss: {
        title: 'Typical specific storage, S<sub>s</sub>',
        source: 'After Domenico &amp; Mifflin (1965), as reproduced in Domenico &amp; Schwartz, <i>Physical and Chemical Hydrogeology</i>.',
        rows: [
          ['Plastic clay', 2.6e-3, 2.0e-2],
          ['Stiff clay', 1.3e-3, 2.6e-3],
          ['Medium-hard clay', 9.2e-4, 1.3e-3],
          ['Loose sand', 4.9e-4, 1.0e-3],
          ['Dense sand', 1.3e-4, 2.0e-4],
          ['Dense sandy gravel', 4.9e-5, 1.0e-4],
          ['Rock, fissured/jointed', 3.3e-6, 6.9e-5],
          ['Rock, sound', null, 3.3e-6],
        ],
      },
    },

    terms: {
      Lx: {
        label: 'Domain length', symbol: 'L<sub>x</sub>', units: 'L',
        text: 'Horizontal extent of the cross-section. x runs from 0 at the left edge to L<sub>x</sub> at the right edge.',
      },
      Lz: {
        label: 'Domain depth', symbol: 'L<sub>z</sub>', units: 'L',
        text: 'Vertical extent of the cross-section. z = 0 is the top edge and z increases downward to L<sub>z</sub>.',
      },
      nx: {
        label: 'Cells in x', symbol: 'n<sub>x</sub>',
        text: 'Number of grid columns (1&ndash;400). Cell width &Delta;x = L<sub>x</sub>/n<sub>x</sub>.',
      },
      nz: {
        label: 'Cells in z', symbol: 'n<sub>z</sub>',
        text: 'Number of grid rows (1&ndash;400). Cell height &Delta;z = L<sub>z</sub>/n<sub>z</sub>.',
      },
      createGrid: {
        label: 'Create grid',
        text: 'Builds a new regular grid filled with the default properties. Resets all cell properties, sources and boundary conditions.',
      },
      K: {
        label: 'Hydraulic conductivity', symbol: 'K', units: 'L/T',
        text: 'Ease with which water flows through the material; must be &gt; 0. Flow between neighbouring cells uses the harmonic mean of their K. ' +
          'See the Documentation tab for typical values.',
      },
      Ss: {
        label: 'Specific storage', symbol: 'S<sub>s</sub>', units: '1/L',
        text: 'Volume of water released from storage per unit aquifer volume per unit decline in head; must be &ge; 0. ' +
          'Hydraulic diffusivity is D = K/S<sub>s</sub>, so larger S<sub>s</sub> gives a slower response. ' +
          'S<sub>s</sub> = 0 everywhere gives the steady-state solution (needs at least one Dirichlet boundary). ' +
          'See the Documentation tab for typical values.',
      },
      W: {
        label: 'Source/sink', symbol: 'W', units: '1/T',
        text: 'Volume of water added per unit cell volume per unit time. Positive = source (injection, recharge); negative = sink (pumping). ' +
          'A cell injects W&middot;&Delta;x&middot;&Delta;z per unit thickness.',
      },
      h0: {
        label: 'Initial head', symbol: 'h<sub>0</sub>', units: 'L',
        text: 'Hydraulic head in each cell at t = 0.',
      },
      bcDirichlet: {
        label: 'Dirichlet boundary', symbol: 'h<sub>b</sub>', units: 'L',
        text: 'Prescribed head on the boundary face of an edge cell (e.g. a lake, river or fixed water table).',
      },
      bcNeumann: {
        label: 'Neumann boundary', symbol: 'q', units: 'L/T',
        text: 'Prescribed Darcy flux across the boundary face, positive <b>into</b> the domain. q = 0 is a no-flow boundary.',
      },
      bcEdge: {
        label: 'Edge',
        text: 'Domain edge the condition applies to: top (z = 0), bottom (z = L<sub>z</sub>), left (x = 0) or right (x = L<sub>x</sub>). Corner cells have two boundary faces.',
      },
      bcType: {
        label: 'Boundary type',
        text: 'Dirichlet fixes the head h<sub>b</sub>; Neumann fixes the inflow flux q.',
      },
      bcValue: {
        label: 'Boundary value',
        text: 'h<sub>b</sub> [L] for a Dirichlet condition, or q [L/T] (positive into the domain) for a Neumann condition.',
      },
      applyBC: {
        label: 'Apply to selected edge cells',
        text: 'Sets the condition on the faces of the selected cells that lie on the chosen edge. The selection must touch that edge.',
      },
      setEdge: {
        label: 'Set entire edge',
        text: 'Sets the condition on every face of the chosen edge, overriding any cell-level boundary conditions already set there.',
      },
      selection: {
        label: 'Selection',
        text: 'Drag on the grid to select a rectangle of cells. Starting the drag in the coloured boundary band grabs edge cells. ' +
          'Select all / Clear change the whole selection.',
      },
      applyCell: {
        label: 'Apply to selected cells',
        text: 'Writes each ticked property (K, S<sub>s</sub>, W, h<sub>0</sub>) into every selected cell.',
      },
      field: {
        label: 'Displayed field',
        text: 'Property shown on the editor map: K, log<sub>10</sub> K, S<sub>s</sub>, W or h<sub>0</sub>.',
      },
      aspect: {
        label: 'Equal aspect ratio',
        text: 'Draw x and z at the same scale. Untick to stretch the grid to fill the view (vertical exaggeration).',
      },
      tEnd: {
        label: 'End time', symbol: 't<sub>end</sub>', units: 'T',
        text: 'Simulated duration. A characteristic diffusion time is L<sup>2</sup>S<sub>s</sub>/K for a length scale L.',
      },
      nSteps: {
        label: 'Number of time steps', symbol: 'N',
        text: 'Time step &Delta;t = t<sub>end</sub>/N (1&ndash;5000). Implicit stepping is stable for any &Delta;t; explicit stepping needs &Delta;t &le; &Delta;t<sub>max</sub> (shown below the button).',
      },
      method: {
        label: 'Time integration',
        text: '<i>Implicit</i> (backward Euler): solves a linear system each step; stable for any &Delta;t. ' +
          '<i>Explicit</i> (forward Euler): updates each cell directly from old heads; cheap per step but only stable for ' +
          '&Delta;t &le; &Delta;t<sub>max</sub> = min S<sub>s</sub>V/&Sigma;C, and needs S<sub>s</sub> &gt; 0 everywhere.',
      },
      run: {
        label: 'Run solver',
        text: 'Computes h(x, z, t) at every time step. Editing the model afterwards clears the solution.',
      },
      scale: {
        label: 'Colour scale',
        text: '<i>Fixed</i> uses the min/max head over all times so maps are comparable; <i>Per time step</i> rescales to each snapshot.',
      },
      slider: {
        label: 'Time step slider',
        text: 'Selects which time step is shown in the head map and the probe.',
      },
      play: {
        label: 'Play / Pause',
        text: 'Animates through the time steps.',
      },
      probe: {
        label: 'Cell probe',
        text: 'Click a cell in the head map to show its head at the current time and its full head history h(t).',
      },
    },
  };
})(window.App = window.App || {});
