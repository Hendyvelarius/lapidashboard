const CT = require('../models/controlTowerModel');
const { cache, CACHE_TTL } = require('../utils/cache');

// ============================================================================
// Processing Control Tower API
//
// Every read takes an optional `depts` query param (comma-separated, from
// PN1/PN2/PC/QC/QA/MC). The frontend derives it from the user's department;
// an empty scope means "everything" (NT / PL / HQ / HD / MS view).
// ============================================================================

const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const MAX_WINDOW_DAYS = 400;

function parseDepts(req) {
  const raw = String(req.query.depts || '').trim();
  if (!raw) return [];
  return raw.split(',').map((d) => d.trim().toUpperCase()).filter((d) => CT.SCOPED_DEPTS.includes(d));
}

/** [from, to) as Date objects from inclusive YYYY-MM-DD query params. */
function parseWindow(req) {
  const { from, to } = req.query;
  if (!isDate(from) || !isDate(to)) throw badRequest('from and to are required as YYYY-MM-DD');
  if (from > to) throw badRequest('from must not be after to');
  const f = new Date(`${from}T00:00:00`);
  const t = new Date(`${to}T00:00:00`);
  t.setDate(t.getDate() + 1);
  if ((t - f) / 86400000 > MAX_WINDOW_DAYS) throw badRequest(`window must be at most ${MAX_WINDOW_DAYS} days`);
  return { from: f, to: t, fromStr: from, toStr: to };
}

function badRequest(message) {
  const e = new Error(message);
  e.status = 400;
  return e;
}

function userFromBody(body) {
  const u = body?.user || {};
  return {
    nik: u.nik ? String(u.nik).trim() : '',
    name: u.name ? String(u.name).trim() : '',
    dept: u.dept ? String(u.dept).trim().toUpperCase() : '',
  };
}

async function cached(key, ttl, skip, fn) {
  if (!skip) {
    const hit = cache.get(key);
    if (hit !== null) return hit;
  }
  const data = await fn();
  cache.set(key, data, ttl);
  return data;
}

function fail(res, err, label) {
  if (err.status === 400) return res.status(400).json({ success: false, error: err.message });
  console.error(`Control Tower ${label} error:`, err);
  return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
}

// GET /controlTower/live?depts=&hours=8
// Completed steps in the last N hours (all severities) + steps running now.
async function getLive(req, res) {
  try {
    const depts = parseDepts(req);
    const hours = Math.min(48, Math.max(1, parseInt(req.query.hours, 10) || 8));
    const now = new Date();
    const from = new Date(now.getTime() - hours * 3600 * 1000);
    const to = new Date(now.getTime() + 3600 * 1000);
    const [completed, running] = await Promise.all([
      CT.getSteps({ from, to, depts }),
      CT.getRunningSteps({ depts }),
    ]);
    res.json({ data: { completed, running, hours, serverTime: now } });
  } catch (err) { fail(res, err, 'live'); }
}

// GET /controlTower/alerts?from&to&depts&severities=red,yellow
async function getAlerts(req, res) {
  try {
    const depts = parseDepts(req);
    const w = parseWindow(req);
    const severities = String(req.query.severities || 'red,yellow').split(',').map((s) => s.trim());
    const key = `ct:alerts:${w.fromStr}:${w.toStr}:${depts.join('|')}:${severities.join('|')}`;
    // SHORT cache: the log is reread on every filter change; acknowledgements
    // bypass it by refetching with refresh=true.
    const data = await cached(key, CACHE_TTL.SHORT, req.query.refresh === 'true',
      () => CT.getSteps({ from: w.from, to: w.to, depts, severities }));
    res.json({ data });
  } catch (err) { fail(res, err, 'alerts'); }
}

// GET /controlTower/stats?from&to&depts&granularity=day|week|month|year
async function getStats(req, res) {
  try {
    const depts = parseDepts(req);
    const w = parseWindow(req);
    const granularity = ['day', 'week', 'month', 'year'].includes(req.query.granularity) ? req.query.granularity : 'day';
    const key = `ct:stats:${granularity}:${w.fromStr}:${w.toStr}:${depts.join('|')}`;
    const data = await cached(key, CACHE_TTL.MEDIUM, req.query.refresh === 'true',
      () => CT.getStats({ from: w.from, to: w.to, depts, granularity }));
    res.json({ data, granularity });
  } catch (err) { fail(res, err, 'stats'); }
}

// GET /controlTower/todo?from&to&depts  -- steps with no standard set
async function getTodo(req, res) {
  try {
    const depts = parseDepts(req);
    const w = parseWindow(req);
    const key = `ct:todo:${w.fromStr}:${w.toStr}:${depts.join('|')}`;
    const data = await cached(key, CACHE_TTL.MEDIUM, req.query.refresh === 'true',
      () => CT.getNoStandard({ from: w.from, to: w.to, depts }));
    res.json({ data });
  } catch (err) { fail(res, err, 'todo'); }
}

// GET /controlTower/report?from&to&depts&severities=red,yellow,green
// Full detail rows + acknowledgement records for the workbook builder.
async function getReport(req, res) {
  try {
    const depts = parseDepts(req);
    const w = parseWindow(req);
    const severities = String(req.query.severities || 'red,yellow').split(',').map((s) => s.trim());
    const [rows, acks] = await Promise.all([
      CT.getSteps({ from: w.from, to: w.to, depts, severities }),
      CT.getAcknowledgements({ from: w.from, to: w.to, depts }),
    ]);
    res.json({ data: { rows, acks } });
  } catch (err) { fail(res, err, 'report'); }
}

// GET /controlTower/thresholds
async function getThresholds(req, res) {
  try {
    res.json({ data: await CT.getThresholds() });
  } catch (err) { fail(res, err, 'thresholds'); }
}

// PUT /controlTower/thresholds  { rows: [{dept, fast_ratio, slow_ratio}], user }
// Only NT may change the rules (the frontend hides the panel; this is the backstop).
async function saveThresholds(req, res) {
  try {
    const user = userFromBody(req.body);
    if (user.dept !== 'NT') return res.status(403).json({ success: false, error: 'Hanya NT yang dapat mengubah threshold' });
    const data = await CT.saveThresholds(req.body?.rows, user);
    // Severity depends on the thresholds -> everything computed is stale.
    cache.deleteByPrefix('ct:');
    res.json({ success: true, data });
  } catch (err) { fail(res, err, 'saveThresholds'); }
}

// POST /controlTower/ack  { items, status, note, user }
async function acknowledge(req, res) {
  try {
    const user = userFromBody(req.body);
    const data = await CT.acknowledge({ items: req.body?.items, status: req.body?.status, note: req.body?.note, user });
    invalidateAlerts();
    res.json({ success: true, data });
  } catch (err) { fail(res, err, 'ack'); }
}

// POST /controlTower/unack  { keys }
async function unacknowledge(req, res) {
  try {
    const data = await CT.unacknowledge({ keys: req.body?.keys });
    invalidateAlerts();
    res.json({ success: true, data });
  } catch (err) { fail(res, err, 'unack'); }
}

function invalidateAlerts() {
  cache.deleteByPrefix('ct:alerts:');
}

module.exports = {
  getLive,
  getAlerts,
  getStats,
  getTodo,
  getReport,
  getThresholds,
  saveThresholds,
  acknowledge,
  unacknowledge,
};
