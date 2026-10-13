// Seeds the database with demo logins and fictional sample data.
// Idempotent: only seeds when the users table is empty. Run `npm run reset` to wipe + reseed.
import bcrypt from 'bcryptjs';
import db, { initCoreSchema } from './db.js';
import { initExtSchema } from './schema.js';
import { seedAccounting } from './seed_accounting.js';

export async function initDb() { await initCoreSchema(); await initExtSchema(); }

const DEFAULT_PASSWORD = process.env.DEMO_PASSWORD || 'Demo@2026';

// All people, companies and figures below are fictional demo data.
const USERS = [
  { full_name: 'Alex Morgan',  email: 'admin@demo.com',      title: 'Managing Director',  role: 'admin',      is_super: 1 },
  { full_name: 'Sara Khan',    email: 'sara@demo.com',       title: 'Sales Director',     role: 'admin',      is_super: 0 },
  { full_name: 'Daniel Reyes', email: 'daniel@demo.com',     title: 'Operations Manager', role: 'admin',      is_super: 0 },
  { full_name: 'Priya Nair',   email: 'accounts@demo.com',   title: 'Finance & Accounts', role: 'accountant', is_super: 0 },
];

// [date, time, client, category, type, mode, confirmed_by, status, remarks]
const MEETINGS = [
  ['2026-07-08', '10:00', 'Harbor View Hotels', 'Hospitality', 'Sales/Demo', 'In-Person', 'Sara Khan', 'Completed', 'Reviewed annual supply contract for 3 properties. Requested a volume-based quote.'],
  ['2026-07-21', '14:30', 'Greenleaf Clinics', 'Healthcare', 'Sales/Demo', 'Online', 'Sara Khan', 'Completed', 'Interested in monthly consumables program. Sent catalogue.'],
  ['2026-08-05', '11:00', 'Atlas Logistics', 'Logistics', 'Follow-up', 'In-Person', 'Daniel Reyes', 'Completed', 'Agreed on delivery schedule for warehouse IT refresh.'],
  ['2026-08-27', '16:00', 'Bluewave Academy', 'Education', 'Sales/Demo', 'In-Person', 'Alex Morgan', 'Completed', 'Needs 120 student workstations before next term.'],
  ['2026-09-15', '09:30', 'Summit Fitness', 'Fitness', 'Sales/Demo', 'Online', 'Sara Khan', 'Completed', 'Exploring facility supplies for 4 branches.'],
  ['2026-10-06', '13:00', 'Nova Retail Group', 'Retail', 'Sales/Demo', 'In-Person', 'Alex Morgan', 'Completed', 'Pilot order for 2 stores approved; full rollout in Q1.'],
  ['2026-10-20', '10:30', 'Cedar Architects', 'Architecture', 'Sales/Demo', 'Online', 'Sara Khan', 'Pending', 'Intro call — office fit-out supplies.'],
  ['2026-10-23', '15:00', 'Harbor View Hotels', 'Hospitality', 'Follow-up', 'In-Person', 'Daniel Reyes', 'Pending', 'Quarterly review and renewal discussion.'],
];

