export default function EvalBar({ evaluation, boardOrientation = 'white' }) {
  // evaluation is expected to be a number (e.g. 1.5, -0.8) or string if mate (e.g. 'M3', '-M2')
  
  let whitePercent = 50;
  let displayScore = '0.0';

  if (typeof evaluation === 'string' && (evaluation.includes('M') || evaluation.includes('m'))) {
    const isWhiteMate = !evaluation.startsWith('-'); // M3 means white has mate, -M2 means black
    whitePercent = isWhiteMate ? 100 : 0;
    displayScore = evaluation.replace('-', '').toUpperCase();
  } else {
    // Normal numeric evaluation
    const score = parseFloat(evaluation) || 0;
    // Cap at +10 / -10
    const clamped = Math.max(-10, Math.min(10, score));
    whitePercent = 50 + (clamped / 10) * 50;
    
    // Display absolute value because the position of the badge represents the advantage
    displayScore = Math.abs(score).toFixed(1);
    if (score === 0) displayScore = '0.0';
  }

  // If board is flipped, the visual representation is flipped (white at top)
  const isFlipped = boardOrientation === 'black';

  // Determine if the score should be shown at the top or bottom of the bar
  const showAtTop = (!isFlipped && whitePercent < 50) || (isFlipped && whitePercent >= 50);

  return (
    <div className="w-5 md:w-8 h-full relative select-none shrink-0">
      {/* Visual Bar Wrapper with rounded corners and overflow hidden */}
      <div className="absolute inset-0 bg-slate-800 rounded-lg overflow-hidden flex flex-col border border-slate-700/50 shadow-inner">
        {/* Black section (normally top) */}
        <div 
          className="w-full bg-[#2a2a2a] transition-all duration-700 ease-out"
          style={{ height: `${isFlipped ? whitePercent : (100 - whitePercent)}%` }}
        />

        {/* White section (normally bottom) */}
        <div 
          className="w-full bg-[#e1e1e1] transition-all duration-700 ease-out"
          style={{ height: `${isFlipped ? (100 - whitePercent) : whitePercent}%` }}
        />
      </div>

      {/* Floating Score Badge Overlay (outside overflow-hidden wrapper so it can hang over slightly) */}
      <div 
        className={`absolute left-1/2 -translate-x-1/2 flex justify-center z-10 pointer-events-none transition-all duration-500 ${
          showAtTop ? 'top-1.5' : 'bottom-1.5'
        }`}
      >
        <span className="bg-slate-950/90 text-slate-200 text-[10px] md:text-xs font-extrabold font-mono px-1.5 py-0.5 rounded-md border border-slate-700/60 shadow-lg shadow-black/50 tracking-tighter leading-none whitespace-nowrap">
          {displayScore}
        </span>
      </div>
    </div>
  );
}

