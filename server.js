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

// In-memory storage for room states
const rooms = {}; // { roomId: { gameState: null, roomState: null, lastUpdated: number } }

console.log(`Socket.IO Server running on port ${PORT}`);

io.on("connection", (socket) => {
  console.log(`[Connect] Client ${socket.id}`);

  // Client wants to join a specific room
  socket.on("join_room", ({ roomId, playerId }) => {
    socket.join(roomId);
    // Store mapping for disconnect handling
    socket.data.roomId = roomId;
    socket.data.playerId = playerId;
    
    console.log(`[Join] ${socket.id} (${playerId}) -> Room: ${roomId}`);
    
    // Initialize room storage if needed
    if (!rooms[roomId]) {
        rooms[roomId] = { gameState: null, roomState: null, lastUpdated: Date.now() };
    }

    // If we have state, send it to the joining player immediately
    const roomData = rooms[roomId];
    if (roomData.roomState || roomData.gameState) {
        console.log(`[Sync] Sending cached state to ${playerId} in ${roomId}`);
        socket.emit("room_message", {
            type: 'SYNC_STATE',
            roomId: roomId,
            senderId: 'SERVER',
            payload: {
                room: roomData.roomState,
                gameState: roomData.gameState
            }
        });
    }
  });

  // Client wants to leave a room
  socket.on("leave_room", (roomId) => {
    socket.leave(roomId);
    console.log(`[Leave] ${socket.id} <- Room: ${roomId}`);
    // Clear data
    socket.data.roomId = null;
    socket.data.playerId = null;
  });

  // Relay message to others in the room
  // Note: socket.to(roomId).emit(...) sends to everyone EXCEPT the sender.
  // This matches our previous BroadcastChannel behavior.
  socket.on("room_message", ({ roomId, message }) => {
    // console.log(`[Msg] ${roomId}: ${message.type}`);
    socket.to(roomId).emit("room_message", message);
    
    // Server-side Caching
    if (rooms[roomId]) {
        rooms[roomId].lastUpdated = Date.now();
        
        if (message.type === 'SYNC_STATE') {
            if (message.payload.room) {
                rooms[roomId].roomState = message.payload.room;
            }
            if (message.payload.gameState) {
                rooms[roomId].gameState = message.payload.gameState;
            }
        }
        
        if (message.type === 'START_GAME') {
             rooms[roomId].gameState = message.payload;
        }

        if (message.type === 'RESET_ROOM') {
             rooms[roomId].gameState = null;
             if (message.payload.room) {
                 rooms[roomId].roomState = message.payload.room;
             }
        }
        
        // If host updates room (e.g. players ready), update room state
        // We assume the message payload contains the updated room if type is UPDATE_ROOM 
        // But UPDATE_ROOM usually has partial payload. We might need to wait for SYNC_STATE.
    }
  });

  socket.on("disconnect", () => {
    console.log(`[Disconnect] Client ${socket.id}`);
    if (socket.data.roomId && socket.data.playerId) {
        console.log(`[Auto-Leave] ${socket.data.playerId} from ${socket.data.roomId}`);
        // Notify room of disconnection
        io.to(socket.data.roomId).emit("room_message", {
            type: 'PLAYER_DISCONNECTED',
            roomId: socket.data.roomId,
            senderId: 'SERVER',
            payload: { playerId: socket.data.playerId }
        });
    }
  });
});

// Cleanup Mechanism
const CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ROOM_TIMEOUT = 30 * 60 * 1000; // 30 minutes inactive

setInterval(() => {
    const now = Date.now();
    for (const roomId in rooms) {
        if (now - rooms[roomId].lastUpdated > ROOM_TIMEOUT) {
            console.log(`[Cleanup] Removing inactive room ${roomId}`);
            delete rooms[roomId];
        }
    }
}, CLEANUP_INTERVAL);