// [date, person, category, other_details, amount, description, receipt_url, month]
const EXPENSES = [
  ['2026-07-01', 'Alex Morgan',  'Office Expense', 'Office Rent [Q3]', 12000.00, 'Quarterly rent — Business Bay office', null, 'Jul'],
  ['2026-07-03', 'Priya Nair',   'Office Expense', 'Accounting Software Subscription', 450.00, null, null, 'Jul'],
  ['2026-07-10', 'Sara Khan',    'Other Expense',  'Client lunch', 320.00, 'Harbor View Hotels meeting', null, 'Jul'],
  ['2026-07-31', 'Priya Nair',   'Office Expense', 'Salary Paid [July]', 24000.00, 'Team payroll', null, 'Jul'],
  ['2026-08-04', 'Daniel Reyes', 'Other Expense',  'Delivery van fuel', 640.00, null, null, 'Aug'],
  ['2026-08-12', 'Sara Khan',    'Other Expense',  'Marketing campaign — social ads', 2500.00, null, null, 'Aug'],
  ['2026-08-20', 'Alex Morgan',  'Office Expense', 'Trade License Renewal', 6200.00, null, null, 'Aug'],
  ['2026-08-31', 'Priya Nair',   'Office Expense', 'Salary Paid [August]', 24000.00, 'Team payroll', null, 'Aug'],
  ['2026-09-05', 'Daniel Reyes', 'Other Expense',  'Taxi & transport', 210.00, null, null, 'Sep'],
  ['2026-09-14', 'Sara Khan',    'Other Expense',  'Business cards & brochures', 780.00, null, null, 'Sep'],
  ['2026-09-30', 'Priya Nair',   'Office Expense', 'Salary Paid [September]', 24000.00, 'Team payroll', null, 'Sep'],
  ['2026-10-01', 'Alex Morgan',  'Office Expense', 'Office Rent [Q4]', 12000.00, 'Quarterly rent — Business Bay office', null, 'Oct'],
  ['2026-10-04', 'Daniel Reyes', 'Office Expense', 'Cloud hosting', 390.00, null, null, 'Oct'],
  ['2026-10-09', 'Sara Khan',    'Other Expense',  'Team dinner', 560.00, null, null, 'Oct'],
];

const LEDGER = [
  ['2026-07-01', 'credit', 'Investment', 'Shareholder capital contribution', 300000.00, 'Shareholders', 'bank transfer', 'CAP-001', null],
];

// [name, business_category, status, source, notes, next_action, next_action_date]
const LEADS = [
  ['Harbor View Hotels', 'Hospitality', 'Won', 'Website', 'Annual supply contract signed', null, null],
  ['Greenleaf Clinics', 'Healthcare', 'Interested', 'Referral', 'Monthly consumables program', 'Send revised quote', '2026-10-16'],
  ['Atlas Logistics', 'Logistics', 'Won', 'Trade Show', 'Warehouse IT refresh', null, null],
  ['Bluewave Academy', 'Education', 'Interested', 'Cold Call', '120 workstations', 'Demo unit delivery', '2026-10-19'],
  ['Summit Fitness', 'Fitness', 'Follow-up', 'Website', '4 branches', 'Call operations head', '2026-10-15'],
  ['Nova Retail Group', 'Retail', 'Interested', 'LinkedIn', 'Pilot approved for 2 stores', 'Prepare rollout plan', '2026-10-22'],
  ['Cedar Architects', 'Architecture', 'New', 'Website', null, 'Intro call', '2026-10-20'],
  ['Orchid Dental Care', 'Healthcare', 'Follow-up', 'Referral', null, 'Share catalogue', '2026-10-17'],
  ['Pinnacle Motors', 'Automotive', 'Lost', 'Cold Call', 'Chose incumbent supplier', null, null],
  ['Silverline Events', 'Events', 'New', 'Instagram', null, 'Qualify requirement', '2026-10-21'],
  ['Falcon Engineering', 'Engineering', 'Follow-up', 'Trade Show', null, 'Send proposal', '2026-10-24'],
  ['Lumen Coworking', 'Real Estate', 'Interested', 'Website', 'Supplies for 3 floors', 'Site visit', '2026-10-27'],
  ['Crescent Pharmacy', 'Pharmacy', 'Lost', 'Cold Call', 'Budget on hold', null, null],
  ['Vertex Software', 'Technology', 'New', 'LinkedIn', null, 'Discovery call', '2026-10-28'],
  ['Oasis Cafés', 'Food & Beverage', 'Follow-up', 'Referral', '6 outlets', 'Follow up next week', '2026-10-20'],
];

