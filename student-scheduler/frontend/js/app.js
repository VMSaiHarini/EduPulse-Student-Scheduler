// ========== CONFIG ==========
const API = 'http://localhost:3001/api';
let token = localStorage.getItem('token');
let currentUser = JSON.parse(localStorage.getItem('user') || 'null');
let subjects = [];
let allSchedules = [];
let selectedDay = 'Monday';

// ========== UTILS ==========
const $ = id => document.getElementById(id);
const toast = (msg, type='info') => {
  const c = $('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  const icons = { success: '✅', error: '❌', info: '💡' };
  el.innerHTML = `<span>${icons[type]||'ℹ️'}</span> <span>${msg}</span>`;
  c.appendChild(el);
  setTimeout(() => { el.style.animation = 'toastIn 0.3s ease reverse'; setTimeout(() => el.remove(), 300); }, 3500);
};
const api = async (path, opts = {}) => {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(API + path, { ...opts, headers: { ...headers, ...opts.headers } });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || 'Request failed');
  return data;
};
const fmt12 = t => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2,'0')} ${ampm}`;
};

// ========== AUTH ==========
document.querySelectorAll('.auth-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    tab.classList.add('active');
    $(`${tab.dataset.tab}-form`).classList.add('active');
  });
});

$('login-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.innerHTML = '<span class="spinner"></span> Signing in...';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: $('login-email').value, password: $('login-password').value })
    });
    token = data.token; currentUser = data.student;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(currentUser));
    initApp();
  } catch (err) {
    $('login-error').textContent = err.message;
    btn.innerHTML = 'Sign In <span class="btn-arrow">→</span>';
  }
});

$('register-form').addEventListener('submit', async e => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  btn.innerHTML = '<span class="spinner"></span> Creating...';
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        name: $('reg-name').value, email: $('reg-email').value,
        password: $('reg-password').value, whatsapp_number: $('reg-whatsapp').value
      })
    });
    token = data.token; currentUser = data.student;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(currentUser));
    initApp();
  } catch (err) {
    $('register-error').textContent = err.message;
    btn.innerHTML = 'Create Account <span class="btn-arrow">→</span>';
  }
});

// ========== APP INIT ==========
function initApp() {
  $('auth-screen').classList.remove('active');
  $('app-screen').classList.add('active');
  updateUserDisplay();
  loadDashboard();
  loadSubjects();
  loadSchedules();
  loadNotifSettings();
  initVoice();
  setupTTS();
  setGreeting();
}

function updateUserDisplay() {
  if (!currentUser) return;
  const initial = currentUser.name[0].toUpperCase();
  [$('nav-avatar'), $('top-avatar')].forEach(el => {
    if (el) { el.textContent = initial; el.style.background = currentUser.avatar_color || '#6C63FF'; }
  });
  if ($('nav-name')) $('nav-name').textContent = currentUser.name;
}

function setGreeting() {
  const h = new Date().getHours();
  const greetings = h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
  if ($('greeting-text')) $('greeting-text').textContent = `${greetings}, ${currentUser?.name?.split(' ')[0] || 'Student'}! 👋`;
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  if ($('date-text')) $('date-text').textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
  if ($('today-day')) $('today-day').textContent = days[now.getDay()];
}

// ========== NAVIGATION ==========
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    navigateTo(item.dataset.page);
    if (window.innerWidth < 900) document.getElementById('sidebar').classList.remove('open');
  });
});

function navigateTo(page) {
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelector(`[data-page="${page}"]`)?.classList.add('active');
  $(`page-${page}`)?.classList.add('active');
  const titles = { dashboard: 'Dashboard', schedule: 'My Schedule', subjects: 'Subjects',
    notifications: 'Notifications', voice: 'Voice Assistant', settings: 'Settings', 'n8n-guide': 'N8N Setup Guide' };
  if ($('page-title')) $('page-title').textContent = titles[page] || page;
  if (page === 'notifications') loadNotifications();
  if (page === 'settings') loadSettings();
}

$('menu-btn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
$('sidebar-close').addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
$('btn-logout').addEventListener('click', () => {
  token = null; currentUser = null;
  localStorage.removeItem('token'); localStorage.removeItem('user');
  $('app-screen').classList.remove('active');
  $('auth-screen').classList.add('active');
});
$('voice-quick-btn').addEventListener('click', () => navigateTo('voice'));

// ========== DASHBOARD ==========
async function loadDashboard() {
  try {
    const stats = await api('/student/stats');
    $('stat-subjects').textContent = stats.total_subjects;
    $('stat-schedules').textContent = stats.total_schedules;
    $('stat-today').textContent = stats.today_classes;
    $('stat-notifs').textContent = stats.notifications_sent;
    $('today-count-badge').textContent = `${stats.today_classes} ${stats.today_classes === 1 ? 'class' : 'classes'} today`;
    renderTodaySchedule(stats.today_schedule);
  } catch (err) { toast('Failed to load dashboard', 'error'); }
}

function renderTodaySchedule(list) {
  const el = $('today-schedule');
  if (!list || !list.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">🎉</div><h3>No classes today!</h3><p>Enjoy your free day</p></div>`;
    return;
  }
  el.innerHTML = list.map(c => `
    <div class="class-card" style="--card-color:${c.color||'#6C63FF'}">
      <div class="class-time-badge">
        <div class="time-start">${fmt12(c.start_time)}</div>
        <div class="time-end">${fmt12(c.end_time)}</div>
      </div>
      <div class="class-icon">${c.icon||'📚'}</div>
      <div class="class-info">
        <div class="class-name">${c.subject_name}</div>
        <div class="class-meta">${[c.teacher, c.room].filter(Boolean).join(' · ')}</div>
      </div>
      <div class="class-notify-badge">🔔 ${c.notify_minutes_before}m</div>
    </div>
  `).join('');
}

