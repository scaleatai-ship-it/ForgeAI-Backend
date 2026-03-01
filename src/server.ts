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
  await prisma.$connect();
  await redis.ping();
  await initGenerationWorker(io);

  server.listen(env.PORT, () => {
    console.log(`Forge AI backend running on port ${env.PORT}`);
  });
}

start().catch((error) => {
  console.error("Failed to start server", error);
  process.exit(1);
});

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
