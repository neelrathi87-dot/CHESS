// Chess Learning Helper — AI Assistant Logic
// Provides move evaluation, piece info, tips, and guidance for beginners

import { evaluateBoard } from './ai';

// ==================== PIECE INFORMATION ====================
export const PIECE_INFO = {
  p: {
    name: 'Pawn',
    symbol: '♟',
    value: 1,
    description: 'The foot soldier of chess. Pawns move forward one square (or two from starting position). They capture diagonally one square forward.',
    movement: [
      'Moves forward 1 square (2 squares from starting position)',
      'Captures diagonally forward 1 square',
      'Can perform "en passant" capture',
      'Promotes to any piece when reaching the last rank'
    ],
    tips: [
      'Control the center with pawns early (d4, e4, d5, e5)',
      'Avoid moving the same pawn twice in the opening',
      'Connected pawns (side by side) protect each other',
      'Passed pawns (no opposing pawns blocking) are very strong in endgames',
      'Don\'t push pawns in front of your castled king'
    ]
  },
  n: {
    name: 'Knight',
    symbol: '♞',
    value: 3,
    description: 'The tricky piece! Knights move in an "L" shape — two squares in one direction and one square perpendicular. Knights are the only pieces that can jump over others.',
    movement: [
      'Moves in an L-shape: 2+1 squares',
      'Can jump over other pieces',
      'Alternates between light and dark squares',
      'Controls up to 8 squares from the center'
    ],
    tips: [
      'Knights are strongest in the center of the board',
      'Develop knights early — they\'re great in the opening',
      'Knights on the rim are dim — avoid placing them on edges',
      'Knights are better in closed positions (lots of pawns)',
      'A knight on an outpost (protected square) is very powerful'
    ]
  },
  b: {
    name: 'Bishop',
    symbol: '♝',
    value: 3,
    description: 'The diagonal striker! Bishops move any number of squares diagonally. Each bishop stays on its starting color for the entire game.',
    movement: [
      'Moves any number of squares diagonally',
      'Stays on the same color squares forever',
      'Cannot jump over pieces',
      'Long-range piece — great for controlling diagonals'
    ],
    tips: [
      'Two bishops together (the "bishop pair") are very powerful',
      'Place bishops on long open diagonals for maximum reach',
      'Fianchetto (b2/g2 or b7/g7) creates strong diagonal control',
      'Bishops are better in open positions (few pawns blocking)',
      'Don\'t block your bishop with your own pawns'
    ]
  },
  r: {
    name: 'Rook',
    symbol: '♜',
    value: 5,
    description: 'The powerful tower! Rooks move any number of squares horizontally or vertically. They\'re most effective on open files and the 7th rank.',
    movement: [
      'Moves any number of squares horizontally or vertically',
      'Cannot jump over pieces',
      'Participates in castling with the king',
      'Strongest piece after the queen'
    ],
    tips: [
      'Place rooks on open files (no pawns blocking)',
      'Double rooks on the same file for maximum power',
      'Rooks on the 7th rank can be devastating',
      'Don\'t develop rooks too early — they need open files',
      'Connect your rooks by clearing the back rank'
    ]
  },
  q: {
    name: 'Queen',
    symbol: '♛',
    value: 9,
    description: 'The most powerful piece! The queen combines the movement of a rook and bishop — it can move any number of squares in any straight line direction.',
    movement: [
      'Moves any number of squares horizontally, vertically, or diagonally',
      'Combines the power of a rook and bishop',
      'Cannot jump over pieces',
      'Most powerful piece on the board'
    ],
    tips: [
      'Don\'t bring the queen out too early — it can be chased',
      'The queen is worth about 9 points — protect it!',
      'Use the queen for tactics after developing other pieces',
      'The queen works best when supported by other pieces',
      'Avoid trading your queen for minor pieces (knight/bishop)'
    ]
  },
  k: {
    name: 'King',
    symbol: '♚',
    value: '∞',
    description: 'The most important piece! If your king is checkmated, you lose. The king moves one square in any direction and can castle with a rook.',
    movement: [
      'Moves 1 square in any direction',
      'Can castle kingside (O-O) or queenside (O-O-O)',
      'Cannot move into check',
      'In endgames, the king becomes an active fighting piece'
    ],
    tips: [
      'Castle early to protect your king!',
      'Keep pawns in front of your castled king',
      'In the endgame, bring your king to the center',
      'Never expose your king in the middlegame',
      'The king can help promote pawns in the endgame'
    ]
  }
};

