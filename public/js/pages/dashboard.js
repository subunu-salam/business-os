import { get, icon, fmtAED, fmtDate, badge, escapeHtml } from '../api.js';
import { countUp } from '../ui.js';
import { makeChart, palette, compact } from '../charts.js';

/* Dashboard — same data (/api/dashboard) and same quick actions as before,
   presented as interactive panels: switchable trend chart, range filter,
   toggleable status donut, ranked spend bars and animated figures. */
export default async function dashboard(view, ctx) {
  const d = await get('/api/dashboard');
  const k = d.kpi;
  const P = palette();
  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });

  const net = k.netProfit ?? 0, income = k.credit || 0, spend = k.debit || 0;
  const margin = income ? (net / income) * 100 : 0;
  const recv = k.receivables ?? 0, pay = k.payables ?? 0;
  const cash = k.cashBank ?? 0;
  const cover = pay ? cash / pay : 0;
  const pct = (a, b) => (a + b ? (a / (a + b)) * 100 : 50);

  view.innerHTML = `
    <div class="dash-hero">
      <div>
        <div class="eyebrow"><i></i>${today}</div>
        <h1>${greet}, ${escapeHtml(ctx.user.full_name.split(' ')[0])}</h1>
        <div class="desc">Your Meridian Trading operations at a glance.</div>
      </div>
      <div class="actions">
        <button class="btn btn-outline" id="qMeet">${icon('calendar')} Schedule Meeting</button>
        <button class="btn btn-primary" id="qExp">${icon('plus')} Add Expense</button>
      </div>
    </div>

    <div class="stat-grid">
      <div class="stat feature">
        <div class="top"><span class="lbl">Net profit</span><span class="ic">${icon('trending')}</span></div>
        <div class="val">${money(net)}</div>
        <div class="meta"><span class="trend ${net >= 0 ? 'up' : 'down'}">${icon(net >= 0 ? 'arrowUp' : 'arrowDown')}${margin.toFixed(1)}%</span>net margin</div>
        <div class="split"><span style="width:${pct(income, spend)}%;background:#fff"></span><span style="width:${100 - pct(income, spend)}%;background:rgba(255,255,255,.45)"></span></div>
        <div class="legend"><span><i style="background:#fff"></i>Income <b>${compact(income)}</b></span><span><i style="background:rgba(255,255,255,.45)"></i>Expenses <b>${compact(spend)}</b></span></div>
      </div>
      <div class="stat">
        <div class="top"><span class="lbl">Cash &amp; bank</span><span class="ic">${icon('wallet')}</span></div>
        <div class="val">${money(cash)}</div>
        <div class="meta">Net worth ${fmtAED(k.netPosition || 0)}</div>
        <div class="split"><span style="width:${Math.min(100, cover * 50)}%;background:${P[1]}"></span></div>
        <div class="legend"><span>Covers payables</span><b>${pay ? cover.toFixed(1) + '×' : '—'}</b></div>
      </div>
      <div class="stat">
        <div class="top"><span class="lbl">Receivables</span><span class="ic">${icon('invoice')}</span></div>
        <div class="val">${money(recv)}</div>
        <div class="meta">Payables ${fmtAED(pay)}</div>
        <div class="split"><span style="width:${pct(recv, pay)}%;background:${P[2]}"></span><span style="width:${100 - pct(recv, pay)}%;background:${P[5]}"></span></div>
        <div class="legend"><span><i style="background:${P[2]}"></i>Owed to you</span><span><i style="background:${P[5]}"></i>You owe</span></div>
      </div>
      <div class="stat">
        <div class="top"><span class="lbl">Pipeline</span><span class="ic">${icon('target')}</span></div>
        <div class="val">${money(k.pipelineValue ?? 0)}</div>
        <div class="meta">${k.openDeals || 0} open deals</div>
        <svg class="spark" viewBox="0 0 300 64" preserveAspectRatio="none" id="pipeSpark"></svg>
      </div>
    </div>

    <div class="mini-grid">
      ${mini('meetings', 'calendar', 'Meetings this month', k.monthMeetings, `${k.totalMeetings} all time`, ratio(k.completed, k.totalMeetings), P[0])}
      ${mini('expenses', 'receipt', 'Expenses this month', fmtAED(k.monthExpenses), `${fmtAED(k.totalExpenses)} all time`, ratio(k.monthExpenses, k.totalExpenses), P[2])}
      ${mini('financials', 'ledger', 'VAT payable', fmtAED(k.vatPayable ?? 0), 'Output − input VAT', 1, P[1])}
      ${mini('leads', 'leads', 'Active leads', k.interestedLeads, `${k.leads} total · ${k.wonLeads} won`, ratio(k.interestedLeads, k.leads), P[4])}
    </div>

    <div class="dash-main">
      <div class="card">
        <div class="panel-head">
          <div>
            <h3>Monthly expenses</h3>
            <div class="big"><span id="rangeTotal">AED 0</span><small id="rangeNote"></small></div>
          </div>
          <div class="panel-tools">
            <div class="tabs sm" id="tMode"><button class="active" data-v="line">Trend</button><button data-v="bar">Bars</button><button data-v="cum">Cumulative</button></div>
            <div class="tabs sm" id="tRange"><button data-v="6">6M</button><button class="active" data-v="12">12M</button><button data-v="0">All</button></div>
          </div>
        </div>
        <div class="chart-lg"><canvas id="dMonth"></canvas></div>
      </div>
      <div class="card">
        <div class="panel-head"><div><h3>Meetings by status</h3><div class="hint">Tap a status to hide or show it</div></div><a href="#/meetings" style="font-size:13px;font-weight:500">Open</a></div>
        <div class="donut-wrap"><canvas id="dStatus"></canvas>
          <div class="donut-center"><b id="dcVal">0</b><span id="dcLbl">Total meetings</span></div></div>
        <div class="legend-list" id="dLegend"></div>
      </div>
    </div>

    <div class="dash-lower">
      <div class="card">
        <div class="panel-head"><div><h3>Where money goes</h3><div class="hint">All-time spend</div></div>
          <div class="tabs sm" id="tSplit"><button class="active" data-v="cat">Category</button><button data-v="person">People</button></div></div>
        <div class="bars" id="spendBars"></div>
      </div>
      <div class="card"><div class="card-head"><h3>Recent meetings</h3><a href="#/meetings">View all</a></div>
        <div id="recMeet"></div></div>
      <div class="card"><div class="card-head"><h3>Recent expenses</h3><a href="#/expenses">View all</a></div>
        <div id="recExp"></div></div>
    </div>`;

  view.querySelector('#qMeet').onclick = () => ctx.navigate('meetings');
  view.querySelector('#qExp').onclick = () => ctx.navigate('expenses');
  view.querySelectorAll('.stat .val .n').forEach((el) => countUp(el, 1100));
  view.querySelectorAll('.mini .val').forEach((el) => countUp(el, 1000));
  requestAnimationFrame(() => view.querySelectorAll('.mini .fg').forEach((c) => { c.style.strokeDashoffset = c.dataset.off; }));

  /* ---------- Lead funnel line (total → interested → won) under the pipeline figure */
  drawFunnelSpark(view.querySelector('#pipeSpark'), [k.leads || 0, k.interestedLeads || 0, k.wonLeads || 0], P[4]);

  /* ---------- Expense trend (interactive) ---------- */
  const em = d.charts.expenseByMonth;
  const state = { mode: 'line', range: 12 };
  function renderTrend() {
    const rows = state.range ? em.slice(-state.range) : em;
    const prev = state.range ? em.slice(-state.range * 2, -state.range) : [];
    let vals = rows.map((r) => r.total);
    if (state.mode === 'cum') { let s = 0; vals = vals.map((v) => (s += v)); }
    const total = rows.reduce((s, r) => s + r.total, 0);
    const prevTotal = prev.reduce((s, r) => s + r.total, 0);
    const tEl = view.querySelector('#rangeTotal');
    tEl.textContent = fmtAED(total); delete tEl.dataset.counted; countUp(tEl, 700);
    const note = view.querySelector('#rangeNote');
    if (state.range && prev.length === rows.length && prevTotal) {
      const ch = ((total - prevTotal) / prevTotal) * 100;
      note.innerHTML = `<span class="trend ${ch <= 0 ? 'up' : 'down'}">${icon(ch <= 0 ? 'arrowDown' : 'arrowUp')}${Math.abs(ch).toFixed(1)}%</span> vs previous ${rows.length} months`;
    } else note.textContent = `${rows.length} month${rows.length === 1 ? '' : 's'}`;
    makeChart('dMonth', state.mode === 'bar' ? 'bar' : 'line', {
      labels: rows.map((r) => new Date(r.ym + '-01').toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })),
      datasets: [{ label: state.mode === 'cum' ? 'Cumulative (AED)' : 'AED', data: vals }],
    }, { plugins: { legend: { display: false }, tooltip: tooltipOpts((v) => fmtAED(v)) } });
  }
  bindTabs(view.querySelector('#tMode'), (v) => { state.mode = v; renderTrend(); });
  bindTabs(view.querySelector('#tRange'), (v) => { state.range = +v; renderTrend(); });
  renderTrend();

  /* ---------- Meetings donut with toggleable legend ---------- */
  const ms = d.charts.meetingsByStatus;
  const totalMeet = ms.reduce((s, r) => s + r.n, 0);
  const dc = view.querySelector('#dcVal'), dl = view.querySelector('#dcLbl');
  const setCenter = (val, lbl) => { dc.textContent = val; dl.textContent = lbl; };
  const chart = makeChart('dStatus', 'doughnut', { labels: ms.map((r) => r.status), datasets: [{ data: ms.map((r) => r.n) }] }, {
    plugins: { legend: { display: false }, tooltip: { enabled: false } },
    onHover: (e, els) => {
      if (els.length) { const r = ms[els[0].index]; setCenter(r.n, r.status); }
      else resetCenter();
    },
  });
  function visibleTotal() { return ms.reduce((s, r, i) => s + (chart && !chart.getDataVisibility(i) ? 0 : r.n), 0); }
  function resetCenter() { setCenter(visibleTotal(), visibleTotal() === totalMeet ? 'Total meetings' : 'Shown meetings'); }
  resetCenter(); countUp(dc, 900);
  const legend = view.querySelector('#dLegend');
  legend.innerHTML = ms.length ? ms.map((r, i) => `<button data-i="${i}"><i style="background:${P[i % P.length]}"></i>${escapeHtml(r.status)}<b>${r.n}</b><em>${totalMeet ? Math.round((r.n / totalMeet) * 100) : 0}%</em></button>`).join('')
    : `<div class="muted" style="text-align:center;padding:10px">No meetings yet</div>`;
  legend.querySelectorAll('button').forEach((b) => {
    const i = +b.dataset.i;
    b.onclick = () => { chart?.toggleDataVisibility(i); chart?.update(); b.classList.toggle('off'); resetCenter(); };
    b.onmouseenter = () => { if (chart?.getDataVisibility(i)) { chart.setActiveElements([{ datasetIndex: 0, index: i }]); chart.update('none'); setCenter(ms[i].n, ms[i].status); } };
    b.onmouseleave = () => { chart?.setActiveElements([]); chart?.update('none'); resetCenter(); };
  });

  /* ---------- Spend bars ---------- */
  function renderBars(kind) {
    const src = kind === 'cat' ? d.charts.expenseByCategory.map((r) => ({ n: r.category, v: r.total }))
      : d.charts.expenseByPerson.map((r) => ({ n: r.person, v: r.total }));
    const top = src.slice(0, 6); const max = Math.max(1, ...top.map((r) => r.v));
    const sum = src.reduce((s, r) => s + r.v, 0);
    const el = view.querySelector('#spendBars');
    el.innerHTML = top.length ? top.map((r, i) => `
      <div class="bar-row" title="${escapeHtml(r.n)} — ${fmtAED(r.v)} (${sum ? ((r.v / sum) * 100).toFixed(1) : 0}%)">
        <span class="n">${escapeHtml(r.n || '—')}</span><span class="v">${compact(r.v)}</span>
        <div class="track"><span style="width:100%;background:linear-gradient(90deg,${P[i % P.length]}66,${P[i % P.length]})" data-s="${r.v / max}"></span></div>
      </div>`).join('') : `<div class="empty" style="padding:30px">${icon('inbox')}<p class="muted">No expenses yet</p></div>`;
    requestAnimationFrame(() => requestAnimationFrame(() =>
      el.querySelectorAll('.track span').forEach((s, i) => { s.style.transitionDelay = i * 60 + 'ms'; s.style.transform = `scaleX(${s.dataset.s})`; })));
  }
  bindTabs(view.querySelector('#tSplit'), renderBars);
  renderBars('cat');

  /* ---------- Recent lists ---------- */
  view.querySelector('#recMeet').innerHTML = listBlock(d.recentMeetings, (m) => `
    <div class="lrow"><div class="av" style="background:${tint(m.client_name)}">${initials(m.client_name)}</div>
      <div class="tx"><strong>${escapeHtml(m.client_name)}</strong>
        <span>${fmtDate(m.meeting_date)}${m.business_category ? ' · ' + escapeHtml(m.business_category) : ''}</span></div>
      ${badge(m.status)}</div>`, 'No meetings yet');
  view.querySelector('#recExp').innerHTML = listBlock(d.recentExpenses, (e) => `
    <div class="lrow"><div class="av" style="background:${tint(e.category)}">${icon('receipt')}</div>
      <div class="tx"><strong>${escapeHtml(e.other_details || e.category)}</strong>
        <span>${escapeHtml(e.person)} · ${fmtDate(e.expense_date)}</span></div>
      <span class="neg">${fmtAED(e.amount)}</span></div>`, 'No expenses yet');
}

