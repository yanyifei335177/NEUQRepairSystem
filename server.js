// server.js
const express = require("express");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

// -------------------------
// 数据库初始化
// -------------------------
const DB_FILE = path.join(__dirname, "repair.db");
const dbExists = fs.existsSync(DB_FILE);
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  if (!dbExists) {
    db.run(`CREATE TABLE repairs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      phone TEXT,
      email TEXT,
      service TEXT,
      description TEXT,
      date TEXT,
      location TEXT,
      status TEXT DEFAULT 'pending',
      reason TEXT
    )`);
    db.run(`CREATE TABLE admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user TEXT UNIQUE,
      pass TEXT
    )`);
    db.run(`INSERT INTO admins (user, pass) VALUES (?, ?)`, ["202312420", "335177Ff"]);
    console.log("✅ 数据库初始化完成，默认管理员账号 202312420 / 335177Ff");
  }
});

// -------------------------
// API 接口
// -------------------------
app.get("/api/repairs", (req, res) => {
  db.all("SELECT * FROM repairs", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/repairs", (req, res) => {
  const { name, phone, email, service, description, date, location } = req.body;
  const stmt = db.prepare(`INSERT INTO repairs (name, phone, email, service, description, date, location) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  stmt.run(name, phone, email, service, description, date, location, function(err){
    if(err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID });
  });
});

app.post("/api/admin/login", (req, res) => {
  const { user, pass } = req.body;
  db.get("SELECT * FROM admins WHERE user=? AND pass=?", [user, pass], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json({ ok: true });
    else res.status(401).json({ ok: false });
  });
});

app.post("/api/repairs/:id/confirm", (req, res) => {
  const id = req.params.id;
  db.run("UPDATE repairs SET status='confirmed' WHERE id=?", [id], function(err){
    if(err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.post("/api/repairs/:id/reject", (req, res) => {
  const id = req.params.id;
  const reason = req.body.reason || "无原因";
  db.run("UPDATE repairs SET status='rejected', reason=? WHERE id=?", [reason, id], function(err){
    if(err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.post("/api/repairs/:id/complete", (req, res) => {
  const id = req.params.id;
  db.run("UPDATE repairs SET status='completed' WHERE id=?", [id], function(err){
    if(err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

app.delete("/api/repairs/:id", (req, res) => {
  const id = req.params.id;
  db.run("DELETE FROM repairs WHERE id=?", [id], function(err){
    if(err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// -------------------------
// 云端和本地端口
// -------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
