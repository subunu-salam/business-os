// Business OS — SPA bootstrap: auth gate, app shell, hash router.
import { api, get, post, icon, escapeHtml, toast } from './api.js';
import { countUp } from './ui.js';

import dashboard from './pages/dashboard.js';
import meetings from './pages/meetings.js';
import expenses from './pages/expenses.js';
import invoices from './pages/invoices.js';
import leads from './pages/leads.js';
import company from './pages/company.js';
import reports from './pages/reports.js';
import activity from './pages/activity.js';
import settings from './pages/settings.js';
// Zoho Books modules
import coa from './pages/accounts.js';
import customers from './pages/customers.js';
import vendors from './pages/vendors.js';
import items from './pages/items.js';
import estimates from './pages/estimates.js';
import salesorders from './pages/sales_orders.js';
import deliverychallans from './pages/delivery_challans.js';
import recurringinvoices from './pages/recurring_invoices.js';
import paymentsin from './pages/payments_received.js';
import paymentsout from './pages/payments_made.js';
import purchaseorders from './pages/purchase_orders.js';
import bills from './pages/bills.js';
import vendorcredits from './pages/vendor_credits.js';
import creditnotes from './pages/credit_notes.js';
import journals from './pages/journals.js';
import banking from './pages/banking.js';
import transactionlocking from './pages/transaction_locking.js';
import bulkupdate from './pages/bulk_update.js';
import financials from './pages/financials.js';
import documents from './pages/documents.js';
import projects from './pages/projects.js';
import timesheet from './pages/timesheet.js';
// Zoho CRM modules
import deals from './pages/deals.js';
import crmcontacts from './pages/crm_contacts.js';
import crmaccounts from './pages/crm_accounts.js';
import tasks from './pages/tasks.js';

const PAGES = {
  dashboard, leads, deals, crmcontacts, crmaccounts, meetings, tasks,
  customers, items, estimates, salesorders, deliverychallans, invoices, recurringinvoices, paymentsin, creditnotes,
  vendors, expenses, purchaseorders, bills, paymentsout, vendorcredits,
  projects, timesheet, banking, coa, journals, transactionlocking, bulkupdate, financials, reports, documents,
  company, activity, settings,
};

const NAV = [
  { group: 'Overview' },
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { group: 'CRM' },
  { key: 'leads', label: 'Leads', icon: 'leads' },
  { key: 'deals', label: 'Deals', icon: 'target' },
  { key: 'crmcontacts', label: 'Contacts', icon: 'users' },
  { key: 'crmaccounts', label: 'Accounts', icon: 'building' },
  { key: 'meetings', label: 'Meetings', icon: 'calendar' },
  { key: 'tasks', label: 'Tasks', icon: 'check2' },
  { group: 'Sales' },
  { key: 'customers', label: 'Customers', icon: 'users' },
  { key: 'items', label: 'Items', icon: 'layers' },
  { key: 'estimates', label: 'Estimates / Quotes', icon: 'file' },
  { key: 'salesorders', label: 'Sales Orders', icon: 'file' },
  { key: 'deliverychallans', label: 'Delivery Challans', icon: 'inbox' },
  { key: 'invoices', label: 'Invoices', icon: 'invoice' },
  { key: 'recurringinvoices', label: 'Recurring Invoices', icon: 'clock' },
  { key: 'paymentsin', label: 'Payments Received', icon: 'wallet' },
  { key: 'creditnotes', label: 'Credit Notes', icon: 'receipt' },
  { group: 'Purchases' },
  { key: 'vendors', label: 'Vendors', icon: 'users' },
  { key: 'expenses', label: 'Expenses', icon: 'receipt' },
  { key: 'purchaseorders', label: 'Purchase Orders', icon: 'file' },
  { key: 'bills', label: 'Bills', icon: 'invoice' },
  { key: 'paymentsout', label: 'Payments Made', icon: 'wallet' },
  { key: 'vendorcredits', label: 'Vendor Credits', icon: 'receipt' },
  { group: 'Time Tracking' },
  { key: 'projects', label: 'Projects', icon: 'layers' },
  { key: 'timesheet', label: 'Timesheet', icon: 'clock' },
  { group: 'Accounting' },
  { key: 'banking', label: 'Banking', icon: 'wallet' },
  { key: 'coa', label: 'Chart of Accounts', icon: 'ledger' },
  { key: 'journals', label: 'Manual Journals', icon: 'ledger' },
  { key: 'bulkupdate', label: 'Bulk Update', icon: 'layers', adminOnly: true },
  { key: 'transactionlocking', label: 'Transaction Locking', icon: 'lock', adminOnly: true },
  { group: 'Reports' },
  { key: 'financials', label: 'Financial Reports', icon: 'report' },
  { key: 'reports', label: 'Export Center', icon: 'download' },
  { group: 'Company' },
  { key: 'documents', label: 'Documents', icon: 'file' },
  { key: 'company', label: 'Company', icon: 'building' },
  { group: 'Admin' },
  { key: 'activity', label: 'Activity Logs', icon: 'activity', adminOnly: true },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

let currentUser = null;
const appEl = () => document.getElementById('app');

window.addEventListener('unauthorized', () => { currentUser = null; renderLogin(); });

/* ---------------- Theme ---------------- */
function initTheme() {
  let t; try { t = localStorage.getItem('bos-theme'); } catch {}
  if (!t) t = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
}
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('bos-theme', t); } catch {}
  document.querySelectorAll('[data-theme-set]').forEach((b) => b.classList.toggle('active', b.dataset.themeSet === t));
}
function currentTheme() { return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }
function roleLabel(u) {
  if (u.is_super) return `${u.title || 'Admin'} · Super Admin`;
  return u.title || u.role;
}
initTheme();

