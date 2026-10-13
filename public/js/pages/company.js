import { icon } from '../api.js';
import { pageHead } from '../ui.js';

// Demo company profile — all details below are fictional sample content.
const SERVICES = [
  ['layers', 'Wholesale Distribution', 'Office supplies, IT accessories and facility consumables for SMEs across the UAE.'],
  ['building', 'Corporate Procurement', 'Single-vendor sourcing for growing teams, with monthly consolidated billing.'],
  ['zap', 'Fast Fulfilment', 'Same-day dispatch within Dubai and next-day delivery across the Emirates.'],
  ['report', 'Inventory Programs', 'Managed stock levels and automatic re-ordering for recurring customers.'],
  ['cpu', 'IT Setup Services', 'Workstation installation, networking and on-site configuration.'],
  ['leads', 'Account Management', 'A dedicated account manager for every business customer.'],
];
const STATS = [['1,200+', 'Products'], ['180+', 'Business Clients'], ['24', 'Team Members'], ['7', 'Emirates Served'], ['98%', 'On-time Delivery']];

export default async function company(view) {
  view.innerHTML = pageHead({ title: 'Company', desc: 'Company profile (demo data).' }) + `
    <div class="hero mb16">
      <img src="/assets/logo.svg" alt="Meridian Trading">
      <div style="flex:1;min-width:220px">
        <h1>Meridian Trading LLC</h1>
        <div class="tag">Reliable supply for modern businesses</div>
        <p style="color:rgba(255,255,255,.7);margin:10px 0 0;max-width:640px">A fictional B2B trading and services company used to demonstrate the platform. All names, figures and contacts in this workspace are sample data.</p>
      </div>
    </div>

    <div class="stat-strip mb16">${STATS.map(([n, l]) => `<div class="card"><div class="card-pad"><div class="n">${n}</div><div class="l">${l}</div></div></div>`).join('')}</div>

    <h3 style="margin:8px 0 12px">What we do</h3>
    <div class="svc mb16">${SERVICES.map(([ic, t, d]) => `<div class="card"><div class="card-pad"><div class="ic">${icon(ic)}</div><strong>${t}</strong><p class="muted" style="margin:6px 0 0">${d}</p></div></div>`).join('')}</div>

    <div class="grid cols-2">
      <div class="card"><div class="card-head"><h3>About this demo</h3></div>
        <div class="card-pad"><p class="muted">This workspace showcases accounting (double-entry books, invoicing, purchases, banking, VAT reports), CRM (leads, deals, contacts, tasks), meetings, expenses and a full activity audit trail — all pre-loaded with realistic sample data.</p></div></div>
      <div class="card"><div class="card-head"><h3>Contact</h3></div>
        <div class="card-pad">
          <div class="detail-row"><span class="k">${icon('phone')} Phone</span><strong>+971 4 000 0000</strong></div>
          <div class="detail-row"><span class="k">${icon('mail')} Email</span><strong>hello@meridian-demo.com</strong></div>
          <div class="detail-row"><span class="k">${icon('pin')} Address</span><strong>Office 1204, Example Tower, Business Bay, Dubai</strong></div>
          <div class="detail-row"><span class="k">${icon('clock')} Hours</span><strong>Mon–Fri · 9:00–18:00 GST</strong></div>
        </div></div>
    </div>`;
}