export async function seedAll() {
  const hash = bcrypt.hashSync(DEFAULT_PASSWORD, 10);
  const insUser = db.prepare('INSERT INTO users (full_name, email, title, role, is_super, password_hash) VALUES (?,?,?,?,?,?)');
  const idByName = {};
  for (const u of USERS) {
    const info = await insUser.run(u.full_name, u.email, u.title, u.role, u.is_super || 0, hash);
    idByName[u.full_name] = info.lastInsertRowid;
  }
  const founder = idByName['Alex Morgan'];
  const personToId = (p) => idByName[p] ?? founder;

  const insMeeting = db.prepare(`INSERT INTO meetings
    (meeting_date, meeting_time, client_name, business_category, meeting_type, meeting_mode, confirmed_by, status, remarks, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const m of MEETINGS) await insMeeting.run(...m, m[6] ? personToId(m[6]) : founder);

  const insExpense = db.prepare(`INSERT INTO expenses
    (expense_date, person, category, other_details, amount, description, receipt_url, month, created_by)
    VALUES (?,?,?,?,?,?,?,?,?)`);
  for (const e of EXPENSES) await insExpense.run(...e, personToId(e[1]));

  const insLedger = db.prepare(`INSERT INTO ledger_entries
    (entry_date, type, category, description, amount, party, method, reference, attachment_url, created_by)
    VALUES (?,?,?,?,?,?,?,?,?,?)`);
  for (const l of LEDGER) await insLedger.run(...l, founder);

  const insLead = db.prepare(`INSERT INTO leads
    (name, business_category, status, source, notes, next_action, next_action_date, created_by)
    VALUES (?,?,?,?,?,?,?,?)`);
  for (const ld of LEADS) await insLead.run(...ld, founder);

  console.log(`Seeded: ${USERS.length} users, ${MEETINGS.length} meetings, ${EXPENSES.length} expenses, ${LEDGER.length} ledger entries, ${LEADS.length} leads.`);
  await seedAccounting(founder);

  const insAct = db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, entity_type, entity_id, description, created_at) VALUES (?,?,?,?,?,?,?)`);
  const HISTORY = [
    ['create', 'account', null, 'Set up the chart of accounts', '2026-07-01 09:00:00'],
    ['create', 'ledger', null, 'Recorded shareholder capital AED 300,000 (opening journal)', '2026-07-01 09:05:00'],
    ['create', 'customer', null, 'Imported customer and vendor directory', '2026-07-01 09:10:00'],
    ['create', 'lead', null, 'Imported sales pipeline leads', '2026-07-01 09:15:00'],
  ];
  for (const hh of HISTORY) await insAct.run(founder, 'Alex Morgan', hh[0], hh[1], hh[2], hh[3], hh[4]);
}

export async function ensureSeed() {
  await initDb();
  const n = (await db.prepare('SELECT COUNT(*) n FROM users').get()).n;
  if (n === 0) {
    console.log('Empty database — seeding initial data...');
    await seedAll();
  } else {
    const founder = (await db.prepare("SELECT id FROM users WHERE lower(email)='admin@demo.com'").get())?.id
      || (await db.prepare('SELECT id FROM users ORDER BY id LIMIT 1').get())?.id;
    try { await seedAccounting(founder); } catch (e) { console.error('accounting backfill failed:', e.message); }
  }
}

// CLI: `node server/seed.js` seeds if empty; `--reset` wipes everything first.
const isMain = process.argv[1] && process.argv[1].endsWith('seed.js');
if (isMain) {
  (async () => {
    await initDb();
    if (process.argv.includes('--reset')) {
      for (const t of ['files', 'activity_logs', 'journal_lines', 'journals', 'accounts', 'invoice_items', 'invoices',
                       'estimate_items', 'estimates', 'bill_items', 'bills', 'payments',
                       'credit_note_items', 'credit_notes', 'sales_order_items', 'sales_orders',
                       'purchase_order_items', 'purchase_orders', 'vendor_credit_items', 'vendor_credits',
                       'recurring_invoice_items', 'recurring_invoices', 'delivery_challan_items', 'delivery_challans',
                       'documents', 'time_entries', 'projects', 'items', 'contacts', 'settings',
                       'crm_accounts', 'crm_contacts', 'deals', 'tasks',
                       'leads', 'ledger_entries', 'expenses', 'meetings', 'users']) {
        try { await db.prepare(`TRUNCATE ${t} RESTART IDENTITY CASCADE`).run(); } catch (e) { /* table may not exist */ }
      }
      console.log('Database wiped.');
      await seedAll();
    } else {
      await ensureSeed();
    }
    console.log('Done.');
    process.exit(0);
  })().catch((e) => { console.error(e); process.exit(1); });
}
