/* ZineIt Phase-2 sync API — minimal, stateless, horizontally scalable scaffold.
 * The Phase-1 product (index.html) does NOT require this server; it adds
 * optional multi-device sync and server-side version history.
 *
 *   npm install && cp .env.example .env && node server.js
 */
'use strict';
const express = require('express');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const { Pool } = require('pg');

const PORT = process.env.PORT || 8080;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-only-change-me';
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const app = express();
app.use(express.json({ limit: '25mb' })); // docs are JSON; photos go direct to S3

/* ---------- shared validation: mirrors the client's validateProject ---------- */
const FORMATS = new Set(['mini-zine','quarter','half-letter','a5','book-8x8','book-8x10','book-10x8','book-a4']);
function validateDoc(p){
  if (!p || p.app !== 'ZineIt' || !Array.isArray(p.pages) || p.pages.length < 2) return 'not a ZineIt project';
  if (!FORMATS.has(p.format)) return 'unknown format';
  for (const pg of p.pages){
    if (!Array.isArray(pg.elements)) return 'corrupt page data';
    for (const e of pg.elements){
      if (!['image','text'].includes(e.type)) return 'corrupt element';
      if (![e.x,e.y,e.w,e.h].every(Number.isFinite)) return 'corrupt geometry';
    }
  }
  return null;
}

/* ---------- auth ---------- */
function sign(user){ return jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: '12h' }); }
function auth(req, res, next){
  const t = (req.headers.authorization || '').replace(/^Bearer /, '');
  try { req.userId = jwt.verify(t, JWT_SECRET).sub; next(); }
  catch { res.status(401).json({ error: 'unauthorized' }); }
}

app.post('/v1/auth/signup', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password || password.length < 8) return res.status(400).json({ error: 'email + 8-char password required' });
  const hash = await argon2.hash(password);
  try {
    const { rows } = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1,$2) RETURNING id', [email, hash]);
    res.status(201).json({ token: sign(rows[0]) });
  } catch { res.status(409).json({ error: 'email already registered' }); }
});

app.post('/v1/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  const { rows } = await pool.query('SELECT id, password_hash FROM users WHERE email=$1', [email]);
  if (!rows[0] || !(await argon2.verify(rows[0].password_hash, password || '')))
    return res.status(401).json({ error: 'invalid credentials' });
  res.json({ token: sign(rows[0]) });
});

/* ---------- projects ---------- */
app.get('/v1/projects', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT id, name, format, updated_at FROM projects WHERE user_id=$1 ORDER BY updated_at DESC', [req.userId]);
  res.json(rows);
});

app.post('/v1/projects', auth, async (req, res) => {
  const doc = req.body;
  const err = validateDoc(doc);
  if (err) return res.status(422).json({ error: err });
  const { rows } = await pool.query(
    'INSERT INTO projects (user_id, name, format, doc) VALUES ($1,$2,$3,$4) RETURNING id',
    [req.userId, (doc.meta && doc.meta.name) || 'Untitled project', doc.format, doc]);
  res.status(201).json({ id: rows[0].id });
});

app.get('/v1/projects/:id', auth, async (req, res) => {
  const { rows } = await pool.query(
    'SELECT doc FROM projects WHERE id=$1 AND user_id=$2', [req.params.id, req.userId]);
  rows[0] ? res.json(rows[0].doc) : res.status(404).json({ error: 'not found' });
});

app.put('/v1/projects/:id', auth, async (req, res) => {
  const doc = req.body;
  const err = validateDoc(doc);
  if (err) return res.status(422).json({ error: err });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE projects SET doc=$1, name=$2, format=$3, updated_at=now()
       WHERE id=$4 AND user_id=$5 RETURNING id`,
      [doc, (doc.meta && doc.meta.name) || 'Untitled project', doc.format, req.params.id, req.userId]);
    if (!r.rows[0]) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'not found' }); }
    await client.query('INSERT INTO project_versions (project_id, doc) VALUES ($1,$2)', [req.params.id, doc]);
    await client.query('COMMIT');
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
});

app.get('/v1/projects/:id/versions', auth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT v.id, v.created_at FROM project_versions v
     JOIN projects p ON p.id = v.project_id
     WHERE v.project_id=$1 AND p.user_id=$2 ORDER BY v.created_at DESC LIMIT 100`,
    [req.params.id, req.userId]);
  res.json(rows);
});

/* ---------- assets: presigned direct-to-S3 (bytes never touch this API) ---------- */
app.post('/v1/assets/presign', auth, async (req, res) => {
  const { filename, bytes, sha256, width, height } = req.body || {};
  if (!filename || !sha256) return res.status(400).json({ error: 'filename + sha256 required' });
  const key = `u/${req.userId}/${crypto.randomUUID()}/${filename}`;
  const { rows } = await pool.query(
    `INSERT INTO assets (user_id, s3_key, filename, width, height, bytes, sha256)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT (user_id, sha256) DO UPDATE SET filename=EXCLUDED.filename
     RETURNING id, s3_key`,
    [req.userId, key, filename, width || 0, height || 0, bytes || 0, sha256]);
  // TODO(prod): sign with @aws-sdk/s3-request-presigner against your bucket.
  res.json({ assetId: rows[0].id, uploadUrl: `https://S3-BUCKET.example/${rows[0].s3_key}?X-Amz-Signature=...` });
});

app.get('/healthz', (_req, res) => res.json({ ok: true }));

app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: 'internal' }); });

app.listen(PORT, () => console.log(`ZineIt sync API on :${PORT}`));
