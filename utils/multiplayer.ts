import { NetworkMessage, PlayerProfile, Room } from '../types';
import { io, Socket } from 'socket.io-client';

// CONFIGURATION
// If running locally, use localhost:3000.
// If deployed, use your production URL.
// We try to auto-detect: if we are on localhost/127.0.0.1, assume local server.
// Otherwise, assume relative path or specific prod URL.
const IS_LOCALHOST = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SOCKET_URL = IS_LOCALHOST 
  ? 'http://localhost:3000' 
  : window.location.origin; // Changed to use window.location.origin to support tunneling

let socket: Socket | null = null;
let messageHandler: ((msg: NetworkMessage) => void) | null = null;

// Initialize Network Connection
export const initNetwork = (onMessage: (msg: NetworkMessage) => void, onStatusChange?: (connected: boolean) => void) => {
  messageHandler = onMessage;

  if (socket) {
    if (onStatusChange) onStatusChange(socket.connected);
    return; // Already initialized
  }

  console.log(`Connecting to WebSocket Server: ${SOCKET_URL}`);
  
  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'], // Try websocket first
    reconnectionAttempts: 5,
    timeout: 10000,
    path: '/socket.io' // Ensure path is set correctly
  });

  messageHandler = onMessage;

  socket.on('connect', () => {
    console.log('✅ WebSocket Connected:', socket?.id);
    if (onStatusChange) onStatusChange(true);
  });

  socket.on('disconnect', () => {
    console.log('❌ WebSocket Disconnected');
    if (onStatusChange) onStatusChange(false);
  });

  socket.on('connect_error', (err) => {
    console.error('WebSocket Connection Error:', err);
    if (onStatusChange) onStatusChange(false);
  });

  // Handle incoming messages from the server
  socket.on('room_message', (msg: NetworkMessage) => {
    if (messageHandler) {
      messageHandler(msg);
    }
  });
};

// Join a specific room channel on the server
export const joinGameRoom = (roomId: string) => {
  if (socket && socket.connected) {
    socket.emit('join_room', roomId);
  } else {
    console.warn('Cannot join room: Socket not connected');
  }
};

// Leave a specific room channel
export const leaveGameRoom = (roomId: string) => {
  if (socket && socket.connected) {
    socket.emit('leave_room', roomId);
  }
};

// Broadcast a message to everyone else in the room
export const broadcastMessage = (msg: NetworkMessage) => {
  if (socket && socket.connected) {
    // We wrap the message in a payload expected by server.js
    socket.emit('room_message', {
      roomId: msg.roomId,
      message: msg
    });
  } else {
    console.warn('Cannot send message: Socket not connected');
  }
};

// Utility to generate random ID
export const generateId = () => Math.random().toString(36).substring(2, 9);

// Create a local room object (Initial state)
export const createRoom = (host: PlayerProfile): Room => {
  return {
    id: generateId().toUpperCase(), // 6-7 char random ID
    hostId: host.id,
    players: [host],
    status: 'WAITING'
  };
};

// Logic to handle room updates (Host Authority Logic)
// This remains unchanged as the "Server" is just a relay.
export const handleHostRoomLogic = (
  currentRoom: Room, 
  msg: NetworkMessage, 
  localPlayerId: string
): Room | null => {
  if (msg.roomId !== currentRoom.id) return null;
  if (currentRoom.hostId !== localPlayerId) return null; // Only host processes room joins/updates

  let updatedRoom = { ...currentRoom };
  let changed = false;

  switch (msg.type) {
    case 'JOIN_ROOM':
      const newPlayer = msg.payload as PlayerProfile;
      // Prevent duplicates and respect max players
      if (!updatedRoom.players.find(p => p.id === newPlayer.id) && updatedRoom.players.length < 6 && updatedRoom.status === 'WAITING') {
        updatedRoom.players = [...updatedRoom.players, newPlayer];
        changed = true;
      }
      break;
      
    case 'UPDATE_ROOM':
      const updateData = msg.payload as Partial<PlayerProfile>;
      
      if (msg.payload.left) {
         updatedRoom.players = updatedRoom.players.filter(p => p.id !== msg.senderId);
         changed = true;
      } else {
        updatedRoom.players = updatedRoom.players.map(p => 
            p.id === msg.senderId ? { ...p, ...updateData } : p
        );
        changed = true;
      }
      break;
  }

  if (changed) {
    return updatedRoom;
  }
  return null;
};
