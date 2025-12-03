const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3000';

const socketHost = io(SOCKET_URL);
const socketPlayer = io(SOCKET_URL);

let roomId = 'TEST_ROOM_' + Math.floor(Math.random() * 1000);
let hostId = 'HOST_' + Math.floor(Math.random() * 1000);
let playerId = 'PLAYER_' + Math.floor(Math.random() * 1000);

console.log(`Starting Disconnect Event Test in Room: ${roomId}`);

socketHost.on('connect', () => {
    console.log('Host connected');
    socketHost.emit('join_room', { roomId, playerId: hostId });
});

socketPlayer.on('connect', () => {
    console.log('Player connected');
    setTimeout(() => {
        socketPlayer.emit('join_room', { roomId, playerId: playerId });
    }, 500);
});

socketPlayer.on('room_message', (msg) => {
    if (msg.type === 'PLAYER_DISCONNECTED') {
        console.log('✅ Received PLAYER_DISCONNECTED event:', msg);
        console.log('Test Passed!');
        socketPlayer.disconnect();
        process.exit(0);
    }
});

setTimeout(() => {
    console.log('Disconnecting Host...');
    socketHost.disconnect();
}, 2000);

// Timeout
setTimeout(() => {
    console.log('❌ Test Timed Out - Did not receive PLAYER_DISCONNECTED event');
    socketHost.disconnect();
    socketPlayer.disconnect();
    process.exit(1);
}, 5000);
