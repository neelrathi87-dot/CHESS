import { Chess } from 'chess.js';
import { getComputerMove } from './ai.js';

self.onmessage = (e) => {
  const { fen, difficulty } = e.data;
  
  try {
    const game = new Chess(fen);
    const move = getComputerMove(game, difficulty);
    self.postMessage({ move });
  } catch (error) {
    self.postMessage({ error: error.message });
  }
};
