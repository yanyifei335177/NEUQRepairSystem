// server.js
const express = require("express");
const cors = require("cors");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(express.json());

// SQLite 数据库
const DB_FILE = path.join(__dirname, "repair.db");
const db = new sqlite3.Database(DB_FILE);

// 初始化数据库表
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS repairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    email TEXT,
    service TEXT,
    description TEXT,
    date TEXT,
    location TEXT,
    status TEXT,
    reason TEXT,
    createdAt INTEGER,
    completedAt INTEGER
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admins (
    user TEXT PRIMARY KEY,
    pass TEXT
  )`);

  // 默认管理员
  db.run(`INSERT OR IGNORE INTO admins(user, pass) VALUES(?, ?)`, [
    "202312420",
    "335177Ff",
  ]);
});

// ------------------- API -------------------
// 获取所有维修申请
app.get("/api/repairs", (req, res) => {
  db.all("SELECT * FROM repairs ORDER BY createdAt DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// 提交维修申请
app.post("/api/repairs", (req, res) => {
  const r = req.body;
  const stmt = db.prepare(
    `INSERT INTO repairs (name,phone,email,service,description,date,location,status,reason,createdAt)
     VALUES (?,?,?,?,?,?,?,?,?,?)`
  );
  stmt.run(
    r.name,
    r.phone,
    r.email,
    r.service,
    r.description,
    r.date,
    r.location,
    "pending",
    "",
    Date.now(),
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ id: this.lastID });
    }
  );
});

// 后台确认申请
app.post("/api/repairs/:id/confirm", (req, res) => {
  db.run("UPDATE repairs SET status='confirmed' WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// 后台驳回申请
app.post("/api/repairs/:id/reject", (req, res) => {
  const reason = req.body.reason || "";
  db.run("UPDATE repairs SET status='rejected', reason=? WHERE id=?", [reason, req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// 标记为已维修（删除前计入统计）
app.post("/api/repairs/:id/complete", (req, res) => {
  db.run("UPDATE repairs SET status='completed', completedAt=? WHERE id=?", [Date.now(), req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// 永久删除（数据库中移除）
app.delete("/api/repairs/:id", (req, res) => {
  db.run("DELETE FROM repairs WHERE id=?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// 管理员登录
app.post("/api/admin/login", (req, res) => {
  const { user, pass } = req.body;
  db.get("SELECT * FROM admins WHERE user=? AND pass=?", [user, pass], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (row) res.json({ ok: true });
    else res.status(401).json({ ok: false, msg: "账号或密码错误" });
  });
});

// 添加管理员
app.post("/api/admin/add", (req, res) => {
  const { user, pass } = req.body;
  db.run("INSERT INTO admins(user, pass) VALUES(?, ?)", [user, pass], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ ok: true });
  });
});

// ------------------- 前端 -------------------
app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 启动服务
const PORT = 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
