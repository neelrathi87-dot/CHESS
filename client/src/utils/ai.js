// Chess AI Engine — Phase-Adaptive Strategy
// The AI changes its playstyle dynamically based on the game phase:
// Opening: Develop pieces, control center, castle early
// Middlegame: Tactics, king safety, piece activity, pawn structure
// Endgame: King activation, passed pawns, pawn promotion

// ==================== PIECE VALUES ====================
const PIECE_VALUES = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

// ==================== OPENING BOOK ====================
// Common openings for variety — AI picks randomly from these in the first few moves
const OPENING_BOOK = {
  // Starting position responses (as Black)
  'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq': ['e5', 'c5', 'd5', 'e6', 'c6', 'Nf6'],
  'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq': ['d5', 'Nf6', 'e6', 'f5'],
  'rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq': ['e5', 'Nf6', 'c5', 'e6'],
  'rnbqkbnr/pppppppp/8/8/8/5N2/PPPPPPPP/RNBQKB1R b KQkq': ['d5', 'Nf6', 'c5'],
  // Starting position moves (as White)
  'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq': ['e4', 'd4', 'c4', 'Nf3'],
};

// ==================== PIECE-SQUARE TABLES ====================
// Middlegame tables
const MG_PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [10, 10, 20, 30, 30, 20, 10, 10],
  [5,  5, 10, 25, 25, 10,  5,  5],
  [0,  0,  0, 20, 20,  0,  0,  0],
  [5, -5,-10,  0,  0,-10, -5,  5],
  [5, 10, 10,-20,-20, 10, 10,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const MG_KNIGHT_PST = [
  [-50,-40,-30,-30,-30,-30,-40,-50],
  [-40,-20,  0,  0,  0,  0,-20,-40],
  [-30,  0, 10, 15, 15, 10,  0,-30],
  [-30,  5, 15, 20, 20, 15,  5,-30],
  [-30,  0, 15, 20, 20, 15,  0,-30],
  [-30,  5, 10, 15, 15, 10,  5,-30],
  [-40,-20,  0,  5,  5,  0,-20,-40],
  [-50,-40,-30,-30,-30,-30,-40,-50]
];

const MG_BISHOP_PST = [
  [-20,-10,-10,-10,-10,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5, 10, 10,  5,  0,-10],
  [-10,  5,  5, 10, 10,  5,  5,-10],
  [-10,  0, 10, 10, 10, 10,  0,-10],
  [-10, 10, 10, 10, 10, 10, 10,-10],
  [-10,  5,  0,  0,  0,  0,  5,-10],
  [-20,-10,-10,-10,-10,-10,-10,-20]
];

const MG_ROOK_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [5, 10, 10, 10, 10, 10, 10,  5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [-5,  0,  0,  0,  0,  0,  0, -5],
  [0,  0,  0,  5,  5,  5,  0,  0]
];

const MG_QUEEN_PST = [
  [-20,-10,-10, -5, -5,-10,-10,-20],
  [-10,  0,  0,  0,  0,  0,  0,-10],
  [-10,  0,  5,  5,  5,  5,  0,-10],
  [-5,  0,  5,  5,  5,  5,  0, -5],
  [0,  0,  5,  5,  5,  5,  0, -5],
  [-10,  5,  5,  5,  5,  5,  0,-10],
  [-10,  0,  5,  0,  0,  5,  0,-10],
  [-20,-10,-10, -5, -5,-10,-10,-20]
];

// King: prefers safety in middlegame (corner, behind pawns)
const MG_KING_PST = [
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-30,-40,-40,-50,-50,-40,-40,-30],
  [-20,-30,-30,-40,-40,-30,-30,-20],
  [-10,-20,-20,-20,-20,-20,-20,-10],
  [20, 20,  0,  0,  0,  0, 20, 20],
  [20, 30, 10,  0,  0, 10, 30, 20]
];

// King ENDGAME: prefers center for active play
const EG_KING_PST = [
  [-50,-40,-30,-20,-20,-30,-40,-50],
  [-30,-20,-10,  0,  0,-10,-20,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 30, 40, 40, 30,-10,-30],
  [-30,-10, 20, 30, 30, 20,-10,-30],
  [-30,-30,  0,  0,  0,  0,-30,-30],
  [-50,-30,-30,-30,-30,-30,-30,-50]
];

