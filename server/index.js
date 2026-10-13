// Business OS — Express app. Runs as a normal server locally (`npm start`)
// and as a Vercel serverless function (see /api/index.js + vercel.json).
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import './db.js';
import { registerAuthRoutes } from './auth.js';
import { registerRoutes } from './routes.js';
import { registerExtRoutes } from './routes_ext.js';
import { ensureSeed } from './seed.js';
import { loadAccountCache } from './accounting.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

// Schema + seed + account cache run once per instance (cold start); requests wait for it.
let ready = null;
export function init() {
  if (!ready) {
    ready = (async () => { await ensureSeed(); await loadAccountCache(); })()
      .catch((e) => { ready = null; throw e; });
  }
  return ready;
}

const app = express();
app.set('trust proxy', 1);
app.use(async (req, res, next) => {
  try { await init(); next(); }
  catch (e) { console.error('Startup failed:', e); res.status(503).json({ error: 'Service is starting, please retry shortly' }); }
});
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());
app.use(express.static(PUBLIC_DIR, { extensions: ['html', 'js'] }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
registerAuthRoutes(app);
registerRoutes(app);
registerExtRoutes(app);

// SPA fallback — only serve index.html for navigation requests, not missing assets/APIs
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || path.extname(req.path)) return next();
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

export default app;

// Local / traditional hosting: start a listener. On Vercel the platform invokes the app directly.
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  init()
    .then(() => app.listen(PORT, () => console.log(`\n  Business OS running → http://localhost:${PORT}\n`)))
    .catch((e) => { console.error('Startup failed:', e); process.exit(1); });
}
