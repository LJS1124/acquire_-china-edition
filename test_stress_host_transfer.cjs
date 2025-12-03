const io = require('socket.io-client');

const SOCKET_URL = 'http://localhost:3000';

// Helpers
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTest() {
    console.log('Starting 10x Host Transfer Stress Test (Simulator Mode)...');
    
    const roomId = 'STRESS_ROOM_' + Math.floor(Math.random() * 10000);
    const clientIds = ['PLAYER_A', 'PLAYER_B', 'PLAYER_C'];
    const clients = [];
    
    // Client Logic Simulator
    const createClient = (id) => {
        const socket = io(SOCKET_URL);
        const client = {
            id,
            socket,
            room: null,
            isHost: false
        };

        socket.on('connect', () => {
            // console.log(`${id} Connected`);
        });

        socket.on('room_message', (msg) => {
            if (msg.roomId !== roomId) return;

            // 1. Handle SYNC_STATE
            if (msg.type === 'SYNC_STATE' && msg.payload.room) {
                client.room = msg.payload.room;
                client.isHost = (client.room.hostId === client.id);
            }

            // 2. Handle JOIN_ROOM (Host Logic)
            if (msg.type === 'JOIN_ROOM' && client.isHost) {
                const newPlayer = msg.payload;
                if (!client.room.players.find(p => p.id === newPlayer.id)) {
                    // Add player
                    const updatedRoom = {
                        ...client.room,
                        players: [...client.room.players, newPlayer]
                    };
                    client.room = updatedRoom;
                    // Broadcast update
                    socket.emit('room_message', {
                        roomId,
                        message: {
                            type: 'SYNC_STATE',
                            roomId,
                            senderId: client.id,
                            payload: { room: updatedRoom }
                        }
                    });
                }
            }

            // 3. Handle PLAYER_DISCONNECTED (All Clients Logic - for Takeover)
            if (msg.type === 'PLAYER_DISCONNECTED') {
                const pId = msg.payload.playerId;
                
                if (client.room) {
                    // If Host Disconnected
                    if (pId === client.room.hostId) {
                        const remainingPlayers = client.room.players.filter(p => p.id !== pId);
                        if (remainingPlayers.length > 0) {
                            const newHost = remainingPlayers[0];
                            // If I am the new host, I take over
                            if (newHost.id === client.id) {
                                console.log(`[${client.id}] Taking Over Host...`);
                                const myProfile = { ...newHost, isHost: true, isReady: true };
                                const updatedPlayers = remainingPlayers.map(p => 
                                    p.id === client.id ? myProfile : p
                                );
                                const newRoomState = {
                                    ...client.room,
                                    hostId: client.id,
                                    players: updatedPlayers
                                };
                                client.room = newRoomState;
                                client.isHost = true;

                                socket.emit('room_message', {
                                    roomId,
                                    message: {
                                        type: 'SYNC_STATE',
                                        roomId,
                                        senderId: client.id,
                                        payload: { room: newRoomState }
                                    }
                                });
                            }
                        }
                    } 
                    // If Regular Player Disconnected (Host Logic)
                    else if (client.isHost) {
                        const updatedPlayers = client.room.players.filter(p => p.id !== pId);
                        const updatedRoom = { ...client.room, players: updatedPlayers };
                        client.room = updatedRoom;
                         socket.emit('room_message', {
                            roomId,
                            message: {
                                type: 'SYNC_STATE',
                                roomId,
                                senderId: client.id,
                                payload: { room: updatedRoom }
                            }
                        });
                    }
                }
            }
        });

        return client;
    };

    // Initialize Clients
    for (let i = 0; i < 3; i++) {
        clients.push(createClient(clientIds[i]));
    }

    // Step 1: PLAYER_A Creates Room
    const host = clients[0];
    host.socket.emit('join_room', { roomId, playerId: host.id });
    
    const initialRoom = {
        id: roomId,
        hostId: host.id,
        players: [{
            id: host.id,
            name: host.id,
            isReady: true,
            isHost: true,
            joinedAt: Date.now()
        }],
        status: 'WAITING'
    };
    
    host.room = initialRoom;
    host.isHost = true;
    
    // Sync initial state
    host.socket.emit('room_message', {
        roomId,
        message: {
            type: 'SYNC_STATE',
            roomId,
            senderId: host.id,
            payload: { room: initialRoom }
        }
    });

    await sleep(1000);

    // Step 2: Others Join
    for (let i = 1; i < 3; i++) {
        const c = clients[i];
        c.socket.emit('join_room', { roomId, playerId: c.id });
        await sleep(200);
        c.socket.emit('room_message', {
            roomId,
            message: {
                type: 'JOIN_ROOM',
                roomId,
                senderId: c.id,
                payload: {
                    id: c.id,
                    name: c.id,
                    isReady: false,
                    isHost: false,
                    joinedAt: Date.now()
                }
            }
        });
    }

    await sleep(2000);

    // Verify Setup
    if (clients[0].room.players.length !== 3) {
        console.error('❌ Setup Failed. Players not joined.', clients[0].room?.players.length);
        process.exit(1);
    }
    console.log('✅ Setup Complete. 3 Players in Room.');

    // Step 3: Stress Loop
    for (let round = 1; round <= 10; round++) {
        console.log(`\n--- Round ${round} ---`);
        
        // Find current host
        const currentHostIndex = clients.findIndex(c => c.isHost && c.socket.connected);
        if (currentHostIndex === -1) {
            console.error('❌ No active host found! Test Failed.');
            process.exit(1);
        }

        const hostClient = clients[currentHostIndex];
        console.log(`Current Host: ${hostClient.id}. Disconnecting...`);

        // Disconnect Host
        hostClient.socket.disconnect();
        hostClient.isHost = false; // Manual reset for test logic
        
        await sleep(1500);
        
        // Verify New Host
        const newHost = clients.find(c => c.isHost && c.socket.connected);
        if (newHost) {
             console.log(`✅ Round ${round} Success. New Host: ${newHost.id}`);
        } else {
             console.log(`❌ Round ${round} Failed. No new host detected.`);
             // Debug info
             clients.forEach(c => {
                 if (c.socket.connected) {
                     console.log(`   ${c.id}: isHost=${c.isHost} Players=${c.room?.players.map(p=>p.id)}`);
                 }
             });
             process.exit(1);
        }

        // Reconnect Old Host (as regular player)
        console.log(`Reconnecting ${hostClient.id}...`);
        hostClient.socket.connect();
        hostClient.socket.emit('join_room', { roomId, playerId: hostClient.id });
        
        // Wait for connection
        await sleep(500);
        
        // Join Logic
        hostClient.socket.emit('room_message', {
            roomId,
            message: {
                type: 'JOIN_ROOM',
                roomId,
                senderId: hostClient.id,
                payload: {
                    id: hostClient.id,
                    name: hostClient.id,
                    isReady: false,
                    isHost: false,
                    joinedAt: Date.now()
                }
            }
        });

        await sleep(1500);
        
        // Verify Rejoin
        const activeClient = clients.find(c => c.socket.connected && c.room);
        if (activeClient && activeClient.room.players.find(p => p.id === hostClient.id)) {
            console.log(`✅ ${hostClient.id} rejoined successfully.`);
        } else {
            console.warn(`⚠️ ${hostClient.id} rejoin check incomplete.`);
        }
    }

    console.log('\n✅ Stress Test Completed Successfully');
    clients.forEach(c => c.socket.disconnect());
    process.exit(0);
}

runTest();
