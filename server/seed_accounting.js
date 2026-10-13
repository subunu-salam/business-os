// Seeds the Chart of Accounts and migrates existing data into the double-entry ledger (Postgres, async).
import db from './schema.js';
import { postJournal, CODES, idByCode, expenseCategoryToCode, loadAccountCache } from './accounting.js';

const ACCOUNTS = [
  ['1000', 'Petty Cash', 'asset', 'cash', 1],
  ['1001', 'Undeposited Funds', 'asset', 'cash', 1],
  ['1010', 'Business Bank Account', 'asset', 'bank', 1],
  ['1200', 'Accounts Receivable', 'asset', 'accounts_receivable', 1],
  ['1300', 'Inventory Asset', 'asset', 'stock', 0],
  ['1400', 'Prepaid Expenses', 'asset', 'current_asset', 0],
  ['1500', 'Furniture & Equipment', 'asset', 'fixed_asset', 0],
  ['1510', 'Input VAT (Recoverable)', 'asset', 'current_asset', 1],
  ['2000', 'Accounts Payable', 'liability', 'accounts_payable', 1],
  ['2100', 'VAT Payable (Output)', 'liability', 'tax', 1],
  ['2200', 'Employee Reimbursements', 'liability', 'current_liability', 0],
  ['3000', "Owner's Equity / Capital", 'equity', 'equity', 1],
  ['3100', "Owner's Drawings", 'equity', 'equity', 0],
  ['3200', 'Retained Earnings', 'equity', 'equity', 1],
  ['4000', 'Sales / Services Income', 'income', 'income', 1],
  ['4100', 'Other Income', 'income', 'other_income', 0],
  ['5000', 'Cost of Goods Sold', 'expense', 'cost_of_goods_sold', 1],
  ['5010', 'Labor', 'expense', 'cost_of_goods_sold', 0],
  ['5020', 'Materials', 'expense', 'cost_of_goods_sold', 0],
  ['5030', 'Subcontractor', 'expense', 'cost_of_goods_sold', 0],
  ['5040', 'Job Costing', 'expense', 'cost_of_goods_sold', 0],
  ['6000', 'Salaries & Wages', 'expense', 'expense', 0],
  ['6010', 'Rent Expense', 'expense', 'expense', 0],
  ['6020', 'Office & Admin Expense', 'expense', 'expense', 0],
  ['6030', 'License & Government Fees', 'expense', 'expense', 0],
  ['6040', 'Travel Expense', 'expense', 'expense', 0],
  ['6050', 'Meals & Entertainment', 'expense', 'expense', 0],
  ['6060', 'Software & Subscriptions', 'expense', 'expense', 0],
  ['6070', 'Marketing & Advertising', 'expense', 'expense', 0],
  ['6080', 'Repairs & Maintenance', 'expense', 'expense', 0],
  ['6090', 'Consultant Expense', 'expense', 'expense', 0],
  ['6100', 'Depreciation Expense', 'expense', 'expense', 0],
  ['6900', 'Other Expenses', 'expense', 'other_expense', 0],
  ['6910', 'Exchange Gain or Loss', 'expense', 'other_expense', 0],
  ['6920', 'Lodging', 'expense', 'other_expense', 0],
];

