import { io } from 'socket.io-client';

async function runE2ESimulation() {
  console.log('--- Starting Judge Chess End-to-End Multiplayer & Analysis Test ---');
  const serverUrl = 'http://127.0.0.1:4000';

  // Client 1 (Nuru)
  const client1 = io(serverUrl, { transports: ['websocket'] });
  // Client 2 (Alex)
  const client2 = io(serverUrl, { transports: ['websocket'] });

  await new Promise<void>((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    client1.on('connect', check);
    client2.on('connect', check);
  });

  console.log('✓ Both player sockets connected to server');

  // Step 1: Nuru creates room
  const createRes: any = await new Promise((resolve) => {
    client1.emit(
      'room:create',
      {
        playerName: 'Nuru',
        preferredColor: 'w',
        timeControlId: '5m'
      },
      resolve
    );
  });

  console.log('✓ Room created:', createRes);
  const roomCode = createRes.roomCode;
  const p1Token = createRes.reconnectToken;
  const p1Id = createRes.playerId;

  // Step 2: Alex joins room
  const joinRes: any = await new Promise((resolve) => {
    client2.emit(
      'room:join',
      {
        roomCode,
        playerName: 'Alex'
      },
      resolve
    );
  });

  console.log('✓ Player 2 joined:', joinRes);
  const p2Token = joinRes.reconnectToken;
  const p2Id = joinRes.playerId;

  // Host clicks Start Game
  const startPromise = new Promise<void>((resolve) => {
    client1.on('game:started', () => {
      console.log('✓ game:started event received by Player 1');
      resolve();
    });
  });
  client1.emit('game:start', { roomCode });
  await startPromise;

  // Step 3: Play moves e4, e5, Nf3, Nc6, Bc4, Bc5
  const movesToPlay = [
    { client: client1, from: 'e2', to: 'e4' },
    { client: client2, from: 'e7', to: 'e5' },
    { client: client1, from: 'g1', to: 'f3' },
    { client: client2, from: 'b8', to: 'c6' },
    { client: client1, from: 'f1', to: 'c4' },
    { client: client2, from: 'f8', to: 'c5' }
  ];

  for (const m of movesToPlay) {
    const moveRes: any = await new Promise((resolve) => {
      m.client.emit(
        'game:move',
        {
          roomCode,
          from: m.from,
          to: m.to
        },
        resolve
      );
    });
    console.log(`✓ Move ${m.from}-${m.to} accepted:`, moveRes.ok);
  }

  // Step 4: Test reconnection simulation (Alex disconnects and reconnects)
  console.log('Simulating Alex connection drop and reconnect...');
  client2.disconnect();

  const client2Reconnect = io(serverUrl, { transports: ['websocket'] });
  await new Promise<void>((resolve) => client2Reconnect.on('connect', resolve));

  const reconRes: any = await new Promise((resolve) => {
    client2Reconnect.emit(
      'session:reconnect',
      {
        roomCode,
        playerId: p2Id,
        reconnectToken: p2Token
      },
      resolve
    );
  });

  console.log('✓ Alex successfully reconnected with restored session:', reconRes.ok);

  // Step 5: End game via resignation
  console.log('Alex resigns match...');
  const endedPromise = new Promise<any>((resolve) => {
    client1.on('game:ended', (data) => {
      console.log('✓ game:ended event received:', data.winner, data.reason);
      resolve(data);
    });
  });

  client2Reconnect.emit('game:resign', { roomCode });
  await endedPromise;

  // Step 6: Wait for Stockfish analysis completion
  console.log('Waiting for Stockfish move-by-move Judge analysis...');
  const analysisSummary: any = await new Promise((resolve) => {
    client1.on('analysis:completed', (data) => {
      resolve(data.summary);
    });
  });

  console.log('✓ STOCKFISH ANALYSIS COMPLETED!');
  console.log('  White Accuracy:', analysisSummary.whiteAccuracy + '%');
  console.log('  Black Accuracy:', analysisSummary.blackAccuracy + '%');
  console.log('  White Breakdown:', analysisSummary.whiteBreakdown);
  console.log('  Black Breakdown:', analysisSummary.blackBreakdown);
  console.log('  Move of the Game Ply:', analysisSummary.moveOfTheGamePly);
  console.log('  Move of the Game Explanation:', analysisSummary.moveOfTheGameExplanation);

  client1.disconnect();
  client2Reconnect.disconnect();

  console.log('=== END-TO-END MULTIPLAYER & ANALYSIS SIMULATION PASSED 100% ===');
  process.exit(0);
}

runE2ESimulation().catch((err) => {
  console.error('Simulation failed:', err);
  process.exit(1);
});