init();

async function init() {
  try {
    const { user } = await get('/api/auth/me');
    currentUser = user;
    renderShell();
    route();
  } catch {
    renderLogin();
  }
}

/* ---------------- Login ---------------- */
function renderLogin() {
  document.body.classList.remove('shell');
  appEl().innerHTML = `
    <div class="login-wrap">
      <div class="login-glow a"></div><div class="login-glow b"></div>
      <section class="login-art">
        <img src="/assets/mark.svg" alt="" style="width:44px;height:44px;border-radius:13px" />
        <div>
          <div class="eyebrow">Business OS</div>
          <h2>Your books, pipeline and team — <em>in one place.</em></h2>
          <p>Accounting, invoicing, CRM, expenses and reporting for Meridian Trading, in a single workspace.</p>
        </div>
        <div class="login-mini">
          <div><b>Sales → Cash</b><span>Quotes, invoices, payments</span></div>
          <div><b>CRM</b><span>Leads, deals, meetings</span></div>
          <div><b>Reports</b><span>P&amp;L, balance sheet, VAT</span></div>
        </div>
      </section>
      <section class="login-side">
      <div class="login-card">
        <img class="logo" src="/assets/logo.svg" alt="Business OS" />
        <h1>Welcome back</h1>
        <p class="sub">Sign in to your Business OS workspace</p>
        <form id="loginForm" style="margin-top:26px">
          <div class="field"><label>Work email</label>
            <input class="input" type="email" id="email" placeholder="you@company.com" value="admin@demo.com" autocomplete="email" required></div>
          <div class="field"><label>Password</label>
            <input class="input" type="password" id="password" placeholder="••••••••" autocomplete="current-password" required></div>
          <button class="btn btn-primary" style="width:100%;height:46px;margin-top:6px" type="submit" id="loginBtn">Sign in</button>
        </form>
        <p class="login-note">${icon('lock')}<span>Demo workspace — sign in with <strong>admin@demo.com</strong> / <strong>Demo@2026</strong></span></p>
      </div>
      </section>
    </div>`;
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('loginBtn');
    btn.disabled = true; btn.textContent = 'Signing in…';
    try {
      const { user } = await post('/api/auth/login', {
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
      });
      currentUser = user;
      toast(`Welcome back, ${user.full_name}`, 'ok');
      renderShell();
      location.hash = '#/dashboard';
      route();
    } catch (err) {
      toast(err.message, 'err');
      btn.disabled = false; btn.textContent = 'Sign in';
    }
  });
}

