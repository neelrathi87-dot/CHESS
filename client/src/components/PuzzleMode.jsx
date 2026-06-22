import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import GameBoard from './GameBoard';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, HelpCircle } from 'lucide-react';

export default function PuzzleMode({ onLeave, boardTheme }) {
  const [game, setGame] = useState(new Chess());
  const [puzzleData, setPuzzleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [solution, setSolution] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0); // Which solution move we are waiting for the USER to play
  const [puzzleStatus, setPuzzleStatus] = useState('playing'); // 'playing', 'solved', 'failed'
  const [playerColor, setPlayerColor] = useState('white');
  const [lastMove, setLastMove] = useState(null);

  const fetchPuzzle = async () => {
    setLoading(true);
    setError(null);
    setPuzzleStatus('playing');
    setMoveIndex(0);
    setLastMove(null);

    try {
      // Fetch daily puzzle from Lichess
      const response = await fetch('https://lichess.org/api/puzzle/daily');
      if (!response.ok) throw new Error('Failed to fetch puzzle');
      const data = await response.json();

      const { game: gameData, puzzle } = data;
      const initialPly = puzzle.initialPly;
      const sol = puzzle.solution; // e.g. ["e2e4", "e7e5", ...]

      // 1. Reconstruct game up to initialPly
      const tempGame = new Chess();
      tempGame.loadPgn(gameData.pgn);
      const history = tempGame.history();

      const newGame = new Chess();
      for (let i = 0; i < initialPly; i++) {
        newGame.move(history[i]);
      }

      // 2. The first move in the solution is the opponent's blunder/setup move.
      // We play it automatically to show the user what just happened.
      const firstMove = sol[0];
      const from = firstMove.substring(0, 2);
      const to = firstMove.substring(2, 4);
      const promotion = firstMove.length > 4 ? firstMove[4] : undefined;
      
      const moveResult = newGame.move({ from, to, promotion });
      
      setGame(newGame);
      setLastMove(moveResult);
      setPuzzleData(data);
      
      // The user is the one to respond, so their color is whoever's turn it is now.
      setPlayerColor(newGame.turn() === 'w' ? 'white' : 'black');
      
      // The solution array for the user starts at index 1
      setSolution(sol);
      setMoveIndex(1);
      setLoading(false);

    } catch (err) {
      console.error(err);
      setError('Could not load daily puzzle. Please try again later.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPuzzle();
  }, []);

  const handleMove = (moveData) => {
    if (puzzleStatus !== 'playing') return;

    const expectedMoveStr = solution[moveIndex];
    
    // We need to check if the user's move matches the expected UCI string (e.g. 'e2e4')
    // We can do this by applying the move to a clone and checking its UCI (from+to+promotion)
    const clone = new Chess(game.fen());
    try {
      const result = clone.move(moveData);
      if (!result) return; // Invalid move

      const userMoveUci = result.from + result.to + (result.promotion || '');

      if (userMoveUci === expectedMoveStr) {
        // Correct move!
        const newGame = new Chess(game.fen());
        const realResult = newGame.move(moveData);
        setGame(newGame);
        setLastMove(realResult);

        // Check if puzzle is solved
        if (moveIndex + 1 >= solution.length) {
          setPuzzleStatus('solved');
        } else {
          // Play the opponent's next forced move automatically
          const nextIndex = moveIndex + 1;
          const opponentMoveStr = solution[nextIndex];
          
          setTimeout(() => {
            const oppFrom = opponentMoveStr.substring(0, 2);
            const oppTo = opponentMoveStr.substring(2, 4);
            const oppProm = opponentMoveStr.length > 4 ? opponentMoveStr[4] : undefined;
            
            const nextGame = new Chess(newGame.fen());
            const oppResult = nextGame.move({ from: oppFrom, to: oppTo, promotion: oppProm });
            
            setGame(nextGame);
            setLastMove(oppResult);
            setMoveIndex(nextIndex + 1);
            
            if (nextIndex + 1 >= solution.length) {
               setPuzzleStatus('solved');
            }
          }, 500); // 500ms delay for natural feel
        }
      } else {
        // Incorrect move
        setPuzzleStatus('failed');
      }
    } catch {
      // Invalid move string
    }
  };

  const handleRetry = () => {
    // Reset to the state right after the opponent's first move
    if (!puzzleData) return;
    
    const initialPly = puzzleData.puzzle.initialPly;
    const tempGame = new Chess();
    tempGame.loadPgn(puzzleData.game.pgn);
    const history = tempGame.history();

    const newGame = new Chess();
    for (let i = 0; i < initialPly; i++) {
      newGame.move(history[i]);
    }
    
    // Play opponent's first move
    const firstMove = puzzleData.puzzle.solution[0];
    const from = firstMove.substring(0, 2);
    const to = firstMove.substring(2, 4);
    const promotion = firstMove.length > 4 ? firstMove[4] : undefined;
    const result = newGame.move({ from, to, promotion });

    setGame(newGame);
    setLastMove(result);
    setPuzzleStatus('playing');
    setMoveIndex(1);
  };

  const handleShowHint = () => {
    if (puzzleStatus !== 'playing') return;
    const expectedMoveStr = solution[moveIndex];
    const from = expectedMoveStr.substring(0, 2);
    const to = expectedMoveStr.substring(2, 4);
    // You could flash the piece or show an arrow. For now, we'll just alert the piece to move.
    alert(`Hint: Move the piece on ${from} to ${to}`);
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-6 min-h-[100dvh] flex flex-col">
      
      {/* Header */}
      <div className="flex justify-between items-center bg-slate-900/60 px-4 py-3 rounded-xl border border-slate-800 shrink-0 mb-4">
        <button
          onClick={onLeave}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors text-sm font-semibold"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="flex items-center gap-2 text-slate-200">
          <HelpCircle className="w-5 h-5 text-indigo-400" />
          <h1 className="font-bold">Daily Puzzle</h1>
          {puzzleData && (
            <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">
              Rating: {puzzleData.puzzle.rating}
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
        
        {/* Board Area */}
        <div className="flex-1 flex flex-col min-h-0">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p>Loading Daily Puzzle...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center text-rose-400">
              <XCircle className="w-12 h-12 mb-4" />
              <p>{error}</p>
            </div>
          ) : (
            <div className="glass p-3 rounded-2xl relative w-full max-w-[60vh] mx-auto flex-1 min-h-0 flex items-center justify-center">
              <div className="w-full" style={{ aspectRatio: '1/1' }}>
                <GameBoard
                  game={game}
                  onMove={handleMove}
                  playerColor={playerColor}
                  boardOrientation={playerColor}
                  interactive={puzzleStatus === 'playing'}
                  boardTheme={boardTheme}
                />
              </div>
            </div>
          )}
        </div>

        {/* Info Sidebar */}
        <div className="w-full lg:w-80 flex flex-col gap-4">
          <div className="bg-slate-900/60 rounded-xl border border-slate-800 p-5 shadow-xl">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Puzzle Status</h2>
            
            {puzzleStatus === 'playing' && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-lg p-4 text-center">
                <span className="text-indigo-300 font-semibold">Find the best move for {playerColor}.</span>
              </div>
            )}

            {puzzleStatus === 'solved' && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 text-center flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <span className="text-emerald-300 font-bold text-lg">Puzzle Solved!</span>
                <p className="text-sm text-emerald-400/80">Excellent work.</p>
              </div>
            )}

            {puzzleStatus === 'failed' && (
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-lg p-4 text-center flex flex-col items-center gap-2">
                <XCircle className="w-8 h-8 text-rose-400" />
                <span className="text-rose-300 font-bold text-lg">Incorrect Move</span>
                <p className="text-sm text-rose-400/80">That wasn't the best move.</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              {puzzleStatus === 'failed' && (
                <button
                  onClick={handleRetry}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" /> Try Again
                </button>
              )}
              
              {puzzleStatus === 'playing' && (
                <button
                  onClick={handleShowHint}
                  className="w-full py-2.5 bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-lg font-semibold transition-colors border border-slate-700/50"
                >
                  Show Hint
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
