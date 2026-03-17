# 🎓 EduPulse — Smart Student Scheduler

A full-stack student schedule management system with WhatsApp notifications via N8N, voice recognition, and text-to-speech.

---

## ✨ Features

- 📅 **Weekly Schedule Management** — Add classes by day/time with repeat support
- 🔔 **WhatsApp Notifications** — Automated reminders via N8N (configurable minutes before class)
- 🎤 **Voice Recognition** — Speak commands to query your schedule (Web Speech API)
- 🔊 **Text-to-Speech** — Hear your schedule read aloud
- 📚 **Subject Management** — Color-coded subjects with icons, teacher, room info
- 📊 **Dashboard** — Stats and today's class overview
- 🔐 **Authentication** — JWT-based secure login/register
- 🗄️ **SQLite Database** — Lightweight, zero-config SQL database
- ⚙️ **N8N Integration Guide** — Step-by-step setup walkthrough built into the app

---

## 🚀 Quick Start

### Option 1 — Direct Run
```bash
cd backend
npm install
node server.js
```
Open http://localhost:3001 in your browser.

### Option 2 — Docker Compose (includes N8N)
```bash
docker-compose up -d
```
- App: http://localhost:3001
- N8N: http://localhost:5678

---

## ⚙️ Environment Variables

Copy `backend/.env.example` to `backend/.env` and configure:

```env
PORT=3001
JWT_SECRET=your-super-secret-key
NODE_ENV=development
```

---

## 📱 WhatsApp Setup (N8N)

1. Install & start N8N: `npx n8n start` or Docker
2. Open N8N at http://localhost:5678
3. Import `n8n-workflows/edupulse-workflow.json`
4. Add your Twilio/WhatsApp credentials
5. In EduPulse → Settings → paste your N8N webhook URL
6. Add your WhatsApp number with country code (+91...)
7. Click "Test WhatsApp" to verify!

The scheduler checks every minute and sends a notification X minutes before each class.

---

## 🎤 Voice Commands

- "What classes do I have today?"
- "What is my next class?"
- "Read my schedule for this week"
- "How many subjects do I have?"

---

## 📁 Project Structure

```
student-scheduler/
├── backend/
│   ├── server.js          # Express server + static files
│   ├── scheduler.js       # Cron job for notifications
│   ├── db/database.js     # SQLite schema & connection
│   ├── routes/
│   │   ├── auth.js        # Register/Login
│   │   ├── student.js     # Profile & stats
│   │   ├── schedules.js   # CRUD schedules
│   │   ├── subjects.js    # CRUD subjects
│   │   └── notifications.js # History & settings
│   └── middleware/auth.js # JWT middleware
├── frontend/
│   ├── index.html         # Single-page app
│   ├── css/styles.css     # Full dark theme UI
│   └── js/app.js          # All frontend logic
├── docker-compose.yml     # App + N8N containers
└── README.md
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create account |
| POST | /api/auth/login | Sign in |
| GET | /api/student/me | Get profile |
| GET | /api/student/stats | Dashboard stats |
| GET/POST | /api/subjects | List/create subjects |
| PUT/DELETE | /api/subjects/:id | Update/delete subject |
| GET/POST | /api/schedules | List/create schedules |
| PUT/DELETE | /api/schedules/:id | Update/delete schedule |
| GET | /api/notifications | Notification history |
| GET/PUT | /api/notifications/settings | N8N config |
| POST | /api/notifications/test | Send test WhatsApp |

---

Built with ❤️ — Express.js, SQLite, Vanilla JS, N8N, Web Speech API
