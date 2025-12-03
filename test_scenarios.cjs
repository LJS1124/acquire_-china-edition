const io = require('socket.io-client');

const SERVER_URL = 'http://localhost:3000';

function createClient(name) {
    return io(SERVER_URL, {
        transports: ['websocket'],
        forceNew: true,
        query: { name }
    });
}

async function runTest() {
    console.log('=== Starting Host Reconnection & Rights Test ===');

    const host = createClient('HostUser');
    const player = createClient('PlayerUser');
    
    let roomId = null;
    let hostId = null;
    let playerId = null;

    // Helper to wrap socket events in promises
    const waitForEvent = (socket, event) => {
        return new Promise(resolve => {
            socket.once(event, resolve);
        });
    };

    try {
        // 1. Host creates room
        console.log('[Step 1] Host creating room...');
        host.emit('create_room', { name: 'HostUser' });
        
        const createMsg = await waitForEvent(host, 'room_created');
        roomId = createMsg.roomId;
        hostId = createMsg.playerId; // Note: server returns playerId as part of room info usually, or we get it from join
        // Actually create_room event usually returns { roomId, players, ... }
        // Let's get our ID from the socket connect or the response
        // Based on server code: socket.emit("room_created", { roomId, ... });
        // We need to know our ID. The client usually generates it or gets it.
        // In this codebase, client generates ID. But for this test, we rely on server assigning or echoing.
        // Wait, the app generates ID. The test script needs to emulate App behavior if it wants to be accurate.
        // But here we are testing Server + Logic interaction.
        // Let's assume we can get IDs from the room state updates.

        console.log(`Room created: ${roomId}`);

        // 2. Player joins
        console.log('[Step 2] Player joining room...');
        // We need a unique ID for the player.
        playerId = 'player_' + Date.now();
        player.emit('join_room', { roomId, playerId });
        
        // Wait for sync
        const syncMsg = await waitForEvent(player, 'room_message');
        // Expect SYNC_STATE
        if (syncMsg.type === 'SYNC_STATE') {
             console.log('Player joined and synced.');
        }

        // 3. Host leaves (Active Leave)
        console.log('[Step 3] Host leaving room (Active Leave)...');
        // In App.tsx, host transfer logic happens BEFORE leave.
        // We need to simulate what the App does:
        // A. Calculate new host
        // B. Broadcast SYNC_STATE with new host
        // C. Broadcast UPDATE_ROOM (left)
        // D. Leave room

        // To properly test the FIX, we must emulate the App's logic here.
        // Host client logic:
        // Get current room state (we need to track it)
        
        // Let's listen to updates to have current state
        let currentRoomState = syncMsg.payload.room; 
        
        // Emulate Host App Logic:
        const remainingPlayers = currentRoomState.players.filter(p => p.id !== hostId); // Wait, we don't know hostId yet strictly from above, but let's assume we can find it from players list.
        // Actually, let's just look at the room state from Player's perspective.
        const realHostId = currentRoomState.hostId;
        const realPlayerId = currentRoomState.players.find(p => p.id !== realHostId).id;
        
        console.log(`Host ID: ${realHostId}, Player ID: ${realPlayerId}`);

        // New Host should be the player
        const newHostId = realPlayerId;
        
        // Host constructs new state
        const updatedPlayers = currentRoomState.players.filter(p => p.id !== realHostId).map(p => 
            p.id === newHostId ? { ...p, isHost: true, isReady: true } : p
        );
        
        const newRoomState = {
            ...currentRoomState,
            hostId: newHostId,
            players: updatedPlayers
        };

        console.log('Host broadcasting SYNC_STATE with new host...');
        host.emit('room_message', {
            roomId,
            message: {
                type: 'SYNC_STATE',
                roomId,
                senderId: realHostId,
                payload: { room: newRoomState }
            }
        });

        console.log('Host broadcasting UPDATE_ROOM (left)...');
        host.emit('room_message', {
            roomId,
            message: {
                type: 'UPDATE_ROOM',
                roomId,
                senderId: realHostId,
                payload: { left: true }
            }
        });

        host.disconnect();

        // 4. Verify Player is now Host
        console.log('[Step 4] Verifying Player is now Host...');
        // Player should receive the SYNC_STATE
        // We might have missed it if it happened fast, but let's wait for next update or check current.
        // Actually, since we emitted it, Player should get it.
        
        // We need to capture the SYNC_STATE event on player
        // But since we might have missed the event loop tick, let's ask for a state or wait a bit.
        // Better: Setup listener before action.
        
        // Let's restart the scenario with proper event listeners.
        
    } catch (e) {
        console.error('Test failed:', e);
    } finally {
        host.close();
        player.close();
    }
}

