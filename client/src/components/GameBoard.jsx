import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Chessboard } from 'react-chessboard';

// Piece image URLs (Wikipedia chess piece SVGs — same set react-chessboard uses by default)
const PIECE_SVGS = {
  wK: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  wQ: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wR: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wB: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wN: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wP: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  bK: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  bQ: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  bR: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bB: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  bN: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bP: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
};

export default function GameBoard({
  game,
  onMove,
  onPieceSelect, // optional callback: (square, piece) => void — used by Learn Mode
  playerColor, // 'white', 'black', or 'spectator'
  boardOrientation, // 'white' or 'black'
  interactive // boolean (true if it's the player's turn)
}) {
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [optionSquares, setOptionSquares] = useState({});
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
  const lastMoveFenRef = useRef(null);

  // Ghost piece state: shown at source square during drag via a portal
  const [ghostPiece, setGhostPiece] = useState(null); // { piece, top, left, size }
  const boardContainerRef = useRef(null);

  const turn = game.turn(); // 'w' or 'b'

  // In local 2-player mode playerColor is 'both' — either player can move on their turn
  const isLocalBoth = playerColor === 'both';
  const isMyTurn = interactive && (
    isLocalBoth ||
    (playerColor === 'white' && turn === 'w') ||
    (playerColor === 'black' && turn === 'b')
  );

  // Clear selections when game state changes
  useEffect(() => {
    lastMoveFenRef.current = null;
    setTimeout(() => {
      setSelectedSquare(null);
      setOptionSquares({});
    }, 0);
  }, [game]);

  // Find all legal moves for a square
  const getMoveOptions = (square) => {
    const moves = game.moves({
      square,
      verbose: true
    });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares = {};
    moves.forEach((move) => {
      newSquares[move.to] = {
        background:
          game.get(move.to)
            ? 'radial-gradient(circle, transparent 40%, rgba(16, 185, 129, 0.4) 41%, rgba(16, 185, 129, 0.6) 55%, transparent 56%)' // Ring for capture
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.6) 20%, transparent 25%)', // Dot for standard move
        borderRadius: '50%'
      };
    });

    newSquares[square] = {
      background: 'rgba(14, 165, 233, 0.25)',
      boxShadow: 'inset 0 0 0 2px rgb(14, 165, 233)'
    };
    setOptionSquares(newSquares);
    return true;
  };

  const checkPromotion = (source, target) => {
    const piece = game.get(source);
    if (!piece || piece.type !== 'p') return false;
    
    // Check if white pawn reaches rank 8 or black pawn reaches rank 1
    const reachedEnd = (piece.color === 'w' && target[1] === '8') || 
                      (piece.color === 'b' && target[1] === '1');
    
    return reachedEnd;
  };

  const onSquareClick = (square) => {
    if (!isMyTurn) return;

    // If a promotion is pending, ignore other clicks
    if (pendingPromotion) return;

    // Check if clicked square has player's piece
    const piece = game.get(square);
    const isOwnPiece = piece && (
      // In local 2-player mode, allow whichever side is on turn
      (isLocalBoth && piece.color === turn) ||
      (piece.color === 'w' && playerColor === 'white') ||
      (piece.color === 'b' && playerColor === 'black')
    );

    if (selectedSquare === null) {
      if (isOwnPiece) {
        setSelectedSquare(square);
        getMoveOptions(square);
        if (onPieceSelect) onPieceSelect(square, piece);
      }
    } else {
      // Trying to make a move
      const moves = game.moves({
        square: selectedSquare,
        verbose: true
      });
      const validMove = moves.find((m) => m.to === square);

      if (validMove) {
        if (lastMoveFenRef.current === game.fen()) {
          // Prevent double fire
          setSelectedSquare(null);
          setOptionSquares({});
          return;
        }

        if (checkPromotion(selectedSquare, square)) {
          setPendingPromotion({ from: selectedSquare, to: square });
          return;
        }

        lastMoveFenRef.current = game.fen();
        onMove({
          from: selectedSquare,
          to: square
        });
        setSelectedSquare(null);
        setOptionSquares({});
      } else {
        // If clicked on another of player's own pieces, change selection
        if (isOwnPiece) {
          setSelectedSquare(square);
          getMoveOptions(square);
          if (onPieceSelect) onPieceSelect(square, piece);
        } else {
          // Clicked empty or opponent piece, cancel selection
          setSelectedSquare(null);
          setOptionSquares({});
        }
      }
    }
  };

  const onPieceDrop = (sourceSquare, targetSquare) => {
    if (!isMyTurn) return false;
    if (pendingPromotion) return false;

    // Check if valid move
    const moves = game.moves({
      square: sourceSquare,
      verbose: true
    });
    const validMove = moves.find((m) => m.to === targetSquare);

    // In local 2-player mode, only allow the current turn's pieces to be dragged
    if (!validMove) return false;
    const sourcePiece = game.get(sourceSquare);
    if (!isLocalBoth && sourcePiece && sourcePiece.color !== turn) return false;
    if (lastMoveFenRef.current === game.fen()) return false;

    if (checkPromotion(sourceSquare, targetSquare)) {
      setPendingPromotion({ from: sourceSquare, to: targetSquare });
      return true;
    }

    lastMoveFenRef.current = game.fen();
    onMove({
      from: sourceSquare,
      to: targetSquare
    });
    setSelectedSquare(null);
    setOptionSquares({});
    return true;
  };

  // --- Ghost piece: shown at source square during drag ---
  const handlePieceDragBegin = (piece, sourceSquare) => {
    if (!boardContainerRef.current) return;
    const squareEl = boardContainerRef.current.querySelector(`[data-square="${sourceSquare}"]`);
    if (squareEl) {
      const rect = squareEl.getBoundingClientRect();
      setGhostPiece({ piece, top: rect.top, left: rect.left, size: rect.width });
    }
  };

  const handlePieceDragEnd = () => {
    setGhostPiece(null);
  };

  const handlePromotionSelect = (pieceCode) => {
    if (pendingPromotion) {
      onMove({
        from: pendingPromotion.from,
        to: pendingPromotion.to,
        promotion: pieceCode
      });
      setPendingPromotion(null);
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  // Find highlights for: King in check, Last Move
  const getCustomSquareStyles = () => {
    const styles = { ...optionSquares };

    // 1. Last move highlights (yellow background)
    const history = game.history({ verbose: true });
    if (history.length > 0) {
      const lastMove = history[history.length - 1];
      styles[lastMove.from] = {
        ...styles[lastMove.from],
        backgroundColor: 'rgba(234, 179, 8, 0.25)'
      };
      styles[lastMove.to] = {
        ...styles[lastMove.to],
        backgroundColor: 'rgba(234, 179, 8, 0.3)'
      };
    }

    // 2. King in check highlight (red pulsing gradient)
    if (game.inCheck()) {
      const currentTurn = game.turn(); // 'w' or 'b'
      // Find the king of the side whose turn it is
      const board = game.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const sq = board[r][c];
          if (sq && sq.type === 'k' && sq.color === currentTurn) {
            const squareName = `${String.fromCharCode(97 + c)}${8 - r}`;
            styles[squareName] = {
              ...styles[squareName],
              background: 'radial-gradient(circle, rgba(239,68,68,1) 0%, rgba(239,68,68,0.4) 65%, transparent 100%)',
              boxShadow: 'inset 0 0 10px rgba(239,68,68,0.9)'
            };
            break;
          }
        }
      }
    }

    return styles;
  };

  return (
    <div className="relative w-full max-w-[560px] aspect-square select-none mx-auto" ref={boardContainerRef}>
      <Chessboard
        position={game.fen()}
        onPieceDrop={onPieceDrop}
        onSquareClick={onSquareClick}
        onPieceDragBegin={handlePieceDragBegin}
        onPieceDragEnd={handlePieceDragEnd}
        boardOrientation={boardOrientation}
        customSquareStyles={getCustomSquareStyles()}
        customBoardStyle={{
          borderRadius: '12px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.6), 0 8px 10px -6px rgba(0, 0, 0, 0.6)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
        customDarkSquareStyle={{ backgroundColor: '#2d3748' }} // sleek slate-800
        customLightSquareStyle={{ backgroundColor: '#718096' }} // soft steel slate-500
      />

      {/* Ghost piece portal — renders at source square position on top of everything,
          bypassing react-dnd's opacity:0 on the piece container */}
      {ghostPiece && PIECE_SVGS[ghostPiece.piece] && createPortal(
        <div
          style={{
            position: 'fixed',
            top: ghostPiece.top,
            left: ghostPiece.left,
            width: ghostPiece.size,
            height: ghostPiece.size,
            pointerEvents: 'none',
            zIndex: 9998,
            opacity: 0.45,
            backgroundImage: `url(${PIECE_SVGS[ghostPiece.piece]})`,
            backgroundSize: '80%',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center',
          }}
        />,
        document.body
      )}

      {/* Pawn Promotion Selection Modal Overlay */}
      {pendingPromotion && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center rounded-xl z-50 animate-fade-in">
          <div className="glass p-6 rounded-2xl text-center space-y-4 max-w-xs w-full">
            <h3 className="text-lg font-bold text-slate-100">Promote Pawn</h3>
            <p className="text-xs text-slate-400">Select which piece to promote your pawn into:</p>
            <div className="grid grid-cols-4 gap-2">
              {[
                { code: 'q', name: 'Queen', icon: '♛' },
                { code: 'r', name: 'Rook', icon: '♜' },
                { code: 'b', name: 'Bishop', icon: '♝' },
                { code: 'n', name: 'Knight', icon: '♞' }
              ].map((p) => (
                <button
                  key={p.code}
                  onClick={() => handlePromotionSelect(p.code)}
                  className="py-3 bg-slate-900 border border-slate-800 hover:border-teal-500 rounded-xl text-3xl text-slate-200 hover:text-teal-400 transition-all active:scale-95"
                >
                  {p.icon}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setPendingPromotion(null);
                setSelectedSquare(null);
                setOptionSquares({});
              }}
              className="w-full py-1.5 mt-2 bg-slate-900 hover:bg-slate-800 text-xs font-semibold text-slate-400 rounded-lg transition-colors border border-slate-800"
            >
              Cancel Move
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