// Pawn ENDGAME: push pawns aggressively
const EG_PAWN_PST = [
  [0,  0,  0,  0,  0,  0,  0,  0],
  [80, 80, 80, 80, 80, 80, 80, 80],
  [50, 50, 50, 50, 50, 50, 50, 50],
  [30, 30, 30, 35, 35, 30, 30, 30],
  [20, 20, 20, 25, 25, 20, 20, 20],
  [10, 10, 10, 15, 15, 10, 10, 10],
  [5,  5,  5,  5,  5,  5,  5,  5],
  [0,  0,  0,  0,  0,  0,  0,  0]
];

const PST_TABLES = {
  mg: { p: MG_PAWN_PST, n: MG_KNIGHT_PST, b: MG_BISHOP_PST, r: MG_ROOK_PST, q: MG_QUEEN_PST, k: MG_KING_PST },
  eg: { p: EG_PAWN_PST, n: MG_KNIGHT_PST, b: MG_BISHOP_PST, r: MG_ROOK_PST, q: MG_QUEEN_PST, k: EG_KING_PST }
};

// ==================== GAME PHASE DETECTION ====================
function detectPhase(game) {
  const board = game.board();
  let totalPieces = 0;
  let queens = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.type !== 'k' && sq.type !== 'p') {
        totalPieces++;
        if (sq.type === 'q') queens++;
      }
    }
  }
  const moveCount = game.history().length;
  // Opening: first ~12 moves and most pieces still on board
  if (moveCount < 12 && totalPieces >= 12) return 'opening';

  // Endgame: few pieces left, or no queens and few pieces
  if (totalPieces <= 6 || (queens === 0 && totalPieces <= 8)) return 'endgame';

  // Middlegame: everything else
  return 'middlegame';
}

// ==================== POSITIONAL VALUE ====================
function getPositionalValue(pieceType, color, row, col, phase) {
  const r = color === 'w' ? row : 7 - row;
  const tableSet = phase === 'endgame' ? PST_TABLES.eg : PST_TABLES.mg;
  const table = tableSet[pieceType];
  return table ? table[r][col] : 0;
}

// ==================== PHASE-SPECIFIC BONUSES ====================
function getOpeningBonus(game) {
  let bonus = 0;
  const board = game.board();
  const history = game.history({ verbose: true });

  // Reward for developing knights and bishops (moved from back rank)
  // White back rank = row 7, Black back rank = row 0
  for (let c = 0; c < 8; c++) {
    const wBackRank = board[7][c];
    const bBackRank = board[0][c];

    // Penalize knights/bishops still on back rank
    if (wBackRank && (wBackRank.type === 'n' || wBackRank.type === 'b') && wBackRank.color === 'w') {
      bonus -= 15; // White undeveloped
    }
    if (bBackRank && (bBackRank.type === 'n' || bBackRank.type === 'b') && bBackRank.color === 'b') {
      bonus += 15; // Black undeveloped (good for white)
    }
  }

  // Reward castling
  // If White has castled (no castling rights left and king not on e1)
  const whiteKingPos = findKing(board, 'w');
  const blackKingPos = findKing(board, 'b');

  if (whiteKingPos) {
    if (whiteKingPos.col === 6 || whiteKingPos.col === 2) bonus += 30; // Castled
    if (whiteKingPos.col === 4 && history.length > 10) bonus -= 20; // Still on e1 late
  }
  if (blackKingPos) {
    if (blackKingPos.col === 6 || blackKingPos.col === 2) bonus -= 30; // Black castled
    if (blackKingPos.col === 4 && history.length > 10) bonus += 20; // Black still on e8 late
  }

  // Penalize early queen moves
  const earlyQueenMoves = history.slice(0, 10).filter(m => m.piece === 'q').length;
  if (earlyQueenMoves > 0) {
    // Penalize whichever side moved queen early
    const earlyWhiteQueen = history.slice(0, 10).filter(m => m.piece === 'q' && m.color === 'w').length;
    const earlyBlackQueen = history.slice(0, 10).filter(m => m.piece === 'q' && m.color === 'b').length;
    bonus -= earlyWhiteQueen * 15;
    bonus += earlyBlackQueen * 15;
  }

  // Center control: reward pawns on d4/e4/d5/e5
  const centerSquares = [[3,3],[3,4],[4,3],[4,4]];
  for (const [r, c] of centerSquares) {
    const sq = board[r][c];
    if (sq && sq.type === 'p') {
      bonus += sq.color === 'w' ? 15 : -15;
    }
  }

  return bonus;
}

