const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

// Get all schedules for student
router.get('/', auth, (req, res) => {
  const schedules = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color,
           sub.icon as subject_icon, sub.teacher, sub.room
    FROM schedules s
    JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.student_id = ?
    ORDER BY CASE day_of_week
      WHEN 'Monday' THEN 1 WHEN 'Tuesday' THEN 2 WHEN 'Wednesday' THEN 3
      WHEN 'Thursday' THEN 4 WHEN 'Friday' THEN 5 WHEN 'Saturday' THEN 6 WHEN 'Sunday' THEN 7
    END, s.start_time
  `).all(req.user.id);
  res.json(schedules);
});

// Create schedule
router.post('/', auth, (req, res) => {
  const { subject_id, day_of_week, start_time, end_time, notify_minutes_before, notes } = req.body;
  if (!subject_id || !day_of_week || !start_time || !end_time)
    return res.status(400).json({ error: 'Missing required fields' });

  const result = db.prepare(`
    INSERT INTO schedules (student_id, subject_id, day_of_week, start_time, end_time, notify_minutes_before, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(req.user.id, subject_id, day_of_week, start_time, end_time, notify_minutes_before || 5, notes || '');

  const schedule = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color,
           sub.icon as subject_icon, sub.teacher, sub.room
    FROM schedules s JOIN subjects sub ON s.subject_id = sub.id
    WHERE s.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json(schedule);
});

// Update schedule
router.put('/:id', auth, (req, res) => {
  const { day_of_week, start_time, end_time, notify_minutes_before, notes, is_active } = req.body;
  const schedule = db.prepare('SELECT * FROM schedules WHERE id=? AND student_id=?').get(req.params.id, req.user.id);
  if (!schedule) return res.status(404).json({ error: 'Schedule not found' });

  db.prepare(`UPDATE schedules SET day_of_week=?, start_time=?, end_time=?, notify_minutes_before=?, notes=?, is_active=? WHERE id=?`)
    .run(day_of_week || schedule.day_of_week, start_time || schedule.start_time,
         end_time || schedule.end_time, notify_minutes_before ?? schedule.notify_minutes_before,
         notes ?? schedule.notes, is_active ?? schedule.is_active, req.params.id);

  const updated = db.prepare(`
    SELECT s.*, sub.name as subject_name, sub.color as subject_color,
           sub.icon as subject_icon, sub.teacher, sub.room
    FROM schedules s JOIN subjects sub ON s.subject_id = sub.id WHERE s.id=?
  `).get(req.params.id);
  res.json(updated);
});

// Delete schedule
router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM schedules WHERE id=? AND student_id=?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Schedule not found' });
  res.json({ message: 'Deleted successfully' });
});

module.exports = router;
