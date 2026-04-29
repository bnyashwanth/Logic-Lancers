# Walkthrough — Hyperlocal Disaster Sync

## What Was Built
A complete full-stack **RESPONDER** application converted from 4 Stitch HTML mockups into a production-ready React + Express + MongoDB architecture.

## Architecture
```
Logic Lancers/
├── html/                      # 4 Stitch source mockups (reference)
├── frontend/                  # React + Vite (35+ files)
│   ├── src/
│   │   ├── styles/index.css   # Design system tokens
│   │   ├── components/        # 10 component groups
│   │   │   ├── layout/        # AppShell, TopAppBar, BottomNavBar, DesktopSidebar
│   │   │   ├── feed/          # TriageCard, FilterChips, FeedList
│   │   │   ├── detail/        # CoordinationModal, VolunteerProgress, DetailRow
│   │   │   ├── map/           # MapView (Leaflet), IncidentOverlay
│   │   │   ├── form/          # RequestForm, UrgencySelector, LocationPicker
│   │   │   └── ui/            # Icon
│   │   ├── pages/             # FeedPage, MapPage, RequestPage, LoginPage, RegisterPage
│   │   ├── hooks/             # useIncidents, useOnlineStatus
│   │   ├── context/           # AuthContext
│   │   └── services/          # api.js, socket.js
├── backend/                   # Node.js + Express
│   ├── server.js              # Express + Socket.io + MongoDB
│   ├── config/db.js           # Mongoose connection
│   ├── models/                # User.js, Incident.js
│   ├── routes/                # auth.js, incidents.js, volunteers.js
│   └── middleware/auth.js     # JWT middleware
```

## Design System Mapping
All Stitch design tokens are preserved as CSS custom properties:

| Token | Value | Usage |
|-------|-------|-------|
| `--color-primary-container` | `#1F2937` | Buttons, nav active, headers |
| `--color-error` | `#BA1A1A` | CRITICAL urgency, FAB, alerts |
| `--color-secondary` | `#0051D5` | STABLE urgency, links, focus |
| `--color-tertiary` | `#1D1202` | URGENT urgency level |
| `--color-surface-container-lowest` | `#FFFFFF` | Card/page backgrounds |
| Font | Inter 400–800 | All text |
| Border Radius | 0.25rem | Sharp utilitarian |
| Touch Target | 48px min | All interactive elements |

## Screen-to-Component Mapping
| Stitch Screen | React Components |
|---------------|-----------------|
| **1.html** — Nearby Requests Feed | `FeedPage` → `FilterChips` + `FeedList` → `TriageCard` |
| **2.html** — Coordination Detail | `CoordinationModal` → `VolunteerProgress` + `DetailRow` |
| **3.html** — Live Coordination Map | `MapPage` → `MapView` + `IncidentOverlay` + `OfflineBanner` |
| **4.html** — Request Resources | `RequestPage` → `RequestForm` → `UrgencySelector` + `LocationPicker` |

## Backend API Routes
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register volunteer |
| POST | `/api/auth/login` | JWT login |
| GET | `/api/auth/me` | Current user |
| GET | `/api/incidents` | List incidents (filterable) |
| GET | `/api/incidents/:id` | Incident detail |
| POST | `/api/incidents` | Create request → Socket.io emit |
| PUT | `/api/incidents/:id/volunteer` | Join → Socket.io emit |
| PUT | `/api/incidents/:id/resolve` | Mark resolved |
| GET | `/api/volunteers/nearby` | Available volunteers |
| PUT | `/api/volunteers/availability` | Toggle status |

## Real-time (Socket.io)
Events wired:
- `incident:new` — emitted on POST, listened in `useIncidents`
- `incident:updated` — emitted on volunteer/resolve, auto-updates feed
- `volunteer:location` — broadcast GPS coordinates
- `volunteer:status` — availability toggle

## Verification
✅ Frontend dev server starts clean on port 5173
✅ Login page renders with correct Stitch design system

## Next Steps

> [!IMPORTANT]
> **You must update `backend/.env`** with your MongoDB Atlas connection string before running the backend:
> ```
> MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/responder
> ```

Then start both servers:
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```