// ==================== MOVE QUALITY EVALUATION ====================
export function evaluateMove(game, move) {
  const fen = game.fen();
  
  // Get score before move
  const scoreBefore = evaluateBoard(game, 0);
  
  // Make the move temporarily
  game.move(move);
  const scoreAfter = evaluateBoard(game, 0);
  game.undo();
  
  // Calculate score change from the perspective of the player who moved
  const isWhiteMove = fen.includes(' w ');
  const scoreDelta = isWhiteMove ? (scoreAfter - scoreBefore) : (scoreBefore - scoreAfter);
  
  // Find the best move for comparison
  const allMoves = game.moves({ verbose: true });
  let bestDelta = -Infinity;
  let bestMove = null;
  
  for (const m of allMoves) {
    game.move(m);
    const s = evaluateBoard(game, 0);
    game.undo();
    const delta = isWhiteMove ? (s - scoreBefore) : (scoreBefore - s);
    if (delta > bestDelta) {
      bestDelta = delta;
      bestMove = m;
    }
  }
  
  const diffFromBest = bestDelta - scoreDelta;
  
  // Classify the move
  let quality, emoji, color, message;
  
  if (diffFromBest <= 10) {
    quality = 'Excellent';
    emoji = '🌟';
    color = 'text-emerald-400';
    message = 'Great move! This is one of the best options.';
  } else if (diffFromBest <= 50) {
    quality = 'Good';
    emoji = '✅';
    color = 'text-teal-400';
    message = 'Solid move! You\'re playing well.';
  } else if (diffFromBest <= 100) {
    quality = 'Okay';
    emoji = '🤔';
    color = 'text-amber-400';
    message = `Decent, but ${bestMove?.san || 'another move'} might be slightly better.`;
  } else if (diffFromBest <= 200) {
    quality = 'Inaccuracy';
    emoji = '⚠️';
    color = 'text-orange-400';
    message = `Consider ${bestMove?.san || 'a different move'} instead for a stronger position.`;
  } else {
    quality = 'Mistake';
    emoji = '❌';
    color = 'text-rose-400';
    message = `${bestMove?.san || 'Another move'} would have been much better here.`;
  }
  
  return { quality, emoji, color, message, scoreDelta, bestMove, diffFromBest };
}

