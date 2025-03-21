const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const app = express();
app.use(
  cors({ origin: process.env.CLIENT_URL || "*", methods: ["GET", "POST"], credentials: true })
);

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || "*", methods: ["GET", "POST"], credentials: true },
  transports: ["websocket", "polling"],
  allowEIO3: true,
});

const rooms = new Map();

io.on("connection", (socket) => {
  console.log(`User connected: ${socket.id} from ${socket.handshake.address}`);

  socket.on("join-drawing", ({ roomId, userName }) => {
    socket.join(roomId);
    console.log(`User ${userName} (${socket.id}) joined drawing room ${roomId}`);

    if (!rooms.has(roomId)) {
      rooms.set(roomId, { drawingData: [], users: new Map() });
    }

    const room = rooms.get(roomId);
    room.users.set(socket.id, { id: socket.id, name: userName });

    socket.emit("initial-state", { drawings: room.drawingData });
  });

  socket.on("draw", ({ roomId, drawingData }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.drawingData.push(drawingData);
      socket.to(roomId).emit("drawing-data", drawingData);
    }
  });

  socket.on("clear-canvas", ({ roomId }) => {
    if (rooms.has(roomId)) {
      const room = rooms.get(roomId);
      room.drawingData = [];
      socket.to(roomId).emit("clear-canvas");
    }
  });

  socket.on("disconnect", () => {
    console.log(`User disconnected: ${socket.id}`);
    rooms.forEach((room, roomId) => {
      if (room.users.has(socket.id)) {
        room.users.delete(socket.id);
        if (room.users.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
const HOST = "0.0.0.0";

httpServer.listen(PORT, HOST, () => {
  console.log(`Drawing server running on port ${PORT}`);
});
