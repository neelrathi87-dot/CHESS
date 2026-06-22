import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import GameArena from './components/GameArena';
import InstallGuide from './components/InstallGuide';
import SettingsModal from './components/SettingsModal';
import PuzzleMode from './components/PuzzleMode';
import PostGameAnalysis from './components/PostGameAnalysis';
import AdminDashboard from './components/AdminDashboard';

import { AlertCircle, RefreshCw, Globe, Search, Palette, Shield } from 'lucide-react';

// Socket connection singleton
let socketInstance = null;
const getSocket = () => {
  if (!socketInstance) {
    // Use env variable if set (for production), otherwise auto-detect from browser
    const url = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:5000`;
    socketInstance = io(url, {
      query: { playerId: getOrCreatePlayerId() },
      autoConnect: false,
      // Polling first → then upgrade to WebSocket.
      // This is more reliable behind HTTP proxies (Render, Vercel, etc.) that
      // may not support direct WebSocket upgrades on first connect.
      transports: ['polling', 'websocket'],
      // Reconnect aggressively so we recover within the 60s server window
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,      // start retrying after 1s
      reconnectionDelayMax: 5000,   // cap at 5s between retries
      timeout: 60000, // 60s timeout for Render cold starts
      // Match server-side ping settings
      pingInterval: 10000,
      pingTimeout: 5000,
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
  const [screen, setScreen] = useState('lobby'); // 'lobby' | 'arena' | 'puzzle' | 'analysis' | 'admin'
  const [game, setGame] = useState(new Chess());
  const [analysisPgn, setAnalysisPgn] = useState(null);
  const [playerColor, setPlayerColor] = useState('white'); // 'white' | 'black' | 'spectator'
  const [isOffline, setIsOffline] = useState(true);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState(0);
  const [toast, setToast] = useState(null); // { message, type }

  // Offline AI game states
  const [offlineDifficulty, setOfflineDifficulty] = useState('medium');
  const [offlineClocks, setOfflineClocks] = useState({ w: 600000, b: 600000 }); // default 10min
  const [aiIsThinking, setAiIsThinking] = useState(false);
  const [isLearnMode, setIsLearnMode] = useState(false);
  const [lastMove, setLastMove] = useState(null);

  // Multiplayer online game states
  const [gameState, setGameState] = useState(null);
  const [reconnectCode, setReconnectCode] = useState(null);
  const [reconnectUsername, setReconnectUsername] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [mismatchProposal, setMismatchProposal] = useState(null);
  const [waitingOnActiveMatch, setWaitingOnActiveMatch] = useState(null);

  // Local 2-player game state
  const [isLocalGame, setIsLocalGame] = useState(false);
  const [localPlayers, setLocalPlayers] = useState({ white: 'Player 1', black: 'Player 2' });
  const [localBoardOrientation, setLocalBoardOrientation] = useState('white');

  // PWA install prompt
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);

  // Theme State
  const [boardTheme, setBoardTheme] = useState(() => {
    return localStorage.getItem('boardTheme') || 'slate';
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('boardTheme', boardTheme);
  }, [boardTheme]);

  // Capture browser's install prompt event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsAppInstalled(true);
      setInstallPrompt(null);
    });
    // Check if already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsAppInstalled(true);
    }
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallApp = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setInstallPrompt(null);
      setIsAppInstalled(true);
    }
  };

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
    const savedUsername = localStorage.getItem('chess_username') || '';
    if (savedRoomId) {
      setTimeout(() => {
        setReconnectCode(savedRoomId);
        setReconnectUsername(savedUsername);
      }, 0);
    }
  }, []);

  // Connect socket and register listeners
  useEffect(() => {
    socket.connect();

    socket.on('connect', () => {
      console.log('Connected to socket server');
      setConnecting(false);
    });

    socket.on('disconnect', (reason) => {
      console.log('Disconnected from socket server, reason:', reason);
    });

    socket.on('connect_error', (err) => {
      console.log('Connection error:', err.message);
      // Don't show overlay here — let ensureConnected handle UI feedback when user takes action
    });

    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}...`);
    });

    socket.io.on('reconnect', () => {
      setConnecting(false);
    });

    // App-level heartbeat: emit a ping every 20s to keep the connection alive
    // through aggressive proxy idle timeouts that would silently drop the socket.
    const heartbeatInterval = setInterval(() => {
      if (socket.connected) {
        socket.emit('ping');
      }
    }, 20000);

    socket.on('onlinePlayersCount', (count) => {
      setOnlinePlayersCount(count);
    });

    socket.on('roomCreated', (state) => {
      setGameState(state);
      const hostColor = state.players.white?.id === playerId ? 'white' : 'black';
      setPlayerColor(hostColor);
      const newGame = new Chess();
      newGame.loadPgn(state.pgn || '');
      setGame(newGame);
      
      const history = newGame.history({ verbose: true });
      setLastMove(history.length > 0 ? history[history.length - 1] : null);
      setIsOffline(false);
      setScreen('arena');
      sessionStorage.setItem('chess_room_id', state.id);
      localStorage.setItem('chess_username', state.players[hostColor]?.username || '');
      setReconnectCode(state.id);
    });

    socket.on('gameState', (state) => {
      setGameState(state);
      const newGame = new Chess();
      newGame.loadPgn(state.pgn || '');
      setGame(newGame);

      const history = newGame.history({ verbose: true });
      setLastMove(history.length > 0 ? history[history.length - 1] : null);

      // Transition screen and save roomId (particularly important for the joining guest player)
      setIsOffline(false);
      setScreen('arena');
      sessionStorage.setItem('chess_room_id', state.id);

      if (state.players.white?.id === playerId) {
        setPlayerColor('white');
      } else if (state.players.black?.id === playerId) {
        setPlayerColor('black');
      } else {
        setPlayerColor('spectator');
      }
    });

    socket.on('joinedSuccess', ({ color }) => {
      if (color) {
        setPlayerColor(color);
      }
    });

    socket.on('drawOffered', () => {
      // RoomManager handles syncing, but we can display a toast
      showToast('Opponent offered a draw!', 'warning');
    });

    socket.on('drawDeclined', () => {
      showToast('Draw offer declined by opponent.', 'info');
    });

    socket.on('rematchOffered', () => {
      showToast('Opponent wants a rematch!', 'info');
    });

    socket.on('rematchAccepted', () => {
      showToast('Rematch accepted! Starting new game...', 'success');
      // The new game state will arrive via the 'gameState' event automatically
    });

    socket.on('playerDisconnected', ({ username }) => {
      showToast(`${username || 'Opponent'} disconnected! 60s to reconnect...`, 'warning');
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

    // Matchmaking events
    socket.on('matchFound', ({ state, color }) => {
      setIsSearching(false);
      setMismatchProposal(null);
      setWaitingOnActiveMatch(null);
      setGameState(state);
      setPlayerColor(color);
      setGame(new Chess(state.fen));
      setIsOffline(false);
      setScreen('arena');
      sessionStorage.setItem('chess_room_id', state.id);
      setReconnectCode(state.id);
      showToast('Match found! Game starting...', 'info');
    });

    socket.on('searchCancelled', () => {
      setIsSearching(false);
      setMismatchProposal(null);
      setWaitingOnActiveMatch(null);
    });

    socket.on('queueUpdate', ({ searching }) => {
      setIsSearching(searching);
    });

    socket.on('proposeMismatch', ({ proposalId, myTime, opponentTime }) => {
      setMismatchProposal({ proposalId, myTime, opponentTime });
      setWaitingOnActiveMatch(null);
    });

    socket.on('waitingOnMatch', ({ roomId }) => {
      setWaitingOnActiveMatch({ roomId });
      setMismatchProposal(null);
    });

    return () => {
      clearInterval(heartbeatInterval);
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off('roomCreated');
      socket.off('gameState');
      socket.off('joinedSuccess');
      socket.off('drawOffered');
      socket.off('drawDeclined');
      socket.off('playerDisconnected');
      socket.off('errorMsg');
      socket.off('gameOver');
      socket.off('matchFound');
      socket.off('searchCancelled');
      socket.off('queueUpdate');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerId]);

  // Handle local AI moves
  useEffect(() => {
    if (!isOffline || screen !== 'arena') return;

    const turn = game.turn(); // 'w' or 'b'
    const isAiTurn = (playerColor === 'white' && turn === 'b') || (playerColor === 'black' && turn === 'w');
    const isGameActive = !game.isGameOver() && offlineClocks.w > 0 && offlineClocks.b > 0;

    if (isAiTurn && isGameActive && !aiIsThinking) {
      setTimeout(() => {
        setAiIsThinking(true);
      }, 0);
      
      // Artificial delay so the AI feels natural and user can see their last move
      const thinkTime = offlineDifficulty === 'easy' ? 400 : 100;
      
      const worker = new Worker('/stockfish.js');

      const timer = setTimeout(() => {
        worker.postMessage('uci');
        worker.postMessage(`position fen ${game.fen()}`);

        let depth = 5;
        let skillLevel = 5;
        
        if (offlineDifficulty === 'easy') { depth = 2; skillLevel = 0; }
        else if (offlineDifficulty === 'medium') { depth = 8; skillLevel = 10; }
        else if (offlineDifficulty === 'hard') { depth = 15; skillLevel = 20; }

        worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
        worker.postMessage(`go depth ${depth}`);
        
        worker.onmessage = (e) => {
          const msg = e.data;
          // Look for 'bestmove e2e4'
          if (typeof msg === 'string' && msg.startsWith('bestmove')) {
            const moveStr = msg.split(' ')[1]; // e.g., 'e2e4' or 'e7e8q'
            if (moveStr && moveStr !== '(none)') {
              try {
                const from = moveStr.substring(0, 2);
                const to = moveStr.substring(2, 4);
                const promotion = moveStr.length > 4 ? moveStr[4] : undefined;

                game.move({ from, to, promotion });
                const newGame = new Chess();
                newGame.loadPgn(game.pgn());
                setLastMove(newGame.history({ verbose: true }).slice(-1)[0] || null);
                setGame(newGame);
              } catch (err) {
                console.error('Stockfish move error:', err);
              }
            }
            setAiIsThinking(false);
            worker.terminate();
          }
        };
      }, thinkTime);

      return () => {
        clearTimeout(timer);
        worker.terminate();
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, playerColor, isOffline, offlineDifficulty, screen]);

  // Handle client move request
  const handleMove = (moveData) => {
    if (isLocalGame) {
      // Local 2-player: apply move then flip board for next player
      try {
        const result = game.move(moveData);
        if (result) {
          const newGame = new Chess();
          newGame.loadPgn(game.pgn());
          setGame(newGame);
          setLastMove(result);
        }
      } catch {
        showToast('Invalid move', 'error');
      }
    } else if (isOffline) {
      try {
        // Apply move to existing game instance to preserve history
        const result = game.move(moveData);
        if (result) {
          // Clone with full history via PGN
          const newGame = new Chess();
          newGame.loadPgn(game.pgn());
          setGame(newGame);
          setLastMove(result);
        }
      } catch {
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
    showToast('Connecting to game server... please wait a moment.', 'warning');
    
    // Force reconnect
    socket.connect();
    
    const onConnect = () => {
      socket.off('connect', onConnect);
      setConnecting(false);
      showToast('Connected! Setting up your game...', 'success');
      callback();
    };
    socket.on('connect', onConnect);
    
    // Timeout after 20 seconds
    setTimeout(() => {
      socket.off('connect', onConnect);
      if (!socket.connected) {
        setConnecting(false);
        showToast('Could not connect to server. Please check your connection and try again.', 'error');
      }
    }, 20000);
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
    setIsLocalGame(false);
    setScreen('arena');
    setAiIsThinking(false);

    // Clear any previous online reconnection
    sessionStorage.removeItem('chess_room_id');
    setIsLearnMode(false);
    setLastMove(null);
  };

  // Start Local 2-Player Pass & Play Game
  const handleStartLocalGame = ({ player1, player2, timeLimit }) => {
    const timeLimitMs = timeLimit * 60 * 1000;
    setLocalPlayers({ white: player1, black: player2 });
    setOfflineClocks({ w: timeLimitMs, b: timeLimitMs });
    setGame(new Chess());
    setIsOffline(true);
    setIsLocalGame(true);
    setPlayerColor('both'); // Special value: both sides are human
    setLocalBoardOrientation('white'); // White starts
    setScreen('arena');
    setAiIsThinking(false);
    setIsLearnMode(false);
    setLastMove(null);
    sessionStorage.removeItem('chess_room_id');
  };

  // Start Learn Mode — Easy AI with assistant
  const handleStartLearnMode = () => {
    setPlayerColor('white');
    setOfflineDifficulty('easy');
    setOfflineClocks({ w: 9999000, b: 9999000 }); // Effectively unlimited time
    setGame(new Chess());
    setIsOffline(true);
    setIsLearnMode(true);
    setLastMove(null);
    setScreen('arena');
    setAiIsThinking(false);
    sessionStorage.removeItem('chess_room_id');
  };

  // Undo Move (Learn Mode only) — undoes both AI move and player move
  const handleUndo = () => {
    if (!isLearnMode || !isOffline) return;
    
    const historyLen = game.history().length;
    if (historyLen < 2) {
      showToast('No moves to undo yet!', 'info');
      return;
    }
    
    // Undo AI's last move then player's last move
    game.undo();
    game.undo();
    
    // Clone with preserved history
    const newGame = new Chess();
    newGame.loadPgn(game.pgn());
    
    setGame(newGame);
    setAiIsThinking(false);
    setLastMove(null);
    showToast('Move undone! Try a different approach.', 'info');
  };

  // Find Random Match (Matchmaking)
  const handleFindMatch = ({ username, timeLimit }) => {
    ensureConnected(() => {
      setIsSearching(true);
      socket.emit('findMatch', {
        playerId,
        username: username || 'Player',
        timeLimit: timeLimit || 10
      });
    });
  };

  const handleRespondMismatch = (accept) => {
    if (!mismatchProposal) return;
    socket.emit('respondMismatch', { proposalId: mismatchProposal.proposalId, playerId, accept });
    setMismatchProposal(null); // Clear local UI
  };

  // Cancel Match Search
  const handleCancelSearch = () => {
    socket.emit('cancelSearch', { playerId });
    setMismatchProposal(null);
    setWaitingOnActiveMatch(null);
    setIsSearching(false);
  };

  // Resign active game
  const handleResign = () => {
    if (isLocalGame) {
      // In local mode, current player resigns
      const losingColor = game.turn() === 'w' ? 'w' : 'b';
      setOfflineClocks((prev) => ({ ...prev, [losingColor]: 0 }));
      showToast(`${losingColor === 'w' ? localPlayers.white : localPlayers.black} resigned. Game Over.`, 'info');
    } else if (isOffline) {
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
    if (isLocalGame) {
      // In local 2-player, both players agree on the spot — just show the draw confirm in arena
      // We mark it as a draw by zeroing both clocks equally
      showToast('Both players agreed to a draw!', 'success');
      setOfflineClocks({ w: 0, b: 0 });
    } else if (isOffline) {
      // AI evaluates: if material is equal, it might accept, else reject
      const diff = Math.abs(game.history().length);
      if (diff > 30) {
        showToast('Computer accepted the draw offer.', 'success');
        // Set game to a draw state (e.g. loading a draw FEN or custom state)
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

  // Request Rematch
  const handleRequestRematch = () => {
    if (isOffline || !gameState?.id) return;
    socket.emit('requestRematch', {
      roomId: gameState.id,
      playerId
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

  // Sync Offline Game Clock from GameArena (runs once per second)
  const handleTickOfflineClock = (newClocks) => {
    setOfflineClocks(newClocks);
  };

  // Leave Arena and go back to Lobby
  function handleLeaveGame() {
    sessionStorage.removeItem('chess_room_id');
    setReconnectCode(null);
    setGameState(null);
    setIsLocalGame(false);
    setScreen('lobby');
  }

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
        
        {screen === 'puzzle' && (
          <PuzzleMode
            onLeave={() => setScreen('lobby')}
            boardTheme={boardTheme}
          />
        )}

        {screen === 'analysis' && (
          <PostGameAnalysis
            pgn={analysisPgn}
            onLeave={() => setScreen('lobby')}
            boardTheme={boardTheme}
          />
        )}

        {screen === 'admin' && (
          <AdminDashboard onLeave={() => setScreen('lobby')} />
        )}

        {screen === 'lobby' && (
          <div className="relative">
            {/* Connecting to Server Overlay */}
            {connecting && (
              <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center z-50">
                <div className="glass p-8 rounded-2xl text-center space-y-4 max-w-sm w-full border border-teal-500/20">
                  <RefreshCw className="w-10 h-10 text-teal-400 animate-spin mx-auto" />
                  <h3 className="text-lg font-bold text-slate-100">Connecting to Server...</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Setting up your connection to the game server. This usually takes just a moment!
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

            {/* Global Matchmaking Overlays */}
            {mismatchProposal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-teal-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-fade-in">
                  <Globe className="w-12 h-12 text-teal-400 mx-auto mb-4" />
                  <h2 className="text-xl font-bold text-slate-100 mb-2">Match Found!</h2>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    An opponent is available but wants to play for <strong className="text-emerald-400">{mismatchProposal.opponentTime} min</strong>, while you requested <strong className="text-emerald-400">{mismatchProposal.myTime} min</strong>. 
                    <br/><br/>
                    Do you want to play a Time Odds match keeping your requested times? (If either player declines, both clocks will be set to the average time).
                  </p>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => handleRespondMismatch(false)}
                      className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors"
                    >
                      No, Play Average
                    </button>
                    <button 
                      onClick={() => handleRespondMismatch(true)}
                      className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-white rounded-lg font-semibold shadow-lg transition-colors"
                    >
                      Yes, Play Time Odds
                    </button>
                  </div>
                </div>
              </div>
            )}

            {waitingOnActiveMatch && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
                <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 max-w-sm w-full text-center shadow-2xl animate-fade-in">
                  <Search className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse" />
                  <h2 className="text-xl font-bold text-slate-100 mb-2">You are next!</h2>
                  <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    We found an ongoing game that is about to finish. You will automatically be matched against the winner as soon as it ends.
                  </p>
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mb-6">
                    <div className="bg-gradient-to-r from-indigo-500 to-fuchsia-500 h-full rounded-full w-full animate-pulse"></div>
                  </div>
                  <button 
                    onClick={handleCancelSearch}
                    className="w-full px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
                  >
                    Cancel Matchmaking
                  </button>
                </div>
              </div>
            )}

            <Lobby
              onCreateRoom={handleCreateRoom}
              onJoinRoom={handleJoinRoom}
              onStartComputerGame={handleStartComputerGame}
              onStartLocalGame={handleStartLocalGame}
              onFindMatch={handleFindMatch}
              onCancelSearch={handleCancelSearch}
              isSearching={isSearching}
              onStartLearnMode={handleStartLearnMode}
              onlinePlayersCount={onlinePlayersCount}
              onStartPuzzle={() => setScreen('puzzle')}
            />
          </div>
        )}

        {screen === 'arena' && (
          <GameArena
            game={game}
            onMove={handleMove}
            onResign={handleResign}
            onOfferDraw={handleOfferDraw}
            onRespondDraw={handleRespondDraw}
            onRequestRematch={handleRequestRematch}
            onSendMessage={handleSendMessage}
            onLeave={handleLeaveGame}
            playerColor={playerColor}
            gameState={gameState}
            isOffline={isOffline}
            isLocalGame={isLocalGame}
            localPlayers={localPlayers}
            localBoardOrientation={localBoardOrientation}
            offlineDifficulty={offlineDifficulty}
            offlineClocks={offlineClocks}
            onTickOfflineClock={handleTickOfflineClock}
            isLearnMode={isLearnMode}
            onUndo={handleUndo}
            lastMove={lastMove}
            boardTheme={boardTheme}
            onStartAnalysis={(pgn) => {
              setAnalysisPgn(pgn);
              setScreen('analysis');
            }}
          />
        )}
      </main>

      {/* Footer — Paper Archive style: copyright left, links right */}
      <footer className="border-t border-slate-900/60 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          {/* Left: copyright */}
          <p className="text-[11px] text-slate-600 font-sans">
            &copy; {new Date().getFullYear()} <span className="text-slate-500 font-semibold">CHESS</span>
            &nbsp;&middot;&nbsp;MIT License&nbsp;&middot;&nbsp;Independent project
          </p>
          {/* Right: links */}
          <nav className="flex items-center gap-5">
            {[
              { label: 'Terms',        href: '/terms.html' },
              { label: 'Privacy',      href: '/privacy.html' },
              { label: 'Honor Code',   href: '/honor-code.html' },
              { label: 'Legal & DMCA', href: '/legal.html' },
            ].map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="text-[11px] text-slate-500 hover:text-slate-300 transition-colors duration-200 font-sans"
              >
                {label}
              </a>
            ))}
            <button
              onClick={() => setScreen('admin')}
              className="text-[11px] text-teal-500/50 hover:text-teal-400 transition-colors duration-200 font-sans flex items-center gap-1"
            >
              <Shield className="w-3 h-3" /> Admin
            </button>
          </nav>
        </div>
      </footer>

      {/* Floating Install Guide in Top Right Corner */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col items-end">
        <InstallGuide
          installPrompt={installPrompt}
          isAppInstalled={isAppInstalled}
          onInstallApp={handleInstallApp}
        />
      </div>

      {/* Floating Settings Button in Top Left Corner */}
      <button
        onClick={() => setIsSettingsOpen(true)}
        className="fixed top-4 left-4 z-[100] flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-slate-900/90 border-2 border-teal-500/80 shadow-[0_0_15px_rgba(45,212,191,0.4)] hover:shadow-[0_0_25px_rgba(45,212,191,0.7)] text-teal-400 hover:text-teal-300 text-sm font-bold transition-all group backdrop-blur-md"
      >
        <Palette className="w-5 h-5 group-hover:rotate-12 transition-transform" />
        <span className="hidden md:inline">Themes & Settings</span>
      </button>

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        currentTheme={boardTheme}
        onThemeChange={setBoardTheme}
      />
    </div>
  );
}
