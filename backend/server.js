require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/db');

// Route imports
const authRoutes = require('./routes/auth');
const incidentRoutes = require('./routes/incidents');
const volunteerRoutes = require('./routes/volunteers');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean),
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  },
});

// Store io instance for route access
app.set('io', io);

// Middleware
app.use(cors({ 
  origin: [process.env.CLIENT_URL, 'http://localhost:5173', 'http://localhost:5174'].filter(Boolean),
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/volunteers', volunteerRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`[WS] Client connected: ${socket.id}`);

  socket.on('join:incident', (incidentId) => {
    socket.join(`incident:${incidentId}`);
  });

  socket.on('leave:incident', (incidentId) => {
    socket.leave(`incident:${incidentId}`);
  });

  socket.on('volunteer:location', (data) => {
    io.emit('volunteer:location', data);
  });

  socket.on('disconnect', () => {
    console.log(`[WS] Client disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 5001;

connectDB().then(() => {
  server.listen(PORT, () => {
    console.log(`[SERVER] Running on port ${PORT}`);
    console.log(`[WS] Socket.io ready`);
  });
});
