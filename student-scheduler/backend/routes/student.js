const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const bcrypt = require('bcryptjs');

router.get('/me', auth, (req, res) => {
  const student = db.prepare('SELECT id,name,email,whatsapp_number,avatar_color,created_at FROM students WHERE id=?').get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Not found' });
  res.json(student);
});

router.put('/me', auth, async (req, res) => {
  const { name, whatsapp_number, avatar_color, current_password, new_password } = req.body;
  const student = db.prepare('SELECT * FROM students WHERE id=?').get(req.user.id);

  if (new_password) {
    const valid = await bcrypt.compare(current_password || '', student.password);
    if (!valid) return res.status(401).json({ error: 'Current password incorrect' });
    const hashed = await bcrypt.hash(new_password, 12);
    db.prepare('UPDATE students SET password=? WHERE id=?').run(hashed, req.user.id);
  }

  db.prepare('UPDATE students SET name=?,whatsapp_number=?,avatar_color=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name||student.name, whatsapp_number??student.whatsapp_number, avatar_color||student.avatar_color, req.user.id);

  res.json(db.prepare('SELECT id,name,email,whatsapp_number,avatar_color,created_at FROM students WHERE id=?').get(req.user.id));
});

// Dashboard stats
router.get('/stats', auth, (req, res) => {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  const stats = {
    total_subjects: db.prepare('SELECT COUNT(*) as c FROM subjects WHERE student_id=?').get(req.user.id).c,
    total_schedules: db.prepare('SELECT COUNT(*) as c FROM schedules WHERE student_id=? AND is_active=1').get(req.user.id).c,
    today_classes: db.prepare("SELECT COUNT(*) as c FROM schedules s JOIN subjects sub ON s.subject_id=sub.id WHERE s.student_id=? AND s.day_of_week=? AND s.is_active=1").get(req.user.id, today).c,
    notifications_sent: db.prepare("SELECT COUNT(*) as c FROM notifications WHERE student_id=? AND status='sent'").get(req.user.id).c,
    today_schedule: db.prepare(`
      SELECT s.*, sub.name as subject_name, sub.color, sub.icon, sub.teacher, sub.room
      FROM schedules s JOIN subjects sub ON s.subject_id=sub.id
      WHERE s.student_id=? AND s.day_of_week=? AND s.is_active=1
      ORDER BY s.start_time
    `).all(req.user.id, today)
  };
  res.json(stats);
});

module.exports = router;
