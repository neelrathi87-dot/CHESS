import React, { useEffect, useRef } from 'react';

// Piece value mapping for material advantage
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

  // Calculate captured pieces and material advantage
  const getCapturedPieces = () => {
    const starting = {
      w: { p: 8, n: 2, b: 2, r: 2, q: 1 },
      b: { p: 8, n: 2, b: 2, r: 2, q: 1 }
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

    let whiteCapturedValue = 0; // Value of white pieces captured by black
    let blackCapturedValue = 0; // Value of black pieces captured by white

    // White pieces captured by black
    Object.keys(starting.w).forEach((type) => {
      const diff = starting.w[type] - current.w[type];
      for (let i = 0; i < diff; i++) {
        captured.white.push(type);
        whiteCapturedValue += PIECE_VALUES[type];
      }
    });

    // Black pieces captured by white
    Object.keys(starting.b).forEach((type) => {
      const diff = starting.b[type] - current.b[type];
      for (let i = 0; i < diff; i++) {
        captured.black.push(type);
        blackCapturedValue += PIECE_VALUES[type];
      }
    });

    // Material advantage: positive = white ahead, negative = black ahead
    const whiteAdvantage = blackCapturedValue - whiteCapturedValue;

    return { captured, whiteAdvantage };
  };

  const { captured, whiteAdvantage } = getCapturedPieces();

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden">
      <div className="p-3 border-b border-slate-800 bg-slate-900/60">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-xs">Match Sheet</h3>
      </div>

      {/* Captured Pieces Panel */}
      <div className="px-3 py-2 border-b border-slate-800/50 bg-slate-900/20 text-xs space-y-1">
        {/* Captured Black Pieces (Captured by White) */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1 overflow-hidden flex-wrap">
            <span className="text-slate-500 font-semibold mr-0.5 text-[10px]">W captures:</span>
            <div className="flex items-center text-slate-100 text-base tracking-tight select-none flex-wrap">
              {captured.black.length === 0 ? (
                <span className="text-slate-600 text-[10px] italic">None</span>
              ) : (
                captured.black.map((type, idx) => (
                  <span key={idx}>{PIECE_UNICODE.b[type]}</span>
                ))
              )}
            </div>
          </div>
          {whiteAdvantage > 0 && (
            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded text-[10px] shrink-0">+{whiteAdvantage}</span>
          )}
        </div>

        {/* Captured White Pieces (Captured by Black) */}
        <div className="flex items-center gap-2 justify-between">
          <div className="flex items-center gap-1 overflow-hidden flex-wrap">
            <span className="text-slate-500 font-semibold mr-0.5 text-[10px]">B captures:</span>
            <div className="flex items-center text-slate-300 text-base tracking-tight select-none flex-wrap">
              {captured.white.length === 0 ? (
                <span className="text-slate-600 text-[10px] italic">None</span>
              ) : (
                captured.white.map((type, idx) => (
                  <span key={idx}>{PIECE_UNICODE.w[type]}</span>
                ))
              )}
            </div>
          </div>
          {whiteAdvantage < 0 && (
            <span className="text-indigo-400 font-bold bg-indigo-500/10 px-1.5 py-0.5 rounded text-[10px] shrink-0">+{Math.abs(whiteAdvantage)}</span>
          )}
        </div>
      </div>

      {/* Move History Table */}
      <div ref={containerRef} className="flex-1 p-2 overflow-y-auto font-mono text-xs space-y-0.5 min-h-0">
        {history.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 italic text-[10px] py-4">
            No moves recorded yet.
          </div>
        ) : (
          renderMoves().map((m) => (
            <div
              key={m.num}
              className="grid grid-cols-12 py-0.5 px-1.5 hover:bg-slate-800/40 rounded transition-colors text-slate-300"
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
