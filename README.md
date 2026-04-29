# RescueSync

RescueSync is a real-time, offline-first disaster response platform that matches volunteers with SOS requests and keeps active incidents visible on a live map.

It is built for fast-response coordination: victims or responders can create anonymous SOS requests, volunteers can see those requests instantly, and response updates are synchronized across clients through Socket.io.

---

## Tech Stack

### Frontend
- React
- Vite
- Tailwind CSS
- Leaflet / React Leaflet
- Axios
- Socket.io client

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- Socket.io
- Ollama local LLM integration

### Platform Focus
- Anonymous victim SOS reporting
- Real-time map syncing via WebSockets
- Duplicate request prevention
- Offline-first PWA architecture

---

## Core Features

- Anonymous SOS reporting with incident creation
- Volunteer login and incident join flow
- Real-time incident map for active requests
- WebSocket-driven updates for new and updated incidents
- Duplicate request prevention through shared incident state
- Offline-first PWA behavior for field use
- Local Ollama chat assistance for guidance and support

---

## Project Structure

```text
.
├── README.md
├── backend/
│   ├── package.json
│   ├── server.cjs
│   ├── models/
│   │   ├── Incident.cjs
│   │   └── User.cjs
│   └── routes/
│       ├── admin.cjs
│       ├── auth.cjs
│       ├── chat.cjs
│       └── incident.cjs
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   ├── vercel.json
│   └── src/
│       ├── App.jsx
│       ├── components/
│       ├── context/
│       ├── pages/
│       └── services/
└── sample/
```

---

## API Endpoints

Base URL: `VITE_API_URL` on the frontend, or `http://localhost:5001` in local development.

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register a user |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/admin-login` | Admin login |
| GET | `/api/incidents` | Fetch active incidents |
| POST | `/api/incidents` | Create a new SOS incident |
| POST | `/api/incidents/:id/join` | Join an incident as a volunteer |
| POST | `/api/chat` | Local Ollama chat endpoint (will use Gemini when `GEMINI_API_KEY` is set) |
| GET | `/api/admin/operators` | Admin operators list |
| GET | `/api/admin/stats` | Admin dashboard stats |

### Incident Request Bodies

`POST /api/incidents`

```json
{
  "requesterId": "string",
  "type": "BLOOD | MEDICINE | RESCUE | SUPPLIES",
  "description": "string",
  "location": {
    "lat": 0,
    "lng": 0
  },
  "requiredVolunteers": 5
}
```

`POST /api/incidents/:id/join`

```json
{
  "userId": "string"
}
```

---

## Local Development

### 1. Start MongoDB locally
Make sure your local MongoDB service is running on port 27017.

### 2. Setup backend env

```bash
cd backend
cp .env.example .env
# Edit .env with your values
```

### 3. Install dependencies

```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && npm install
```

### 4. Run both servers

**Option A — Two terminals (recommended):**

```bash
# Terminal 1 — Frontend
cd frontend
npm run dev

# Terminal 2 — Backend
cd backend
npm start
```

**Option B — Single terminal:**

```bash
cd frontend
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:5001`

---

## Deployment

### Frontend → Vercel

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. **Build Command:** `npm run build`
4. **Output Directory:** `dist`
5. Add environment variable: `VITE_API_URL=<your-render-backend-url>`

Note: If Vercel install fails due to peer dependency conflicts (e.g., `vite-plugin-pwa` vs `vite`), add a project-level `.npmrc` with `legacy-peer-deps=true` or set the install command to `npm install --legacy-peer-deps` in Vercel settings. This allows the build to proceed while you upgrade plugin versions.

### Backend → Render

1. Create a new **Web Service** in [Render](https://render.com).
2. Connect your GitHub repo.
3. **Root Directory:** `backend`
4. **Build Command:** `npm install`
5. **Start Command:** `npm start`
6. Add environment variables in the Render dashboard:
   - `MONGO_URI` — MongoDB Atlas connection string
   - `JWT_SECRET` — a long random string
   - `ADMIN_EMAIL` — your admin email
   - `ADMIN_PASSWORD` — your admin password
   - `FRONTEND_URL` — your Vercel deployment URL for CORS
   - `FRONTEND_URLS` — optional comma-separated allow-list of frontend origins
   - `ALLOW_ALL_ORIGINS` — set to `true` only for local experimentation
   - `OLLAMA_URL` — the Ollama server URL used by chat.cjs
   - `OLLAMA_MODEL` — the Ollama model name
   - `OLLAMA_TIMEOUT_MS` — optional request timeout override
  - `GEMINI_API_KEY` — optional Google Generative AI / Gemini API key. When set, the backend will attempt to use Gemini for `/api/chat` and fall back to Ollama.
  - `GEMINI_MODEL` — optional Gemini model id (default: `chat-bison-001`)
  - `GEMINI_BASE` — optional Gemini base URL (default: `https://generativelanguage.googleapis.com`)

---

## Runtime Notes

- The live map is implemented in [frontend/src/pages/MapDashboard.jsx](frontend/src/pages/MapDashboard.jsx).
- Anonymous SOS creation is handled through [frontend/src/components/SOSModal.jsx](frontend/src/components/SOSModal.jsx).
- Real-time incident broadcasting is emitted from [backend/routes/incident.cjs](backend/routes/incident.cjs).
- Chat assistance is handled through local Ollama in [backend/routes/chat.cjs](backend/routes/chat.cjs).