// ========== SUBJECTS ==========
async function loadSubjects() {
  try {
    subjects = await api('/subjects');
    renderSubjectsGrid();
    populateSubjectSelect();
  } catch (err) { toast('Failed to load subjects', 'error'); }
}

function renderSubjectsGrid() {
  const el = $('subjects-grid');
  if (!subjects.length) {
    el.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">📚</div><h3>No subjects yet</h3><p>Add your first subject to get started</p></div>`;
    return;
  }
  el.innerHTML = subjects.map(s => `
    <div class="subject-card" style="--card-color:${s.color}">
      <div class="subject-card-icon">${s.icon||'📚'}</div>
      <div class="subject-card-name">${s.name}</div>
      <div class="subject-card-meta">
        ${s.teacher ? `👨‍🏫 ${s.teacher}<br>` : ''}
        ${s.room ? `📍 ${s.room}` : ''}
      </div>
      <div class="subject-card-actions">
        <button class="btn-secondary" style="flex:1" onclick="editSubject(${s.id})">Edit</button>
        <button class="sched-action-btn delete" onclick="deleteSubject(${s.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

function populateSubjectSelect() {
  const sel = $('sched-subject');
  sel.innerHTML = subjects.map(s => `<option value="${s.id}">${s.icon||'📚'} ${s.name}</option>`).join('');
}

$('btn-add-subject').addEventListener('click', () => {
  $('modal-subject-title').textContent = 'Add Subject';
  $('subject-edit-id').value = '';
  $('form-subject').reset();
  openModal('modal-subject');
});

$('form-subject').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('subject-edit-id').value;
  const payload = { name: $('sub-name').value, teacher: $('sub-teacher').value, room: $('sub-room').value, color: $('sub-color').value, icon: $('sub-icon').value||'📚' };
  try {
    if (id) await api(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/subjects', { method: 'POST', body: JSON.stringify(payload) });
    closeModal(); await loadSubjects(); toast(id ? 'Subject updated!' : 'Subject added!', 'success');
  } catch (err) { toast(err.message, 'error'); }
});

async function editSubject(id) {
  const s = subjects.find(x => x.id === id);
  if (!s) return;
  $('modal-subject-title').textContent = 'Edit Subject';
  $('subject-edit-id').value = id;
  $('sub-name').value = s.name; $('sub-teacher').value = s.teacher||'';
  $('sub-room').value = s.room||''; $('sub-color').value = s.color||'#6C63FF';
  $('sub-icon').value = s.icon||'📚';
  openModal('modal-subject');
}

async function deleteSubject(id) {
  if (!confirm('Delete this subject and all its classes?')) return;
  try {
    await api(`/subjects/${id}`, { method: 'DELETE' });
    await loadSubjects(); await loadSchedules(); toast('Subject deleted', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

window.setSubIcon = icon => { $('sub-icon').value = icon; };

// ========== SCHEDULES ==========
async function loadSchedules() {
  try {
    allSchedules = await api('/schedules');
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    selectedDay = today;
    document.querySelectorAll('.week-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.day === today);
    });
    renderScheduleList();
  } catch {}
}

document.querySelectorAll('.week-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.week-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active'); selectedDay = tab.dataset.day; renderScheduleList();
  });
});

function renderScheduleList() {
  const list = allSchedules.filter(s => s.day_of_week === selectedDay).sort((a,b) => a.start_time.localeCompare(b.start_time));
  const el = $('schedule-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="empty-icon">📭</div><h3>No classes on ${selectedDay}</h3><p>Click "+ Add Class" to schedule one</p></div>`;
    return;
  }
  el.innerHTML = list.map(s => `
    <div class="sched-card" style="--card-color:${s.subject_color||'#6C63FF'}">
      <div class="class-time-badge">
        <div class="time-start">${fmt12(s.start_time)}</div>
        <div class="time-end">${fmt12(s.end_time)}</div>
      </div>
      <div class="class-icon">${s.subject_icon||'📚'}</div>
      <div class="class-info">
        <div class="class-name">${s.subject_name}</div>
        <div class="class-meta">${[s.teacher, s.room].filter(Boolean).join(' · ')}</div>
        ${s.notes ? `<div class="class-meta" style="margin-top:4px;font-style:italic">${s.notes}</div>` : ''}
      </div>
      <div class="class-notify-badge">🔔 ${s.notify_minutes_before}m</div>
      <div class="sched-actions">
        <button class="sched-action-btn" onclick="editSchedule(${s.id})">✏️</button>
        <button class="sched-action-btn delete" onclick="deleteSchedule(${s.id})">🗑</button>
      </div>
    </div>
  `).join('');
}

