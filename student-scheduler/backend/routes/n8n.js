const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const db = require('../db/init');
const auth = require('../middleware/auth');

router.use(auth);

// Get all webhooks
router.get('/webhooks', (req, res) => {
  const hooks = db.prepare('SELECT * FROM n8n_webhooks ORDER BY created_at DESC').all();
  res.json(hooks);
});

// Add webhook
router.post('/webhooks', (req, res) => {
  const { name, url, event_type } = req.body;
  if (!name || !url || !event_type) return res.status(400).json({ error: 'Name, URL, and event type required' });
  const id = uuidv4();
  db.prepare('INSERT INTO n8n_webhooks (id,name,url,event_type) VALUES (?,?,?,?)').run(id, name, url, event_type);
  res.json(db.prepare('SELECT * FROM n8n_webhooks WHERE id=?').get(id));
});

// Toggle webhook
router.put('/webhooks/:id/toggle', (req, res) => {
  const hook = db.prepare('SELECT * FROM n8n_webhooks WHERE id=?').get(req.params.id);
  if (!hook) return res.status(404).json({ error: 'Webhook not found' });
  db.prepare('UPDATE n8n_webhooks SET is_active=? WHERE id=?').run(hook.is_active ? 0 : 1, hook.id);
  res.json({ success: true, is_active: !hook.is_active });
});

// Delete webhook
router.delete('/webhooks/:id', (req, res) => {
  db.prepare('DELETE FROM n8n_webhooks WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Test webhook
router.post('/webhooks/:id/test', async (req, res) => {
  const hook = db.prepare('SELECT * FROM n8n_webhooks WHERE id=?').get(req.params.id);
  if (!hook) return res.status(404).json({ error: 'Webhook not found' });
  try {
    const response = await axios.post(hook.url, {
      event: 'test',
      student: { name: 'Test Student', phone: '+1234567890' },
      class: { subject: 'Mathematics', time: '16:00' },
      message: '🔔 *Test Notification*\n\nHey Test Student! 📐\nYour *Mathematics* class starts in 5 minutes at *16:00*.\n\nGet ready! 🎒',
      timestamp: new Date().toISOString()
    }, { timeout: 8000 });
    res.json({ success: true, status: response.status });
  } catch (e) {
    res.status(400).json({ success: false, error: e.message });
  }
});

// Get N8N workflow templates
router.get('/templates', (req, res) => {
  res.json([
    {
      name: 'WhatsApp Class Reminder',
      description: 'Sends WhatsApp message via Twilio when class is about to start',
      event_type: 'class_reminder',
      nodes: ['Webhook', 'Twilio WhatsApp', 'Set Message']
    },
    {
      name: 'Telegram Class Reminder',
      description: 'Sends Telegram message when class is about to start',
      event_type: 'class_reminder',
      nodes: ['Webhook', 'Telegram', 'Format Message']
    },
    {
      name: 'Email + WhatsApp',
      description: 'Sends both email and WhatsApp reminder',
      event_type: 'class_reminder',
      nodes: ['Webhook', 'Gmail', 'Twilio WhatsApp']
    }
  ]);
});

module.exports = router;
