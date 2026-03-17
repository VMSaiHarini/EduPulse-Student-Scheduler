const express = require('express');
const router = express.Router();
const db = require('../db/init');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/me', (req, res) => {
  const student = db.prepare('SELECT id,name,email,phone,grade,avatar_color,created_at FROM students WHERE id=?').get(req.user.id);
  if (!student) return res.status(404).json({ error: 'Student not found' });
  res.json(student);
});

router.put('/me', (req, res) => {
  const { name, phone, grade } = req.body;
  db.prepare('UPDATE students SET name=?,phone=?,grade=?,updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(name, phone, grade||'', req.user.id);
  res.json({ success: true });
});

// Stats
router.get('/stats', (req, res) => {
  const totalSubjects = db.prepare('SELECT COUNT(*) as c FROM subjects WHERE student_id=?').get(req.user.id).c;
  const totalSchedules = db.prepare('SELECT COUNT(*) as c FROM schedules WHERE student_id=? AND is_active=1').get(req.user.id).c;
  const totalNotifs = db.prepare('SELECT COUNT(*) as c FROM notifications WHERE student_id=?').get(req.user.id).c;
  const todayDay = new Date().getDay();
  const todayClasses = db.prepare('SELECT COUNT(*) as c FROM schedules WHERE student_id=? AND day_of_week=? AND is_active=1').get(req.user.id, todayDay).c;
  res.json({ totalSubjects, totalSchedules, totalNotifs, todayClasses });
});

module.exports = router;