/* ---------------- Shell ---------------- */
function renderShell() {
  document.body.classList.add('shell');
  const initials = (currentUser.full_name || 'U').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  // Group NAV into collapsible sections (same items, same routes, same admin rules).
  const sections = [];
  NAV.forEach((n) => {
    if (n.group) { sections.push({ group: n.group, items: [] }); return; }
    if (n.adminOnly && currentUser.role !== 'admin') return;
    sections[sections.length - 1].items.push(n);
  });
  const closed = readClosedGroups();
  const navHtml = sections.filter((sec) => sec.items.length).map((sec) => `
    <div class="nav-sec${closed.includes(sec.group) ? ' closed' : ''}" data-sec="${sec.group}">
      <button class="nav-group" type="button" aria-expanded="${!closed.includes(sec.group)}">${sec.group}<span class="cnt">${sec.items.length}</span>${icon('chevronD', 'chev')}</button>
      <div class="nav-items"><div>${sec.items.map((n) =>
        `<a href="#/${n.key}" data-nav="${n.key}" data-label="${escapeHtml(n.label)}">${icon(n.icon)}<span>${n.label}</span></a>`).join('')}</div></div>
    </div>`).join('');

  appEl().innerHTML = `
    <div class="shell">
      <aside class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <img src="/assets/mark.svg" alt="" />
          <div><div class="t">Business OS</div><div class="s">Meridian Trading</div></div>
          <button class="sb-collapse" id="sbCollapse" title="Collapse sidebar" aria-label="Collapse sidebar">${icon('chevronL')}</button>
        </div>
        <div class="sb-search">${icon('search')}<input id="navFilter" placeholder="Jump to…" autocomplete="off" aria-label="Filter navigation"><kbd>⌘K</kbd></div>
        <nav class="nav" id="nav"><div class="nav-indicator" id="navInd"></div>${navHtml}<div class="nav-empty hidden" id="navEmpty">No matching pages</div></nav>
        <div class="sidebar-foot">
          <div class="sidebar-theme">
            <div class="theme-toggle" id="themeToggle">
              <button data-theme-set="light" title="Light">${icon('sun')}<span>Light</span></button>
              <button data-theme-set="dark" title="Dark">${icon('moon')}<span>Dark</span></button>
            </div>
          </div>
          <div class="sidebar-user">
            <div class="avatar">${initials}</div>
            <div style="flex:1;min-width:0"><div class="nm">${escapeHtml(currentUser.full_name)}</div>
              <div class="rl">${escapeHtml(roleLabel(currentUser))}</div></div>
            <button class="btn btn-ghost btn-icon" id="logoutBtn" title="Sign out">${icon('logout')}</button>
          </div>
        </div>
      </aside>
      <div class="main">
        <div class="topbar">
          <button class="btn btn-ghost btn-icon" id="menuBtn">${icon('menu')}</button>
          <img src="/assets/mark.svg" alt="" /><span class="t">Business OS</span>
        </div>
        <div class="crumbs" id="crumbs"></div>
        <div class="content" id="view"><div class="spinner"></div></div>
      </div>
    </div>`;
  initSidebar();

  document.getElementById('logoutBtn').onclick = async () => {
    try { await post('/api/auth/logout'); } catch {}
    currentUser = null; location.hash = ''; renderLogin();
  };
  const sidebar = document.getElementById('sidebar');
  const openMenu = () => { sidebar.classList.add('open'); addBackdrop(); };
  const closeMenu = () => { sidebar.classList.remove('open'); removeBackdrop(); };
  document.getElementById('menuBtn').onclick = openMenu;
  sidebar.addEventListener('click', (e) => { if (e.target.closest('[data-nav]')) closeMenu(); });
  window._closeMenu = closeMenu;

  document.querySelectorAll('#themeToggle [data-theme-set]').forEach((b) => {
    b.onclick = () => { applyTheme(b.dataset.themeSet); route(); };
  });
  applyTheme(currentTheme()); // sync active state
}
function addBackdrop() {
  if (document.querySelector('.backdrop')) return;
  const b = document.createElement('div'); b.className = 'backdrop';
  b.onclick = () => window._closeMenu?.(); document.querySelector('.main').appendChild(b);
}
function removeBackdrop() { document.querySelector('.backdrop')?.remove(); }