// ==================== PIECE MOVE ANALYSIS (for coaching) ====================
export function analyzePieceMoves(game, square) {
  const piece = game.get(square);
  if (!piece) return null;

  const pieceNames = { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' };
  const pieceName = pieceNames[piece.type] || piece.type;
  const isWhite = piece.color === 'w';
  const scoreBefore = evaluateBoard(game, 0);

  // Get all legal moves for this specific piece
  const moves = game.moves({ square, verbose: true });
  if (moves.length === 0) {
    return { pieceName, square, moves: [], bestMove: null, suggestion: `Your ${pieceName} on ${square} has no legal moves right now.` };
  }

  // Evaluate each move
  const evaluated = moves.map(m => {
    game.move(m);
    const scoreAfter = evaluateBoard(game, 0);
    const inCheck = game.inCheck();
    game.undo();
    const delta = isWhite ? (scoreAfter - scoreBefore) : (scoreBefore - scoreAfter);

    // Build a reason string
    let reason = '';
    if (m.captured) {
      const capName = pieceNames[m.captured] || m.captured;
      reason = `captures ${capName}`;
    }
    if (inCheck) {
      reason = reason ? `${reason} and gives check` : 'gives check';
    }
    if (m.san.includes('O-O')) {
      reason = 'castles to safety';
    }

    // Positional reasoning
    if (!reason) {
      const centerSquares = ['d4', 'd5', 'e4', 'e5'];
      const nearCenter = ['c3', 'c4', 'c5', 'c6', 'd3', 'd6', 'e3', 'e6', 'f3', 'f4', 'f5', 'f6'];
      if (centerSquares.includes(m.to)) {
        reason = 'controls the center';
      } else if (nearCenter.includes(m.to)) {
        reason = 'develops toward the center';
      } else if (m.to[0] === 'a' || m.to[0] === 'h') {
        reason = 'moves to the edge (usually less active)';
      } else {
        reason = 'repositions the piece';
      }
    }

    // Add delta-based quality
    let quality;
    if (delta >= 50) quality = 'strong';
    else if (delta >= 0) quality = 'solid';
    else if (delta >= -50) quality = 'slightly weakening';
    else quality = 'weakening';

    return { san: m.san, from: m.from, to: m.to, delta, reason, quality, captured: m.captured, inCheck };
  });

  // Sort by evaluation (best first)
  evaluated.sort((a, b) => b.delta - a.delta);

  const best = evaluated[0];
  const worst = evaluated[evaluated.length - 1];

  // Build suggestion text
  let suggestion;
  if (evaluated.length === 1) {
    suggestion = `Your ${pieceName} on ${square} can only move to ${best.san} — ${best.reason}. This is a ${best.quality} move.`;
  } else {
    suggestion = `Best move: ${best.san} — ${best.reason} (${best.quality}). `;
    if (evaluated.length > 2) {
      suggestion += `You have ${evaluated.length} options. `;
    }
    if (worst.quality === 'weakening' || worst.quality === 'slightly weakening') {
      suggestion += `Avoid ${worst.san} — ${worst.reason} (${worst.quality}).`;
    }
  }

  return { pieceName, square, moves: evaluated, bestMove: best, suggestion };
}

// ==================== POSITION TIPS ====================
export function getPositionTips(game, playerColor) {
  const tips = [];
  const board = game.board();
  const turn = game.turn();
  const moveCount = game.history().length;
  const myColor = playerColor === 'white' ? 'w' : 'b';
  
  // Only give tips on player's turn
  if (turn !== myColor) return ['Wait for your opponent\'s move...'];
  
  // Opening tips (first 10 moves)
  if (moveCount < 10) {
    // Check if center pawns are played
    const centerPawns = [];
    for (const [r, c] of [[3,3],[3,4],[4,3],[4,4]]) {
      const sq = board[r][c];
      if (sq && sq.type === 'p' && sq.color === myColor) {
        centerPawns.push(true);
      }
    }
    if (centerPawns.length === 0) {
      tips.push('🎯 Try to control the center with pawns (d4/e4 or d5/e5)');
    }
    
    // Check if knights are developed
    const backRank = myColor === 'w' ? 7 : 0;
    let undevelopedKnights = 0;
    for (const c of [1, 6]) {
      const sq = board[backRank][c];
      if (sq && sq.type === 'n' && sq.color === myColor) {
        undevelopedKnights++;
      }
    }
    if (undevelopedKnights > 0) {
      tips.push('🐴 Develop your knights! Move them toward the center.');
    }
    
    // Check if bishops are developed
    let undevelopedBishops = 0;
    for (const c of [2, 5]) {
      const sq = board[backRank][c];
      if (sq && sq.type === 'b' && sq.color === myColor) {
        undevelopedBishops++;
      }
    }
    if (undevelopedBishops > 0) {
      tips.push('⛪ Develop your bishops to active squares.');
    }
    
    // Check if castled
    const kingCol = findKingCol(board, myColor);
    if (kingCol === 4 && moveCount > 4) {
      tips.push('🏰 Castle soon to protect your king!');
    }
    
    if (tips.length === 0) {
      tips.push('👍 Good development so far! Keep building your position.');
    }
  }
  
  // Middlegame tips
  else if (moveCount < 30) {
    // Check if in check
    if (game.inCheck()) {
      tips.push('⚡ You\'re in check! You must block, move, or capture.');
    }
    
    // Look for hanging pieces (undefended pieces under attack)
    const moves = game.moves({ verbose: true });
    const captures = moves.filter(m => m.captured);
    if (captures.length > 0) {
      const highValue = captures.filter(m => ['q', 'r'].includes(m.captured));
      if (highValue.length > 0) {
        tips.push('🎯 You can capture a high-value piece!');
      }
    }
    
    tips.push('🔍 Look for tactics: forks, pins, and skewers.');
    tips.push('💪 Keep your pieces active and coordinated.');
  }
  
  // Endgame tips
  else {
    tips.push('👑 Activate your king — it\'s a fighting piece in the endgame!');
    tips.push('♟️ Push passed pawns toward promotion.');
    tips.push('🔄 Try to create a passed pawn by trading pawns.');
  }
  
  return tips;
}

// ==================== THREAT DETECTION ====================
export function detectThreats(game, playerColor) {
  const threats = [];
  const myColor = playerColor === 'white' ? 'w' : 'b';
  const oppColor = myColor === 'w' ? 'b' : 'w';
  
  // Temporarily switch to opponent's perspective to see their captures
  if (game.turn() !== oppColor) {
    // Check if any of our pieces are under attack
    const board = game.board();
    const VALS = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
    
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = board[r][c];
        if (sq && sq.color === myColor && sq.type !== 'k') {
          const square = String.fromCharCode(97 + c) + (8 - r);
          if (game.isAttacked(square, oppColor)) {
            if (!game.isAttacked(square, myColor) || VALS[sq.type] >= 3) {
              threats.push({
                piece: PIECE_INFO[sq.type]?.name || sq.type,
                square: square,
                value: VALS[sq.type]
              });
            }
          }
        }
      }
    }
  }
  
  // Sort by value (most valuable first)
  threats.sort((a, b) => b.value - a.value);
  return threats.slice(0, 3); // Top 3 threats
}

