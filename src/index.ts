import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { connectDatabase } from './config/database';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import eventMonitorService from './services/eventMonitorService';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware - More permissive CORS for development
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // Allow localhost and 127.0.0.1 on any port for development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    
    // Allow configured frontend URL
    if (origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Foo', 'X-Bar'],
}));

// Increase body size limit for base64 image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Routes
app.use('/api', routes);

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();

    // Start event monitoring (optional - enable in production)
    if (process.env.ENABLE_EVENT_MONITORING === 'true') {
      try {
        await eventMonitorService.startMonitoring();

        // Run reconciliation every hour
        setInterval(async () => {
          await eventMonitorService.reconcileData();
        }, 60 * 60 * 1000);
      } catch (error) {
        console.warn('⚠️  Event monitoring not started:', error);
      }
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`
🚀 Server is running on port ${PORT}
📝 Environment: ${process.env.NODE_ENV || 'development'}
🔗 API URL: http://localhost:${PORT}/api
${process.env.ENABLE_EVENT_MONITORING === 'true' ? '🔍 Event monitoring: ENABLED' : ''}
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await eventMonitorService.stopMonitoring();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await eventMonitorService.stopMonitoring();
  process.exit(0);
});

export default app;