// All companies and people below are fictional demo data.
const CUSTOMERS = [
  ['customer', 'Harbor View Hotels', 'Harbor View Hotels LLC', 'procurement@harborview-demo.com', '+971 4 100 2001', 'Jumeirah Beach Road, Dubai'],
  ['customer', 'Atlas Logistics', 'Atlas Logistics FZE', 'it@atlas-demo.com', '+971 4 100 2002', 'Jebel Ali Free Zone, Dubai'],
  ['customer', 'Nova Retail Group', 'Nova Retail Group LLC', 'finance@novaretail-demo.com', '+971 4 100 2003', 'Al Barsha, Dubai'],
  ['customer', 'Bluewave Academy', 'Bluewave Academy', 'admin@bluewave-demo.com', '+971 6 100 2004', 'University City, Sharjah'],
  ['customer', 'Greenleaf Clinics', 'Greenleaf Medical Clinics', 'ops@greenleaf-demo.com', '+971 2 100 2005', 'Al Reem Island, Abu Dhabi'],
  ['vendor', 'Prime Office Wholesale', 'Prime Office Wholesale LLC', 'sales@primeoffice-demo.com', '+971 4 200 3001', 'Al Quoz, Dubai'],
  ['vendor', 'TechSource Distribution', 'TechSource Distribution FZCO', 'orders@techsource-demo.com', '+971 4 200 3002', 'Dubai Silicon Oasis'],
  ['vendor', 'Swift Couriers', 'Swift Couriers LLC', 'billing@swift-demo.com', '+971 4 200 3003', 'Al Qusais, Dubai'],
];
const ITEMS = [
  ['Office Supplies Bundle', 'goods', 'OFF-BUNDLE', 'Monthly stationery & consumables pack', 1200, 780, 5, CODES.SALES],
  ['Business Laptop 14"', 'goods', 'IT-LAP14', 'Core i7, 16GB RAM, 512GB SSD', 4200, 3400, 5, CODES.SALES],
  ['24" Monitor', 'goods', 'IT-MON24', 'Full-HD IPS monitor', 650, 480, 5, CODES.SALES],
  ['Workstation Setup', 'service', 'SRV-SETUP', 'On-site installation & configuration (per seat)', 150, 0, 5, CODES.SALES],
  ['Facility Supplies Program', 'service', 'SRV-FACILITY', 'Managed facility consumables (monthly)', 6500, 0, 5, CODES.SALES],
];
const CRM_ACCOUNTS = [
  ['Harbor View Hotels LLC', 'Hospitality', 'https://harborview.example.com', '+971 4 100 2001', 'Dubai', '200-500', 'Sara Khan'],
  ['Nova Retail Group LLC', 'Retail', 'https://novaretail.example.com', '+971 4 100 2003', 'Dubai', '500+', 'Alex Morgan'],
  ['Bluewave Academy', 'Education', 'https://bluewave.example.com', '+971 6 100 2004', 'Sharjah', '50-200', 'Alex Morgan'],
  ['Greenleaf Medical Clinics', 'Healthcare', 'https://greenleaf.example.com', '+971 2 100 2005', 'Abu Dhabi', '50-200', 'Sara Khan'],
  ['Lumen Coworking', 'Real Estate', 'https://lumen.example.com', '+971 4 100 2006', 'Dubai', '20-50', 'Daniel Reyes'],
];
const CRM_CONTACTS = [
  ['Omar', 'Haddad', 'Harbor View Hotels LLC', 'Procurement Manager', 'omar.h@harborview-demo.com', '+971 50 000 1001', 'Sara Khan', 'Website'],
  ['Emily', 'Carter', 'Nova Retail Group LLC', 'Head of Operations', 'emily.c@novaretail-demo.com', '+971 50 000 1002', 'Alex Morgan', 'LinkedIn'],
  ['Rahul', 'Mehta', 'Bluewave Academy', 'IT Director', 'rahul.m@bluewave-demo.com', '+971 50 000 1003', 'Alex Morgan', 'Cold Call'],
  ['Layla', 'Hassan', 'Greenleaf Medical Clinics', 'Clinic Administrator', 'layla.h@greenleaf-demo.com', '+971 50 000 1004', 'Sara Khan', 'Referral'],
  ['James', 'Wilson', 'Lumen Coworking', 'Facilities Lead', 'james.w@lumen-demo.com', '+971 50 000 1005', 'Daniel Reyes', 'Website'],
];
// [name, account, contact, amount, stage, probability, source, owner, closing_date]
const DEALS = [
  ['Harbor View — Annual Supply Contract', 'Harbor View Hotels LLC', 'Omar Haddad', 96000, 'Closed Won', 100, 'Website', 'Sara Khan', '2026-07-30'],
  ['Nova Retail — Store Rollout', 'Nova Retail Group LLC', 'Emily Carter', 140000, 'Negotiation', 75, 'LinkedIn', 'Alex Morgan', '2026-11-30'],
  ['Bluewave — 120 Workstations', 'Bluewave Academy', 'Rahul Mehta', 520000, 'Proposal', 60, 'Cold Call', 'Alex Morgan', '2026-12-15'],
  ['Greenleaf — Consumables Program', 'Greenleaf Medical Clinics', 'Layla Hassan', 42000, 'Needs Analysis', 40, 'Referral', 'Sara Khan', '2026-11-15'],
  ['Lumen — Coworking Supplies', 'Lumen Coworking', 'James Wilson', 28000, 'Qualification', 20, 'Website', 'Daniel Reyes', '2026-12-01'],
];
const TASKS = [
  ['Send revised quote to Greenleaf', 'Greenleaf — Consumables Program', 'Email', 'High', 'Sara Khan', '2026-10-16'],
  ['Deliver demo laptop to Bluewave', 'Bluewave — 120 Workstations', 'To-Do', 'High', 'Daniel Reyes', '2026-10-19'],
  ['Prepare Nova rollout plan', 'Nova Retail — Store Rollout', 'To-Do', 'Normal', 'Alex Morgan', '2026-10-22'],
  ['Schedule Lumen site visit', 'Lumen — Coworking Supplies', 'Call', 'Normal', 'Daniel Reyes', '2026-10-27'],
];
// [number, customer, issue, due, status, [[desc, qty, price]...], paid]
const INVOICES = [
  ['INV-2026-001', 'Harbor View Hotels', '2026-07-15', '2026-08-14', 'Paid', [['Facility Supplies Program — July', 3, 6500], ['Office Supplies Bundle', 2, 1200]], true],
  ['INV-2026-002', 'Atlas Logistics', '2026-08-08', '2026-09-07', 'Paid', [['Business Laptop 14"', 20, 4200], ['24" Monitor', 20, 650], ['Workstation Setup', 20, 150]], true],
  ['INV-2026-003', 'Harbor View Hotels', '2026-08-15', '2026-09-14', 'Paid', [['Facility Supplies Program — August', 3, 6500]], true],
  ['INV-2026-004', 'Nova Retail Group', '2026-09-10', '2026-10-10', 'Sent', [['Office Supplies Bundle', 20, 1200], ['24" Monitor', 20, 650]], false],
  ['INV-2026-005', 'Harbor View Hotels', '2026-09-15', '2026-10-15', 'Sent', [['Facility Supplies Program — September', 3, 6500]], false],
  ['INV-2026-006', 'Bluewave Academy', '2026-09-28', '2026-10-28', 'Partially Paid', [['Business Laptop 14"', 30, 4200], ['Workstation Setup', 30, 150]], 50000],
  ['INV-2026-007', 'Greenleaf Clinics', '2026-10-05', '2026-11-04', 'Sent', [['Office Supplies Bundle', 3, 1200]], false],
  ['INV-2026-008', 'Nova Retail Group', '2026-10-12', '2026-11-11', 'Draft', [['Business Laptop 14"', 4, 4200], ['Workstation Setup', 4, 150]], false],
];
// [number, vendor, date, due, status, [[desc, qty, price, accountCode]], paid]
const BILLS = [
  ['PO-BILL-101', 'TechSource Distribution', '2026-08-02', '2026-09-01', 'Paid', [['Laptops & monitors — Atlas order', 1, 77600, CODES.COGS]], true],
  ['PO-BILL-105', 'TechSource Distribution', '2026-09-20', '2026-10-20', 'Open', [['Laptops — Bluewave order', 1, 102000, CODES.COGS]], false],
  ['PO-BILL-102', 'Prime Office Wholesale', '2026-09-03', '2026-10-03', 'Paid', [['Stationery stock replenishment', 1, 9400, CODES.COGS]], true],
  ['PO-BILL-103', 'Swift Couriers', '2026-09-30', '2026-10-30', 'Open', [['Courier & delivery services — September', 1, 1850, CODES.TRAVEL]], false],
  ['PO-BILL-104', 'Prime Office Wholesale', '2026-10-06', '2026-11-05', 'Open', [['Stationery stock — Q4', 1, 7600, CODES.COGS]], false],
];
const PROJECTS = [
  ['Atlas Warehouse IT Refresh', 'Atlas Logistics', 'Based on Project Hours', 150, 60, 'Completed', 'Install & configure 20 workstations'],
  ['Bluewave Lab Pilot', 'Bluewave Academy', 'Based on Project Hours', 150, 40, 'Active', 'Pilot setup for one computer lab'],
];
const TIME = [
  ['Atlas Warehouse IT Refresh', 'Hardware installation', 'Daniel Reyes', '2026-08-09', 6, 1],
  ['Atlas Warehouse IT Refresh', 'Network configuration', 'Daniel Reyes', '2026-08-10', 4, 1],
  ['Bluewave Lab Pilot', 'Site survey', 'Daniel Reyes', '2026-10-07', 3, 1],
  ['Bluewave Lab Pilot', 'Internal planning', 'Alex Morgan', '2026-10-08', 2, 0],
];

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const addDays = (d, n) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
const count = async (t) => (await db.prepare(`SELECT COUNT(*) n FROM ${t}`).get()).n;