// Helper
function findKingCol(board, color) {
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (board[r][c] && board[r][c].type === 'k' && board[r][c].color === color) {
        return c;
      }
    }
  }
  return -1;
}

// ==================== CHESS PRINCIPLES ====================
export const CHESS_PRINCIPLES = [
  { title: 'Control the Center', text: 'Place pawns and pieces in the center (d4, e4, d5, e5). The center controls the most squares.' },
  { title: 'Develop Pieces', text: 'Move knights and bishops out early. Each piece should contribute to the game.' },
  { title: 'Castle Early', text: 'Castle to protect your king and connect your rooks. Usually do this in the first 10 moves.' },
  { title: 'Don\'t Move the Same Piece Twice', text: 'In the opening, develop new pieces instead of moving the same one repeatedly.' },
  { title: 'Don\'t Bring the Queen Out Early', text: 'The queen can be chased by minor pieces, wasting your tempo.' },
  { title: 'Trade When Ahead', text: 'If you\'re winning material, trade pieces to simplify. Your advantage matters more with fewer pieces.' },
  { title: 'Activate Your King', text: 'In the endgame, the king becomes a fighting piece. Bring it to the center!' },
  { title: 'Think About Threats', text: 'Before moving, ask: "What is my opponent threatening?" and "Does my move leave anything hanging?"' },
  { title: 'Control Open Files', text: 'Place rooks on files with no pawns. They\'re most powerful on open lines.' },
  { title: 'Create Passed Pawns', text: 'A pawn with no opposing pawns blocking it can march to promotion!' },
];
