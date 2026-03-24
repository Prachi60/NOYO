// Restart triggered at 2026-03-02T15:56
import express from "express"
import dotenv from "dotenv"
import http from "http"
import { Server } from "socket.io"
import connectDB from "./app/dbConfig/dbConfig.js"
import setupRoutes from "./app/routes/index.js";
import cors from "cors"
import { initSocket } from "./app/socket/socketManager.js"

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 7000;
const NODE_ENV = process.env.NODE_ENV || "development";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// CORS Configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = FRONTEND_URL.split(",").map((url) => url.trim());
    // Allow any localhost port in development or if explicitly in allowedOrigins
    if (
      !origin ||
      allowedOrigins.indexOf(origin) !== -1 ||
      origin.startsWith("http://localhost:")
    ) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked for origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ['GET', 'POST'],
  }
});
initSocket(io);

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Lightweight request logger & timing (disabled in production)
if (NODE_ENV !== "production") {
  app.use((req, res, next) => {
    const start = Date.now();
    const hasBody = req.body && Object.keys(req.body).length > 0;
    res.on("finish", () => {
      const duration = Date.now() - start;
      const bodySummary = hasBody ? ` bodyKeys=${Object.keys(req.body).slice(0, 5).join(",")}` : "";
      if (duration > 500) {
        console.warn(
          `[SLOW ${duration}ms] ${req.method} ${req.originalUrl} -> ${res.statusCode}${bodySummary}`
        );
      } else {
        console.log(
          `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)${bodySummary}`
        );
      }
    });
    next();
  });
}

// Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV
  });
});

// Welcome Endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Quick Commerce API',
    version: '1.0.0',
    status: 'running'
  });
});

// Connect to Database
connectDB();

// Setup Routes
setupRoutes(app);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: true,
    message: 'Route not found'
  });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: true,
    message: NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Start Server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`
╔════════════════════════════════════════╗
║   Quick Commerce API Server Started    ║
╠════════════════════════════════════════╣
║ Environment: ${NODE_ENV.padEnd(28)} ║
║ Port: ${PORT.toString().padEnd(33)} ║
║ CORS Origin: ${FRONTEND_URL.substring(0, 25).padEnd(28)} ║
║ Socket.IO: Enabled                     ║
╚════════════════════════════════════════╝
  `);
});


