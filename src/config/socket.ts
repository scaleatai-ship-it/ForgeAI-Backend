import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setSocketServer(server: SocketIOServer) {
  io = server;
}

export function getSocketServer() {
  if (!io) {
    throw new Error("Socket server is not initialized");
  }

  return io;
}
