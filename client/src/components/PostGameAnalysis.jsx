import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import GameBoard from './GameBoard';
import EvalBar from './EvalBar';
import { ArrowLeft, ChevronLeft, ChevronRight, FastForward, Rewind, Activity } from 'lucide-react';

export default function PostGameAnalysis({ pgn, onLeave, boardTheme }) {
  const [game, setGame] = useState(new Chess());
  const [history, setHistory] = useState([]);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [evaluation, setEvaluation] = useState('0.0');
  const [bestMove, setBestMove] = useState('');
  
  const evalWorkerRef = useRef(null);

  // Initialize game from PGN
  useEffect(() => {
    const fullGame = new Chess();
    if (pgn) {
      fullGame.loadPgn(pgn);
    }
    const moves = fullGame.history({ verbose: true });
    setHistory(moves);
    
    // Start at the end of the game
    setCurrentMoveIndex(moves.length);
    
    const initialGame = new Chess();
    for (let i = 0; i < moves.length; i++) {
      initialGame.move(moves[i]);
    }
    setGame(initialGame);
  }, [pgn]);

  // Setup Stockfish worker
  useEffect(() => {
    evalWorkerRef.current = new Worker('/stockfish.js');
    evalWorkerRef.current.onmessage = (e) => {
      const msg = e.data;
      if (typeof msg === 'string' && msg.includes('score')) {
        const scoreMatch = msg.match(/score (cp|mate) (-?\d+)/);
        const pvMatch = msg.match(/ pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        
        if (pvMatch) {
           setBestMove(pvMatch[1]);
        }
        
        if (scoreMatch) {
          const type = scoreMatch[1];
          const val = parseInt(scoreMatch[2], 10);
          
          const isWhiteToMove = game.turn() === 'w';
          
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
  }, [game]); // Need game dependency for game.turn()

  // Evaluate current position
  useEffect(() => {
    if (evalWorkerRef.current) {
      evalWorkerRef.current.postMessage('stop');
      evalWorkerRef.current.postMessage('uci');
      evalWorkerRef.current.postMessage(`position fen ${game.fen()}`);
      evalWorkerRef.current.postMessage('go depth 14');
    }
  }, [game.fen()]);

  const goToMove = (index) => {
    if (index < 0) index = 0;
    if (index > history.length) index = history.length;
    
    const newGame = new Chess();
    for (let i = 0; i < index; i++) {
      newGame.move(history[i]);
    }
    setGame(newGame);
    setCurrentMoveIndex(index);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 min-h-[100dvh] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-800 shrink-0 mb-4">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Lobby
        </button>

        <div className="flex items-center gap-2 text-slate-200">
          <Activity className="w-5 h-5 text-indigo-400" />
          <h1 className="font-bold">Post-Game Analysis</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        {/* Board Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="glass p-3 rounded-2xl relative w-full max-w-[60vh] mx-auto flex-1 min-h-0 flex items-center justify-center">
            <div className="flex w-full h-full gap-2" style={{ aspectRatio: '1/1' }}>
              <EvalBar evaluation={evaluation} boardOrientation="white" />
              <div className="flex-1">
                <GameBoard
                  game={game}
                  onMove={() => false} // Read only
                  playerColor="spectator"
                  boardOrientation="white"
                  interactive={false}
                  boardTheme={boardTheme}
                />
              </div>
            </div>
          </div>
          
          {/* Controls */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => goToMove(0)}
              disabled={currentMoveIndex === 0}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <Rewind className="w-5 h-5" />
            </button>
            <button
              onClick={() => goToMove(currentMoveIndex - 1)}
              disabled={currentMoveIndex === 0}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="w-16 text-center text-slate-400 font-mono text-sm">
              {currentMoveIndex} / {history.length}
            </span>
            <button
              onClick={() => goToMove(currentMoveIndex + 1)}
              disabled={currentMoveIndex === history.length}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => goToMove(history.length)}
              disabled={currentMoveIndex === history.length}
              className="p-3 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-50 transition-colors"
            >
              <FastForward className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 shadow-xl flex-1 flex flex-col">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Engine Evaluation</h2>
            
            <div className="bg-slate-800/50 rounded-lg p-6 flex flex-col items-center justify-center border border-slate-700 mb-4">
              <span className="text-4xl font-mono font-bold text-slate-200">
                {evaluation.startsWith('M') || evaluation.startsWith('-') ? evaluation : (parseFloat(evaluation) > 0 ? `+${evaluation}` : evaluation)}
              </span>
              <span className="text-xs text-slate-400 mt-2 uppercase tracking-wider">Advantage</span>
            </div>

            <div className="flex-1 overflow-y-auto mb-4 border border-slate-800 rounded-lg bg-slate-900/40 p-2">
               <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-sm font-mono">
                 {history.map((move, i) => (
                    <button
                      key={i}
                      onClick={() => goToMove(i + 1)}
                      className={`px-2 py-1 text-left rounded ${i + 1 === currentMoveIndex ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-slate-800'}`}
                    >
                      {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{move.san}
                    </button>
                 ))}
               </div>
            </div>

            {bestMove && (
               <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-center text-sm">
                 <span className="text-emerald-400">Stockfish suggests: </span>
                 <strong className="text-emerald-300 uppercase tracking-widest">{bestMove}</strong>
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