// Rerunning with better structure
async function runRealTest() {
    const hostClient = createClient('Host');
    const playerClient = createClient('Player');
    let roomId;
    let hostId = 'host_' + Date.now();
    let playerId = 'player_' + Date.now();

    try {
        // Setup listeners to track state
        let hostState = null;
        let playerState = null;

        hostClient.on('room_message', (msg) => {
            if (msg.type === 'SYNC_STATE') hostState = msg.payload.room;
        });
        
        playerClient.on('room_message', (msg) => {
            if (msg.type === 'SYNC_STATE') playerState = msg.payload.room;
        });

        // 1. Create Room
        console.log('1. Creating Room...');
        hostClient.emit('create_room', { roomId: 'TEST_ROOM', playerId: hostId }); 
        // Note: Server expects join_room or create_room? 
        // Server code: socket.on("join_room", ...) - it creates if not exists.
        // App.tsx uses createRoom helper which generates ID then calls joinGameRoom.
        roomId = 'TEST_ROOM_' + Math.floor(Math.random() * 1000);
        
        hostClient.emit('join_room', { roomId, playerId: hostId });
        
        // Host creates initial state and broadcasts it (App logic)
        const initialRoom = {
            id: roomId,
            hostId: hostId,
            players: [{ id: hostId, name: 'Host', isHost: true, isReady: true, joinedAt: Date.now() }],
            status: 'LOBBY'
        };
        
        // Wait a bit for join to process
        await new Promise(r => setTimeout(r, 200));
        
        hostClient.emit('room_message', {
            roomId,
            message: {
                type: 'SYNC_STATE',
                roomId,
                senderId: hostId,
                payload: { room: initialRoom }
            }
        });

        await new Promise(r => setTimeout(r, 500));

        // 2. Player Joins
        console.log('2. Player Joining...');
        playerClient.emit('join_room', { roomId, playerId });
        
        // Player broadcasts JOIN_ROOM (App logic)
        playerClient.emit('room_message', {
            roomId,
            message: {
                type: 'JOIN_ROOM',
                roomId,
                senderId: playerId,
                payload: { id: playerId, name: 'Player', isHost: false, isReady: false, joinedAt: Date.now() }
            }
        });

        // Host responds with updated state (App logic)
        // We need to simulate Host App responding to JOIN_ROOM
        // But for this test, let's just assume Host updates state manually for simplicity
        // or relies on the fact that we are testing the "Leave" logic mainly.
        
        // Let's manually update state to include both
        const roomWithTwo = {
            ...initialRoom,
            players: [
                ...initialRoom.players,
                { id: playerId, name: 'Player', isHost: false, isReady: false, joinedAt: Date.now() }
            ]
        };

        hostClient.emit('room_message', {
            roomId,
            message: {
                type: 'SYNC_STATE',
                roomId,
                senderId: hostId,
                payload: { room: roomWithTwo }
            }
        });
        
        await new Promise(r => setTimeout(r, 500));
        console.log('State synced. Players:', playerState?.players?.length);

        // 3. Host Leaves (Active Transfer)
        console.log('3. Host Leaving (Active Transfer)...');
        
        // Calculate new state (App logic)
        const remainingPlayers = playerState.players.filter(p => p.id !== hostId);
        const newHost = remainingPlayers[0];
        const updatedPlayers = remainingPlayers.map(p => 
            p.id === newHost.id ? { ...p, isHost: true, isReady: true } : p
        );
        const roomAfterLeave = {
            ...playerState,
            hostId: newHost.id,
            players: updatedPlayers
        };

        // Broadcast SYNC
        hostClient.emit('room_message', {
            roomId,
            message: {
                type: 'SYNC_STATE',
                roomId,
                senderId: hostId,
                payload: { room: roomAfterLeave }
            }
        });

        // Broadcast UPDATE_ROOM (Left)
        hostClient.emit('room_message', {
            roomId,
            message: {
                type: 'UPDATE_ROOM',
                roomId,
                senderId: hostId,
                payload: { left: true }
            }
        });
        
        hostClient.disconnect();
        
        await new Promise(r => setTimeout(r, 500));
        
        // Check Player State
        console.log('Player isHost:', playerState.hostId === playerId);
        console.log('Player isReady:', playerState.players.find(p => p.id === playerId).isReady);
        
        if (playerState.hostId !== playerId) throw new Error('Host transfer failed');
        if (!playerState.players.find(p => p.id === playerId).isReady) throw new Error('New host not set to ready');

        // 4. Original Host Rejoins
        console.log('4. Original Host Rejoins...');
        const oldHostClient = createClient('Host'); // New socket, same "User" logic usually
        // But strictly speaking, it's a new socket. 
        // If it's the same user ID, we need to reuse ID.
        
        oldHostClient.on('room_message', (msg) => {
             if (msg.type === 'SYNC_STATE') {
                 // console.log('Old Host got state:', msg.payload.room);
             }
        });

        oldHostClient.emit('join_room', { roomId, playerId: hostId });
        
        // Wait for server to send cached state (The Fix!)
        // The server should send the state where Player is Host.
        
        const cachedStateMsg = await new Promise(resolve => {
            oldHostClient.once('room_message', resolve);
        });
        
        console.log('Rejoined Host got state. Host is:', cachedStateMsg.payload.room.hostId);
        
        if (cachedStateMsg.payload.room.hostId === hostId) {
             throw new Error('Rejoined host STOLE back host rights! (Server cache not updated?)');
        }
        
        if (cachedStateMsg.payload.room.hostId !== playerId) {
             throw new Error('Host ID is wrong in cached state: ' + cachedStateMsg.payload.room.hostId);
        }

        console.log('SUCCESS: Host rights preserved for new host.');

        oldHostClient.close();
        playerClient.close();
        
    } catch (e) {
        console.error('TEST FAILED:', e);
        process.exit(1);
    }
}

runRealTest();