/* ---------------- Sidebar interactions ---------------- */
function readClosedGroups() { try { return JSON.parse(localStorage.getItem('bos-nav-closed') || '[]'); } catch { return []; } }
function saveClosedGroups(list) { try { localStorage.setItem('bos-nav-closed', JSON.stringify(list)); } catch {} }

function initSidebar() {
  const nav = document.getElementById('nav');
  const filter = document.getElementById('navFilter');
  let mini = false; try { mini = localStorage.getItem('bos-sb-mini') === '1'; } catch {}
  document.body.classList.toggle('sb-mini', mini);

  // Collapse / expand groups
  nav.querySelectorAll('.nav-group').forEach((btn) => btn.addEventListener('click', () => {
    const sec = btn.closest('.nav-sec');
    sec.classList.toggle('closed');
    btn.setAttribute('aria-expanded', String(!sec.classList.contains('closed')));
    saveClosedGroups([...nav.querySelectorAll('.nav-sec.closed')].map((x) => x.dataset.sec));
    trackIndicator(true);
  }));

  // Rail mode
  document.getElementById('sbCollapse').onclick = () => {
    const on = !document.body.classList.contains('sb-mini');
    document.body.classList.toggle('sb-mini', on);
    try { localStorage.setItem('bos-sb-mini', on ? '1' : '0'); } catch {}
    trackIndicator(true);
    setTimeout(() => window.dispatchEvent(new Event('resize')), 560); // let charts reflow
  };

  // Tooltips in rail mode
  const tip = document.createElement('div'); tip.className = 'sb-tip'; document.body.appendChild(tip);
  nav.addEventListener('mouseover', (e) => {
    const a = e.target.closest('a[data-nav]');
    if (!a || !document.body.classList.contains('sb-mini') || window.innerWidth <= 1024) return;
    const r = a.getBoundingClientRect();
    tip.textContent = a.dataset.label; tip.style.left = (r.right + 14) + 'px'; tip.style.top = (r.top + r.height / 2 - 14) + 'px';
    tip.classList.add('show');
  });
  nav.addEventListener('mouseout', (e) => { if (e.target.closest('a[data-nav]')) tip.classList.remove('show'); });

  // Quick filter
  filter.addEventListener('input', () => {
    const q = filter.value.trim().toLowerCase();
    let any = false;
    nav.querySelectorAll('.nav-sec').forEach((sec) => {
      let hits = 0;
      sec.querySelectorAll('a[data-nav]').forEach((a) => {
        const label = a.dataset.label; const i = label.toLowerCase().indexOf(q);
        const show = !q || i >= 0 || sec.dataset.sec.toLowerCase().includes(q);
        a.classList.toggle('hidden', !show); if (show) hits++;
        a.querySelector('span').innerHTML = q && i >= 0
          ? escapeHtml(label.slice(0, i)) + '<mark>' + escapeHtml(label.slice(i, i + q.length)) + '</mark>' + escapeHtml(label.slice(i + q.length))
          : escapeHtml(label);
      });
      sec.classList.toggle('hidden', hits === 0);
      sec.classList.toggle('searching', !!q);
      if (q) sec.classList.remove('closed');
      any = any || hits > 0;
    });
    if (!q) nav.querySelectorAll('.nav-sec').forEach((sec) => sec.classList.toggle('closed', readClosedGroups().includes(sec.dataset.sec)));
    document.getElementById('navEmpty').classList.toggle('hidden', any);
    nav.classList.toggle('no-indicator', !!q);
    trackIndicator(true);
  });
  filter.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const first = nav.querySelector('a[data-nav]:not(.hidden)'); if (first) { location.hash = first.getAttribute('href'); filter.value = ''; filter.dispatchEvent(new Event('input')); filter.blur(); } }
    if (e.key === 'Escape') { filter.value = ''; filter.dispatchEvent(new Event('input')); filter.blur(); }
  });
  if (!window._navKeys) {
    window._navKeys = true;
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        const f = document.getElementById('navFilter'); if (!f) return;
        e.preventDefault();
        if (document.body.classList.contains('sb-mini')) document.getElementById('sbCollapse')?.click();
        if (window.innerWidth <= 1024) document.getElementById('menuBtn')?.click();
        setTimeout(() => f.focus(), 60);
      }
    });
    window.addEventListener('resize', () => trackIndicator(false));
  }
}

