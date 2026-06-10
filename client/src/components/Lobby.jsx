import React, { useState } from 'react';
import { Monitor, Users, ShieldAlert, Swords, Plus, Key } from 'lucide-react';

export default function Lobby({ onCreateRoom, onJoinRoom, onStartComputerGame }) {
  const [mode, setMode] = useState('computer'); // 'computer' or 'multiplayer'
  
  // Computer options
  const [aiDifficulty, setAiDifficulty] = useState('medium');
  const [aiColor, setAiColor] = useState('white');
  
  // Multiplayer options
  const [username, setUsername] = useState('');
  const [mpColor, setMpColor] = useState('random');
  const [timeLimit, setTimeLimit] = useState(10); // in minutes
  const [roomCodeInput, setRoomCodeInput] = useState('');

  const handleStartComputer = () => {
    onStartComputerGame(aiDifficulty, aiColor);
  };

  const handleCreateRoom = (e) => {
    e.preventDefault();
    onCreateRoom({ hostColor: mpColor, username, timeLimit });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (!roomCodeInput.trim()) return;
    onJoinRoom({ roomId: roomCodeInput.trim().toUpperCase(), username });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-8">
      {/* Title Header */}
      <div className="text-center mb-10">
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-500 to-indigo-500 bg-clip-text text-transparent flex items-center justify-center gap-3">
          <Swords className="w-12 h-12 text-teal-400 animate-pulse" /> ANTIGRAVITY CHESS
        </h1>
        <p className="text-slate-400 mt-2 text-lg">Play against the machine or challenge friends live</p>
      </div>

      {/* Mode Toggle Buttons */}
      <div className="flex bg-slate-900/60 p-1.5 rounded-xl border border-slate-800 w-full max-w-md mb-8">
        <button
          onClick={() => setMode('computer')}
          className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
            mode === 'computer'
              ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Monitor className="w-5 h-5" /> vs Computer
        </button>
        <button
          onClick={() => setMode('multiplayer')}
          className={`flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
            mode === 'multiplayer'
              ? 'bg-gradient-to-r from-teal-500 to-indigo-500 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-5 h-5" /> Multiplayer
        </button>
      </div>

      {/* Configuration Panel */}
      <div className="w-full max-w-md glass p-8 rounded-2xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500"></div>

        {mode === 'computer' ? (
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
        ) : (
          /* MULTIPLAYER PANEL */
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
