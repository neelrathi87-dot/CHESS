import { useState, useEffect, useRef } from 'react';
import { ShieldAlert, RefreshCw, LogOut, Copy, Check, MessageCircle, AlertTriangle, Trophy, Handshake, Flag, Clock, Crown, X } from 'lucide-react';
import GameBoard from './GameBoard';
import MoveHistory from './MoveHistory';
import ChatBox from './ChatBox';
import LearnAssistant from './LearnAssistant';
import EvalBar from './EvalBar';

export default function GameArena({
  game,
  onMove,
  onResign,
  onOfferDraw,
  onRespondDraw,
  onSendMessage,
  onLeave,
  playerColor, // 'white', 'black', 'both' (local), or 'spectator'
  gameState, // room state from socket or null if offline
  isOffline, // boolean
  isLocalGame, // boolean - local 2-player pass & play mode
  localPlayers, // { white, black } player names for local game
  localBoardOrientation, // 'white' | 'black' - controlled by App for pass-and-play
  offlineDifficulty, // 'easy'|'medium'|'hard'
  offlineClocks, // { w, b } for offline mode
  onTickOfflineClock, // callback to decrement clock
  isLearnMode, // boolean - learn mode active
  onUndo, // callback to undo last move
  lastMove, // last move object for evaluation
  boardTheme, // string theme id
  onStartAnalysis // callback to enter analysis mode
}) {
  const [boardOrientation, setBoardOrientation] = useState(
    isLocalGame ? localBoardOrientation : (playerColor === 'black' ? 'black' : 'white')
  );
  const [copied, setCopied] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);
  const [showGameOverModal, setShowGameOverModal] = useState(false);
  const [showDrawConfirm, setShowDrawConfirm] = useState(false);
  const [selectedSquare, setSelectedSquare] = useState(null);
  const prevStatusRef = useRef('playing');

  // 🔊 Audio Manager
  const audioContextRef = useRef(null);
  useEffect(() => {
    audioContextRef.current = {
      move: new Audio('/sounds/move.mp3'),
      capture: new Audio('/sounds/capture.mp3'),
      check: new Audio('/sounds/check.mp3'),
      gameEnd: new Audio('/sounds/game-end.mp3')
    };
  }, []);

  const playSound = (type) => {
    if (audioContextRef.current && audioContextRef.current[type]) {
      const audio = audioContextRef.current[type];
      audio.currentTime = 0;
      audio.play().catch(() => {}); // catch autoplay blocks
    }
  };

  // 📊 Evaluation Engine Worker
  const [evaluation, setEvaluation] = useState('0.0');
  const evalWorkerRef = useRef(null);
  const currentFenRef = useRef(game.fen());

  useEffect(() => {
    evalWorkerRef.current = new Worker('/stockfish.js');
    evalWorkerRef.current.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg === 'string' && msg.includes('score')) {
        const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
        if (scoreMatch) {
          const type = scoreMatch[1];
          const val = parseInt(scoreMatch[2], 10);
          
          const fenTokens = currentFenRef.current.split(' ');
          const isWhiteToMove = fenTokens[1] === 'w';
          
          if (type === 'cp') {
            const scoreInPawns = val / 100;
            const finalScore = isWhiteToMove ? scoreInPawns : -scoreInPawns;
            setEvaluation(finalScore.toFixed(1));
          } else if (type === 'mate') {
            if (val === 0) return;
            const mateIn = isWhiteToMove ? val : -val;
            setEvaluation(mateIn > 0 ? `M${mateIn}` : `-M${Math.abs(mateIn)}`);
          }
        }
      }
    };
    
    return () => {
      evalWorkerRef.current?.terminate();
    };
  }, []);

  // Update Evaluation on every move
  useEffect(() => {
    currentFenRef.current = game.fen();
    // Only evaluate if playing and not in learn mode (learn mode has its own evaluation)
    if (evalWorkerRef.current && prevStatusRef.current === 'playing' && !isLearnMode) {
      evalWorkerRef.current.postMessage('stop');
      evalWorkerRef.current.postMessage('uci');
      evalWorkerRef.current.postMessage(`position fen ${game.fen()}`);
      evalWorkerRef.current.postMessage('go depth 12');
    }
  }, [game.fen(), isLearnMode]);

  // Play sound on move
  useEffect(() => {
    if (!lastMove) return;
    if (game.inCheck()) {
      playSound('check');
    } else if (lastMove.captured || lastMove.san?.includes('x')) {
      playSound('capture');
    } else {
      playSound('move');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove]);

  const handlePieceSelect = (square) => {
    setSelectedSquare(square);
  };

  // Sync orientation
  useEffect(() => {
    if (isLocalGame) {
      // For local games, orientation is controlled externally (auto-flip on each move)
      setBoardOrientation(localBoardOrientation);
    } else {
      setTimeout(() => {
        if (playerColor === 'black') {
          setBoardOrientation('black');
        } else {
          setBoardOrientation('white');
        }
      }, 0);
    }
  }, [playerColor, isLocalGame, localBoardOrientation]);

  // Extract status variables
  const isMultiplayer = !isOffline;
  const status = isMultiplayer ? gameState?.status : (
    offlineClocks?.w <= 0 || offlineClocks?.b <= 0 ? 'timeout' : (
      game.isCheckmate() ? 'checkmate' : (
        game.isDraw() ? 'draw' : 'playing'
      )
    )
  );

  const turn = game.turn(); // 'w' or 'b'
  const isCheck = game.inCheck();
  const isGameOver = ['checkmate', 'stalemate', 'draw', 'resigned', 'timeout'].includes(status);

  // Show game over modal when status changes to a game-over state
  useEffect(() => {
    if (isGameOver && prevStatusRef.current === 'playing') {
      setTimeout(() => {
        playSound('gameEnd');
        setShowGameOverModal(true);
      }, 500);
    }
    prevStatusRef.current = status;
  }, [status, isGameOver]);

  // Draw offer state
  const drawOfferFrom = isMultiplayer ? gameState?.drawOfferFrom : null;
  const isMyDrawOffer = drawOfferFrom && (
    (playerColor === 'white' && gameState?.players?.white?.id === drawOfferFrom) ||
    (playerColor === 'black' && gameState?.players?.black?.id === drawOfferFrom)
  );
  const isOpponentDrawOffer = drawOfferFrom && !isMyDrawOffer;

  // Players details
  let topPlayer;
  let bottomPlayer;

  if (isLocalGame && localPlayers) {
    // Local 2-player: show both real names, current turn is always 'bottom'
    const activeColor = game.turn() === 'w' ? 'white' : 'black';
    const inactiveColor = activeColor === 'white' ? 'black' : 'white';
    // Whoever's turn it is sees their own pieces at the bottom
    topPlayer = { name: localPlayers[inactiveColor], color: inactiveColor, connected: true };
    bottomPlayer = { name: localPlayers[activeColor], color: activeColor, connected: true };
  } else if (isMultiplayer && gameState) {
    const whiteP = gameState.players.white;
    const blackP = gameState.players.black;

    if (playerColor === 'black') {
      topPlayer = { name: whiteP?.username || 'Waiting...', color: 'white', connected: whiteP?.connected ?? false };
      bottomPlayer = { name: blackP?.username || 'You', color: 'black', connected: blackP?.connected ?? true };
    } else {
      topPlayer = { name: blackP?.username || 'Waiting...', color: 'black', connected: blackP?.connected ?? false };
      bottomPlayer = { name: whiteP?.username || 'You', color: 'white', connected: whiteP?.connected ?? true };
    }
  } else {
    // Offline AI
    const aiName = isLearnMode ? '🎓 Coach AI' : `Computer (${offlineDifficulty})`;
    if (playerColor === 'black') {
      topPlayer = { name: aiName, color: 'white', connected: true };
      bottomPlayer = { name: 'You', color: 'black', connected: true };
    } else {
      topPlayer = { name: aiName, color: 'black', connected: true };
      bottomPlayer = { name: 'You', color: 'white', connected: true };
    }
  }

  // Smooth clock ticking - unified for both offline and multiplayer
  const [displayClocks, setDisplayClocks] = useState({ w: 600000, b: 600000 });
  const clockRef = useRef({ w: 600000, b: 600000 });
  const lastTickRef = useRef(null);
  const lastParentSyncRef = useRef(null);

  // Sync clock reference when props change
  useEffect(() => {
    if (isOffline && offlineClocks) {
      clockRef.current = { ...offlineClocks };
      setTimeout(() => {
        setDisplayClocks({ ...offlineClocks });
      }, 0);
    } else if (gameState?.clocks) {
      const clocks = {
        w: gameState.clocks.white ?? gameState.clocks.w ?? 600000,
        b: gameState.clocks.black ?? gameState.clocks.b ?? 600000
      };
      clockRef.current = { ...clocks };
      setTimeout(() => {
        setDisplayClocks({ ...clocks });
      }, 0);
    }
  }, [isOffline, offlineClocks, gameState?.clocks]);

  // Continuous ticking interval - runs every 100ms
  useEffect(() => {
    if (status !== 'playing') return;

    lastTickRef.current = Date.now();
    lastParentSyncRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - (lastTickRef.current || now);
      lastTickRef.current = now;

      const activeKey = turn; // 'w' or 'b'

      clockRef.current = {
        ...clockRef.current,
        [activeKey]: Math.max(0, clockRef.current[activeKey] - elapsed)
      };

      setDisplayClocks({ ...clockRef.current });

      // For offline mode, sync parent state every ~1 second to avoid heavy re-renders
      if (isOffline) {
        if (now - lastParentSyncRef.current >= 1000 || clockRef.current[activeKey] <= 0) {
          onTickOfflineClock(clockRef.current);
          lastParentSyncRef.current = now;
        }
      }
    }, 100);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, turn, isOffline]);

  // Format Milliseconds to MM:SS
  const formatTime = (ms) => {
    if (ms <= 0) return '00:00';
    const totalSecs = Math.floor(ms / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    
    // Add tenth of a second if time < 20s
    if (totalSecs < 20) {
      const tenths = Math.floor((ms % 1000) / 100);
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${tenths}`;
    }

    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleCopyCode = () => {
    if (!gameState?.id) return;
    navigator.clipboard.writeText(gameState.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeaveClick = () => {
    if (status === 'playing' || status === 'waiting') {
      setShowConfirmLeave(true);
    } else {
      onLeave();
    }
  };

  // Turn announcement message
  const getBannerMessage = () => {
    if (status === 'waiting') {
      return 'Waiting for opponent to connect...';
    }
    if (status === 'checkmate') {
      const winner = isMultiplayer ? gameState.winner : (turn === 'w' ? 'Black' : 'White');
      if (playerColor === 'spectator' || isLocalGame) return `Checkmate! ${winner.toUpperCase()} wins!`;
      if (winner === playerColor) return `Checkmate! You win!`;
      return `Checkmate! You lose.`;
    }
    if (status === 'stalemate') {
      return 'Stalemate! Game drawn.';
    }
    if (status === 'draw') {
      const reason = isMultiplayer ? gameState.reason : 'Draw agreement';
      return `Game Drawn (${reason.replace('_', ' ')}).`;
    }
    if (status === 'resigned') {
      const winner = gameState.winner;
      if (playerColor === 'spectator' || isLocalGame) {
        const loser = winner === 'white' ? 'Black' : 'White';
        return `Game Over. ${loser} resigned. ${winner.toUpperCase()} wins!`;
      }
      if (winner === playerColor) {
        return `Game Over. Opponent resigned. You win!`;
      } else {
        return `Game Over. You resigned. Opponent wins!`;
      }
    }
    if (status === 'timeout') {
      const winner = isMultiplayer
        ? gameState.winner
        : (offlineClocks?.w <= 0 ? 'Black' : 'White');
      if (playerColor === 'spectator' || isLocalGame) return `Timeout! ${winner.toUpperCase()} wins on time!`;
      if (winner === playerColor) return `Timeout! You win on time!`;
      return `Timeout! You lose on time.`;
    }

    // Active playing states
    const side = turn === 'w' ? 'White' : 'Black';
    const checkText = isCheck ? ' - CHECK!' : '';
    return `${side}'s Turn${checkText}`;
  };

  // Determine clocks for display
  const topClock = topPlayer.color === 'white' ? displayClocks.w : displayClocks.b;
  const bottomClock = bottomPlayer.color === 'white' ? displayClocks.w : displayClocks.b;

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-2 sm:py-6 min-h-[100dvh] lg:h-[100dvh] flex flex-col overflow-x-hidden lg:overflow-hidden">
      {/* Top Banner Controls */}
      <div className="flex justify-between items-center bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800 shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handleLeaveClick}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px] font-semibold"
          >
            <LogOut className="w-3.5 h-3.5 text-rose-400" /> Menu
          </button>

          {isMultiplayer && gameState && (
            <div className="flex items-center gap-1.5 bg-slate-950/40 px-2 py-1.5 rounded-lg border border-slate-800 font-mono text-[11px]">
              <span className="text-slate-500 font-bold">ROOM:</span>
              <span className="text-teal-400 font-bold tracking-wider">{gameState.id}</span>
              <button
                onClick={handleCopyCode}
                className="text-slate-400 hover:text-slate-200 transition-colors"
                title="Copy Room Code"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          )}
        </div>

        {/* Banner State Message */}
        <div className={`px-3 py-1.5 rounded-lg text-xs font-bold text-center flex items-center gap-1.5 ${
          ['checkmate', 'resigned', 'timeout'].includes(status)
            ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300'
            : status === 'draw' || status === 'stalemate'
            ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300'
            : isCheck
            ? 'bg-red-500/20 border border-red-500/30 text-red-300 animate-pulse'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300'
        }`}>
          {isCheck && <ShieldAlert className="w-3.5 h-3.5 text-red-400 animate-bounce" />}
          <span className="hidden sm:inline">{getBannerMessage()}</span>
          <span className="sm:hidden">{status === 'playing' ? (isCheck ? 'CHECK!' : `${turn === 'w' ? 'W' : 'B'} turn`) : getBannerMessage()}</span>
        </div>

        <button
          onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-[11px] font-semibold"
          title="Flip Chessboard View"
        >
          <RefreshCw className="w-3.5 h-3.5 text-teal-400" /> Flip
        </button>
      </div>

      {/* Main Grid: Chessboard vs Panels */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 min-h-0 py-2">
        {/* Left Side: Chessboard Block */}
        <div className="col-span-1 lg:col-span-7 flex flex-col gap-1.5 min-h-0">
          
          {/* Opponent Info Plate */}
          <div className="flex items-center justify-between bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2">
              {/* Connection Status Icon */}
              <div className={`w-2.5 h-2.5 rounded-full ${topPlayer.connected ? 'bg-emerald-500 shadow-md shadow-emerald-500/20' : 'bg-rose-500 shadow-md shadow-rose-500/20 animate-pulse'}`} />
              <div className="bg-slate-950 border border-slate-800 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase text-indigo-400 select-none">
                {topPlayer.name.slice(0, 2)}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200 block leading-tight">{topPlayer.name}</span>
                <span className="text-[9px] text-slate-500 capitalize">{topPlayer.color}</span>
              </div>
              {!topPlayer.connected && (
                <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded font-medium flex items-center gap-0.5 animate-pulse ml-1 border border-rose-500/10">
                  <AlertTriangle className="w-2.5 h-2.5" /> Disconnected
                </span>
              )}
            </div>
            {/* Opponent Clock */}
            <div className={`font-mono text-lg font-bold px-2.5 py-1 rounded-lg border transition-colors ${
              turn === topPlayer.color[0] && status === 'playing'
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow shadow-teal-500/5'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              {formatTime(topClock)}
            </div>
          </div>

          {/* Board Rendering - flex-1 to fill available space */}
          <div className="glass p-2 sm:p-3 rounded-2xl relative flex-1 flex items-center justify-center min-h-0">
            <div className="flex w-full max-w-[min(100%,_60vh)] mx-auto gap-2" style={{ aspectRatio: '1/1' }}>
              {/* Eval Bar (Only if not learn mode, since learn mode is guided) */}
              {!isLearnMode && (
                <EvalBar evaluation={evaluation} boardOrientation={boardOrientation} />
              )}
              <div className="flex-1">
                <GameBoard
                  game={game}
                  onMove={onMove}
                  onPieceSelect={handlePieceSelect}
                  playerColor={playerColor}
                  boardOrientation={boardOrientation}
                  interactive={status === 'playing'}
                  boardTheme={boardTheme}
                />
              </div>
            </div>
          </div>

          {/* Active Player Info Plate */}
          <div className="flex items-center justify-between bg-slate-900/40 px-3 py-2 rounded-xl border border-slate-800/80 shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/20" />
              <div className="bg-slate-950 border border-slate-800 w-7 h-7 rounded-lg flex items-center justify-center font-bold text-[10px] uppercase text-teal-400 select-none">
                {bottomPlayer.name.slice(0, 2)}
              </div>
              <div>
                <span className="text-xs font-semibold text-slate-200 block leading-tight">{bottomPlayer.name}{!isLocalGame && ' (You)'}</span>
                <span className="text-[9px] text-slate-500 capitalize">{bottomPlayer.color}{isLocalGame ? ' · Your turn' : ''}</span>
              </div>
            </div>
            {/* Player Clock */}
            <div className={`font-mono text-lg font-bold px-2.5 py-1 rounded-lg border transition-colors ${
              turn === bottomPlayer.color[0] && status === 'playing'
                ? 'bg-teal-500/15 border-teal-500/40 text-teal-300 shadow shadow-teal-500/5'
                : 'bg-slate-950/60 border-slate-800 text-slate-400'
            }`}>
              {formatTime(bottomClock)}
            </div>
          </div>

        </div>

        {/* Right Side: Side Panels and Actions */}
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-2 lg:min-h-0 lg:overflow-hidden">

          {/* Draw Offer from Opponent */}
          {isOpponentDrawOffer && status === 'playing' && (
            <div className="glass border-2 border-amber-500/30 p-4 rounded-xl flex flex-col gap-3 items-center justify-center text-center shrink-0 animate-fade-in">
              <Handshake className="w-8 h-8 text-amber-400" />
              <p className="text-sm text-slate-200">
                Opponent has proposed a <span className="text-amber-400 font-bold">Draw Deal</span>
              </p>
              <p className="text-[10px] text-slate-500">Do you want to accept and end the game as a draw, or continue playing?</p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => onRespondDraw(true)}
                  className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md flex items-center justify-center gap-1"
                >
                  <Handshake className="w-3.5 h-3.5" /> Accept Draw
                </button>
                <button
                  onClick={() => onRespondDraw(false)}
                  className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-1"
                >
                  <X className="w-3.5 h-3.5" /> Continue Playing
                </button>
              </div>
            </div>
          )}

          {isMyDrawOffer && status === 'playing' && (
            <div className="bg-slate-900/60 p-2 rounded-xl border border-amber-500/20 text-center text-[10px] text-amber-400/80 italic shrink-0 flex items-center justify-center gap-1">
              <Handshake className="w-3 h-3" /> Draw deal sent. Waiting for opponent's decision...
            </div>
          )}

          {/* Action Buttons Panel */}
          {status === 'playing' && (
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={onResign}
                className="py-2 px-3 rounded-xl font-bold text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all text-center uppercase tracking-wider shadow flex items-center justify-center gap-1"
              >
                <Flag className="w-3.5 h-3.5" /> Resign
              </button>
              
              <button
                onClick={() => setShowDrawConfirm(true)}
                disabled={!!drawOfferFrom}
                className="py-2 px-3 rounded-xl font-bold text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400 transition-all text-center uppercase tracking-wider shadow flex items-center justify-center gap-1"
              >
                <Handshake className="w-3.5 h-3.5" /> Offer Draw
              </button>
            </div>
          )}

          {/* Post-game action buttons */}
          {isGameOver && (
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={() => setShowGameOverModal(true)}
                className="py-2 px-3 rounded-xl font-bold text-[11px] bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all text-center uppercase tracking-wider shadow flex items-center justify-center gap-1"
              >
                <Trophy className="w-3.5 h-3.5" /> Results
              </button>
              <button
                onClick={onLeave}
                className="py-2 px-3 rounded-xl font-bold text-[11px] bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-all text-center uppercase tracking-wider shadow flex items-center justify-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Leave
              </button>
            </div>
          )}

          {/* Move History Sheet */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MoveHistory history={isMultiplayer && gameState ? gameState.history : game.history({ verbose: true })} game={game} />
          </div>

          {/* Learn Assistant / Chat Panel */}
          <div className={`${isLearnMode ? 'flex-1 min-h-[500px] lg:min-h-0' : 'shrink-0 h-[140px] lg:flex-1 lg:h-auto lg:min-h-0'} overflow-hidden flex flex-col`}>
            {isLearnMode ? (
              <LearnAssistant
                game={game}
                playerColor={playerColor}
                onUndo={onUndo}
                lastMove={lastMove}
                canUndo={game.history().length >= 2}
                moveHistory={game.history()}
                selectedSquare={selectedSquare}
              />
            ) : (
              <ChatBox
                chatHistory={isMultiplayer && gameState ? gameState.chat : []}
                onSendMessage={onSendMessage}
                active={isMultiplayer}
                gameOver={isGameOver}
              />
            )}
          </div>

        </div>
      </div>

      {/* Confirmation Leave Dialog */}
      {showConfirmLeave && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-6 rounded-2xl text-center space-y-4 max-w-xs w-full border border-slate-800">
            <h3 className="text-lg font-bold text-slate-100 flex items-center justify-center gap-1.5">
              <AlertTriangle className="text-rose-400 w-5 h-5" /> Quit Match?
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Leaving an active match will forfeit the game. Are you sure you want to resign and leave?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowConfirmLeave(false);
                  onResign();
                  setTimeout(onLeave, 200);
                }}
                className="flex-1 py-2 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
              >
                Yes, Forfeit
              </button>
              <button
                onClick={() => setShowConfirmLeave(false)}
                className="flex-1 py-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Draw Confirmation Dialog */}
      {showDrawConfirm && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="glass p-6 rounded-2xl text-center space-y-4 max-w-xs w-full border border-amber-500/20">
            <Handshake className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-lg font-bold text-slate-100">Propose a Draw Deal?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will send a draw offer to your opponent. They can accept to end the game as a draw, or decline to continue playing.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowDrawConfirm(false);
                  onOfferDraw();
                }}
                className="flex-1 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1"
              >
                <Handshake className="w-3.5 h-3.5" /> Send Deal
              </button>
              <button
                onClick={() => setShowDrawConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
              >
                Continue Game
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {showGameOverModal && isGameOver && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 animate-fade-in">
          <div className="glass p-8 rounded-3xl text-center space-y-5 max-w-sm w-full border border-slate-700 shadow-2xl relative">
            {/* Close button */}
            <button
              onClick={() => setShowGameOverModal(false)}
              className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Icon based on result */}
            <div className={`w-20 h-20 mx-auto rounded-full flex items-center justify-center ${
              status === 'checkmate' ? 'bg-gradient-to-br from-amber-500/20 to-yellow-500/20 border-2 border-amber-500/30' :
              status === 'draw' || status === 'stalemate' ? 'bg-gradient-to-br from-slate-500/20 to-slate-400/20 border-2 border-slate-500/30' :
              status === 'resigned' ? 'bg-gradient-to-br from-rose-500/20 to-red-500/20 border-2 border-rose-500/30' :
              'bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border-2 border-indigo-500/30'
            }`}>
              {status === 'checkmate' && <Crown className="w-10 h-10 text-amber-400" />}
              {(status === 'draw' || status === 'stalemate') && <Handshake className="w-10 h-10 text-slate-400" />}
              {status === 'resigned' && <Flag className="w-10 h-10 text-rose-400" />}
              {status === 'timeout' && <Clock className="w-10 h-10 text-indigo-400" />}
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-extrabold text-slate-100">
                {status === 'checkmate' && 'Checkmate!'}
                {status === 'stalemate' && 'Stalemate!'}
                {status === 'draw' && 'Draw!'}
                {status === 'resigned' && 'Game Over'}
                {status === 'timeout' && 'Time Out!'}
              </h2>
              <p className={`text-sm mt-1 font-semibold ${
                status === 'checkmate' ? 'text-amber-400' :
                status === 'draw' || status === 'stalemate' ? 'text-slate-400' :
                status === 'resigned' ? 'text-rose-400' : 'text-indigo-400'
              }`}>
                {getBannerMessage()}
              </p>
            </div>

            {/* Game Summary */}
            <div className="bg-slate-900/60 rounded-xl p-4 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Total Moves</span>
                <span className="text-slate-200 font-mono font-bold">{game.history().length}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>White Time</span>
                <span className="text-slate-200 font-mono font-bold">{formatTime(displayClocks.w)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Black Time</span>
                <span className="text-slate-200 font-mono font-bold">{formatTime(displayClocks.b)}</span>
              </div>
              {(status === 'draw' || status === 'stalemate') && (
                <div className="flex justify-between text-slate-400">
                  <span>Reason</span>
                  <span className="text-amber-400 font-semibold capitalize">
                    {isMultiplayer ? (gameState?.reason || 'draw').replace(/_/g, ' ') : game.isStalemate() ? 'stalemate' : 'draw'}
                  </span>
                </div>
              )}
            </div>

            {/* Tips prompt for multiplayer */}
            {isMultiplayer && (
              <p className="text-[11px] text-slate-500 italic">
                💬 Chat is still active — exchange tips and GG with your opponent!
              </p>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowGameOverModal(false);
                  onStartAnalysis(game.pgn());
                }}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="w-4 h-4" /> Analyze Game
              </button>
              <button
                onClick={() => setShowGameOverModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm border border-slate-700 transition-all flex items-center justify-center gap-1.5"
              >
                Board & Chat
              </button>
              <button
                onClick={onLeave}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-semibold text-sm border border-rose-600 transition-all flex items-center justify-center gap-1.5"
              >
                <LogOut className="w-4 h-4" /> Leave
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
