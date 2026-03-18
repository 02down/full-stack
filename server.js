const express = require("express");
const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const cors = require("cors");
const path = require("path");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Serve static files
app.use(express.static(path.join(__dirname, "public")));

// Database connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "abc12345", // change your password
    database: "myapp"
});

db.connect((err) => {
    if (err) console.error("Database connection failed:", err);
    else console.log("Connected to MariaDB");
});

// REGISTER
app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ message: "Missing username or password" });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = "INSERT INTO users (username, password) VALUES (?, ?)";
        db.query(query, [username, hashedPassword], (err, result) => {
            if (err) return res.json({ message: "User already exists or DB error" });
            res.json({ message: "User registered successfully" });
        });
    } catch (error) {
        res.json({ message: "Error hashing password" });
    }
});

// LOGIN
app.post("/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.json({ message: "Missing username or password" });

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

// Serve index.html
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});