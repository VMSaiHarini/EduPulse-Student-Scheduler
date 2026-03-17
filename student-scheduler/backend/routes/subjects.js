const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');

router.get('/', auth, (req, res) => {
  const subjects = db.prepare('SELECT * FROM subjects WHERE student_id=? ORDER BY name').all(req.user.id);
  res.json(subjects);
});

router.post('/', auth, (req, res) => {
  const { name, teacher, room, color, icon } = req.body;
  if (!name) return res.status(400).json({ error: 'Subject name required' });
  const result = db.prepare('INSERT INTO subjects (student_id,name,teacher,room,color,icon) VALUES (?,?,?,?,?,?)')
    .run(req.user.id, name, teacher||'', room||'', color||'#6C63FF', icon||'📚');
  const subject = db.prepare('SELECT * FROM subjects WHERE id=?').get(result.lastInsertRowid);
  res.status(201).json(subject);
});

router.put('/:id', auth, (req, res) => {
  const { name, teacher, room, color, icon } = req.body;
  const sub = db.prepare('SELECT * FROM subjects WHERE id=? AND student_id=?').get(req.params.id, req.user.id);
  if (!sub) return res.status(404).json({ error: 'Not found' });
  db.prepare('UPDATE subjects SET name=?,teacher=?,room=?,color=?,icon=? WHERE id=?')
    .run(name||sub.name, teacher??sub.teacher, room??sub.room, color||sub.color, icon||sub.icon, req.params.id);
  res.json(db.prepare('SELECT * FROM subjects WHERE id=?').get(req.params.id));
});

router.delete('/:id', auth, (req, res) => {
  const result = db.prepare('DELETE FROM subjects WHERE id=? AND student_id=?').run(req.params.id, req.user.id);
  if (!result.changes) return res.status(404).json({ error: 'Not found' });
  res.json({ message: 'Deleted' });
});

module.exports = router;
