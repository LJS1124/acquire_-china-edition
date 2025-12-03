/*
 * Simple Socket.io Relay Server for Acquire: China Edition
 * 
 * Instructions:
 * 1. Initialize a new node project: npm init -y
 * 2. Install dependencies: npm install socket.io
 * 3. Run: node server.js
 * 
 * This server simply puts clients into rooms and relays messages.
 * It does not hold game state (the Host client holds the state).
 */

import { Server } from "socket.io";

const PORT = process.env.PORT || 3000;

const io = new Server(PORT, {
  cors: {
    origin: "*", // Allow all origins for testing. In production, set this to your frontend domain.
    methods: ["GET", "POST"]
  }
});

console.log(`Socket.IO Server running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log(`[Connect] Client ${socket.id}`);

  // Client wants to join a specific room
  socket.on("join_room", (roomId) => {
    socket.join(roomId);
    console.log(`[Join] ${socket.id} -> Room: ${roomId}`);
  });

  // Client wants to leave a room
  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
    console.log(`[Leave] ${socket.id} <- Room: ${roomId}`);
  });

  // Relay message to others in the room
  // Note: socket.to(roomId).emit(...) sends to everyone EXCEPT the sender.
  // This matches our previous BroadcastChannel behavior.
  socket.on("room_message", ({ roomId, message }) => {
    // console.log(`[Msg] ${roomId}: ${message.type}`);
    socket.to(roomId).emit("room_message", message);
  });

  socket.on("disconnect", () => {
    console.log(`[Disconnect] Client ${socket.id}`);
  });
});
