const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db/init');
const auth = require('../middleware/auth');

router.use(auth);

// Save voice transcript and parse command
router.post('/transcript', (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Transcript required' });

  // Simple NLP command parser
  const lower = transcript.toLowerCase();
  let action = null;
  let parsed = {};

  if (lower.includes('add') || lower.includes('schedule') || lower.includes('class')) {
    action = 'add_class';
    // Try to extract subject, time, day
    const days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayFound = days.find(d => lower.includes(d));
    const timeMatch = lower.match(/(\d{1,2}):?(\d{0,2})\s*(am|pm)?/i);
    const subjectMatch = lower.replace(/(add|schedule|class|at|on|every)/gi,'').trim();
    parsed = { day: dayFound, time: timeMatch ? timeMatch[0] : null, subject: subjectMatch };
  } else if (lower.includes('show') || lower.includes('what') || lower.includes('today')) {
    action = 'show_schedule';
  } else if (lower.includes('delete') || lower.includes('remove') || lower.includes('cancel')) {
    action = 'delete_class';
  } else if (lower.includes('remind') || lower.includes('notification')) {
    action = 'set_reminder';
  }

  const id = uuidv4();
  db.prepare('INSERT INTO voice_notes (id,student_id,transcript,action_taken) VALUES (?,?,?,?)')
    .run(id, req.user.id, transcript, action);

  res.json({ id, transcript, action, parsed, message: getActionMessage(action, parsed) });
});

router.get('/history', (req, res) => {
  const notes = db.prepare('SELECT * FROM voice_notes WHERE student_id=? ORDER BY created_at DESC LIMIT 20').all(req.user.id);
  res.json(notes);
});

function getActionMessage(action, parsed) {
  switch(action) {
    case 'add_class': return `I heard you want to add a class${parsed.subject ? ` for "${parsed.subject}"` : ''}${parsed.day ? ` on ${parsed.day}` : ''}${parsed.time ? ` at ${parsed.time}` : ''}. Fill in the form to confirm!`;
    case 'show_schedule': return "Opening your schedule now!";
    case 'delete_class': return "Which class would you like to remove?";
    case 'set_reminder': return "Let's set up a reminder for your class!";
    default: return "I understood your voice command. What would you like to do?";
  }
}

module.exports = router;
