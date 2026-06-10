import React, { useEffect, useRef } from 'react';

// Piece value mapping for score differences
const PIECE_VALUES = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// Unicode chess characters for captured pieces
const PIECE_UNICODE = {
  w: { p: '♙', n: '♘', b: '♗', r: '♖', q: '♕' },
  b: { p: '♟', n: '♞', b: '♝', r: '♜', q: '♛' }
};

export default function MoveHistory({ history, game }) {
  const containerRef = useRef(null);

  // Auto-scroll to latest moves
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [history]);

  // Group moves into pairs (White, Black)
  const renderMoves = () => {
    const moves = [];
    for (let i = 0; i < history.length; i += 2) {
      moves.push({
        num: Math.floor(i / 2) + 1,
        w: history[i]?.san || '',
        b: history[i + 1]?.san || ''
      });
    }
    return moves;
  };

  // Calculate captured pieces
  const getCapturedPieces = () => {
    const starting = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1 }
      // kings aren't captured
    };

    const current = {
      w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
      b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };

    // Count current pieces on board
    game.board().forEach((row) => {
      row.forEach((square) => {
        if (square && square.type !== 'k') {
          current[square.color][square.type]++;
        }
      });
    });

    const captured = {
      white: [], // White pieces captured (by Black)
      black: []  // Black pieces captured (by White)
    };

    let whiteMaterial = 0;
    let blackMaterial = 0;

    // Add white pieces captured by black
    Object.keys(starting.w).forEach((type) => {
      const diff = starting.w[type] - current.w[type];
      whiteMaterial += current.w[type] * PIECE_VALUES[type];
      for (let i = 0; i < diff; i++) {
        captured.white.push(type);
      }
    });

    // Add black pieces captured by white
    Object.keys(starting.b).forEach((type) => {
      const diff = starting.b[type] - current.b[type];
      blackMaterial += current.b[type] * PIECE_VALUES[type];
      for (let i = 0; i < diff; i++) {
        captured.black.push(type);
      }
    });

    // Calculate score difference
    const diffScore = whiteMaterial - blackMaterial;

    return { captured, diffScore };
  };

  const { captured, diffScore } = getCapturedPieces();

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-slate-900/60">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm">Match Sheet</h3>
      </div>

      {/* Captured Pieces Panel */}
      <div className="p-3 border-b border-slate-800/50 bg-slate-900/20 text-xs space-y-2">
        {/* Captured Black Pieces (Captured by White) */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-slate-400 font-semibold mr-1">White captures:</span>
            <div className="flex items-center text-slate-100 text-lg tracking-tight select-none">
              {captured.black.map((type, idx) => (
                <span key={idx} className="hover:scale-110 transition-transform">{PIECE_UNICODE.b[type]}</span>
              ))}
            </div>
          </div>
          {diffScore > 0 && (
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded">+{diffScore}</span>
          )}
        </div>

        {/* Captured White Pieces (Captured by Black) */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1 overflow-hidden">
            <span className="text-slate-400 font-semibold mr-1">Black captures:</span>
            <div className="flex items-center text-slate-300 text-lg tracking-tight select-none">
              {captured.white.map((type, idx) => (
                <span key={idx} className="hover:scale-110 transition-transform">{PIECE_UNICODE.w[type]}</span>
              ))}
            </div>
          </div>
          {diffScore < 0 && (
            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded">+{Math.abs(diffScore)}</span>
          )}
        </div>
      </div>

      {/* Move History Table */}
      <div ref={containerRef} className="flex-1 p-3 overflow-y-auto font-mono text-sm space-y-1 max-h-[200px] md:max-h-none">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 italic text-xs py-8">
            No moves recorded yet.
          </div>
        ) : (
          renderMoves().map((m) => (
            <div
              key={m.num}
              className="grid grid-cols-12 py-1 px-2 hover:bg-slate-800/40 rounded transition-colors text-slate-300"
            >
              <div className="col-span-2 text-slate-500 font-semibold">{m.num}.</div>
              <div className="col-span-5 font-medium text-slate-200">{m.w}</div>
              <div className="col-span-5 text-slate-400">{m.b}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
