const express = require('express');
const path = require('path');
const cors = require('cors');
const Database = require('better-sqlite3');

const app = express();
app.use(cors());
app.use(express.json({ limit: '5mb' }));

const dbFile = path.join(__dirname, 'absensi.db');
const db = new Database(dbFile);

// init tables
db.prepare(`CREATE TABLE IF NOT EXISTS roster (
  name TEXT PRIMARY KEY,
  role TEXT
)`).run();

db.prepare(`CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tanggal TEXT,
  name TEXT,
  role TEXT,
  status TEXT,
  signature TEXT
)`).run();

// Roster endpoints
app.get('/api/roster', (req, res) => {
  const rows = db.prepare('SELECT name, role FROM roster ORDER BY role, name').all();
  res.json(rows);
});

app.post('/api/roster', (req, res) => {
  const { name, role } = req.body;
  if (!name || !role) return res.status(400).json({ error: 'name and role required' });
  try {
    db.prepare('INSERT OR REPLACE INTO roster (name, role) VALUES (?, ?)').run(name, role);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/roster/:oldName', (req, res) => {
  const oldName = req.params.oldName;
  const { name, role } = req.body;
  if (!oldName || !name || !role) return res.status(400).json({ error: 'missing' });
  try {
    const tx = db.transaction(() => {
      db.prepare('UPDATE roster SET name = ?, role = ? WHERE name = ?').run(name, role, oldName);
      db.prepare('UPDATE entries SET name = ?, role = ? WHERE name = ?').run(name, role, oldName);
    });
    tx();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/roster/:name', (req, res) => {
  const name = req.params.name;
  try {
    db.prepare('DELETE FROM roster WHERE name = ?').run(name);
    db.prepare('DELETE FROM entries WHERE name = ?').run(name);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Entries endpoints
app.get('/api/entries', (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ error: 'date param required' });
  try {
    const rows = db.prepare('SELECT id, tanggal, name, role, status, signature FROM entries WHERE tanggal = ? ORDER BY id DESC').all(date);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/entries', (req, res) => {
  const { id, tanggal, name, role, status, signature } = req.body;
  if (!tanggal || !name) return res.status(400).json({ error: 'tanggal and name required' });
  try {
    if (id) {
      db.prepare('UPDATE entries SET tanggal = ?, name = ?, role = ?, status = ?, signature = ? WHERE id = ?')
        .run(tanggal, name, role, status, signature, id);
      return res.json({ success: true });
    }
    const info = db.prepare('INSERT INTO entries (tanggal, name, role, status, signature) VALUES (?, ?, ?, ?, ?)')
      .run(tanggal, name, role, status || null, signature || null);
    res.json({ success: true, id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/entries/:id', (req, res) => {
  const id = req.params.id;
  try {
    db.prepare('DELETE FROM entries WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API server listening on ${PORT}`));
