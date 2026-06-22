export default function EvalBar({ evaluation, boardOrientation = 'white' }) {
  // evaluation is expected to be a number (e.g. 1.5, -0.8) or string if mate (e.g. 'M3', '-M2')
  
  let whitePercent = 50;
  let displayScore = '0.0';

  if (typeof evaluation === 'string' && (evaluation.includes('M') || evaluation.includes('m'))) {
    const isWhiteMate = !evaluation.startsWith('-'); // M3 means white has mate, -M2 means black
    whitePercent = isWhiteMate ? 100 : 0;
    displayScore = evaluation;
  } else {
    // Normal numeric evaluation
    const score = parseFloat(evaluation) || 0;
    // Cap at +10 / -10
    const clamped = Math.max(-10, Math.min(10, score));
    // Non-linear mapping makes small advantages visible but caps out at large advantages
    // A standard formula is: 50 + 50 * (2 / (1 + e^(-0.2*score)) - 1)
    // Or simpler: 50 + (clamped / 10) * 50
    whitePercent = 50 + (clamped / 10) * 50;
    
    displayScore = score > 0 ? `+${score.toFixed(1)}` : score.toFixed(1);
    if (score === 0) displayScore = '0.0';
  }

  // If board is flipped, the visual representation is flipped (white at top)
  const isFlipped = boardOrientation === 'black';

  return (
    <div className="w-4 md:w-6 h-full bg-slate-800 rounded-lg overflow-hidden flex flex-col border border-slate-700/50 shadow-inner relative select-none">
      {/* Black section (top normally) */}
      <div 
        className="w-full bg-[#3f3f3f] transition-all duration-700 ease-out flex items-start justify-center pt-1 overflow-hidden"
        style={{ height: `${isFlipped ? whitePercent : (100 - whitePercent)}%` }}
      >
        {(!isFlipped ? (whitePercent < 50) : (whitePercent >= 50)) && (
          <span className="text-[9px] md:text-[10px] font-bold text-slate-400 transform origin-top break-words leading-none" style={{ writingMode: 'vertical-rl' }}>
            {displayScore.replace('-', '')}
          </span>
        )}
      </div>

      {/* White section (bottom normally) */}
      <div 
        className="w-full bg-[#e5e5e5] transition-all duration-700 ease-out flex items-end justify-center pb-1 overflow-hidden"
        style={{ height: `${isFlipped ? (100 - whitePercent) : whitePercent}%` }}
      >
        {(!isFlipped ? (whitePercent >= 50) : (whitePercent < 50)) && (
          <span className="text-[9px] md:text-[10px] font-bold text-slate-600 transform origin-bottom break-words leading-none" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
            {displayScore}
          </span>
        )}
      </div>
    </div>
  );
}