function getMiddlegameBonus(game) {
  let bonus = 0;
  const board = game.board();

  // Bishop pair bonus
  let whiteBishops = 0, blackBishops = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.type === 'b') {
        if (sq.color === 'w') whiteBishops++;
        else blackBishops++;
      }
    }
  }
  if (whiteBishops >= 2) bonus += 30;
  if (blackBishops >= 2) bonus -= 30;

  // Rook on open file bonus
  for (let c = 0; c < 8; c++) {
    let hasPawn = false;
    let whiteRook = false, blackRook = false;
    for (let r = 0; r < 8; r++) {
      const sq = board[r][c];
      if (sq) {
        if (sq.type === 'p') hasPawn = true;
        if (sq.type === 'r' && sq.color === 'w') whiteRook = true;
        if (sq.type === 'r' && sq.color === 'b') blackRook = true;
      }
    }
    if (!hasPawn) {
      if (whiteRook) bonus += 20;
      if (blackRook) bonus -= 20;
    }
  }

  // King safety: penalize open files near king
  const whiteKing = findKing(board, 'w');
  const blackKing = findKing(board, 'b');

  if (whiteKing) {
    bonus += evaluateKingSafety(board, whiteKing, 'w');
  }
  if (blackKing) {
    bonus -= evaluateKingSafety(board, blackKing, 'b');
  }

  return bonus;
}

function getEndgameBonus(game) {
  let bonus = 0;
  const board = game.board();

  // Passed pawns: huge bonus for pawns with no opposing pawns blocking
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq && sq.type === 'p') {
        if (isPassedPawn(board, r, c, sq.color)) {
          // Value increases the closer the pawn is to promotion
          const distToPromo = sq.color === 'w' ? r : (7 - r);
          const passedBonus = (7 - distToPromo) * 20;
          bonus += sq.color === 'w' ? passedBonus : -passedBonus;
        }
      }
    }
  }

  // King proximity to pawns (king should escort pawns in endgame)
  const whiteKing = findKing(board, 'w');
  const blackKing = findKing(board, 'b');

  if (whiteKing && blackKing) {
    // Reward king being close to center in endgame
    const wCenterDist = Math.abs(whiteKing.row - 3.5) + Math.abs(whiteKing.col - 3.5);
    const bCenterDist = Math.abs(blackKing.row - 3.5) + Math.abs(blackKing.col - 3.5);
    bonus += (bCenterDist - wCenterDist) * 5;
  }

  return bonus;
}

// ==================== HELPER FUNCTIONS ====================
function findKing(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c].type === 'k' && board[r][c].color === color) {
        return { row: r, col: c };
      }
    }
  }
  return null;
}

function evaluateKingSafety(board, kingPos, color) {
  let safety = 0;
  const { row, col } = kingPos;
  const pawnRow = color === 'w' ? row - 1 : row + 1;

  // Check pawn shield (pawns directly in front of king)
  if (pawnRow >= 0 && pawnRow < 8) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc;
      if (c >= 0 && c < 8) {
        const sq = board[pawnRow][c];
        if (sq && sq.type === 'p' && sq.color === color) {
          safety += 10; // Pawn shield bonus
        } else {
          safety -= 10; // Missing pawn shield penalty
        }
      }
    }
  }

  return safety;
}

function isPassedPawn(board, row, col, color) {
  const direction = color === 'w' ? -1 : 1;
  const enemyColor = color === 'w' ? 'b' : 'w';

  // Check if any enemy pawns can block or capture this pawn
  let r = row + direction;
  while (r >= 0 && r < 8) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = col + dc;
      if (c >= 0 && c < 8) {
        const sq = board[r][c];
        if (sq && sq.type === 'p' && sq.color === enemyColor) {
          return false; // Blocked by enemy pawn
        }
      }
    }
    r += direction;
  }
  return true;
}

// ==================== MAIN EVALUATION ====================
export function evaluateBoard(game, noise = 0) {
  const phase = detectPhase(game);
  let score = 0;
  const board = game.board();

  // Material + positional value
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const sq = board[r][c];
      if (sq) {
        const baseVal = PIECE_VALUES[sq.type];
        const posVal = getPositionalValue(sq.type, sq.color, r, c, phase);
        const totalVal = baseVal + posVal;
        score += sq.color === 'w' ? totalVal : -totalVal;
      }
    }
  }

  // Phase-specific strategic bonuses
  if (phase === 'opening') {
    score += getOpeningBonus(game);
  } else if (phase === 'middlegame') {
    score += getMiddlegameBonus(game);
  } else {
    score += getEndgameBonus(game);
  }

  // Mobility bonus: more legal moves = better position
  const mobility = game.moves().length;
  const mobilityBonus = mobility * 2;
  score += game.turn() === 'w' ? mobilityBonus : -mobilityBonus;

  // Add noise for variety
  if (noise > 0) {
    score += (Math.random() - 0.5) * noise;
  }

  return score;
}

