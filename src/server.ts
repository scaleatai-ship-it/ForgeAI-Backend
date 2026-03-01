import fs from "node:fs";
import http from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { redis } from "./config/redis.js";
import { setSocketServer } from "./config/socket.js";
import { apiRouter } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware.js";
import { initGenerationWorker } from "./queue/generation.queue.js";

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: env.CORS_ORIGIN,
    credentials: true
  }
});

setSocketServer(io);

const downloadsDir = "/tmp/forge-ai-downloads";
fs.mkdirSync(downloadsDir, { recursive: true });

app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true
  })
);
app.use(helmet());
app.use(morgan("combined"));
app.use(cookieParser());
app.use("/api/billing/webhook", express.raw({ type: "application/json" }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/downloads", express.static(downloadsDir));

app.get("/health", (_request, response) => {
  response.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

io.on("connection", (socket) => {
  socket.on("project:join", (projectId: string) => {
    socket.join(projectId);
  });

  socket.on("project:leave", (projectId: string) => {
    socket.leave(projectId);
  });
});

async function start() {
  try {
    console.log("⏳ 1. Attempting to connect to Prisma...");
    await prisma.$connect();
    console.log("✅ 1. Prisma connected successfully!");

    console.log("⏳ 2. Attempting to ping Redis...");
    await redis.ping();
    console.log("✅ 2. Redis pinged successfully!");

    console.log("⏳ 3. Initializing generation worker...");
    await initGenerationWorker(io);
    console.log("✅ 3. Generation worker initialized!");

    // Prioritize Railway's dynamic PORT, fallback to custom env.PORT
    const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : (env.PORT || 8080);

    // CRITICAL: Bind to 0.0.0.0 so Railway can route external traffic to the container
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 Forge AI backend running on port ${PORT} at 0.0.0.0`);
    });
  } catch (error) {
    console.error("❌ CRITICAL ERROR DURING STARTUP:", error);
    process.exit(1);
  }
}

start();

async function gracefulShutdown() {
  console.log("Shutting down Forge AI backend...");

  server.close(async () => {
    await prisma.$disconnect();
    await redis.quit();
    process.exit(0);
  });
}

process.on("SIGTERM", gracefulShutdown);
process.on("SIGINT", gracefulShutdown);