const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');

const JWT_SECRET = process.env.JWT_SECRET || 'student-scheduler-secret-2024';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, whatsapp_number } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, password required' });
    }
    const existing = db.prepare('SELECT id FROM students WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const colors = ['#6C63FF','#FF6584','#43D9A2','#FF9F43','#54A0FF'];
    const color = colors[Math.floor(Math.random() * colors.length)];

    const result = db.prepare(
      'INSERT INTO students (name, email, password, whatsapp_number, avatar_color) VALUES (?,?,?,?,?)'
    ).run(name, email, hashed, whatsapp_number || null, color);

    // Default notification settings
    db.prepare('INSERT INTO notification_settings (student_id) VALUES (?)').run(result.lastInsertRowid);

    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '30d' });
    const student = db.prepare('SELECT id,name,email,whatsapp_number,avatar_color,created_at FROM students WHERE id=?').get(result.lastInsertRowid);
    res.status(201).json({ token, student });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const student = db.prepare('SELECT * FROM students WHERE email=?').get(email);
    if (!student) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, student.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: student.id, email }, JWT_SECRET, { expiresIn: '30d' });
    const { password: _, ...safeStudent } = student;
    res.json({ token, student: safeStudent });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
