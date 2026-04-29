# 🚀 Deployment Guide for RESPONDER

Follow these steps to deploy your application to production.

## 1. Backend Deployment (Render / Railway)
The backend is a Node.js/Express app.

1. **Host**: Use [Render.com](https://render.com) or [Railway.app](https://railway.app).
2. **Build Command**: `npm install` (in the `backend` folder).
3. **Start Command**: `node server.js`.
4. **Environment Variables**:
   - `MONGO_URI`: Your MongoDB Atlas connection string.
   - `JWT_SECRET`: A long random string.
   - `GEMINI_API_KEY`: Your Google Gemini AI key.
   - `PORT`: `5001` (or whatever the host provides).

## 2. Frontend Deployment (Vercel / Netlify)
The frontend is a Vite/React app.

1. **Host**: Use [Vercel](https://vercel.com).
2. **Build Command**: `npm run build`.
3. **Output Directory**: `dist`.
4. **Environment Variables**:
   - `VITE_API_URL`: The URL of your deployed backend (e.g., `https://responder-api.onrender.com`).

## 3. PWA Setup
The app is already configured as a PWA. To make it installable on phones:
1. Ensure you serve the app over **HTTPS** (automatic on Vercel/Render).
2. Provide icons in the `frontend/public` folder:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
3. Users will see an "Install App" button in their browser.

## 4. Database Setup
Ensure your MongoDB Atlas cluster has a **Whitelist IP** set to `0.0.0.0/0` so the cloud servers can connect.

---
**Note**: Update `frontend/src/services/api.js` to point to your production URL if you don't use environment variables.
