'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const { Server } = require('socket.io');

const authRoutes = require('./routes/auth.cjs');
const adminRoutes = require('./routes/admin.cjs');
const chatRoutes = require('./routes/chat.cjs');
const incidentRoutes = require('./routes/incident.cjs');

const app = express();
const server = http.createServer(app);

function normalizeOrigin(value) {
  if (!value || typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\/$/, '').toLowerCase();
}

// Configure allowed origins
const localOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
];

const envOrigins = [
  process.env.FRONTEND_URL, // Primary deployed frontend URL
  ...(process.env.FRONTEND_URLS ? process.env.FRONTEND_URLS.split(',') : []),
]
  .map((origin) => normalizeOrigin(origin))
  .filter(Boolean);

const allowedOrigins = Array.from(new Set([...localOrigins.map(normalizeOrigin), ...envOrigins]));
const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true';
const shouldAllowAll = allowAllOrigins || allowedOrigins.length === 0;

const io = new Server(server, {
  cors: {
    origin: shouldAllowAll ? true : allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (shouldAllowAll) return callback(null, true);
    if (!origin) return callback(null, true);

    const normalizedIncomingOrigin = normalizeOrigin(origin);

    if (allowedOrigins.indexOf(normalizedIncomingOrigin) !== -1) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
const JSON_LIMIT = process.env.JSON_LIMIT || '2mb';
app.use(express.json({ limit: JSON_LIMIT }));

// Attach io to request so routes can emit events
app.use((req, _res, next) => {
  req.io = io;
  next();
});

// Health check endpoint (Render uses this)
app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/incidents', incidentRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ msg: 'Route not found' });
});

// Global error handler
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ msg: 'Internal server error' });
});

// Connect to MongoDB
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/rescuesync';

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log(`MongoDB connected: ${MONGO_URI.replace(/\/\/.*@/, '//<credentials>@')}`);
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err.message);
    process.exit(1); // Exit so Render restarts the service
  });

// Socket.io connection tracking
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
