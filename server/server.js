'use strict';
/* Vokabel-Helden Sync-Dienst
 * Speichert den gemeinsamen Datenstand als eine JSON-Datei (mit Versionsnummer).
 * Das Zusammenführen der Stände macht die App; der Server prüft nur Passwort und Version
 * ("If-Match"), damit sich zwei Geräte nicht gegenseitig überschreiben.
 * Keine Abhängigkeiten, nur Node.js (ab Version 18).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = +process.env.PORT || 8080;
const DATA = process.env.DATA_DIR || '/data';
const TOKEN = process.env.TOKEN || '';
const ORIGINS = (process.env.ALLOW_ORIGIN || 'https://berghaferl.github.io').split(',').map(s => s.trim()).filter(Boolean);
const MAX_BODY = 8 * 1024 * 1024;
const KEEP_BACKUPS = 30;

if (TOKEN.length < 8) { console.error('TOKEN fehlt oder ist zu kurz (mindestens 8 Zeichen).'); process.exit(1); }
fs.mkdirSync(path.join(DATA, 'backup'), { recursive: true });
const FILE = path.join(DATA, 'data.json');

let state = { rev: 0, doc: null };
try { state = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') { console.error('data.json ist nicht lesbar – ich überschreibe nichts:', e.message); process.exit(1); } }

const tokenBuf = crypto.createHash('sha256').update(TOKEN).digest();
function authOk(req) {
  const h = String(req.headers.authorization || '');
  const given = crypto.createHash('sha256').update(h.replace(/^Bearer\s+/i, '')).digest();
  return crypto.timingSafeEqual(given, tokenBuf);
}

// Bremse gegen Passwort-Raten: 10 Fehlversuche pro 10 Minuten und Adresse
const fails = new Map();
function clientIp(req) { return String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim(); }
function blocked(ip) { const f = fails.get(ip); return !!f && f.n >= 10 && Date.now() - f.t < 600000; }
function noteFail(ip) { const f = fails.get(ip); if (!f || Date.now() - f.t > 600000) fails.set(ip, { n: 1, t: Date.now() }); else { f.n++; f.t = Date.now(); } }

function cors(req, res) {
  const o = req.headers.origin;
  if (o && (ORIGINS.includes('*') || ORIGINS.includes(o))) {
    res.setHeader('Access-Control-Allow-Origin', o);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}
function send(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => { size += c.length; if (size > MAX_BODY) { reject(Object.assign(new Error('zu groß'), { code: 413 })); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

// Tagessicherung: vor dem ersten Schreiben des Tages wird der alte Stand kopiert
function dailyBackup() {
  try {
    if (!fs.existsSync(FILE)) return;
    const day = new Date().toISOString().slice(0, 10);
    const target = path.join(DATA, 'backup', 'data-' + day + '.json');
    if (!fs.existsSync(target)) fs.copyFileSync(FILE, target);
    const all = fs.readdirSync(path.join(DATA, 'backup')).filter(f => /^data-\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort();
    all.slice(0, Math.max(0, all.length - KEEP_BACKUPS)).forEach(f => fs.unlinkSync(path.join(DATA, 'backup', f)));
  } catch (e) { console.error('Backup-Fehler:', e.message); }
}
function writeState(next) {
  dailyBackup();
  const tmp = FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(next));
  fs.renameSync(tmp, FILE);
  state = next;
}

const server = http.createServer(async (req, res) => {
  try {
    cors(req, res);
    const url = new URL(req.url, 'http://x');
    if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }
    if (url.pathname === '/api/health' && req.method === 'GET') return send(res, 200, { ok: true, rev: state.rev });
    if (url.pathname !== '/api/doc') return send(res, 404, { error: 'nicht gefunden' });

    const ip = clientIp(req);
    if (blocked(ip)) return send(res, 429, { error: 'zu viele Fehlversuche, bitte später erneut' });
    if (!authOk(req)) { noteFail(ip); return send(res, 401, { error: 'Passwort falsch' }); }

    if (req.method === 'GET') return send(res, 200, { rev: state.rev, doc: state.doc });

    if (req.method === 'PUT') {
      const rev = parseInt(req.headers['if-match'], 10);
      if (!Number.isInteger(rev)) return send(res, 428, { error: 'If-Match fehlt' });
      if (rev !== state.rev) return send(res, 409, { rev: state.rev, doc: state.doc });
      let doc;
      try { doc = JSON.parse(await readBody(req)); } catch (e) { return send(res, e.code === 413 ? 413 : 400, { error: 'ungültige Daten' }); }
      if (!doc || typeof doc !== 'object' || !Array.isArray(doc.pages)) return send(res, 400, { error: 'ungültiges Format' });
      writeState({ rev: state.rev + 1, doc, saved: new Date().toISOString() });
      return send(res, 200, { rev: state.rev });
    }
    return send(res, 405, { error: 'Methode nicht erlaubt' });
  } catch (e) {
    console.error(e);
    try { send(res, 500, { error: 'Serverfehler' }); } catch (_) {}
  }
});
server.listen(PORT, () => console.log(`Vokabel-Sync läuft auf Port ${PORT}, Daten in ${DATA}, erlaubte Herkunft: ${ORIGINS.join(', ')}`));
