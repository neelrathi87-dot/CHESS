// Chess Minimax AI Engine

// Base values of pieces
const PIECE_VALUES = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000
};

// Piece-Square Tables (oriented from White's perspective)
// 0,0 is top-left (a8), 7,7 is bottom-right (h1)
const PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const ROOK_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  5,  0,  0]
];

const QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

const KING_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

// Return positional bonus based on piece type, color, and square
function getPositionalValue(pieceType, color, row, col) {
  // If Black, mirror the row index for evaluation
  const r = color === 'w' ? row : 7 - row;
  const c = col;

  switch (pieceType) {
    case 'p': return PAWN_PST[r][c];
    case 'n': return KNIGHT_PST[r][c];
    case 'b': return BISHOP_PST[r][c];
    case 'r': return ROOK_PST[r][c];
    case 'q': return QUEEN_PST[r][c];
    case 'k': return KING_PST[r][c];
    default: return 0;
  }
}

// Evaluate board state
// Positive score is good for White, negative score is good for Black
export function evaluateBoard(game) {
  let score = 0;
  const board = game.board();

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const square = board[r][c];
      if (square) {
        const type = square.type;
        const color = square.color;
        const baseVal = PIECE_VALUES[type];
        const posVal = getPositionalValue(type, color, r, c);
        const totalVal = baseVal + posVal;

        if (color === 'w') {
          score += totalVal;
        } else {
          score -= totalVal;
        }
      }
    }
  }

  return score;
}

// Rate single move for move ordering
function rateMove(move, game) {
  let score = 0;

  // Most Valuable Victim - Least Valuable Aggressor (MVV-LVA)
  if (move.captured) {
    score += 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
  }

  // Promotion is highly scored
  if (move.promotion) {
    score += 900;
  }

  // Castling is favored
  if (move.san.includes('O-O')) {
    score += 60;
  }

  // Moving piece from threatened square could be good, but let's keep it simple
  return score;
}

// Sort moves to maximize alpha-beta pruning efficiency
function orderMoves(moves, game) {
  return moves
    .map(m => ({ move: m, score: rateMove(m, game) }))
    .sort((a, b) => b.score - a.score)
    .map(x => x.move);
}

// Minimax with Alpha-Beta Pruning
function minimax(game, depth, alpha, beta, isMaximizing) {
  // Base cases
  if (depth === 0) {
    return { score: evaluateBoard(game) };
  }

  const moves = game.moves({ verbose: true });

  if (moves.length === 0) {
    if (game.inCheck()) {
      // Checkmate: if White's turn (maximizing) is mated, Black wins (-infinity)
      // if Black's turn (minimizing) is mated, White wins (+infinity)
      return { score: isMaximizing ? -Infinity + (4 - depth) : Infinity - (4 - depth) };
    }
    // Stalemate / Draw
    return { score: 0 };
  }

  // Order moves for optimal pruning
  const orderedMoves = orderMoves(moves, game);

  let bestMove = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of orderedMoves) {
      game.move(move);
      const { score } = minimax(game, depth - 1, alpha, beta, false);
      game.undo();

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break; // beta cut-off
      }
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of orderedMoves) {
      game.move(move);
      const { score } = minimax(game, depth - 1, alpha, beta, true);
      game.undo();

      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break; // alpha cut-off
      }
    }
    return { score: minScore, move: bestMove };
  }
}

// Primary entry point to get computer's move
// Returns move object { from, to, promotion }
export function getComputerMove(game, difficulty) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  // Easy Difficulty: Pure Random Moves
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  // Medium Difficulty: Minimax Depth 2
  if (difficulty === 'medium') {
    const isMaximizing = game.turn() === 'w';
    const result = minimax(game, 2, -Infinity, Infinity, isMaximizing);
    return result.move || moves[0];
  }

  // Hard Difficulty: Minimax Depth 4 with Alpha-Beta Pruning
  if (difficulty === 'hard') {
    const isMaximizing = game.turn() === 'w';
    // Depth 4 is highly tactical and runs very quickly with move ordering
    const result = minimax(game, 4, -Infinity, Infinity, isMaximizing);
    return result.move || moves[0];
  }

  // Fallback to random
  return moves[0];
}