// ==================== MOVE ORDERING ====================
function rateMove(move) {
  let score = 0;
  if (move.captured) {
    score += 10 * PIECE_VALUES[move.captured] - PIECE_VALUES[move.piece];
  }
  if (move.promotion) score += 900;
  if (move.san.includes('O-O')) score += 60;
  if (move.san.includes('+')) score += 30; // Checks are interesting
  return score;
}

function orderMoves(moves, shuffle = false) {
  const scored = moves.map(m => ({ move: m, score: rateMove(m) }));
  if (shuffle) {
    scored.forEach(s => { s.score += (Math.random() - 0.5) * 30; });
  }
  return scored.sort((a, b) => b.score - a.score).map(x => x.move);
}

// ==================== MINIMAX WITH ALPHA-BETA ====================
function minimax(game, depth, alpha, beta, isMaximizing, noiseLevel) {
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

  const orderedMoves = orderMoves(moves, depth >= 2);
  let bestMove = null;

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const move of orderedMoves) {
      game.move(move);
      const { score } = minimax(game, depth - 1, alpha, beta, false, noiseLevel);
      game.undo();
      if (score > maxScore) { maxScore = score; bestMove = move; }
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return { score: maxScore, move: bestMove };
  } else {
    let minScore = Infinity;
    for (const move of orderedMoves) {
      game.move(move);
      const { score } = minimax(game, depth - 1, alpha, beta, true, noiseLevel);
      game.undo();
      if (score < minScore) { minScore = score; bestMove = move; }
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return { score: minScore, move: bestMove };
  }
}

// Get top N moves by score
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

  scored.sort((a, b) => isMaximizing ? b.score - a.score : a.score - b.score);
  return scored.slice(0, Math.min(topN, scored.length));
}

// ==================== OPENING BOOK LOOKUP ====================
function getBookMove(game) {
  const fen = game.fen();
  // Strip move counters from FEN for matching
  const fenKey = fen.split(' ').slice(0, 4).join(' ');

  for (const bookFen of Object.keys(OPENING_BOOK)) {
    if (fenKey.startsWith(bookFen.split(' ').slice(0, 4).join(' '))) {
      const bookMoves = OPENING_BOOK[bookFen];
      const legalMoves = game.moves();
      const validBookMoves = bookMoves.filter(m => legalMoves.includes(m));
      if (validBookMoves.length > 0) {
        return validBookMoves[Math.floor(Math.random() * validBookMoves.length)];
      }
    }
  }
  return null;
}

// ==================== PRIMARY ENTRY POINT ====================
export function getComputerMove(game, difficulty) {
  const moves = game.moves({ verbose: true });
  if (moves.length === 0) return null;

  const moveNumber = game.history().length;
  const isMaximizing = game.turn() === 'w';
  const phase = detectPhase(game);

  // Easy: random moves with slight preference for captures
  if (difficulty === 'easy') {
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0 && Math.random() < 0.4) {
      return captures[Math.floor(Math.random() * captures.length)];
    }
    return moves[Math.floor(Math.random() * moves.length)];
  }

  // Medium & Hard: Try opening book first
  if (moveNumber < 8) {
    const bookMove = getBookMove(game);
    if (bookMove) {
      // Find the verbose move object
      const verboseMove = moves.find(m => m.san === bookMove);
      if (verboseMove) return verboseMove;
    }
  }

  // Medium: depth 3, pick from top 3-4 with noise
  if (difficulty === 'medium') {
    const noiseLevel = phase === 'opening' ? 40 : phase === 'middlegame' ? 20 : 10;
    const topN = phase === 'opening' ? 4 : 3;

    const topMoves = getTopMoves(game, 3, isMaximizing, noiseLevel, topN);
    if (topMoves.length === 0) return moves[0];
    return topMoves[Math.floor(Math.random() * topMoves.length)].move;
  }

  // Hard: depth 4, weighted selection from top 2-3
  if (difficulty === 'hard') {
    const noiseLevel = phase === 'opening' ? 20 : phase === 'middlegame' ? 8 : 5;
    const topN = phase === 'opening' ? 3 : 2;

    const topMoves = getTopMoves(game, 4, isMaximizing, noiseLevel, topN);
    if (topMoves.length === 0) return moves[0];

    // Weighted random: strongly favor best move
    const weights = topMoves.map((_, i) => Math.pow(0.4, i));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * totalWeight;
    for (let i = 0; i < topMoves.length; i++) {
      r -= weights[i];
      if (r <= 0) return topMoves[i].move;
    }
    return topMoves[0].move;
  }

  return moves[0];
}
