import { describe, it } from 'node:test';
import assert from 'node:assert';
import { GameRoom } from './GameRoom.js';
import { GameManager } from './GameManager.js';
import { MoveClassifier } from '../analysis/MoveClassifier.js';
import { AccuracyCalculator } from '../analysis/AccuracyCalculator.js';
import { stockfishService } from '../analysis/StockfishService.js';

describe('Multiplayer Room Lifecycle & State Validation', () => {
  it('creates room, assigns colors, and manages ready status', () => {
    const manager = new GameManager();
    const room = manager.createRoom('w', '5m');
    assert.strictEqual(room.status, 'waiting');

    // Player 1 (Host) joins with White preferred
    const p1 = room.addPlayer('socket_1', 'Nuru');
    assert.strictEqual(p1.ok, true);
    assert.strictEqual(p1.player?.color, 'w');
    assert.strictEqual(p1.player?.name, 'Nuru');
    assert.ok(p1.player?.reconnectToken);

    // Player 2 joins
    const p2 = room.addPlayer('socket_2', 'Alex');
    assert.strictEqual(p2.ok, true);
    assert.strictEqual(p2.player?.color, 'b');
    assert.strictEqual(p2.player?.name, 'Alex');
    assert.strictEqual(room.status, 'ready');

    // 3rd player rejected
    const p3 = room.addPlayer('socket_3', 'ExtraPlayer');
    assert.strictEqual(p3.ok, false);
    assert.strictEqual(p3.error, 'This game is already full.');

    // Start game
    const started = room.startGame();
    assert.strictEqual(started, true);
    assert.strictEqual(room.status, 'playing');
  });

  it('enforces turn order and validates legal moves authoritatively', () => {
    const room = new GameRoom('TEST1', 'w', '5m');
    room.addPlayer('sock_w', 'PlayerWhite');
    room.addPlayer('sock_b', 'PlayerBlack');
    room.startGame();

    // Black attempts to move on White turn
    const blackEarlyMove = room.makeMove('sock_b', 'e7', 'e5');
    assert.strictEqual(blackEarlyMove.ok, false);
    assert.strictEqual(blackEarlyMove.error, 'Not your turn.');

    // White plays legal e2-e4
    const whiteMove = room.makeMove('sock_w', 'e2', 'e4');
    assert.strictEqual(whiteMove.ok, true);

    const stateAfterE4 = room.getAuthoritativeState();
    assert.strictEqual(stateAfterE4.moveHistory.length, 1);
    assert.strictEqual(stateAfterE4.moveHistory[0].san, 'e4');
    assert.strictEqual(stateAfterE4.turn, 'b');

    // Black plays legal e7-e5
    const blackMove = room.makeMove('sock_b', 'e7', 'e5');
    assert.strictEqual(blackMove.ok, true);

    const stateAfterE5 = room.getAuthoritativeState();
    assert.strictEqual(stateAfterE5.moveHistory.length, 2);
    assert.strictEqual(stateAfterE5.moveHistory[1].san, 'e5');
    assert.strictEqual(stateAfterE5.turn, 'w');
  });

  it('supports reconnection using secure reconnect token', () => {
    const room = new GameRoom('RECON', 'w', '5m');
    const p1 = room.addPlayer('sock_1', 'PlayerA');
    const p2 = room.addPlayer('sock_2', 'PlayerB');
    room.startGame();

    // Player A disconnects
    room.handleDisconnect('sock_1');
    assert.strictEqual(p1.player?.isConnected, false);

    // Reconnecting with WRONG token fails
    const badRecon = room.reconnectPlayer('sock_new', p1.player!.id, 'invalid_token');
    assert.strictEqual(badRecon.ok, false);

    // Reconnecting with VALID token succeeds and restores session
    const goodRecon = room.reconnectPlayer('sock_new', p1.player!.id, p1.player!.reconnectToken);
    assert.strictEqual(goodRecon.ok, true);
    assert.strictEqual(p1.player?.isConnected, true);
    assert.strictEqual(p1.player?.socketId, 'sock_new');
  });

  it('handles resignation and draw agreement properly', () => {
    // Resignation
    const roomResign = new GameRoom('RESIGN', 'w', '5m');
    roomResign.addPlayer('s1', 'WhiteResigner');
    roomResign.addPlayer('s2', 'BlackWinner');
    roomResign.startGame();

    const resignRes = roomResign.resign('s1');
    assert.strictEqual(resignRes.ok, true);
    assert.strictEqual(resignRes.winner, 'b');
    assert.strictEqual(roomResign.status, 'ended');
    assert.strictEqual(roomResign.result, '0-1');
    assert.strictEqual(roomResign.resultReason, 'resignation');

    // Draw Agreement
    const roomDraw = new GameRoom('DRAW', 'w', '5m');
    roomDraw.addPlayer('s1', 'Player1');
    roomDraw.addPlayer('s2', 'Player2');
    roomDraw.startGame();

    const offer = roomDraw.offerDraw('s1');
    assert.strictEqual(offer.ok, true);
    const accept = roomDraw.acceptDraw('s2');
    assert.strictEqual(accept, true);
    assert.strictEqual(roomDraw.status, 'ended');
    assert.strictEqual(roomDraw.result, '1/2-1/2');
    assert.strictEqual(roomDraw.resultReason, 'draw_agreement');
  });
});

