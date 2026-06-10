import React, { useState, useEffect, useRef } from 'react';
import { ShieldAlert, RefreshCw, LogOut, Copy, Check, MessageCircle, AlertTriangle } from 'lucide-react';
import GameBoard from './GameBoard';
import MoveHistory from './MoveHistory';
import ChatBox from './ChatBox';

export default function GameArena({
  game,
  onMove,
  onResign,
  onOfferDraw,
  onRespondDraw,
  onSendMessage,
  onLeave,
  playerColor, // 'white', 'black', or 'spectator'
  gameState, // room state from socket or null if offline
  isOffline, // boolean
  offlineDifficulty, // 'easy'|'medium'|'hard'
  offlineClocks, // { w, b } for offline mode
  onTickOfflineClock // callback to decrement clock
}) {
  const [boardOrientation, setBoardOrientation] = useState(playerColor === 'black' ? 'black' : 'white');
  const [copied, setCopied] = useState(false);
  const [showConfirmLeave, setShowConfirmLeave] = useState(false);

  // Sync orientation with assigned color when color changes
  useEffect(() => {
    if (playerColor === 'black') {
      setBoardOrientation('black');
    } else {
      setBoardOrientation('white');
    }
  }, [playerColor]);

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

  // Draw offer state
  const drawOfferFrom = isMultiplayer ? gameState?.drawOfferFrom : null;
  const isMyDrawOffer = drawOfferFrom && (
    (playerColor === 'white' && gameState?.players?.white?.id === drawOfferFrom) ||
    (playerColor === 'black' && gameState?.players?.black?.id === drawOfferFrom)
  );
  const isOpponentDrawOffer = drawOfferFrom && !isMyDrawOffer;

  // Players details
  let topPlayer = { name: 'Opponent', color: 'black', connected: true };
  let bottomPlayer = { name: 'Player', color: 'white', connected: true };

  if (isMultiplayer && gameState) {
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
    if (playerColor === 'black') {
      topPlayer = { name: `Computer (${offlineDifficulty})`, color: 'white', connected: true };
      bottomPlayer = { name: 'You', color: 'black', connected: true };
    } else {
      topPlayer = { name: `Computer (${offlineDifficulty})`, color: 'black', connected: true };
      bottomPlayer = { name: 'You', color: 'white', connected: true };
    }
  }

  // Smooth clock ticking - unified for both offline and multiplayer
  const [displayClocks, setDisplayClocks] = useState({ w: 600000, b: 600000 });
  const clockRef = useRef({ w: 600000, b: 600000 });
  const lastTickRef = useRef(Date.now());

  // Sync clock reference when props change
  useEffect(() => {
    if (isOffline && offlineClocks) {
      clockRef.current = { ...offlineClocks };
      setDisplayClocks({ ...offlineClocks });
    } else if (gameState?.clocks) {
      const clocks = {
        w: gameState.clocks.white ?? gameState.clocks.w ?? 600000,
        b: gameState.clocks.black ?? gameState.clocks.b ?? 600000
      };
      clockRef.current = { ...clocks };
      setDisplayClocks({ ...clocks });
    }
  }, [isOffline, offlineClocks, gameState?.clocks]);

  // Continuous ticking interval - runs every 100ms
  useEffect(() => {
    if (status !== 'playing') return;

    lastTickRef.current = Date.now();

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastTickRef.current;
      lastTickRef.current = now;

      const activeKey = turn; // 'w' or 'b'

      clockRef.current = {
        ...clockRef.current,
        [activeKey]: Math.max(0, clockRef.current[activeKey] - elapsed)
      };

      setDisplayClocks({ ...clockRef.current });

      // For offline mode, also update parent state every ~1 second
      if (isOffline) {
        onTickOfflineClock();
      }
    }, 100);

    return () => clearInterval(interval);
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
      return `Checkmate! ${winner.toUpperCase()} wins!`;
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
      return `Game Over. Opponent resigned. ${winner.toUpperCase()} wins!`;
    }
    if (status === 'timeout') {
      const winner = isMultiplayer ? gameState.winner : (offlineClocks.w <= 0 ? 'Black' : 'White');
      return `Timeout! ${winner.toUpperCase()} wins on time!`;
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
    <div className="w-full max-w-6xl mx-auto px-2 h-[100dvh] flex flex-col overflow-hidden">
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
            <div className="w-full max-w-full" style={{ aspectRatio: '1/1', maxHeight: '100%' }}>
              <GameBoard
                game={game}
                onMove={onMove}
                playerColor={playerColor}
                boardOrientation={boardOrientation}
                interactive={status === 'playing'}
              />
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
                <span className="text-xs font-semibold text-slate-200 block leading-tight">{bottomPlayer.name} (You)</span>
                <span className="text-[9px] text-slate-500 capitalize">{bottomPlayer.color}</span>
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
        <div className="col-span-1 lg:col-span-5 flex flex-col gap-2 min-h-0 overflow-hidden">

          {/* Draw Offer banner inside Game Arena */}
          {isOpponentDrawOffer && status === 'playing' && (
            <div className="glass border-2 border-amber-500/30 p-3 rounded-xl flex flex-col gap-2 items-center justify-center text-center animate-bounce shrink-0">
              <p className="text-xs text-slate-200">
                Opponent has offered a <span className="text-amber-400 font-bold">Draw</span>.
              </p>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => onRespondDraw(true)}
                  className="flex-1 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md"
                >
                  Accept Draw
                </button>
                <button
                  onClick={() => onRespondDraw(false)}
                  className="flex-1 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs border border-slate-700"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {isMyDrawOffer && status === 'playing' && (
            <div className="bg-slate-900/60 p-2 rounded-xl border border-slate-800 text-center text-[10px] text-slate-400 italic shrink-0">
              Draw offer sent. Waiting for opponent response...
            </div>
          )}

          {/* Action Buttons Panel */}
          {status === 'playing' && (
            <div className="grid grid-cols-2 gap-2 shrink-0">
              <button
                onClick={onResign}
                className="py-2 px-3 rounded-xl font-bold text-[11px] bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-slate-950 transition-all text-center uppercase tracking-wider shadow"
              >
                Resign
              </button>
              
              <button
                onClick={onOfferDraw}
                disabled={!!drawOfferFrom}
                className="py-2 px-3 rounded-xl font-bold text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-40 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400 transition-all text-center uppercase tracking-wider shadow"
              >
                Offer Draw
              </button>
            </div>
          )}

          {/* Move History Sheet */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <MoveHistory history={isMultiplayer && gameState ? gameState.history : game.history({ verbose: true })} game={game} />
          </div>

          {/* Chat Panel */}
          <div className="shrink-0 h-[140px] lg:flex-1 lg:h-auto lg:min-h-0 overflow-hidden">
            <ChatBox
              chatHistory={isMultiplayer && gameState ? gameState.chat : []}
              onSendMessage={onSendMessage}
              active={isMultiplayer}
            />
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
    </div>
  );
}