/* ---------- helpers ---------- */
function money(n) {
  const s = fmtAED(n); return `<small>AED</small><span class="n">${s.replace('AED ', '')}</span>`;
}
function ratio(a, b) { a = Number(a || 0); b = Number(b || 0); return b > 0 ? Math.max(0, Math.min(1, a / b)) : 0; }
function mini(href, ic, label, value, sub, r, color) {
  const C = 2 * Math.PI * 20;
  return `<a class="mini" href="#/${href}">
    <div class="ring"><svg viewBox="0 0 46 46"><circle class="bgc" cx="23" cy="23" r="20"/>
      <circle class="fg" cx="23" cy="23" r="20" stroke="${color}" stroke-dasharray="${C}" stroke-dashoffset="${C}" data-off="${C * (1 - r)}"/></svg>
      <span class="gl">${icon(ic)}</span></div>
    <div style="min-width:0"><div class="lbl">${escapeHtml(label)}</div><div class="val">${value}</div><div class="sub">${escapeHtml(sub)}</div></div>
  </a>`;
}
function bindTabs(tabs, onChange) {
  tabs.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    if (b.classList.contains('active')) return;
    tabs.querySelectorAll('button').forEach((x) => x.classList.toggle('active', x === b));
    onChange(b.dataset.v);
  }));
}
function tooltipOpts(fmt) {
  return { callbacks: { label: (c) => ' ' + fmt(c.parsed.y) } };
}
function drawFunnelSpark(svg, steps, color) {
  if (!svg) return;
  const max = Math.max(1, ...steps); const w = 300, h = 64;
  const pts = steps.map((v, i) => [(i / (steps.length - 1)) * w, h - 8 - (v / max) * (h - 18)]);
  let dPath = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1], [x1, y1] = pts[i]; const cx = (x0 + x1) / 2;
    dPath += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
  }
  const id = 'sg' + Math.random().toString(36).slice(2, 7);
  svg.innerHTML = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <path d="${dPath} L${w},${h} L0,${h} Z" fill="url(#${id})"/>
    <path d="${dPath}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" pathLength="1" stroke-dasharray="1" stroke-dashoffset="1" style="transition:stroke-dashoffset 1.4s cubic-bezier(.25,1,.5,1) .2s"/>`;
  requestAnimationFrame(() => requestAnimationFrame(() => { svg.querySelectorAll('path')[1].style.strokeDashoffset = '0'; }));
  svg.insertAdjacentHTML('beforebegin', '');
  svg.setAttribute('aria-label', 'Lead funnel: total, interested, won');
}
const AV = ['#FF5FA2', '#5CE1E6', '#FFB547', '#5CE1A6', '#A48BFF', '#FF6B6B', '#7B6BC9'];
function tint(s) { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; const c = AV[h % AV.length]; return `linear-gradient(135deg, ${c}, ${c}aa)`; }
function initials(s) { return String(s || '?').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase(); }

function listBlock(items, tpl, empty) {
  if (!items.length) return `<div class="empty" style="padding:30px">${icon('inbox')}<p class="muted">${empty}</p></div>`;
  return `<div class="list-rows">${items.map(tpl).join('')}</div>`;
}
