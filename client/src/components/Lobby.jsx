import { useState, useEffect } from 'react';
import { Monitor, Users, Globe, Swords, Plus, Key, Search, X, GraduationCap, Gamepad2 } from 'lucide-react';

export default function Lobby({ onCreateRoom, onJoinRoom, onStartComputerGame, onFindMatch, onCancelSearch, isSearching, onStartLearnMode, onlinePlayersCount, onStartLocalGame }) {
  const [mode, setMode] = useState(() => localStorage.getItem('chess_lobby_mode') || 'local');
  
  // Computer options
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiColor, setAiColor] = useState('white');
  
  // Multiplayer options
  const [username, setUsername] = useState(() => localStorage.getItem('chess_username') || '');
  const [mpColor, setMpColor] = useState('random');
  const [timeLimit, setTimeLimit] = useState(10); // in minutes
  const [roomCodeInput, setRoomCodeInput] = useState('');

  // Local 2-player options
  const [localPlayer1, setLocalPlayer1] = useState('');
  const [localPlayer2, setLocalPlayer2] = useState('');
  const [localTimeLimit, setLocalTimeLimit] = useState(10);

  // Online matchmaking options
  const [onlineUsername, setOnlineUsername] = useState(() => localStorage.getItem('chess_username') || '');
  const [onlineTimeLimit, setOnlineTimeLimit] = useState(10);

  // Auto-save username and mode to localStorage on type/change
  useEffect(() => {
    localStorage.setItem('chess_lobby_mode', mode);
  }, [mode]);

  useEffect(() => {
    if (username) localStorage.setItem('chess_username', username);
  }, [username]);

  useEffect(() => {
    if (onlineUsername) localStorage.setItem('chess_username', onlineUsername);
  }, [onlineUsername]);

  const handleStartComputer = () => {
    onStartComputerGame(aiDifficulty, aiColor);
  };

  const handleStartLocal = () => {
    onStartLocalGame({
      player1: localPlayer1.trim() || 'Player 1',
      player2: localPlayer2.trim() || 'Player 2',
      timeLimit: localTimeLimit
    });
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    localStorage.setItem('chess_username', username);
    onCreateRoom({ hostColor: mpColor, username, timeLimit });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    localStorage.setItem('chess_username', username);
    onJoinRoom({ roomId: roomCodeInput.trim().toUpperCase(), username });
  };

  const handleFindMatch = () => {
    const finalName = onlineUsername || 'Player';
    localStorage.setItem('chess_username', finalName);
    onFindMatch({ username: finalName, timeLimit: onlineTimeLimit });
  };

  const handleCancelSearch = () => {
    onCancelSearch();
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      {/* Title Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <Swords className="w-12 h-12 text-teal-400 animate-pulse" /> CHESS
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Learn, practice, and play chess with anyone in the world</p>
      </div>

      {/* Mode Toggle Buttons - 5 tabs */}
      <div className="flex flex-wrap gap-1.5 bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 w-full max-w-lg mb-8">
        <button
          onClick={() => setMode('learn')}
          className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all text-xs ${mode === 'learn' ? 'bg-gradient-to-r from-emerald-500 to-lime-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <GraduationCap className="w-4 h-4" /> Learn
        </button>
        <button
          onClick={() => setMode('computer')}
          className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all text-xs ${mode === 'computer' ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Monitor className="w-4 h-4" /> vs AI
        </button>
        <button
          onClick={() => setMode('local')}
          className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all text-xs ${mode === 'local' ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Gamepad2 className="w-4 h-4" /> Local
        </button>
        <button
          onClick={() => setMode('online')}
          className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all text-xs ${mode === 'online' ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Globe className="w-4 h-4" /> Online
        </button>
        <button
          onClick={() => setMode('multiplayer')}
          className={`flex-1 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-1 transition-all text-xs ${mode === 'multiplayer' ? 'bg-gradient-to-r from-teal-500 to-indigo-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
        >
          <Users className="w-4 h-4" /> Private
        </button>
      </div>

      {/* Configuration Panel */}
      <div className="w-full max-w-md glass p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className={`absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r ${
          mode === 'learn' ? 'from-emerald-500 via-lime-500 to-teal-500' :
          mode === 'computer' ? 'from-emerald-500 via-teal-500 to-indigo-500' :
          mode === 'local' ? 'from-orange-500 via-amber-500 to-yellow-400' :
          mode === 'online' ? 'from-violet-500 via-fuchsia-500 to-pink-500' :
          'from-teal-500 via-indigo-500 to-violet-500'
        }`}></div>

        {mode === 'learn' ? (
          /* LEARN MODE PANEL */
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-lime-400" /> Learn to Play Chess
            </h2>
            <p className="text-sm text-slate-400 -mt-3">
              Play with an AI assistant that guides you, evaluates your moves, and teaches you strategies.
            </p>

            <div className="bg-emerald-500/5 border border-emerald-500/15 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">What you'll get:</h3>
              <ul className="space-y-1.5 text-xs text-slate-400">
                <li className="flex items-start gap-2"><span className="text-emerald-500">🤖</span> AI assistant that evaluates every move</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500">↩️</span> Undo moves to try different strategies</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500">📚</span> Learn about each piece and how it moves</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500">⚠️</span> Threat warnings when your pieces are attacked</li>
                <li className="flex items-start gap-2"><span className="text-emerald-500">💡</span> Strategy tips adapted to your position</li>
              </ul>
            </div>

            <button
              onClick={() => onStartLearnMode()}
              className="w-full py-4 mt-2 bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-emerald-500/10 hover:shadow-emerald-400/20 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all text-lg"
            >
              <GraduationCap className="w-6 h-6" /> Start Learning
            </button>
          </div>
        ) : mode === 'computer' ? (
          /* VS COMPUTER PANEL */
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Monitor className="w-5 h-5 text-teal-400" /> Play against Computer AI
            </h2>

            {/* Difficulty Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 block">Select Difficulty</label>
              <div className="grid grid-cols-3 gap-2">
                {['easy', 'medium', 'hard'].map((diff) => (
                  <button
                    key={diff}
                    onClick={() => setAiDifficulty(diff)}
                    className={`py-2 px-3 rounded-lg border font-semibold capitalize transition-all ${
                      aiDifficulty === diff
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 shadow-md'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    {diff}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-500 mt-1 italic">
                {aiDifficulty === 'easy' && 'AI makes random valid moves. Great for learning.'}
                {aiDifficulty === 'medium' && 'AI searches 2 steps ahead. Standard difficulty.'}
                {aiDifficulty === 'hard' && 'AI evaluates 4 steps ahead with tactical positional matrices.'}
              </p>
            </div>

            {/* Color Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 block">Choose Your Side</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: 'white', label: 'White', colorClass: 'bg-white text-slate-900' },
                  { value: 'random', label: 'Random', colorClass: 'bg-slate-700 text-white' },
                  { value: 'black', label: 'Black', colorClass: 'bg-black border border-slate-700 text-white' }
                ].map((col) => (
                  <button
                    key={col.value}
                    onClick={() => setAiColor(col.value)}
                    className={`py-2 px-3 rounded-lg border font-semibold transition-all ${
                      aiColor === col.value
                        ? 'border-teal-500 ring-2 ring-teal-500/20'
                        : 'border-slate-800 hover:border-slate-700'
                    } ${col.colorClass}`}
                  >
                    {col.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartComputer}
              className="w-full py-4 mt-4 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/10 hover:shadow-teal-400/20 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all text-lg"
            >
              Start AI Match
            </button>
          </div>

        ) : mode === 'local' ? (
          /* LOCAL 2-PLAYER PASS & PLAY PANEL */
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-amber-400" /> Local 2-Player
            </h2>
            <p className="text-sm text-slate-400 -mt-3">
              Pass and play on the same device. The board flips automatically after each move.
            </p>

            {/* Player Names */}
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 block">⬜ Player 1 Name (White)</label>
                <input
                  type="text"
                  value={localPlayer1}
                  onChange={(e) => setLocalPlayer1(e.target.value)}
                  placeholder="Player 1"
                  maxLength={14}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-400 block">⬛ Player 2 Name (Black)</label>
                <input
                  type="text"
                  value={localPlayer2}
                  onChange={(e) => setLocalPlayer2(e.target.value)}
                  placeholder="Player 2"
                  maxLength={14}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>
            </div>

            {/* Time Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 block">Time Control</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 1, label: '1m', sub: 'Bullet' },
                  { value: 3, label: '3m', sub: 'Blitz' },
                  { value: 5, label: '5m', sub: 'Blitz' },
                  { value: 10, label: '10m', sub: 'Rapid' },
                  { value: 30, label: '30m', sub: 'Classic' }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setLocalTimeLimit(t.value)}
                    className={`py-2 rounded-lg border font-semibold transition-all text-center ${
                      localTimeLimit === t.value
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 shadow-md'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm block">{t.label}</span>
                    <span className="text-[9px] text-slate-500 block">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleStartLocal}
              className="w-full py-4 mt-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-amber-500/10 hover:shadow-amber-400/20 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all text-lg"
            >
              <Gamepad2 className="w-6 h-6" /> Start Local Game
            </button>
          </div>

        ) : mode === 'online' ? (
          /* PLAY ONLINE (RANDOM MATCHMAKING) PANEL */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <Globe className="w-5 h-5 text-fuchsia-400" /> Find Random Opponent
              </h2>
              {onlinePlayersCount !== undefined && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-400">{onlinePlayersCount} Online</span>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-400 -mt-3">
              Get matched with a random player online. Colors are assigned randomly.
            </p>

            {/* Display Name */}
            <div className="space-y-2">
              <label htmlFor="onlineUsername" className="text-sm font-medium text-slate-400 block">Your Name</label>
              <input
                id="onlineUsername"
                type="text"
                value={onlineUsername}
                onChange={(e) => setOnlineUsername(e.target.value)}
                placeholder="Player"
                maxLength={14}
                disabled={isSearching}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-fuchsia-500 transition-colors disabled:opacity-50"
              />
            </div>

            {/* Time Control */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-400 block">Time Control</label>
              <div className="grid grid-cols-5 gap-2">
                {[
                  { value: 1, label: '1m', sub: 'Bullet' },
                  { value: 3, label: '3m', sub: 'Blitz' },
                  { value: 5, label: '5m', sub: 'Blitz' },
                  { value: 10, label: '10m', sub: 'Rapid' },
                  { value: 30, label: '30m', sub: 'Classic' }
                ].map((t) => (
                  <button
                    key={t.value}
                    onClick={() => !isSearching && setOnlineTimeLimit(t.value)}
                    disabled={isSearching}
                    className={`py-2 rounded-lg border font-semibold transition-all text-center disabled:opacity-50 ${
                      onlineTimeLimit === t.value
                        ? 'bg-fuchsia-500/20 border-fuchsia-500 text-fuchsia-300 shadow-md'
                        : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-sm block">{t.label}</span>
                    <span className="text-[9px] text-slate-500 block">{t.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search / Cancel Button */}
            {!isSearching ? (
              <button
                onClick={handleFindMatch}
                className="w-full py-4 mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-400 hover:to-fuchsia-400 text-white font-bold rounded-xl shadow-lg shadow-fuchsia-500/10 hover:shadow-fuchsia-400/20 flex items-center justify-center gap-2 transform hover:-translate-y-0.5 transition-all text-lg"
              >
                <Search className="w-5 h-5" /> Find Match
              </button>
            ) : (
              <div className="space-y-4 mt-4">
                {/* Searching Animation */}
                <div className="text-center space-y-3 py-4">
                  <div className="relative w-16 h-16 mx-auto">
                    <div className="absolute inset-0 border-4 border-fuchsia-500/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-transparent border-t-fuchsia-500 rounded-full animate-spin"></div>
                    <Search className="absolute inset-0 m-auto w-6 h-6 text-fuchsia-400" />
                  </div>
                  <p className="text-slate-200 font-semibold">Searching for opponent...</p>
                  <p className="text-xs text-slate-500">This may take a moment. Waiting for another player to join.</p>
                </div>
                <button
                  onClick={handleCancelSearch}
                  className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 border border-slate-700"
                >
                  <X className="w-4 h-4 text-rose-400" /> Cancel Search
                </button>
              </div>
            )}
          </div>
        ) : (
          /* PRIVATE MULTIPLAYER PANEL */
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" /> Challenge a Friend
            </h2>

            {/* Display Name */}
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium text-slate-400 block">Your Name</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Guest Player"
                maxLength={14}
                className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* Tabs for Create or Join */}
            <div className="border-t border-slate-800/80 pt-4 space-y-5">
              {/* CREATE SECTION */}
              <form onSubmit={handleCreateRoom} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-emerald-400" /> Create a New Room
                </h3>
                
                {/* Timer Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label htmlFor="timeLimit" className="text-xs font-medium text-slate-500 block">Game Time</label>
                    <select
                      id="timeLimit"
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value={1}>1 Min (Bullet)</option>
                      <option value={3}>3 Min (Blitz)</option>
                      <option value={5}>5 Min (Blitz)</option>
                      <option value={10}>10 Min (Rapid)</option>
                      <option value={30}>30 Min (Classical)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500 block">Your Color</label>
                    <select
                      value={mpColor}
                      onChange={(e) => setMpColor(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="random">Random</option>
                      <option value="white">White</option>
                      <option value="black">Black</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-500/20 text-sm"
                >
                  Create Match Code
                </button>
              </form>

              {/* JOIN SECTION */}
              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t border-slate-800/80"></div>
                <span className="flex-shrink mx-4 text-xs text-slate-600 font-semibold uppercase">Or</span>
                <div className="flex-grow border-t border-slate-800/80"></div>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-4 h-4 text-indigo-400" /> Join Existing Room
                </h3>

                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={roomCodeInput}
                      onChange={(e) => setRoomCodeInput(e.target.value)}
                      placeholder="Enter Room Code (e.g. 8K3J92)"
                      maxLength={8}
                      className="w-full bg-slate-900/60 border border-slate-800 rounded-lg px-4 py-2 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 uppercase font-mono tracking-widest text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!roomCodeInput.trim()}
                    className="px-5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white font-semibold rounded-lg text-sm transition-all shadow-md"
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
