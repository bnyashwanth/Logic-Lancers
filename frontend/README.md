# RescueSync Frontend

The frontend is a React + Vite application for RescueSync, a real-time, offline-first disaster response platform.

It presents the landing experience, volunteer login flow, live incident map, and the SOS request workflow backed by the backend incident API.

---

## Frontend Stack

- React
- Vite
- Tailwind CSS
- Leaflet / React Leaflet
- Axios
- Socket.io client

---

## Key Screens

- Landing page for RescueSync introduction and primary calls to action
- Login screen for volunteers and responders
- Live map dashboard for viewing and joining incidents
- SOS modal for anonymous request creation
- PWA install prompt for offline-first usage

---

## Environment Variables

Create a frontend `.env` file with:

- `VITE_API_URL` - backend base URL
- `VITE_SOCKET_URL` - optional Socket.io URL override
- `VITE_SHOW_API_BANNER` - set to `true` to show the API banner

---

## Development

```bash
cd frontend
npm install
npm run dev
```

The app runs on `http://localhost:5173` by default.

---

## Notes

- The live incident view is implemented in [src/pages/MapDashboard.jsx](src/pages/MapDashboard.jsx).
- Anonymous SOS submission is handled in [src/components/SOSModal.jsx](src/components/SOSModal.jsx).
- Chat assistance is provided by [src/components/ChatWidget.jsx](src/components/ChatWidget.jsx).
