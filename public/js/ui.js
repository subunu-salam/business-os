// Shared UI building blocks used across pages.
import { icon, escapeHtml, debounce } from './api.js';

export function pageHead({ title, desc, actions = '' }) {
  return `<div class="page-head">
    <div><h1>${escapeHtml(title)}</h1>${desc ? `<div class="desc">${escapeHtml(desc)}</div>` : ''}</div>
    <div class="actions">${actions}</div>
  </div>`;
}

export function kpiRow(cards) {
  return `<div class="kpi-row">` + cards.map((c) => `
    <div class="kpi ${c.tone || ''}">
      <div class="ic">${icon(c.icon || 'activity')}</div>
      <div class="lbl">${escapeHtml(c.label)}</div>
      <div class="val">${c.value}</div>
      ${c.sub ? `<div class="sub">${escapeHtml(c.sub)}</div>` : ''}
    </div>`).join('') + `</div>`;
}

export function emptyState(msg, iconName = 'inbox') {
  return `<div class="empty">${icon(iconName)}<p>${escapeHtml(msg)}</p></div>`;
}

/**
 * Reusable filterable + sortable table.
 * cfg: { mount, rows, columns:[{key,label,render(row),align,sort(row),th}], searchKeys, filters:[{key,label,options,match(row,val)}], toolbarExtra, empty }
 */
export function listView(cfg) {
  const state = { search: '', sortKey: null, sortDir: 1, filters: {} };
  (cfg.filters || []).forEach((f) => (state.filters[f.key] = 'All'));

  const filtersHtml = (cfg.filters || []).map((f) =>
    `<select data-filter="${f.key}">${f.options.map((o) => `<option value="${escapeHtml(o)}">${escapeHtml(o === 'All' ? f.label + ': All' : o)}</option>`).join('')}</select>`
  ).join('');

  cfg.mount.innerHTML = `
    <div class="toolbar">
      <div class="search">${icon('search')}<input placeholder="Search…" data-search></div>
      ${filtersHtml}
      ${cfg.toolbarExtra || ''}
    </div>
    <div class="table-wrap"><table class="data">
      <thead><tr>${cfg.columns.map((c, i) =>
        `<th data-col="${i}" class="${c.sort ? '' : 'nosort'} ${c.align === 'right' ? 'num' : ''}">${escapeHtml(c.label)}</th>`).join('')}</tr></thead>
      <tbody></tbody>
    </table><div data-emptyslot></div></div>`;

  const tbody = cfg.mount.querySelector('tbody');
  const emptySlot = cfg.mount.querySelector('[data-emptyslot]');

  function compute() {
    let rows = cfg.rows.slice();
    if (state.search) {
      const q = state.search.toLowerCase();
      rows = rows.filter((r) => (cfg.searchKeys || []).some((k) => String(r[k] ?? '').toLowerCase().includes(q)));
    }
    (cfg.filters || []).forEach((f) => {
      const val = state.filters[f.key];
      if (val && val !== 'All') rows = rows.filter((r) => f.match(r, val));
    });
    if (state.sortKey != null) {
      const col = cfg.columns[state.sortKey];
      rows.sort((a, b) => {
        const va = col.sort(a), vb = col.sort(b);
        if (va < vb) return -1 * state.sortDir;
        if (va > vb) return 1 * state.sortDir;
        return 0;
      });
    }
    return rows;
  }

  function render() {
    const rows = compute();
    if (!rows.length) {
      tbody.innerHTML = '';
      emptySlot.innerHTML = emptyState(cfg.empty || 'No records found.');
      return;
    }
    emptySlot.innerHTML = '';
    tbody.innerHTML = rows.map((r) => `<tr data-id="${r.id}">${cfg.columns.map((c) =>
      `<td class="${c.align === 'right' ? 'num' : ''}">${c.render(r)}</td>`).join('')}</tr>`).join('');
    if (cfg.onRowsRendered) cfg.onRowsRendered(tbody);
  }

  cfg.mount.querySelector('[data-search]').addEventListener('input', debounce((e) => { state.search = e.target.value; render(); }, 160));
  cfg.mount.querySelectorAll('[data-filter]').forEach((sel) =>
    sel.addEventListener('change', (e) => { state.filters[e.target.dataset.filter] = e.target.value; render(); }));
  cfg.mount.querySelectorAll('th[data-col]').forEach((th) => {
    const i = +th.dataset.col;
    if (!cfg.columns[i].sort) return;
    th.addEventListener('click', () => {
      if (state.sortKey === i) state.sortDir *= -1; else { state.sortKey = i; state.sortDir = 1; }
      render();
    });
  });
  render();
  return { refresh: render, getRows: () => cfg.rows };
}

export function rowActionButtons(isAdmin) {
  return `<div class="row-actions">
    <button class="btn btn-ghost btn-icon btn-sm" data-edit title="Edit">${icon('edit')}</button>
    ${isAdmin ? `<button class="btn btn-ghost btn-icon btn-sm" data-del title="Delete" style="color:var(--red)">${icon('trash')}</button>` : ''}
  </div>`;
}

// Count-up for KPI figures ("AED 12,345.00", "42", …) — formatting is preserved exactly.
export function countUp(el, dur = 900) {
  const final = el.textContent; const m = final.match(/-?[\d,]+(\.\d+)?/);
  if (!m || el.dataset.counted) return; el.dataset.counted = '1';
  const target = parseFloat(m[0].replace(/,/g, '')); if (!isFinite(target) || target === 0) return;
  const dec = m[1] ? m[1].length - 1 : 0; const pre = final.slice(0, m.index), post = final.slice(m.index + m[0].length);
  const t0 = performance.now(); const ease = (x) => 1 - Math.pow(1 - x, 4);
  const step = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    el.textContent = p >= 1 ? final : pre + (target * ease(p)).toLocaleString('en-AE', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + post;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
