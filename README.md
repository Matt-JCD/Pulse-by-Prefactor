# Pulse — AI Social Intelligence

Monitor AI industry conversations across Reddit and Hacker News. Surface trending topics, keyword signals, and narrative synthesis every morning.

## Structure

```
pulse/
  frontend/   Next.js 16 app (App Router, TypeScript, Tailwind)
  backend/    Express API + collector agents (TypeScript, Supabase)
```

## Quick Start

### Backend
```bash
cd backend
cp .env.example .env   # fill in Supabase URL, anon key, Anthropic key
npm install
npm run dev            # starts on :3001
```

### Frontend
```bash
cd frontend
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm install
npm run dev                  # starts on :3000
```

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | Next.js 16, TypeScript, Tailwind CSS v4, Recharts, react-d3-cloud |
| Backend | Express, TypeScript, Supabase (Postgres) |
| AI | Anthropic Claude (Haiku for extraction, Sonnet for synthesis) |
| Deploy | Render |