describe('Judge Chess Analysis & Accuracy System', () => {
  it('correctly classifies moves and calculates centipawn loss', () => {
    // 1. Best move (0 loss)
    const best = MoveClassifier.classify({
      playerColor: 'w',
      scoreBeforeCp: 30,
      scoreAfterCp: 35,
      mateBefore: null,
      mateAfter: null,
      playedUci: 'e2e4',
      bestMoveUci: 'e2e4',
      isCapture: false,
      isCheck: false
    });
    assert.strictEqual(best.classification, 'BEST');
    assert.strictEqual(best.centipawnLoss, 0);

    // 2. Inaccuracy (80 cp loss)
    const inacc = MoveClassifier.classify({
      playerColor: 'w',
      scoreBeforeCp: 50,
      scoreAfterCp: -30, // dropped 80 cp
      mateBefore: null,
      mateAfter: null,
      playedUci: 'h2h3',
      bestMoveUci: 'e2e4',
      isCapture: false,
      isCheck: false
    });
    assert.strictEqual(inacc.classification, 'INACCURACY');
    assert.strictEqual(inacc.centipawnLoss, 80);

    // 3. Blunder (hanging queen, 500 cp loss)
    const blunder = MoveClassifier.classify({
      playerColor: 'w',
      scoreBeforeCp: 100,
      scoreAfterCp: -450, // dropped 550 cp
      mateBefore: null,
      mateAfter: null,
      playedUci: 'd1g4',
      bestMoveUci: 'd2d4',
      isCapture: false,
      isCheck: false
    });
    assert.strictEqual(blunder.classification, 'BLUNDER');
    assert.strictEqual(blunder.centipawnLoss, 550);
  });

  it('calculates Judge Accuracy accurately', () => {
    // Perfect game: all 0 cp loss -> 100%
    const perfect = AccuracyCalculator.calculate([0, 0, 0, 0, 0]);
    assert.strictEqual(perfect, 100.0);

    // Mixed game with minor inaccuracies -> ~85-95%
    const mixed = AccuracyCalculator.calculate([0, 15, 5, 20, 0, 8]);
    assert.ok(mixed >= 90 && mixed <= 96);

    // Game with blunders -> significantly lower
    const poor = AccuracyCalculator.calculate([0, 450, 600, 300]);
    assert.ok(poor < 40);
  });

  it('runs real Stockfish 19 engine and returns valid evaluation', async () => {
    // Starting position after 1. e4
    const evalResult = await stockfishService.evaluatePosition(
      'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1',
      8
    );
    assert.ok(evalResult.bestMoveUci);
    assert.ok(evalResult.bestMoveUci.length >= 4);
    assert.notStrictEqual(evalResult.scoreCp, null);
    console.log('[Stockfish 19 Test Evaluation]', evalResult);
  });
});
