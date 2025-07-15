require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const { Server } = require('socket.io');
const cron = require('node-cron');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const errorHandler = require('./middleware/errorHandler'); // Import error handler

// Route imports
const userRoutes = require('./routes/userRoutes');
const courseRoutes = require('./routes/courseRoutes');
const enrollmentRoutes = require('./routes/enrollmentRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const quizRoutes = require('./routes/quizRoutes');
const quizAttemptRoutes = require('./routes/quizAttemptRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const educatorRoutes = require('./routes/educatorRoutes');
const studentRoutes = require('./routes/studentRoutes');
const studyPlanRoutes = require('./routes/studyPlanRoutes');
const evaluationRoutes = require('./routes/evaluationRoutes');
const forumRoutes = require('./routes/forumRoutes');
const doubtRoutes = require('./routes/doubtRoutes');
const footerRoutes = require('./routes/footerRoutes');
const reportRoutes = require('./routes/reportRoutes');
const avatarUploadRoute = require('./routes/avatarUploadRoute');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

// Swagger Setup
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Learning Platform API',
      version: '1.0.0',
      description: 'API documentation for the Learning Platform',
    },
    servers: [{ url: `http://localhost:${process.env.PORT || 5000}` }],
  },
  apis: ['./routes/*.js'],
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ MongoDB connected successfully.');
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  }
};
connectDB();

// Middleware
app.set('trust proxy', 1); // Trust first proxy for rate limiting
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// More permissive rate limiting for development/normal use
app.use(rateLimit({ 
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Higher limit for dev
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 'Please wait 15 minutes before trying again.'
  },
  // Skip successful requests to static files
  skip: (req) => {
    return req.url.startsWith('/uploads/') || req.url.startsWith('/api-docs');
  }
}));

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Serve static files for uploads with proper headers
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.header('Pragma', 'no-cache');
  res.header('Expires', '0');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// API Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
app.get('/', (req, res) => res.send('🚀 Learning Platform API is running...'));
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/courses', courseRoutes);
app.use('/api/v1/enrollments', enrollmentRoutes);
console.log('🔍 DEBUG: Registering assignment routes...');
app.use('/api/v1/assignments', assignmentRoutes);
console.log('🔍 DEBUG: Assignment routes registered successfully');
app.use('/api/v1/submissions', submissionRoutes);
app.use('/api/v1/quizzes', quizRoutes);
app.use('/api/v1/quizAttempts', quizAttemptRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/educators', educatorRoutes);
app.use('/api/v1/students', studentRoutes);
app.use('/api/v1/studyplans', studyPlanRoutes);
app.use('/api/v1/evaluations', evaluationRoutes);
app.use('/api/v1/forum', forumRoutes);
app.use('/api/v1/doubts', doubtRoutes); // For Zoom/Doubt sessions
app.use('/api/v1', footerRoutes);
app.use('/api/v1/reports', reportRoutes);
app.use('/api/v1/avatar', avatarUploadRoute);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/doubts', doubtRoutes);


// Socket.io Setup
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  socket.on('joinRoom', (room) => {
    socket.join(room);
    console.log(`👥 Client ${socket.id} joined room ${room}`);
  });

  socket.on('sendMessage', ({ room, message, user }) => {
    io.to(room).emit('receiveMessage', { message, user, timestamp: new Date() });
  });

  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Use centralized error handler
app.use(errorHandler);

// 404 handler (should be after all routes)
app.use((req, res, next) => {
  res.status(404).json({ message: '🔍 Route not found on this server' });
});


// Cron Job: Weekly Email Report
cron.schedule('0 9 * * 1', async () => { // Every Monday at 9 AM
  try {
    console.log('📬 Sending weekly enrollment email report...');
    // This assumes you have a secure way to trigger internal routes, like a secret token
    await fetch(`http://localhost:${process.env.PORT || 5000}/api/v1/reports/weekly-email`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${process.env.INTERNAL_CRON_TOKEN}` },
    });
  } catch (error) {
    console.error('❌ Failed to send weekly report via cron job:', error.message);
  }
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📚 Swagger docs available at http://localhost:${PORT}/api-docs`);
});