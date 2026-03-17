const cron = require('node-cron');
const db = require('./db/database');
const axios = require('axios');

function getDayName() {
  return new Date().toLocaleDateString('en-US', { weekday: 'long' });
}

function getCurrentTime() {
  const now = new Date();
  return now.toTimeString().slice(0, 5); // HH:MM
}

function addMinutes(timeStr, minutes) {
  const [h, m] = timeStr.split(':').map(Number);
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return `${String(nh).padStart(2,'0')}:${String(nm).padStart(2,'0')}`;
}

async function sendWhatsAppNotification(student, schedule, subject, settings) {
  if (!settings?.n8n_webhook_url || !settings?.whatsapp_enabled) return null;
  const whatsapp = student.whatsapp_number;
  if (!whatsapp) return null;

  const message = `📚 *Class Reminder!*\n\nHi ${student.name}! 👋\n\nYour *${subject.name}* class starts in ${schedule.notify_minutes_before} minutes!\n\n⏰ Time: ${schedule.start_time}\n📍 Room: ${subject.room || 'N/A'}\n👨‍🏫 Teacher: ${subject.teacher || 'N/A'}\n\nBe prepared and on time! 🎓`;

  try {
    const resp = await axios.post(settings.n8n_webhook_url, {
      student_name: student.name,
      whatsapp_number: whatsapp,
      message,
      subject: subject.name,
      start_time: schedule.start_time,
      room: subject.room,
      teacher: subject.teacher,
      type: 'class_reminder'
    }, { timeout: 15000 });

    // Log notification
    db.prepare(`INSERT INTO notifications (student_id, schedule_id, message, whatsapp_number, status, sent_at, scheduled_for)
      VALUES (?, ?, ?, ?, 'sent', CURRENT_TIMESTAMP, ?)`)
      .run(student.id, schedule.id, message, whatsapp, schedule.start_time);

    console.log(`✅ Notification sent to ${student.name} for ${subject.name} at ${schedule.start_time}`);
    return resp.data;
  } catch (err) {
    db.prepare(`INSERT INTO notifications (student_id, schedule_id, message, whatsapp_number, status, scheduled_for)
      VALUES (?, ?, ?, ?, 'failed', ?)`)
      .run(student.id, schedule.id, message, whatsapp, schedule.start_time);
    console.error(`❌ Failed to notify ${student.name}:`, err.message);
    return null;
  }
}

// Run every minute to check upcoming classes
function startScheduler() {
  cron.schedule('* * * * *', async () => {
    const day = getDayName();
    const now = getCurrentTime();

    // Get all active schedules for today
    const schedules = db.prepare(`
      SELECT s.*, sub.name as subject_name, sub.teacher, sub.room, sub.icon,
             st.name as student_name, st.whatsapp_number,
             ns.n8n_webhook_url, ns.whatsapp_enabled, ns.default_notify_minutes
      FROM schedules s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN students st ON s.student_id = st.id
      LEFT JOIN notification_settings ns ON ns.student_id = st.id
      WHERE s.day_of_week = ? AND s.is_active = 1
    `).all(day);

    for (const schedule of schedules) {
      const notifyAt = addMinutes(schedule.start_time, -(schedule.notify_minutes_before || 5));
      if (notifyAt !== now) continue;

      // Check not already sent today
      const alreadySent = db.prepare(`
        SELECT id FROM notifications
        WHERE schedule_id=? AND status='sent' AND date(sent_at)=date('now')
      `).get(schedule.id);
      if (alreadySent) continue;

      await sendWhatsAppNotification(
        { id: schedule.student_id, name: schedule.student_name, whatsapp_number: schedule.whatsapp_number },
        schedule,
        { name: schedule.subject_name, teacher: schedule.teacher, room: schedule.room },
        { n8n_webhook_url: schedule.n8n_webhook_url, whatsapp_enabled: schedule.whatsapp_enabled }
      );
    }
  });

  console.log('⏰ Notification scheduler started — checking every minute');
}

module.exports = { startScheduler };
