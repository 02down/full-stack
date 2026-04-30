const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// Kobler til MariaDB-databasen med brukernavn og passord
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "abc12345",
  database: "myapp",
});

// Åpner tilkoblingen – logger feil hvis den mislykkes
db.connect((err) => {
  if (err) console.error("Database connection failed:", err);
  else console.log("Connected to MariaDB");
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ message: "Missing username or password" });

  // Sjekker at passordet er minst 5 tegn
  if (password.length < 5)
    return res.json({ message: "Password must be at least 5 characters" });

  try {
    // Sjekker om brukernavnet allerede finnes i databasen
    const checkQuery = "SELECT username FROM users WHERE username = ?";
    db.query(checkQuery, [username], async (err, results) => {
      if (err) return res.json({ message: "Database error" });

      // Hvis vi finner treff betyr det at brukernavnet er tatt
      if (results.length > 0)
        return res.json({ message: "Username is already taken" });

      // Krypterer passordet med bcrypt før det lagres (10 = antall runder)
      const hashedPassword = await bcrypt.hash(password, 10);
      const query = "INSERT INTO users (username, password) VALUES (?, ?)";
      db.query(query, [username, hashedPassword], (err) => {
        if (err) {
          // ER_DUP_ENTRY er en database-feil for duplikater (ekstra sikkerhet)
          if (err.code === "ER_DUP_ENTRY") return res.json({ message: "Username is already taken" });
          return res.json({ message: "DB error" });
        }
        res.json({ message: "User registered successfully" });
      });
    });
  } catch {
    res.json({ message: "Error hashing password" });
  }
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.json({ message: "Missing username or password" });

  // Henter brukerens rad fra databasen basert på brukernavn
  // ? er en plassholder som hindrer SQL-injection
  const query = "SELECT * FROM users WHERE username = ?";
  db.query(query, [username], async (err, results) => {
    if (err) return res.json({ message: "Database error" });
    if (results.length === 0) return res.json({ message: "User not found" });

    const user = results[0];
    // Sammenligner det skrevne passordet med det krypterte i databasen
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
    // Sjekker om det nye brukernavnet er tatt av en annen bruker
    if (newUsername) {
      const checkResult = await new Promise((resolve, reject) => {
        db.query("SELECT username FROM users WHERE username = ? AND username != ?", [newUsername, currentUsername], (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });
      if (checkResult.length > 0)
        return res.json({ success: false, message: "Username is already taken" });
    }

    // Sjekker passordet på serversiden også
    if (newPassword && newPassword.length < 5)
      return res.json({ success: false, message: "Password must be at least 5 characters" });

    // Bygger opp UPDATE-spørringen dynamisk basert på hva brukeren endrer
    const fields = [];
    const values = [];

    if (newUsername) {
      fields.push("username = ?");
      values.push(newUsername);
    }
    if (newPassword) {
      // Krypterer det nye passordet før det lagres
      const hashed = await bcrypt.hash(newPassword, 10);
      fields.push("password = ?");
      values.push(hashed);
    }
    if (profilePic) {
      // Profilbildet lagres som en base64-streng direkte i databasen
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

// Henter brukerinfo fra databasen – brukes til å verifisere at brukeren fortsatt eksisterer
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

// Sletter hele brukerens rad fra databasen
app.post("/delete-account", (req, res) => {
  const { username } = req.body;
  if (!username) return res.json({ success: false, message: "Not logged in" });

  const query = "DELETE FROM users WHERE username = ?";
  db.query(query, [username], (err, result) => {
    if (err) return res.json({ success: false, message: "Database error" });
    if (result.affectedRows === 0)
      return res.json({ success: false, message: "User not found" });
    res.json({ success: true, message: "Account deleted" });
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});