export async function seedAccounting(founderId) {
  if ((await count('accounts')) === 0) {
    const ins = db.prepare('INSERT INTO accounts (code, name, account_type, account_subtype, is_system) VALUES (?,?,?,?,?)');
    for (const a of ACCOUNTS) await ins.run(...a);
  }
  await loadAccountCache();

  // Shareholder capital → opening journal.
  const openingExists = (await db.prepare("SELECT COUNT(*) n FROM journals WHERE source_type='opening'").get()).n;
  if (!openingExists) {
    await postJournal(
      { journal_date: '2026-07-01', reference: 'CAP-001', notes: 'Shareholder capital contribution', source_type: 'opening' },
      [{ code: CODES.BANK, debit: 300000, credit: 0, description: 'Shareholder capital introduced' },
       { code: CODES.OWNER_EQUITY, debit: 0, credit: 300000, description: 'Shareholder capital introduced' }],
      { id: founderId });
  }

  // Migrate seeded expenses → journals.
  const expenses = await db.prepare('SELECT * FROM expenses').all();
  for (const e of expenses) {
    const done = (await db.prepare("SELECT COUNT(*) n FROM journals WHERE source_type='expense' AND source_id=?").get(e.id)).n;
    if (done) continue;
    const code = expenseCategoryToCode(e.category, e.other_details);
    await postJournal(
      { journal_date: e.expense_date, reference: e.other_details || e.category, notes: `Expense — ${e.category}`, source_type: 'expense', source_id: e.id },
      [{ code, debit: e.amount, credit: 0, description: e.other_details || e.category },
       { code: CODES.BANK, debit: 0, credit: e.amount, description: `Paid by ${e.person}` }],
      { id: e.created_by || founderId });
  }

  if ((await count('contacts')) === 0) {
    const ins = db.prepare('INSERT INTO contacts (contact_type, display_name, company_name, email, phone, billing_address, created_by) VALUES (?,?,?,?,?,?,?)');
    for (const c of CUSTOMERS) await ins.run(...c, founderId);
  }
  if ((await count('items')) === 0) {
    const ins = db.prepare('INSERT INTO items (name, item_type, sku, description, sell_price, cost_price, tax_percent, income_account_id, created_by) VALUES (?,?,?,?,?,?,?,?,?)');
    for (const it of ITEMS) await ins.run(it[0], it[1], it[2], it[3], it[4], it[5], it[6], idByCode(it[7]), founderId);
  }
  if ((await count('crm_accounts')) === 0) {
    const ins = db.prepare('INSERT INTO crm_accounts (name, industry, website, phone, billing_city, employees, owner, created_by) VALUES (?,?,?,?,?,?,?,?)');
    for (const a of CRM_ACCOUNTS) await ins.run(...a, founderId);
  }
  if ((await count('crm_contacts')) === 0) {
    const ins = db.prepare('INSERT INTO crm_contacts (first_name, last_name, account_name, title, email, phone, owner, lead_source, created_by) VALUES (?,?,?,?,?,?,?,?,?)');
    for (const c of CRM_CONTACTS) await ins.run(...c, founderId);
  }
  if ((await count('deals')) === 0) {
    const ins = db.prepare('INSERT INTO deals (name, account_name, contact_name, amount, stage, probability, lead_source, owner, closing_date, created_by) VALUES (?,?,?,?,?,?,?,?,?,?)');
    for (const d of DEALS) await ins.run(...d, founderId);
  }
  if ((await count('tasks')) === 0) {
    const ins = db.prepare('INSERT INTO tasks (subject, related_to, task_type, priority, status, owner, due_date, created_by) VALUES (?,?,?,?,?,?,?,?)');
    for (const t of TASKS) await ins.run(t[0], t[1], t[2], t[3], 'Open', t[4], t[5], founderId);
  }

  if ((await count('invoices')) === 0) {
    const cid = async (name) => (await db.prepare('SELECT id FROM contacts WHERE display_name = ?').get(name))?.id || null;
    let pn = 0;
    for (const [num, cust, issue, due, status, lines, paid] of INVOICES) {
      const contactId = await cid(cust);
      const subtotal = round2(lines.reduce((s, l) => s + l[1] * l[2], 0));
      const tax = round2(subtotal * 0.05), total = round2(subtotal + tax);
      const inv = await db.prepare(`INSERT INTO invoices (invoice_number, client_name, contact_id, issue_date, due_date, status, subtotal, tax_percent, tax, total, currency, amount_paid, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(num, cust, contactId, issue, due, status, subtotal, 5, tax, total, 'AED', paid === true ? total : (paid || 0), founderId);
      for (const l of lines) await db.prepare('INSERT INTO invoice_items (invoice_id, description, qty, unit_price, amount) VALUES (?,?,?,?,?)').run(inv.lastInsertRowid, l[0], l[1], l[2], round2(l[1] * l[2]));
      if (status !== 'Draft') {
        await postJournal({ journal_date: issue, reference: num, notes: `Invoice ${num}`, source_type: 'invoice', source_id: inv.lastInsertRowid },
          [{ code: CODES.AR, debit: total, credit: 0, description: cust, contact_id: contactId },
           { code: CODES.SALES, debit: 0, credit: subtotal, description: cust },
           { code: CODES.OUTPUT_VAT, debit: 0, credit: tax, description: 'Output VAT' }], { id: founderId });
      }
      if (paid) {
        const amt = paid === true ? total : paid;
        const payNo = `PAY-2026-${String(++pn).padStart(4, '0')}`;
        const pdate = addDays(issue, paid === true ? 20 : 10);
        const p = await db.prepare(`INSERT INTO payments (payment_number, payment_type, contact_id, party_name, payment_date, amount, mode, deposit_account_id, reference, document_type, document_id, created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(payNo, 'received', contactId, cust, pdate, amt, 'bank', idByCode(CODES.BANK), num, 'invoice', inv.lastInsertRowid, founderId);
        await postJournal({ journal_date: pdate, reference: payNo, notes: `Payment for ${num}`, source_type: 'payment', source_id: p.lastInsertRowid },
          [{ code: CODES.BANK, debit: amt, credit: 0, description: cust },
           { code: CODES.AR, debit: 0, credit: amt, description: cust, contact_id: contactId }], { id: founderId });
      }
    }
    let bn = 0;
    for (const [num, vend, date, due, status, lines, paid] of BILLS) {
      const contactId = await cid(vend);
      const subtotal = round2(lines.reduce((s, l) => s + l[1] * l[2], 0));
      const tax = round2(subtotal * 0.05), total = round2(subtotal + tax);
      const b = await db.prepare(`INSERT INTO bills (bill_number, contact_id, vendor_name, bill_date, due_date, status, subtotal, tax_percent, tax, total, amount_paid, created_by)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(num, contactId, vend, date, due, status, subtotal, 5, tax, total, paid ? total : 0, founderId);
      const jl = [];
      for (const l of lines) {
        await db.prepare('INSERT INTO bill_items (bill_id, account_id, description, qty, unit_price, amount) VALUES (?,?,?,?,?,?)').run(b.lastInsertRowid, idByCode(l[3]), l[0], l[1], l[2], round2(l[1] * l[2]));
        jl.push({ code: l[3], debit: round2(l[1] * l[2]), credit: 0, description: l[0] });
      }
      jl.push({ code: CODES.INPUT_VAT, debit: tax, credit: 0, description: 'Input VAT' });
      jl.push({ code: CODES.AP, debit: 0, credit: total, description: vend, contact_id: contactId });
      await postJournal({ journal_date: date, reference: num, notes: `Bill ${num}`, source_type: 'bill', source_id: b.lastInsertRowid }, jl, { id: founderId });
      if (paid) {
        const payNo = `PM-2026-${String(++bn).padStart(4, '0')}`;
        const pdate = addDays(date, 25);
        const p = await db.prepare(`INSERT INTO payments (payment_number, payment_type, contact_id, party_name, payment_date, amount, mode, deposit_account_id, reference, document_type, document_id, created_by)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).run(payNo, 'made', contactId, vend, pdate, total, 'bank', idByCode(CODES.BANK), num, 'bill', b.lastInsertRowid, founderId);
        await postJournal({ journal_date: pdate, reference: payNo, notes: `Payment for ${num}`, source_type: 'payment', source_id: p.lastInsertRowid },
          [{ code: CODES.AP, debit: total, credit: 0, description: vend, contact_id: contactId },
           { code: CODES.BANK, debit: 0, credit: total, description: vend }], { id: founderId });
      }
    }
  }
  if ((await count('projects')) === 0) {
    for (const pr of PROJECTS) {
      const c = await db.prepare('SELECT id FROM contacts WHERE display_name = ?').get(pr[1]);
      const r = await db.prepare('INSERT INTO projects (name, contact_id, customer_name, billing_method, rate, budget_hours, status, description, created_by) VALUES (?,?,?,?,?,?,?,?,?)')
        .run(pr[0], c?.id || null, pr[1], pr[2], pr[3], pr[4], pr[5], pr[6], founderId);
      for (const t of TIME.filter((t) => t[0] === pr[0])) {
        await db.prepare('INSERT INTO time_entries (project_id, project_name, task, user_name, entry_date, hours, billable, created_by) VALUES (?,?,?,?,?,?,?,?)')
          .run(r.lastInsertRowid, t[0], t[1], t[2], t[3], t[4], t[5], founderId);
      }
    }
  }

  console.log('Seeded accounting: chart of accounts, opening journal, expense journals, sample Books + CRM data.');
}
