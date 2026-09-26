'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Chess } from 'chess.js';
import {
  AuthoritativeGameState,
  Color,
  GameJudgeSummary,
  MoveRecord
} from '@judge-chess/shared';
import { getSocket } from '@/lib/socket';
import { soundService } from '@/lib/sound';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileHeader } from '@/components/layout/MobileHeader';
import { ChessBoard } from '@/components/chess/ChessBoard';
import { ChessClock } from '@/components/chess/ChessClock';
import { CapturedPieces } from '@/components/chess/CapturedPieces';
import { GameLobby } from '@/components/game/GameLobby';
import { LiveGamePanel } from '@/components/game/LiveGamePanel';
import { GameResultModal } from '@/components/game/GameResultModal';
import { JudgePanel } from '@/components/analysis/JudgePanel';
import { AnalysisSummary } from '@/components/analysis/AnalysisSummary';
import { EvaluationGraph } from '@/components/analysis/EvaluationGraph';
import { RulesModal } from '@/components/layout/RulesModal';
import {
  Wifi,
  WifiOff,
  Sparkles,
  AlertTriangle,
  RotateCw,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';

export default function GameRoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = ((params?.roomCode as string) || '').toUpperCase();

  const [socketConnected, setSocketConnected] = useState(false);
  const [gameState, setGameState] = useState<AuthoritativeGameState | null>(null);
  const [localPlayerColor, setLocalPlayerColor] = useState<Color | null>(null);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Join prompt modal state (for player 2 joining from share link)
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinPlayerName, setJoinPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Post-game review & analysis states
  const [analysisSummary, setAnalysisSummary] = useState<GameJudgeSummary | null>(null);
  const [analysisProgress, setAnalysisProgress] = useState<{ current: number; total: number; percentage: number } | null>(null);
  const [reviewPly, setReviewPly] = useState<number>(-1);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [opponentDisconnected, setOpponentDisconnected] = useState<string | null>(null);

  // Active FEN based on live game or review position
  const currentFen = useMemo(() => {
    if (!gameState) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    if (isReviewMode) {
      if (reviewPly < 0) {
        return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      }
      const move = gameState.moveHistory[reviewPly];
      return move ? move.fenAfter : gameState.fen;
    }
    return gameState.fen;
  }, [gameState, isReviewMode, reviewPly]);

  // Last move squares highlight
  const lastMoveHighlight = useMemo<{ from: string; to: string } | null>(() => {
    if (!gameState || gameState.moveHistory.length === 0) return null;
    if (isReviewMode) {
      if (reviewPly < 0) return null;
      const m = gameState.moveHistory[reviewPly];
      return m ? { from: m.from, to: m.to } : null;
    }
    const last = gameState.moveHistory[gameState.moveHistory.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  }, [gameState, isReviewMode, reviewPly]);

  // Review arrows: Played move (amber) + Engine Best move (emerald)
  const reviewArrows = useMemo<Array<[string, string, string]>>(() => {
    if (!isReviewMode || reviewPly < 0 || !analysisSummary) return [];
    const moveAnalysis = analysisSummary.analyzedMoves[reviewPly];
    if (!moveAnalysis) return [];

    const arrows: Array<[string, string, string]> = [];

    // Played move arrow (warm amber)
    const pFrom = moveAnalysis.uci.slice(0, 2);
    const pTo = moveAnalysis.uci.slice(2, 4);
    arrows.push([pFrom, pTo, 'rgba(212, 163, 115, 0.85)']);

    // Engine best move arrow (emerald), if different
    if (moveAnalysis.bestMoveUci && moveAnalysis.bestMoveUci !== moveAnalysis.uci) {
      const bFrom = moveAnalysis.bestMoveUci.slice(0, 2);
      const bTo = moveAnalysis.bestMoveUci.slice(2, 4);
      arrows.push([bFrom, bTo, 'rgba(16, 185, 129, 0.85)']);
    }

    return arrows;
  }, [isReviewMode, reviewPly, analysisSummary]);

  // Compute captured pieces from current board position
  const { whiteCaptured, blackCaptured, whiteAdvantage, blackAdvantage } = useMemo(() => {
    const startCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, k: 1 };
    const currentCountsWhite: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    const currentCountsBlack: Record<string, number> = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };

    try {
      const chess = new Chess(currentFen);
      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece) {
            if (piece.color === 'w') {
              currentCountsWhite[piece.type] = (currentCountsWhite[piece.type] || 0) + 1;
            } else {
              currentCountsBlack[piece.type] = (currentCountsBlack[piece.type] || 0) + 1;
            }
          }
        }
      }
    } catch {
      // ignore
    }

    const whiteCapturedList: string[] = [];
    const blackCapturedList: string[] = [];
    const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9 };
    let whiteScore = 0;
    let blackScore = 0;

    for (const [type, count] of Object.entries(startCounts)) {
      if (type === 'k') continue;
      const whiteLoss = Math.max(0, count - (currentCountsWhite[type] || 0));
      const blackLoss = Math.max(0, count - (currentCountsBlack[type] || 0));

      for (let i = 0; i < blackLoss; i++) {
        whiteCapturedList.push(type);
        whiteScore += pieceValues[type] || 0;
      }
      for (let i = 0; i < whiteLoss; i++) {
        blackCapturedList.push(type);
        blackScore += pieceValues[type] || 0;
      }
    }

    return {
      whiteCaptured: whiteCapturedList,
      blackCaptured: blackCapturedList,
      whiteAdvantage: Math.max(0, whiteScore - blackScore),
      blackAdvantage: Math.max(0, blackScore - whiteScore)
    };
  }, [currentFen]);

  // 1. Initial Connection and Session Management
  useEffect(() => {
    if (!roomCode) return;
    const socket = getSocket();

    const onConnect = () => {
      setSocketConnected(true);
      checkAndRestoreSession();
    };

    const onDisconnect = () => {
      setSocketConnected(false);
    };

    if (socket.connected) {
      setSocketConnected(true);
      checkAndRestoreSession();
    }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);

    // Socket Event Listeners
    socket.on('room:updated', ({ state }) => {
      setGameState(state);
    });

    socket.on('game:started', ({ state }) => {
      setGameState(state);
      setOpponentDisconnected(null);
      soundService.playMove();
    });

    socket.on('game:move-accepted', ({ state }) => {
      setGameState(state);
      // Play sound
      const last = state.moveHistory[state.moveHistory.length - 1];
      if (last) {
        if (last.captured) soundService.playCapture();
        else soundService.playMove();
        if (last.isCheck) soundService.playCheck();
      }
    });

    socket.on('game:ended', ({ winner, result, reason, state }) => {
      setGameState(state);
      soundService.playGameOver();
      setShowResultModal(true);
    });

    socket.on('player:disconnected', ({ color, playerName }) => {
      setOpponentDisconnected(`${playerName} (${color === 'w' ? 'White' : 'Black'}) disconnected. Waiting 60s for reconnection...`);
    });

    socket.on('player:reconnected', ({ color, playerName }) => {
      setOpponentDisconnected(null);
    });

    socket.on('game:rematch-started', ({ state }) => {
      setGameState(state);
      setIsReviewMode(false);
      setShowResultModal(false);
      setShowSummaryModal(false);
      setAnalysisSummary(null);
      // Determine new color for player
      const stored = localStorage.getItem(`judge_session_${roomCode}`);
      if (stored) {
        try {
          const session = JSON.parse(stored);
          const newColor = state.whitePlayer?.id === session.playerId ? 'w' : 'b';
          setLocalPlayerColor(newColor);
          setBoardOrientation(newColor === 'w' ? 'white' : 'black');
        } catch {}
      }
    });

    socket.on('analysis:progress', (data) => {
      setAnalysisProgress(data);
    });

    socket.on('analysis:completed', ({ summary }) => {
      setAnalysisSummary(summary);
      setAnalysisProgress(null);
    });

    socket.on('analysis:failed', ({ message }) => {
      setAnalysisProgress(null);
      setErrorMessage(message);
    });

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:updated');
      socket.off('game:started');
      socket.off('game:move-accepted');
      socket.off('game:ended');
      socket.off('player:disconnected');
      socket.off('player:reconnected');
      socket.off('game:rematch-started');
      socket.off('analysis:progress');
      socket.off('analysis:completed');
      socket.off('analysis:failed');
    };
  }, [roomCode]);

  // Helper to verify and restore reconnect token from localStorage
  const checkAndRestoreSession = useCallback(() => {
    const socket = getSocket();
    const stored = localStorage.getItem(`judge_session_${roomCode}`);
    if (stored) {
      try {
        const { playerId, reconnectToken, color } = JSON.parse(stored);
        socket.emit(
          'session:reconnect',
          { roomCode, playerId, reconnectToken },
          (res) => {
            if (res.ok && res.state) {
              setGameState(res.state);
              setLocalPlayerColor(color);
              setBoardOrientation(color === 'w' ? 'white' : 'black');

              // If already ended, fetch analysis if available
              if (res.state.status === 'ended') {
                fetchAnalysis(res.state.gameId);
              }
            } else {
              // Token invalid or expired
              localStorage.removeItem(`judge_session_${roomCode}`);
              promptJoin();
            }
          }
        );
      } catch {
        promptJoin();
      }
    } else {
      promptJoin();
    }
  }, [roomCode]);

  const promptJoin = () => {
    // Check if room exists first
    const socket = getSocket();
    fetch(`/api/rooms/${roomCode}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setErrorMessage(data.error);
        } else {
          setGameState(data);
          if (data.status !== 'ended') {
            setShowJoinModal(true);
          }
        }
      })
      .catch(() => {
        setShowJoinModal(true);
      });
  };

  const handleJoinGame = () => {
    if (!joinPlayerName.trim()) return;
    setIsJoining(true);
    setErrorMessage(null);

    const socket = getSocket();
    socket.emit('room:join', { roomCode, playerName: joinPlayerName.trim() }, (res) => {
      setIsJoining(false);
      if (res.ok && res.playerId && res.reconnectToken) {
        setShowJoinModal(false);
        // Save session in local storage
        fetch(`/api/rooms/${roomCode}`)
          .then((r) => r.json())
          .then((state: AuthoritativeGameState) => {
            setGameState(state);
            const myColor = state.whitePlayer?.id === res.playerId ? 'w' : 'b';
            setLocalPlayerColor(myColor);
            setBoardOrientation(myColor === 'w' ? 'white' : 'black');
            localStorage.setItem(
              `judge_session_${roomCode}`,
              JSON.stringify({
                playerId: res.playerId,
                reconnectToken: res.reconnectToken,
                color: myColor
              })
            );
          });
      } else {
        setErrorMessage(res.error || 'Failed to join game');
      }
    });
  };

  const fetchAnalysis = async (gameId: string) => {
    try {
      const res = await fetch(`/api/analysis/${gameId}`);
      if (res.ok) {
        const data = await res.json();
        setAnalysisSummary(data);
      }
    } catch {
      // ignore
    }
  };

  // Move handler from client board
  const handleBoardMove = useCallback(
    (move: { from: string; to: string; promotion?: string }) => {
      if (!gameState || gameState.status !== 'playing') return;

      const socket = getSocket();
      socket.emit(
        'game:move',
        {
          roomCode,
          from: move.from,
          to: move.to,
          promotion: move.promotion
        },
        (res) => {
          if (!res.ok) {
            console.warn('[Game] Move rejected:', res.error);
          }
        }
      );
    },
    [gameState, roomCode]
  );

  // Game actions
  const handleStartGame = () => {
    getSocket().emit('game:start', { roomCode });
  };

  const handleOfferDraw = () => {
    getSocket().emit('game:offer-draw', { roomCode });
  };

  const handleAcceptDraw = () => {
    getSocket().emit('game:accept-draw', { roomCode });
  };

  const handleDeclineDraw = () => {
    getSocket().emit('game:decline-draw', { roomCode });
  };

  const handleResign = () => {
    getSocket().emit('game:resign', { roomCode });
  };

  const handleRequestRematch = () => {
    getSocket().emit('game:request-rematch', { roomCode });
  };

  const handleFlipBoard = () => {
    setBoardOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
  };

  const handleStartReview = () => {
    setIsReviewMode(true);
    setShowResultModal(false);
    setShowSummaryModal(false);
    if (gameState && gameState.moveHistory.length > 0) {
      setReviewPly(gameState.moveHistory.length - 1);
    }
  };

  // Players display names
  const opponentName = useMemo(() => {
    if (!gameState) return 'Opponent';
    if (localPlayerColor === 'w') {
      return gameState.blackPlayer?.name || 'Waiting for Black...';
    }
    return gameState.whitePlayer?.name || 'Waiting for White...';
  }, [gameState, localPlayerColor]);

  const currentPlayerName = useMemo(() => {
    if (!gameState) return 'You';
    if (localPlayerColor === 'w') {
      return gameState.whitePlayer?.name || 'You (White)';
    }
    if (localPlayerColor === 'b') {
      return gameState.blackPlayer?.name || 'You (Black)';
    }
    return 'Spectator';
  }, [gameState, localPlayerColor]);

  const opponentColor: Color = localPlayerColor === 'w' ? 'b' : 'w';

  return (
    <div className="flex h-screen bg-judge-bg overflow-hidden">
      <Sidebar socketConnected={socketConnected} onOpenRules={() => setRulesOpen(true)} />
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <MobileHeader onOpenRules={() => setRulesOpen(true)} />

        {/* Connection Disconnection Alert */}
        {opponentDisconnected && (
          <div className="bg-amber-950/90 border-b border-amber-500/40 px-4 py-2 text-center text-xs font-semibold text-amber-200 flex items-center justify-center gap-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>{opponentDisconnected}</span>
          </div>
        )}

        {/* Analysis Progress Banner */}
        {analysisProgress && (
          <div className="bg-judge-panel border-b border-judge-border px-4 py-2.5 text-center text-xs text-judge-text flex items-center justify-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
            <span>
              Analyzing your game with Stockfish... Move {analysisProgress.current} of{' '}
              {analysisProgress.total} ({analysisProgress.percentage}%)
            </span>
          </div>
        )}

        {/* Error Banner */}
        {errorMessage && (
          <div className="bg-red-950/90 border-b border-red-500/40 px-4 py-2 text-center text-xs text-red-200">
            {errorMessage}
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-3 md:p-6 flex flex-col justify-center">
          {/* 1. Lobby State (Waiting / Ready) */}
          {gameState && (gameState.status === 'waiting' || gameState.status === 'ready') ? (
            <GameLobby
              state={gameState}
              localPlayerColor={localPlayerColor}
              onStartGame={handleStartGame}
              onReadyToggle={() => {}}
            />
          ) : gameState ? (
            /* 2. Live Game or Post-Game Review */
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6 items-start justify-center">
              {/* Central Chessboard Column */}
              <div className="flex flex-col items-center justify-center space-y-3 w-full max-w-[560px] mx-auto">
                {/* Top Player (Opponent) */}
                <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-judge-surface border border-judge-border">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border ${
                        boardOrientation === 'white'
                          ? 'bg-zinc-800 border-zinc-500'
                          : 'bg-zinc-200 border-zinc-400'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-xs tracking-wide text-judge-text">
                        {boardOrientation === 'white'
                          ? gameState.blackPlayer?.name || 'Black'
                          : gameState.whitePlayer?.name || 'White'}
                      </div>
                      <CapturedPieces
                        color={boardOrientation === 'white' ? 'b' : 'w'}
                        capturedPieces={
                          boardOrientation === 'white' ? blackCaptured : whiteCaptured
                        }
                        scoreAdvantage={
                          boardOrientation === 'white' ? blackAdvantage : whiteAdvantage
                        }
                      />
                    </div>
                  </div>

                  <ChessClock
                    color={boardOrientation === 'white' ? 'b' : 'w'}
                    clockState={gameState.clocks}
                    isCurrentTurn={gameState.turn === (boardOrientation === 'white' ? 'b' : 'w')}
                    isGameActive={gameState.status === 'playing'}
                  />
                </div>

                {/* The Chessboard */}
                <ChessBoard
                  fen={currentFen}
                  orientation={boardOrientation}
                  isInteractive={gameState.status === 'playing' && gameState.turn === localPlayerColor}
                  playerColor={localPlayerColor || undefined}
                  lastMove={lastMoveHighlight}
                  onMove={handleBoardMove}
                  reviewArrows={reviewArrows}
                  isReviewMode={isReviewMode}
                />

                {/* Bottom Player (Current User) */}
                <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-judge-surface border border-judge-border">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-3.5 h-3.5 rounded-full border ${
                        boardOrientation === 'white'
                          ? 'bg-zinc-200 border-zinc-400'
                          : 'bg-zinc-800 border-zinc-500'
                      }`}
                    />
                    <div>
                      <div className="font-bold text-xs tracking-wide text-judge-text">
                        {boardOrientation === 'white'
                          ? gameState.whitePlayer?.name || 'White'
                          : gameState.blackPlayer?.name || 'Black'}{' '}
                        {localPlayerColor && (
                          <span className="text-[10px] text-judge-muted font-normal">
                            (You)
                          </span>
                        )}
                      </div>
                      <CapturedPieces
                        color={boardOrientation === 'white' ? 'w' : 'b'}
                        capturedPieces={
                          boardOrientation === 'white' ? whiteCaptured : blackCaptured
                        }
                        scoreAdvantage={
                          boardOrientation === 'white' ? whiteAdvantage : blackAdvantage
                        }
                      />
                    </div>
                  </div>

                  <ChessClock
                    color={boardOrientation === 'white' ? 'w' : 'b'}
                    clockState={gameState.clocks}
                    isCurrentTurn={gameState.turn === (boardOrientation === 'white' ? 'w' : 'b')}
                    isGameActive={gameState.status === 'playing'}
                  />
                </div>

                {/* Compact Evaluation Graph in Review Mode */}
                {isReviewMode && analysisSummary && (
                  <div className="w-full pt-1">
                    <EvaluationGraph
                      analyzedMoves={analysisSummary.analyzedMoves}
                      currentPlyIndex={reviewPly}
                      onSelectPly={(ply) => setReviewPly(ply)}
                    />
                  </div>
                )}
              </div>

              {/* Right Context Panel (Live Game Panel during match, Judge Panel after match) */}
              <div>
                {isReviewMode && analysisSummary ? (
                  <JudgePanel
                    summary={analysisSummary}
                    gameState={gameState}
                    currentPly={reviewPly}
                    onSelectPly={(ply) => setReviewPly(ply)}
                    onShowSummaryModal={() => setShowSummaryModal(true)}
                    onRequestRematch={handleRequestRematch}
                    onFlipBoard={handleFlipBoard}
                  />
                ) : (
                  <LiveGamePanel
                    state={gameState}
                    playerColor={localPlayerColor}
                    onOfferDraw={handleOfferDraw}
                    onAcceptDraw={handleAcceptDraw}
                    onDeclineDraw={handleDeclineDraw}
                    onResign={handleResign}
                    onFlipBoard={handleFlipBoard}
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-judge-muted text-sm flex flex-col items-center gap-3">
              <div className="w-6 h-6 border-2 border-judge-accent border-t-transparent rounded-full animate-spin" />
              <span>Connecting to match room {roomCode}...</span>
            </div>
          )}
        </main>
      </div>

      {/* Join Room Modal (when entering via link without player token) */}
      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-judge-panel border border-judge-border rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-xl bg-judge-surface border border-judge-border flex items-center justify-center text-judge-accent text-2xl font-bold mx-auto">
              ♞
            </div>

            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wider text-judge-text">
                Join Match {roomCode}
              </h2>
              <p className="text-xs text-judge-muted mt-1">
                Enter your display name to join this multiplayer game.
              </p>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                maxLength={20}
                placeholder="Your Name (e.g. Alex)"
                value={joinPlayerName}
                onChange={(e) => setJoinPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleJoinGame()}
                className="w-full px-4 py-3 rounded-xl bg-judge-surface border border-judge-border text-judge-text text-sm placeholder:text-judge-muted/60 focus:outline-none focus:border-judge-accent transition-colors"
                autoFocus
              />

              <button
                onClick={handleJoinGame}
                disabled={!joinPlayerName.trim() || isJoining}
                className="w-full py-3 px-4 rounded-xl bg-judge-accent text-judge-bg font-bold text-xs tracking-wider uppercase hover:bg-judge-accentHover disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg"
              >
                <span>{isJoining ? 'Joining Match...' : 'Join Game'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Game Result Modal */}
      {gameState && (
        <GameResultModal
          isOpen={showResultModal}
          state={gameState}
          playerColor={localPlayerColor}
          onClose={() => setShowResultModal(false)}
          onReviewGame={handleStartReview}
          onRequestRematch={handleRequestRematch}
        />
      )}

      {/* Analysis Summary Full Modal */}
      {showSummaryModal && analysisSummary && gameState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="max-w-md w-full relative">
            <AnalysisSummary
              summary={analysisSummary}
              gameState={gameState}
              onStartReview={() => setShowSummaryModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
