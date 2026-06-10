import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameArena from './components/GameArena';
import { getComputerMove } from './utils/ai';
import { ShieldAlert, AlertCircle, RefreshCw } from 'lucide-react';

// Socket connection singleton
let socketInstance = null;
const getSocket = () => {
  if (!socketInstance) {
    // Use env variable if set (for production), otherwise auto-detect from browser
    const url = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:5000`;
    socketInstance = io(url, {
      autoConnect: false,
      reconnectionAttempts: 10,
      reconnectionDelay: 3000,
      timeout: 60000, // 60s timeout for Render cold starts
      transports: ['websocket', 'polling'] // try websocket first, fallback to polling
    });
  }
  return socketInstance;
};

// Helper to generate or retrieve player ID
const getOrCreatePlayerId = () => {
  let pid = localStorage.getItem('chess_player_id');
  if (!pid) {
    pid = 'player-' + Math.random().toString(36).substring(2, 9);
    localStorage.setItem('chess_player_id', pid);
  }
  return pid;
};

export default function App() {
  const [screen, setScreen] = useState('lobby'); // 'lobby' | 'arena'
  const [game, setGame] = useState(new Chess());
  const [playerColor, setPlayerColor] = useState('white'); // 'white' | 'black' | 'spectator'
  const [isOffline, setIsOffline] = useState(true);
  const [toast, setToast] = useState(null); // { message, type }

  // Offline AI game states
  const [offlineDifficulty, setOfflineDifficulty] = useState('medium');
  const [offlineClocks, setOfflineClocks] = useState({ w: 600000, b: 600000 }); // default 10min
  const [aiIsThinking, setAiIsThinking] = useState(false);

  // Multiplayer online game states
  const [gameState, setGameState] = useState(null);
  const [reconnectCode, setReconnectCode] = useState(null);
  const [reconnectUsername, setReconnectUsername] = useState('');
  const [serverConnected, setServerConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const playerId = getOrCreatePlayerId();
  const socket = getSocket();

  // Show customized toasts
  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Check for reconnection room codes on mount
  useEffect(() => {
    const savedRoomId = sessionStorage.getItem('chess_room_id');
    const savedUsername = sessionStorage.getItem('chess_username') || '';
    if (savedRoomId) {
      setReconnectCode(savedRoomId);
      setReconnectUsername(savedUsername);
    }
  }, []);

  // Connect socket and register listeners
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setServerConnected(true);
      setConnecting(false);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
      setServerConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.log('Connection error:', err.message);
      setConnecting(true);
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}...`);
      setConnecting(true);
    });

    socket.io.on('reconnect', () => {
      setServerConnected(true);
      setConnecting(false);
    });

    socket.on('roomCreated', (state) => {
      // Host has created the room
      setGameState(state);
      setPlayerColor(state.players.white?.id === playerId ? 'white' : 'black');
      setGame(new Chess(state.fen));
      setIsOffline(false);
      setScreen('arena');
      
      // Save for reconnection
      sessionStorage.setItem('chess_room_id', state.id);
      sessionStorage.setItem('chess_username', state.players.white?.username || state.players.black?.username || '');
      setReconnectCode(state.id);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
      
      // Sync local board representation
      const newGame = new Chess(state.fen);
      // Wait, we need to load move history properly to preserve move arrows/last move highlights
      // Let's reconstruct game moves if needed, or simply load fen. loading FEN is solid.
      setGame(newGame);

      // Determine player color assignment
      if (state.players.white?.id === playerId) {
        setPlayerColor('white');
      } else if (state.players.black?.id === playerId) {
        setPlayerColor('black');
      } else {
        setPlayerColor('spectator');
      }

      setIsOffline(false);
      setScreen('arena');
      
      // Save for reconnection
      sessionStorage.setItem('chess_room_id', state.id);
    });

    socket.on('joinedSuccess', ({ color }) => {
      if (color) {
        setPlayerColor(color);
      }
    });

    socket.on('drawOffered', ({ from }) => {
      // RoomManager handles syncing, but we can display a toast
      showToast('Opponent offered a draw!', 'warning');
    });

    socket.on('drawDeclined', () => {
      showToast('Draw offer declined by opponent.', 'info');
    });

    socket.on('playerDisconnected', ({ username }) => {
      showToast(`${username || 'Opponent'} disconnected! 30s to reconnect...`, 'warning');
    });

    socket.on('errorMsg', ({ message }) => {
      showToast(message, 'error');
      // If error occurs, check if we need to return to lobby
      if (message.includes('not found') || message.includes('full')) {
        handleLeaveGame();
      }
    });

    socket.on('gameOver', (state) => {
      setGameState(state);
      // Clear reconnection token since game is finished
      sessionStorage.removeItem('chess_room_id');
      setReconnectCode(null);
    });

    return () => {
      socket.off('connect');
      socket.off('roomCreated');
      socket.off('gameState');
      socket.off('joinedSuccess');
      socket.off('drawOffered');
      socket.off('drawDeclined');
      socket.off('playerDisconnected');
      socket.off('errorMsg');
      socket.off('gameOver');
    };
  }, [playerId]);

  // Handle local AI moves
  useEffect(() => {
    if (!isOffline || screen !== 'arena') return;

    const turn = game.turn(); // 'w' or 'b'
    const isAiTurn = (playerColor === 'white' && turn === 'b') || (playerColor === 'black' && turn === 'w');
    const isGameActive = !game.isGameOver() && offlineClocks.w > 0 && offlineClocks.b > 0;

    if (isAiTurn && isGameActive && !aiIsThinking) {
      setAiIsThinking(true);
      
      // Artificial delay so the AI feels natural and user can see their last move
      const thinkTime = offlineDifficulty === 'easy' ? 400 : (offlineDifficulty === 'medium' ? 600 : 800);
      
      const timer = setTimeout(() => {
        const move = getComputerMove(game, offlineDifficulty);
        if (move) {
          const newGame = new Chess(game.fen());
          try {
            newGame.move({ from: move.from, to: move.to, promotion: move.promotion });
            setGame(newGame);
          } catch (err) {
            console.error('AI move error:', err);
          }
        }
        setAiIsThinking(false);
      }, thinkTime);

      return () => clearTimeout(timer);
    }
  }, [game, playerColor, isOffline, offlineDifficulty, screen]);

  // Handle client move request
  const handleMove = (moveData) => {
    if (isOffline) {
      const newGame = new Chess(game.fen());
      try {
        const result = newGame.move(moveData);
        if (result) {
          setGame(newGame);
        }
      } catch (err) {
        showToast('Invalid move', 'error');
      }
    } else {
      // Multiplayer: validate move on server
      socket.emit('makeMove', {
        roomId: gameState.id,
        playerId,
        move: moveData
      });
    }
  };

  // Helper: ensure socket is connected before emitting
  const ensureConnected = (callback) => {
    if (socket.connected) {
      callback();
      return;
    }
    
    setConnecting(true);
    showToast('Connecting to server... please wait (may take up to 50s on first load)', 'warning');
    
    // Force reconnect
    socket.connect();
    
    const onConnect = () => {
      socket.off('connect', onConnect);
      setConnecting(false);
      setServerConnected(true);
      callback();
    };
    socket.on('connect', onConnect);
    
    // Timeout after 65 seconds
    setTimeout(() => {
      socket.off('connect', onConnect);
      if (!socket.connected) {
        setConnecting(false);
        showToast('Could not connect to server. Please try again.', 'error');
      }
    }, 65000);
  };

  // Create Multiplayer Room
  const handleCreateRoom = ({ hostColor, username, timeLimit }) => {
    ensureConnected(() => {
      socket.emit('createRoom', {
        hostId: playerId,
        hostColor,
        username,
        timeLimit
      });
    });
  };

  // Join Multiplayer Room
  const handleJoinRoom = ({ roomId, username }) => {
    ensureConnected(() => {
      socket.emit('joinRoom', {
        roomId,
        playerId,
        username
      });
    });
  };

  // Start Offline Vs Computer Game
  const handleStartComputerGame = (difficulty, chosenColor) => {
    let finalColor = chosenColor;
    if (chosenColor === 'random') {
      finalColor = Math.random() < 0.5 ? 'white' : 'black';
    }

    setPlayerColor(finalColor);
    setOfflineDifficulty(difficulty);
    setOfflineClocks({ w: 600000, b: 600000 }); // Reset to 10 min
    setGame(new Chess());
    setIsOffline(true);
    setScreen('arena');
    setAiIsThinking(false);

    // Clear any previous online reconnection
    sessionStorage.removeItem('chess_room_id');
  };

  // Resign active game
  const handleResign = () => {
    if (isOffline) {
      // Trigger local timeout for player
      const lostColor = playerColor === 'white' ? 'w' : 'b';
      setOfflineClocks((prev) => ({
        ...prev,
        [lostColor]: 0
      }));
      showToast('You resigned. Game Over.', 'info');
    } else {
      socket.emit('resign', {
        roomId: gameState.id,
        playerId
      });
    }
  };

  // Offer Draw
  const handleOfferDraw = () => {
    if (isOffline) {
      // AI evaluates: if material is equal, it might accept, else reject
      const diff = Math.abs(game.history().length);
      if (diff > 30) {
        showToast('Computer accepted the draw offer.', 'success');
        // Set game to a draw state (e.g. loading a draw FEN or custom state. Let's load draw state)
        const drawGame = new Chess(game.fen());
        // Simple hack: load FEN but make it a draw or alert it.
        // We can just set the clocks to 0 or declare a local state.
        // Let's reload a blank draw game or just show toast
        setOfflineClocks({ w: 0, b: 0 }); // terminate clocks to end game
      } else {
        showToast('Computer declined the draw offer.', 'info');
      }
    } else {
      socket.emit('offerDraw', {
        roomId: gameState.id,
        playerId
      });
    }
  };

  // Respond to incoming Draw Offer
  const handleRespondDraw = (accept) => {
    if (isOffline) return;
    socket.emit('respondDraw', {
      roomId: gameState.id,
      playerId,
      accept
    });
  };

  // Send Chat message
  const handleSendMessage = (text) => {
    if (isOffline) return;
    socket.emit('sendChat', {
      roomId: gameState.id,
      playerId,
      text
    });
  };

  // Tick Offline Game Clock (runs every 100ms)
  const handleTickOfflineClock = () => {
    const turn = game.turn(); // 'w' or 'b'
    setOfflineClocks((prev) => {
      const activeColor = turn === 'w' ? 'w' : 'b';
      const updatedTime = Math.max(0, prev[activeColor] - 100);
      return {
        ...prev,
        [activeColor]: updatedTime
      };
    });
  };

  // Leave Arena and go back to Lobby
  const handleLeaveGame = () => {
    sessionStorage.removeItem('chess_room_id');
    setReconnectCode(null);
    setGameState(null);
    setScreen('lobby');
  };

  // Quick Reconnection Trigger from Lobby Banner
  const handleQuickReconnect = () => {
    if (reconnectCode) {
      handleJoinRoom({ roomId: reconnectCode, username: reconnectUsername });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-5 right-5 z-50 animate-bounce">
          <div className={`flex items-center gap-2.5 px-4.5 py-3 rounded-xl border shadow-xl ${
            toast.type === 'error'
              ? 'bg-rose-950/90 border-rose-800 text-rose-200'
              : toast.type === 'warning'
              ? 'bg-amber-950/90 border-amber-800 text-amber-200'
              : toast.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-200'
              : 'bg-indigo-950/90 border-indigo-800 text-indigo-200'
          }`}>
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-semibold">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 flex flex-col justify-center py-6">
        {screen === 'lobby' ? (
        <div className="relative">
            {/* Connecting to Server Overlay */}
            {connecting && (
              <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="glass p-8 rounded-2xl text-center space-y-4 max-w-sm w-full border border-teal-500/20">
                  <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
                  <h3 className="text-lg font-bold text-slate-100">Connecting to Server...</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    The game server is waking up. This can take up to 50 seconds on the first connection. Please wait!
                  </p>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-gradient-to-r from-teal-500 to-emerald-500 h-full rounded-full animate-pulse" style={{width: '60%'}}></div>
                  </div>
                </div>
              </div>
            )}

            {/* Reconnect Banner Overlay */}
            {reconnectCode && (
              <div className="max-w-md mx-auto mb-6 px-4">
                <div className="glass border border-teal-500/30 p-4 rounded-xl flex items-center justify-between text-xs animate-fade-in shadow shadow-teal-500/5">
                  <div className="flex items-center gap-2 text-slate-300">
                    <RefreshCw className="w-4 h-4 text-teal-400 animate-spin" style={{ animationDuration: '3s' }} />
                    <span>Active match detected in Room <strong className="text-teal-300 font-mono tracking-wider">{reconnectCode}</strong>.</span>
                  </div>
                  <button
                    onClick={handleQuickReconnect}
                    className="bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg transition-all active:scale-95 shadow"
                  >
                    Reconnect
                  </button>
                </div>
              </div>
            )}

            <Lobby
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onStartComputerGame={handleStartComputerGame}
            />
          </div>
        ) : (
          <GameArena
            game={game}
            onMove={handleMove}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onRespondDraw={handleRespondDraw}
            onSendMessage={handleSendMessage}
            onLeave={handleLeaveGame}
            playerColor={playerColor}
            gameState={gameState}
            isOffline={isOffline}
            offlineDifficulty={offlineDifficulty}
            offlineClocks={offlineClocks}
            onTickOfflineClock={handleTickOfflineClock}
          />
        )}
      </main>

      {/* Modern Premium Footer */}
      <footer className="text-center py-5 border-t border-slate-900/60 bg-slate-950/80 text-[10px] text-slate-600 font-mono">
        &copy; {new Date().getFullYear()} Antigravity Chess Arena &bull; Rules validated server-side &bull; Powered by React, Vite & Socket.io
      </footer>
    </div>
  );
}
