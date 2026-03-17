#!/bin/bash
echo "🚀 Starting EduPulse Student Scheduler..."
cd backend
if [ ! -f .env ]; then
  cp .env.example .env
  echo "✅ Created .env file"
fi
npm install
node server.js
