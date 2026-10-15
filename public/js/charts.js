// Chart.js wrappers styled with the Aura palette (pink accent, cyan, gold, mint, violet).
const PALETTE_DARK = ['#FF5FA2', '#5CE1E6', '#FFD166', '#5CE1A6', '#A48BFF', '#FF6B6B', '#C9C2E6', '#FF9CC6'];
const PALETTE_LIGHT = ['#E8418A', '#14A8B0', '#E0A410', '#169B68', '#7B5CE0', '#E0475A', '#A39BC2', '#F07AB0'];
export function palette() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? PALETTE_DARK : PALETTE_LIGHT;
}
const css = (v, fb) => (getComputedStyle(document.documentElement).getPropertyValue(v) || fb).trim();
const hexA = (hex, a) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};

export function chartCard(title, canvasId) {
  return `<div class="card"><div class="card-head"><h3>${title}</h3></div>
    <div class="card-pad"><div class="chart-box"><canvas id="${canvasId}"></canvas></div></div></div>`;
}

/* Vertical gradient that fades into the card — the Aura "glow" area fill. */
function areaGradient(color) {
  return (ctx) => {
    const { chart } = ctx; const { chartArea, ctx: c } = chart;
    if (!chartArea) return hexA(color, .15);
    const g = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
    g.addColorStop(0, hexA(color, .38)); g.addColorStop(.6, hexA(color, .08)); g.addColorStop(1, hexA(color, 0));
    return g;
  };
}
function barGradient(color) {
  return (ctx) => {
    const { chart } = ctx; const { chartArea, ctx: c } = chart;
    if (!chartArea) return color;
    const g = c.createLinearGradient(0, chartArea.bottom, 0, chartArea.top);
    g.addColorStop(0, hexA(color, .35)); g.addColorStop(1, color);
    return g;
  };
}

/* Soft vertical guide line on hover. */
const crosshair = {
  id: 'auraCrosshair',
  afterDatasetsDraw(chart) {
    const act = chart.tooltip?.getActiveElements?.();
    if (!act || !act.length || chart.config.type !== 'line') return;
    const { ctx, chartArea } = chart; const x = act[0].element.x;
    ctx.save(); ctx.strokeStyle = css('--border-strong', 'rgba(201,194,230,.2)'); ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x, chartArea.top); ctx.lineTo(x, chartArea.bottom); ctx.stroke(); ctx.restore();
  },
};

const registry = {};
export function makeChart(canvasId, type, data, options = {}) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;
  if (registry[canvasId]) { registry[canvasId].destroy(); }

  const P = palette();
  const gridColor = css('--row-border', 'rgba(201,194,230,.07)');
  const tickColor = css('--faint', '#8E84B8');
  const ink = css('--ink', '#fff');
  const isPie = type === 'doughnut' || type === 'pie';

  data.datasets = data.datasets.map((ds, i) => {
    const c = P[i % P.length];
    if (isPie) return { borderWidth: 0, hoverOffset: 8, spacing: 3, borderRadius: 8, ...ds, backgroundColor: ds.backgroundColor || P };
    return {
      ...ds,
      backgroundColor: ds.backgroundColor || (type === 'line' ? areaGradient(c) : barGradient(c)),
      hoverBackgroundColor: ds.hoverBackgroundColor || (type === 'bar' ? c : undefined),
      borderColor: ds.borderColor || c,
      borderWidth: type === 'line' ? 2.5 : 0,
      borderRadius: type === 'bar' ? 10 : 0,
      borderSkipped: false,
      fill: ds.fill ?? (type === 'line'),
      tension: .42,
      pointRadius: type === 'line' ? 0 : 0,
      pointHoverRadius: type === 'line' ? 6 : 0,
      pointHoverBorderWidth: 3,
      pointHoverBorderColor: css('--card', '#1E1442'),
      pointBackgroundColor: c,
      maxBarThickness: 38,
    };
  });

  const font = { family: "'Sora', 'Outfit', sans-serif", size: 11 };
  const { plugins: _p, ...rest } = options;
  const base = { plugins: {
    legend: { display: isPie, position: 'bottom', labels: { color: tickColor, usePointStyle: true, pointStyle: 'rectRounded', boxWidth: 9, boxHeight: 9, padding: 14, font: { family: 'Outfit', size: 12 } } },
    tooltip: {
      backgroundColor: document.documentElement.getAttribute('data-theme') === 'dark' ? '#3B2E66' : '#1E1442',
      borderColor: 'rgba(255,255,255,.08)', borderWidth: 1, padding: 12, cornerRadius: 12, caretSize: 0, boxPadding: 4, usePointStyle: true,
      titleColor: 'rgba(255,255,255,.65)', bodyColor: '#fff',
      titleFont: { family: 'Outfit', size: 11, weight: '400' }, bodyFont: { family: "'Sora', sans-serif", size: 12, weight: '600' },
    },
  } };
  registry[canvasId] = new Chart(canvas, {
    type, data,
    plugins: [crosshair],
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: isPie ? undefined : { mode: 'index', intersect: false },
      animation: { duration: 900, easing: 'easeOutQuart' },
      cutout: type === 'doughnut' ? '72%' : undefined,
      scales: isPie ? {} : {
        x: { grid: { display: false }, border: { display: false }, ticks: { font, color: tickColor, maxRotation: 0, autoSkipPadding: 12 } },
        y: { beginAtZero: true, grid: { color: gridColor, drawTicks: false }, border: { display: false }, ticks: { font, color: tickColor, padding: 8, maxTicksLimit: 6, callback: (v) => compact(v) } },
      },
      color: ink,
      ...rest,
      plugins: { ...base.plugins, ...(options.plugins || {}), tooltip: { ...base.plugins.tooltip, ...((options.plugins || {}).tooltip || {}) }, legend: { ...base.plugins.legend, ...((options.plugins || {}).legend || {}) } },
    },
  });
  return registry[canvasId];
}

export function compact(v) {
  const n = Number(v); const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M';
  if (a >= 1e3) return (n / 1e3).toFixed(a >= 1e4 ? 0 : 1) + 'k';
  return String(n);
}
