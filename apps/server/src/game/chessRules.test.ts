import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Chess } from 'chess.js';

describe('Chess Rule Enforcement Engine (chess.js)', () => {
  it('executes legal moves correctly and updates turn', () => {
    const chess = new Chess();
    assert.strictEqual(chess.turn(), 'w');

    const move1 = chess.move({ from: 'e2', to: 'e4' });
    assert.ok(move1);
    assert.strictEqual(move1.san, 'e4');
    assert.strictEqual(chess.turn(), 'b');

    const move2 = chess.move({ from: 'e7', to: 'e5' });
    assert.ok(move2);
    assert.strictEqual(move2.san, 'e5');
    assert.strictEqual(chess.turn(), 'w');
  });

  it('rejects illegal moves', () => {
    const chess = new Chess();
    // Cannot move opponent piece or leap illegally
    assert.throws(() => {
      chess.move({ from: 'e7', to: 'e5' }); // Black pawn on White turn
    });

    assert.throws(() => {
      chess.move({ from: 'e2', to: 'e5' }); // Cannot jump 3 squares
    });
  });

  it('detects check and prevents king suicide', () => {
    // Scholar's Mate setup
    const chess = new Chess();
    chess.move('e4');
    chess.move('e5');
    chess.move('Bc4');
    chess.move('Nc6');
    chess.move('Qh5');
    chess.move('Nf6');
    chess.move('Qxf7#');

    assert.strictEqual(chess.isCheck(), true);
    assert.strictEqual(chess.isCheckmate(), true);
    assert.strictEqual(chess.isGameOver(), true);
  });

  it('supports kingside and queenside castling', () => {
    // Clear path for kingside castling
    const chess = new Chess('rnbqk2r/pppp1ppp/5n2/2b1p3/4P3/3B1N2/PPPP1PPP/RNBQK2R w KQkq - 4 4');
    const castleWhite = chess.move('O-O');
    assert.ok(castleWhite);
    assert.strictEqual(castleWhite.san, 'O-O');
    assert.strictEqual(chess.get('g1')?.type, 'k');
    assert.strictEqual(chess.get('f1')?.type, 'r');

    // Clear path for queenside castling
    const chessQueenSide = new Chess('r3kbnr/pppqpppp/2np4/4P3/8/5NP1/PPPP1P1P/RNBQ1RK1 b kq - 0 6');
    const castleBlack = chessQueenSide.move('O-O-O');
    assert.ok(castleBlack);
    assert.strictEqual(castleBlack.san, 'O-O-O');
    assert.strictEqual(chessQueenSide.get('c8')?.type, 'k');
    assert.strictEqual(chessQueenSide.get('d8')?.type, 'r');
  });

  it('supports en passant captures', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('a6');
    chess.move('e5');
    chess.move('d5'); // Black double pawn move adjacent to e5

    const epMove = chess.move('exd6'); // En passant
    assert.ok(epMove);
    assert.strictEqual(epMove.san, 'exd6');
    assert.ok(!chess.get('d5')); // Captured black pawn removed
    assert.strictEqual(chess.get('d6')?.type, 'p');
    assert.strictEqual(chess.get('d6')?.color, 'w');
  });

  it('supports pawn promotion to Queen, Rook, Bishop, Knight', () => {
    // White pawn on e7 ready to promote on e8
    const chess = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');

    const promoQueen = chess.move({ from: 'e7', to: 'e8', promotion: 'q' });
    assert.ok(promoQueen);
    assert.strictEqual(promoQueen.promotion, 'q');
    assert.strictEqual(chess.get('e8')?.type, 'q');

    // Test knight promotion
    const chess2 = new Chess('8/4P3/8/8/8/8/8/4K2k w - - 0 1');
    const promoKnight = chess2.move({ from: 'e7', to: 'e8', promotion: 'n' });
    assert.ok(promoKnight);
    assert.strictEqual(promoKnight.promotion, 'n');
    assert.strictEqual(chess2.get('e8')?.type, 'n');
  });

  it('detects stalemate', () => {
    // Classical stalemate position: Black king on a8, White king on c7, White queen on b6 -> stalemate if White queen moved to c6 or standard FEN
    const stalemateChess = new Chess('k7/2Q5/1K6/8/8/8/8/8 b - - 0 1');
    assert.strictEqual(stalemateChess.isStalemate(), true);
    assert.strictEqual(stalemateChess.isGameOver(), true);
    assert.strictEqual(stalemateChess.isCheck(), false);
  });

  it('detects insufficient material draws', () => {
    // King vs King
    const kvk = new Chess('8/8/8/4k3/8/8/4K3/8 w - - 0 1');
    assert.strictEqual(kvk.isInsufficientMaterial(), true);
    assert.strictEqual(kvk.isGameOver(), true);

    // King + Bishop vs King
    const kbvk = new Chess('8/8/8/4k3/8/8/4KB2/8 w - - 0 1');
    assert.strictEqual(kbvk.isInsufficientMaterial(), true);
  });
});