// Gliding active-item indicator (follows group open/close animations).
function trackIndicator(follow) {
  const nav = document.getElementById('nav'); const ind = document.getElementById('navInd');
  if (!nav || !ind) return;
  const place = () => {
    const a = nav.querySelector('a.active');
    if (!a || a.offsetParent === null || a.closest('.nav-sec.closed') && !document.body.classList.contains('sb-mini')) { ind.style.opacity = '0'; return; }
    const top = a.getBoundingClientRect().top - nav.getBoundingClientRect().top + nav.scrollTop;
    ind.style.transform = `translateY(${top}px)`; ind.style.opacity = '1';
  };
  place();
  if (follow) { const t0 = performance.now(); const loop = (t) => { place(); if (t - t0 < 420) requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
}

function renderCrumbs(key) {
  const el = document.getElementById('crumbs'); if (!el) return;
  let group = '';
  for (const n of NAV) { if (n.group) group = n.group; else if (n.key === key) { el.innerHTML = `<span>${escapeHtml(group)}</span>${icon('chevronR')}<b>${escapeHtml(n.label)}</b><span class="sp"></span><span class="date">${new Date().toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}</span>`; return; } }
}

// Pill tabs get a gliding indicator; works for every page's .tabs without touching page code.
function enhanceTabs(root) {
  root.querySelectorAll('.tabs:not(.has-glider)').forEach((tabs) => {
    const g = document.createElement('span'); g.className = 'glider'; tabs.prepend(g); tabs.classList.add('has-glider');
    const move = () => { const a = tabs.querySelector('button.active'); if (!a) { g.style.width = '0'; return; } g.style.width = a.offsetWidth + 'px'; g.style.transform = `translateX(${a.offsetLeft}px)`; };
    move();
    new MutationObserver(move).observe(tabs, { subtree: true, attributes: true, attributeFilter: ['class'] });
  });
}

function enhanceView(view) {
  enhanceTabs(view);
  view.querySelectorAll('.kpi .val, .stat-strip .n, [data-count]').forEach((el) => countUp(el));
}
let viewObserver = null;

/* ---------------- Router ---------------- */
window.addEventListener('hashchange', route);
async function route() {
  if (!currentUser) return;
  let key = (location.hash.replace(/^#\//, '') || 'dashboard').split('/')[0];
  if (!PAGES[key]) key = 'dashboard';
  if (key === 'activity' && currentUser.role !== 'admin') key = 'dashboard';
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === key));
  const activeSec = document.querySelector(`[data-nav="${key}"]`)?.closest('.nav-sec');
  if (activeSec?.classList.contains('closed')) activeSec.classList.remove('closed');
  trackIndicator(true);
  renderCrumbs(key);
  const view = document.getElementById('view');
  if (!view) return;
  view.classList.remove('view-enter');
  view.innerHTML = '<div class="spinner"></div>';
  if (!viewObserver) {
    viewObserver = new MutationObserver(() => enhanceView(view));
    viewObserver.observe(view, { childList: true, subtree: true });
  }
  try {
    await PAGES[key](view, { user: currentUser, navigate: (k) => { location.hash = '#/' + k; } });
    void view.offsetWidth; view.classList.add('view-enter');
    enhanceView(view);
  } catch (err) {
    if (err.message !== 'Not authenticated') {
      view.innerHTML = `<div class="empty">${icon('x')}<p>Could not load this page.</p><p class="muted">${escapeHtml(err.message)}</p></div>`;
    }
  }
}