$('btn-add-schedule').addEventListener('click', () => {
  if (!subjects.length) { toast('Add a subject first!', 'info'); navigateTo('subjects'); return; }
  $('modal-sched-title').textContent = 'Add Class';
  $('sched-edit-id').value = '';
  $('form-schedule').reset();
  $('sched-day').value = selectedDay;
  openModal('modal-schedule');
});

$('form-schedule').addEventListener('submit', async e => {
  e.preventDefault();
  const id = $('sched-edit-id').value;
  const payload = {
    subject_id: $('sched-subject').value,
    day_of_week: $('sched-day').value,
    start_time: $('sched-start').value,
    end_time: $('sched-end').value,
    notify_minutes_before: parseInt($('sched-notify').value),
    notes: $('sched-notes').value
  };
  try {
    if (id) await api(`/schedules/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
    else await api('/schedules', { method: 'POST', body: JSON.stringify(payload) });
    closeModal(); await loadSchedules(); await loadDashboard(); toast(id ? 'Class updated!' : 'Class added!', 'success');
  } catch (err) { toast(err.message, 'error'); }
});

async function editSchedule(id) {
  const s = allSchedules.find(x => x.id === id);
  if (!s) return;
  $('modal-sched-title').textContent = 'Edit Class';
  $('sched-edit-id').value = id;
  $('sched-subject').value = s.subject_id;
  $('sched-day').value = s.day_of_week;
  $('sched-start').value = s.start_time;
  $('sched-end').value = s.end_time;
  $('sched-notify').value = s.notify_minutes_before || 5;
  $('sched-notes').value = s.notes || '';
  openModal('modal-schedule');
}

async function deleteSchedule(id) {
  if (!confirm('Delete this class from schedule?')) return;
  try {
    await api(`/schedules/${id}`, { method: 'DELETE' });
    await loadSchedules(); await loadDashboard(); toast('Class removed', 'success');
  } catch (err) { toast(err.message, 'error'); }
}

// ========== NOTIFICATIONS ==========
async function loadNotifications() {
  try {
    const notifs = await api('/notifications');
    const el = $('notif-list');
    if (!notifs.length) {
      el.innerHTML = `<div class="empty-state"><div class="empty-icon">🔔</div><h3>No notifications yet</h3><p>Notifications will appear here after being sent</p></div>`;
      return;
    }
    el.innerHTML = notifs.map(n => `
      <div class="notif-item">
        <div class="notif-status ${n.status}">
          ${n.status === 'sent' ? '✅' : '❌'}
        </div>
        <div class="notif-text">
          <div class="notif-subject">${n.subject_name} — ${n.day_of_week} ${fmt12(n.start_time)}</div>
          <div class="notif-msg">${n.whatsapp_number}</div>
        </div>
        <div class="notif-time">${new Date(n.created_at).toLocaleString()}</div>
      </div>
    `).join('');
  } catch {}
}

async function loadNotifSettings() {
  try {
    const s = await api('/notifications/settings');
    if ($('set-webhook') && s.n8n_webhook_url) $('set-webhook').value = s.n8n_webhook_url;
    if ($('set-notify-mins') && s.default_notify_minutes) $('set-notify-mins').value = s.default_notify_minutes;
    if ($('set-timezone') && s.timezone) $('set-timezone').value = s.timezone;
    if ($('set-wa-enabled')) $('set-wa-enabled').checked = !!s.whatsapp_enabled;
  } catch {}
}

// ========== SETTINGS ==========
function loadSettings() {
  if (!currentUser) return;
  if ($('set-name')) $('set-name').value = currentUser.name || '';
  if ($('set-whatsapp')) $('set-whatsapp').value = currentUser.whatsapp_number || '';
  if ($('set-color')) $('set-color').value = currentUser.avatar_color || '#6C63FF';
  loadNotifSettings();
}

$('btn-save-profile').addEventListener('click', async () => {
  try {
    const updated = await api('/student/me', {
      method: 'PUT',
      body: JSON.stringify({ name: $('set-name').value, whatsapp_number: $('set-whatsapp').value, avatar_color: $('set-color').value })
    });
    currentUser = updated; localStorage.setItem('user', JSON.stringify(currentUser));
    updateUserDisplay(); toast('Profile saved!', 'success');
  } catch (err) { toast(err.message, 'error'); }
});

$('btn-save-notif').addEventListener('click', async () => {
  try {
    await api('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify({
        n8n_webhook_url: $('set-webhook').value,
        whatsapp_enabled: $('set-wa-enabled').checked ? 1 : 0,
        default_notify_minutes: parseInt($('set-notify-mins').value),
        timezone: $('set-timezone').value,
        whatsapp_number: $('set-whatsapp').value
      })
    });
    toast('Notification settings saved!', 'success');
  } catch (err) { toast(err.message, 'error'); }
});

$('btn-test-notif').addEventListener('click', async () => {
  try {
    await api('/notifications/test', { method: 'POST' });
    toast('Test notification sent via N8N! Check WhatsApp.', 'success');
  } catch (err) { toast('Test failed: ' + err.message, 'error'); }
});

// ========== MODALS ==========
function openModal(id) {
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  $('modal-overlay').classList.add('active');
  $(id).style.display = 'block';
}
function closeModal() {
  $('modal-overlay').classList.remove('active');
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
}
$('modal-overlay').addEventListener('click', e => { if (e.target === $('modal-overlay')) closeModal(); });
window.closeModal = closeModal;

// ========== VOICE ASSISTANT ==========
let recognition = null;
let isListening = false;

function initVoice() {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    if ($('voice-status')) $('voice-status').textContent = '⚠️ Speech recognition not supported in this browser';
    return;
  }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SR();
  recognition.continuous = false; recognition.interimResults = true; recognition.lang = 'en-IN';

  recognition.onresult = e => {
    const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
    if ($('voice-transcript')) $('voice-transcript').textContent = `"${transcript}"`;
    if (e.results[e.results.length - 1].isFinal) processVoiceCommand(transcript);
  };
  recognition.onend = () => {
    isListening = false;
    $('voice-orb')?.classList.remove('listening');
    if ($('voice-status')) $('voice-status').textContent = 'Tap the microphone to speak';
    if ($('mic-icon')) $('mic-icon').textContent = '🎤';
  };
  recognition.onerror = e => { toast('Voice error: ' + e.error, 'error'); };

  $('voice-orb').addEventListener('click', toggleVoice);
}

function toggleVoice() {
  if (!recognition) return;
  if (isListening) { recognition.stop(); return; }
  isListening = true;
  $('voice-orb').classList.add('listening');
  if ($('voice-status')) $('voice-status').textContent = '🎙️ Listening...';
  if ($('mic-icon')) $('mic-icon').textContent = '🛑';
  recognition.start();
}

async function processVoiceCommand(text) {
  const lower = text.toLowerCase();
  let response = '';
  if ($('voice-response')) $('voice-response').textContent = '⏳ Processing...';

  if (lower.includes('today') || lower.includes("today's classes")) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
    const todayClasses = allSchedules.filter(s => s.day_of_week === today).sort((a,b) => a.start_time.localeCompare(b.start_time));
    if (!todayClasses.length) response = `You have no classes today, ${currentUser?.name?.split(' ')[0]}! Enjoy your free time 🎉`;
    else response = `Today you have ${todayClasses.length} class${todayClasses.length > 1 ? 'es' : ''}: ${todayClasses.map(c => `${c.subject_name} at ${fmt12(c.start_time)}`).join(', ')}.`;
  } else if (lower.includes('next class')) {
    const now = new Date();
    const todayName = now.toLocaleDateString('en-US', { weekday: 'long' });
    const curTime = now.toTimeString().slice(0,5);
    const next = allSchedules.filter(s => s.day_of_week === todayName && s.start_time > curTime).sort((a,b) => a.start_time.localeCompare(b.start_time))[0];
    response = next ? `Your next class is ${next.subject_name} at ${fmt12(next.start_time)}${next.room ? ` in ${next.room}` : ''}.` : 'No more classes today!';
  } else if (lower.includes('schedule') || lower.includes('week')) {
    const days = ['Monday','Tuesday','Wednesday','Thursday','Friday'];
    const parts = days.map(d => {
      const classes = allSchedules.filter(s => s.day_of_week === d);
      return classes.length ? `${d}: ${classes.map(c => c.subject_name).join(', ')}` : null;
    }).filter(Boolean);
    response = parts.length ? `Your weekly schedule: ${parts.join('. ')}.` : 'Your schedule is empty. Add some classes!';
  } else if (lower.includes('subject') || lower.includes('how many')) {
    response = `You have ${subjects.length} subject${subjects.length !== 1 ? 's' : ''}: ${subjects.map(s => s.name).join(', ')}.`;
  } else {
    response = `I heard: "${text}". Try asking about today's classes, your next class, or your weekly schedule!`;
  }

  if ($('voice-response')) $('voice-response').textContent = response;
  speak(response);
}

window.fillVoiceText = text => {
  if ($('voice-transcript')) $('voice-transcript').textContent = `"${text}"`;
  processVoiceCommand(text);
};

// ========== TEXT TO SPEECH ==========
let currentUtterance = null;

function setupTTS() {
  if (!window.speechSynthesis) return;
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices();
    const sel = $('tts-voice');
    if (sel) {
      sel.innerHTML = '<option value="">Default Voice</option>' +
        voices.map((v, i) => `<option value="${i}">${v.name} (${v.lang})</option>`).join('');
    }
  };
  loadVoices();
  if (speechSynthesis.onvoiceschanged !== undefined) speechSynthesis.onvoiceschanged = loadVoices;
  $('tts-rate')?.addEventListener('input', e => { if ($('tts-rate-label')) $('tts-rate-label').textContent = e.target.value + 'x'; });
}

function speak(text) {
  if (!window.speechSynthesis || !text) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.rate = parseFloat($('tts-rate')?.value || '1');
  const voiceIdx = $('tts-voice')?.value;
  if (voiceIdx) u.voice = window.speechSynthesis.getVoices()[parseInt(voiceIdx)];
  window.speechSynthesis.speak(u);
  currentUtterance = u;
}

window.speakText = () => speak($('tts-text')?.value);
window.stopSpeech = () => { window.speechSynthesis?.cancel(); };

// ========== N8N WORKFLOW DOWNLOAD ==========
window.downloadN8NWorkflow = () => {
  const workflow = {
    "name": "EduPulse - Student Class Reminder",
    "nodes": [
      {
        "parameters": { "httpMethod": "POST", "path": "class-reminder", "responseMode": "lastNode", "options": {} },
        "id": "webhook-trigger",
        "name": "Webhook Trigger",
        "type": "n8n-nodes-base.webhook",
        "position": [240, 300]
      },
      {
        "parameters": {
          "resource": "message",
          "operation": "send",
          "from": "={{$env.TWILIO_FROM_WHATSAPP}}",
          "to": "=whatsapp:{{$json.whatsapp_number}}",
          "body": "={{$json.message}}"
        },
        "id": "whatsapp-send",
        "name": "Send WhatsApp",
        "type": "n8n-nodes-base.twilio",
        "position": [460, 300],
        "credentials": { "twilioApi": { "id": "1", "name": "Twilio Account" } }
      },
      {
        "parameters": { "values": { "string": [{ "name": "status", "value": "sent" }] } },
        "id": "respond",
        "name": "Respond",
        "type": "n8n-nodes-base.set",
        "position": [680, 300]
      }
    ],
    "connections": {
      "Webhook Trigger": { "main": [[{ "node": "Send WhatsApp", "type": "main", "index": 0 }]] },
      "Send WhatsApp": { "main": [[{ "node": "Respond", "type": "main", "index": 0 }]] }
    },
    "settings": { "executionOrder": "v1" },
    "_meta": { "instanceId": "edupulse-template" }
  };
  const blob = new Blob([JSON.stringify(workflow, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'edupulse-n8n-workflow.json';
  a.click();
  toast('N8N workflow downloaded!', 'success');
};

// ========== STARTUP ==========
if (token && currentUser) {
  initApp();
} else {
  $('auth-screen').classList.add('active');
}
