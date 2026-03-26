const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "abc12345",
  database: "myapp",
});

db.connect((err) => {
  if (err) console.error("Database connection failed:", err);
  else console.log("Connected to MariaDB");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ message: "Missing username or password" });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
    db.query(query, [username, hashedPassword], (err) => {
      if (err) return res.json({ message: "User already exists or DB error" });
      res.json({ message: "User registered successfully" });
    });
  } catch {
    res.json({ message: "Error hashing password" });
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ message: "Missing username or password" });

  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) return res.json({ message: "Database error" });
    if (results.length === 0) return res.json({ message: "User not found" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (match) res.json({ message: "Login successful" });
    else res.json({ message: "Wrong password" });
  });
});

app.post("/update-account", async (req, res) => {
  const { currentUsername, newUsername, newPassword, profilePic } = req.body;
  if (!currentUsername)
    return res.json({ success: false, message: "Not logged in" });

  try {
    const fields = [];
    const values = [];

    if (newUsername) {
      fields.push("username = ?");
      values.push(newUsername);
    }
    if (newPassword) {
      const hashed = await bcrypt.hash(newPassword, 10);
      fields.push("password = ?");
      values.push(hashed);
    }
    if (profilePic) {
      fields.push("profile_pic = ?");
      values.push(profilePic);
    }

    if (fields.length === 0)
      return res.json({ success: false, message: "Nothing to update" });

    values.push(currentUsername);
    const query = `UPDATE users SET ${fields.join(", ")} WHERE username = ?`;
    db.query(query, values, (err, result) => {
      if (err) return res.json({ success: false, message: "Database error" });
      if (result.affectedRows === 0)
        return res.json({ success: false, message: "User not found" });
      res.json({ success: true, message: "Account updated" });
    });
  } catch {
    res.json({ success: false, message: "Server error" });
  }
});

app.get("/account-info", (req, res) => {
  const { username } = req.query;
  if (!username) return res.json({ success: false });

  const query = "SELECT username, profile_pic FROM users WHERE username = ?";
  db.query(query, [username], (err, results) => {
    if (err || results.length === 0) return res.json({ success: false });
    res.json({
      success: true,
      username: results[0].username,
      profilePic: results[0].profile_pic,
    });
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
