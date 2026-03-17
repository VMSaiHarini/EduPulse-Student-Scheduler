const express = require('express');
const router = express.Router();
const db = require('../db/database');
const auth = require('../middleware/auth');
const axios = require('axios');

// Get notification history
router.get('/', auth, (req, res) => {
  const notifs = db.prepare(`
    SELECT n.*, s.day_of_week, s.start_time, sub.name as subject_name
    FROM notifications n
    JOIN schedules s ON n.schedule_id = s.id
    JOIN subjects sub ON s.subject_id = sub.id
    WHERE n.student_id = ?
    ORDER BY n.created_at DESC LIMIT 50
  `).all(req.user.id);
  res.json(notifs);
});

// Get/Update notification settings
router.get('/settings', auth, (req, res) => {
  const settings = db.prepare('SELECT * FROM notification_settings WHERE student_id=?').get(req.user.id);
  res.json(settings || {});
});

router.put('/settings', auth, (req, res) => {
  const { n8n_webhook_url, whatsapp_enabled, default_notify_minutes, timezone } = req.body;
  const existing = db.prepare('SELECT id FROM notification_settings WHERE student_id=?').get(req.user.id);
  if (existing) {
    db.prepare(`UPDATE notification_settings SET n8n_webhook_url=?,whatsapp_enabled=?,default_notify_minutes=?,timezone=? WHERE student_id=?`)
      .run(n8n_webhook_url, whatsapp_enabled??1, default_notify_minutes||5, timezone||'Asia/Kolkata', req.user.id);
  } else {
    db.prepare(`INSERT INTO notification_settings (student_id,n8n_webhook_url,whatsapp_enabled,default_notify_minutes,timezone) VALUES (?,?,?,?,?)`)
      .run(req.user.id, n8n_webhook_url, whatsapp_enabled??1, default_notify_minutes||5, timezone||'Asia/Kolkata');
  }
  // Update student whatsapp if provided
  if (req.body.whatsapp_number) {
    db.prepare('UPDATE students SET whatsapp_number=? WHERE id=?').run(req.body.whatsapp_number, req.user.id);
  }
  res.json({ message: 'Settings updated' });
});

// Manually trigger a test notification via n8n
router.post('/test', auth, async (req, res) => {
  const student = db.prepare('SELECT * FROM students WHERE id=?').get(req.user.id);
  const settings = db.prepare('SELECT * FROM notification_settings WHERE student_id=?').get(req.user.id);
  if (!settings?.n8n_webhook_url) return res.status(400).json({ error: 'N8N webhook URL not configured' });
  if (!student.whatsapp_number) return res.status(400).json({ error: 'WhatsApp number not set' });

  try {
    const payload = {
      student_name: student.name,
      whatsapp_number: student.whatsapp_number,
      message: `🧪 Test notification from Student Scheduler!\nHi ${student.name}, your notifications are working perfectly! 🎉`,
      type: 'test'
    };
    await axios.post(settings.n8n_webhook_url, payload, { timeout: 10000 });
    res.json({ message: 'Test notification sent!' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reach N8N: ' + err.message });
  }
});

module.exports = router;
