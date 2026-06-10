// Chess Minimax AI Engine with Variety & Randomization

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

// Evaluate board state with small random noise for variety
// Positive score is good for White, negative is good for Black
export function evaluateBoard(game, noise = 0) {
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

  // Add small random noise to break ties and create variety
  if (noise > 0) {
    score += (Math.random() - 0.5) * noise;
  }

  return score;
}

// Rate single move for move ordering
function rateMove(move) {
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

  return score;
}

// Sort moves with slight randomization for variety
function orderMoves(moves, shuffle = false) {
  const scored = moves.map(m => ({ move: m, score: rateMove(m) }));

  if (shuffle) {
    // Add random factor to move ordering for variety in similar positions
    scored.forEach(s => { s.score += (Math.random() - 0.5) * 30; });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .map(x => x.move);
}

// Minimax with Alpha-Beta Pruning and noise for variety
function minimax(game, depth, alpha, beta, isMaximizing, noiseLevel) {
  // Base case: evaluate with noise
  if (depth === 0) {
    return { score: evaluateBoard(game, noiseLevel) };
  }

  const moves = game.moves({ verbose: true });

  if (moves.length === 0) {
    if (game.inCheck()) {
      return { score: isMaximizing ? -Infinity + (4 - depth) : Infinity - (4 - depth) };
    }
    return { score: 0 };
  }

  // Shuffle move ordering slightly at root for variety
  const orderedMoves = orderMoves(moves, depth >= 2);

  let bestMove = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of orderedMoves) {
      game.move(move);
      const { score } = minimax(game, depth - 1, alpha, beta, false, noiseLevel);
      game.undo();

      if (score > maxScore) {
        maxScore = score;
        bestMove = move;
      }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) {
        break;
      }
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of orderedMoves) {
      game.move(move);
      const { score } = minimax(game, depth - 1, alpha, beta, true, noiseLevel);
      game.undo();

      if (score < minScore) {
        minScore = score;
        bestMove = move;
      }
      beta = Math.min(beta, score);
      if (beta <= alpha) {
        break;
      }
    }
    return { score: minScore, move: bestMove };
  }
}

// Collect top N moves by score for random selection
function getTopMoves(game, depth, isMaximizing, noiseLevel, topN = 3) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return [];

  const scored = [];

  for (const move of moves) {
    game.move(move);
    const { score } = minimax(game, depth - 1, -Infinity, Infinity, !isMaximizing, noiseLevel);
    game.undo();
    scored.push({ move, score });
  }

  // Sort: best first depending on side
  if (isMaximizing) {
    scored.sort((a, b) => b.score - a.score);
  } else {
    scored.sort((a, b) => a.score - b.score);
  }

  // Return top N moves
  return scored.slice(0, Math.min(topN, scored.length));
}

// Primary entry point to get computer's move
export function getComputerMove(game, difficulty) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const moveNumber = game.history().length;
  const isMaximizing = game.turn() === 'w';

  // Easy Difficulty: Pure Random Moves
  if (difficulty === 'easy') {
    const randomIndex = Math.floor(Math.random() * moves.length);
    return moves[randomIndex];
  }

  // Medium Difficulty: Minimax Depth 2, pick randomly from top 3 moves
  if (difficulty === 'medium') {
    // During opening (first 10 moves), add more randomness
    const noiseLevel = moveNumber < 10 ? 40 : 15;
    const topN = moveNumber < 10 ? 4 : 3;

    const topMoves = getTopMoves(game, 2, isMaximizing, noiseLevel, topN);
    if (topMoves.length === 0) return moves[0];

    // Pick randomly from the top moves
    const pick = Math.floor(Math.random() * topMoves.length);
    return topMoves[pick].move;
  }

  // Hard Difficulty: Minimax Depth 4, pick randomly from top 2-3 moves
  if (difficulty === 'hard') {
    // Less noise for hard, but still some for variety
    const noiseLevel = moveNumber < 8 ? 25 : 8;
    const topN = moveNumber < 8 ? 3 : 2;

    const topMoves = getTopMoves(game, 4, isMaximizing, noiseLevel, topN);
    if (topMoves.length === 0) return moves[0];

    // Weighted random: favor the best move but sometimes pick alternatives
    const weights = topMoves.map((_, i) => Math.pow(0.5, i)); // 1, 0.5, 0.25...
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < topMoves.length; i++) {
      r -= weights[i];
      if (r <= 0) return topMoves[i].move;
    }

    return topMoves[0].move;
  }

  // Fallback
  return moves[0];
}
