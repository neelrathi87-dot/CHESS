import React, { useState, useEffect, useRef } from 'react';
import { GraduationCap, BookOpen, Lightbulb, AlertTriangle, Undo2, ChevronRight, ChevronLeft, Info, Shield } from 'lucide-react';
import { PIECE_INFO, getPositionTips, detectThreats, evaluateMove, CHESS_PRINCIPLES } from '../utils/learnHelper';

export default function LearnAssistant({ game, playerColor, onUndo, lastMove, canUndo, moveHistory }) {
  const [tab, setTab] = useState('assistant'); // 'assistant' | 'pieces' | 'principles'
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [moveEval, setMoveEval] = useState(null);
  const [principleIdx, setPrincipleIdx] = useState(0);
  const [assistantMessages, setAssistantMessages] = useState([
    { type: 'welcome', text: '👋 Welcome to Learn Mode! I\'ll guide you through the game. Click on pieces to learn about them, and I\'ll evaluate your moves!' }
  ]);
  const messagesEndRef = useRef(null);

  // Auto-scroll assistant messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [assistantMessages]);

  // Evaluate last move and update assistant
  useEffect(() => {
    if (!lastMove || !game) return;

    const myColor = playerColor === 'white' ? 'w' : 'b';

    // Only evaluate player's own moves
    if (lastMove.color === myColor) {
      try {
        // We need to undo, evaluate, then redo
        game.undo();
        const eval_ = evaluateMove(game, lastMove);
        game.move(lastMove);

        setMoveEval(eval_);
        setAssistantMessages(prev => [...prev, {
          type: 'eval',
          emoji: eval_.emoji,
          quality: eval_.quality,
          color: eval_.color,
          text: eval_.message,
          move: lastMove.san
        }]);
      } catch (e) {
        // If evaluation fails, just skip
      }
    } else {
      // Opponent moved — give tips
      const tips = getPositionTips(game, playerColor);
      const threats = detectThreats(game, playerColor);

      const newMessages = [];

      if (threats.length > 0) {
        newMessages.push({
          type: 'threat',
          text: `⚠️ Watch out! Your ${threats.map(t => `${t.piece} on ${t.square}`).join(', ')} ${threats.length > 1 ? 'are' : 'is'} under attack!`
        });
      }

      if (tips.length > 0) {
        newMessages.push({
          type: 'tip',
          text: tips[Math.floor(Math.random() * tips.length)]
        });
      }

      if (newMessages.length > 0) {
        setAssistantMessages(prev => [...prev, ...newMessages]);
      }
    }
  }, [moveHistory?.length]);

  const pieceTypes = ['p', 'n', 'b', 'r', 'q', 'k'];

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Tab Header */}
      <div className="flex border-b border-slate-800 shrink-0">
        <button
          onClick={() => setTab('assistant')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
            tab === 'assistant' ? 'text-emerald-400 bg-emerald-500/10 border-b-2 border-emerald-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <GraduationCap className="w-3.5 h-3.5" /> Assistant
        </button>
        <button
          onClick={() => setTab('pieces')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
            tab === 'pieces' ? 'text-indigo-400 bg-indigo-500/10 border-b-2 border-indigo-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" /> Pieces
        </button>
        <button
          onClick={() => setTab('principles')}
          className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors ${
            tab === 'principles' ? 'text-amber-400 bg-amber-500/10 border-b-2 border-amber-500' : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5" /> Tips
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ASSISTANT TAB */}
        {tab === 'assistant' && (
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0">
              {assistantMessages.map((msg, idx) => (
                <div key={idx} className={`rounded-lg p-2 text-[11px] leading-relaxed ${
                  msg.type === 'welcome' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' :
                  msg.type === 'eval' ? `bg-slate-900/60 border border-slate-800` :
                  msg.type === 'threat' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' :
                  'bg-indigo-500/5 border border-indigo-500/10 text-indigo-300'
                }`}>
                  {msg.type === 'eval' ? (
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-sm">{msg.emoji}</span>
                        <span className={`font-bold ${msg.color}`}>{msg.quality}</span>
                        <span className="text-slate-500 font-mono text-[10px]">({msg.move})</span>
                      </div>
                      <p className="text-slate-400">{msg.text}</p>
                    </div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Undo Button */}
            <div className="p-2 border-t border-slate-800 shrink-0">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="w-full py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo Last Move
              </button>
            </div>
          </div>
        )}

        {/* PIECES TAB */}
        {tab === 'pieces' && (
          <div className="p-3 h-full overflow-y-auto">
            {!selectedPiece ? (
              <div className="space-y-3">
                <p className="text-sm text-slate-400 text-center mb-3">Tap a piece to learn about it</p>
                <div className="grid grid-cols-3 gap-3">
                  {pieceTypes.map(type => {
                    const info = PIECE_INFO[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedPiece(type)}
                        className="flex flex-col items-center gap-1.5 p-4 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all active:scale-95"
                      >
                        <span className="text-4xl select-none">{info.symbol}</span>
                        <span className="text-sm font-semibold text-slate-200">{info.name}</span>
                        <span className="text-xs text-slate-500">Value: {info.value}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-6">
                {/* Back button */}
                <button
                  onClick={() => setSelectedPiece(null)}
                  className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-semibold sticky top-0 bg-slate-900/90 backdrop-blur-sm py-2 z-10 w-full"
                >
                  <ChevronLeft className="w-4 h-4" /> ← Back to All Pieces
                </button>

                {/* Piece header */}
                <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-500/10 to-violet-500/10 p-4 rounded-xl border border-indigo-500/20">
                  <span className="text-5xl select-none">{PIECE_INFO[selectedPiece].symbol}</span>
                  <div>
                    <h4 className="text-lg font-bold text-slate-100">{PIECE_INFO[selectedPiece].name}</h4>
                    <span className="text-sm text-slate-400">Value: {PIECE_INFO[selectedPiece].value} point{PIECE_INFO[selectedPiece].value !== '∞' && PIECE_INFO[selectedPiece].value > 1 ? 's' : ''}</span>
                  </div>
                </div>

                {/* Description */}
                <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800">
                  <p className="text-sm text-slate-300 leading-relaxed">{PIECE_INFO[selectedPiece].description}</p>
                </div>

                {/* Movement */}
                <div className="bg-teal-500/5 p-4 rounded-xl border border-teal-500/10">
                  <h5 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Shield className="w-4 h-4 text-teal-400" /> How it Moves
                  </h5>
                  <ul className="space-y-2.5">
                    {PIECE_INFO[selectedPiece].movement.map((m, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <ChevronRight className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <span>{m}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Tips */}
                <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10">
                  <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5 mb-3">
                    <Lightbulb className="w-4 h-4 text-amber-400" /> Strategy Tips
                  </h5>
                  <ul className="space-y-2.5">
                    {PIECE_INFO[selectedPiece].tips.map((t, i) => (
                      <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                        <span className="text-amber-500 shrink-0 text-base leading-none mt-0.5">•</span>
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PRINCIPLES TAB */}
        {tab === 'principles' && (
          <div className="p-3 space-y-3">
            <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] text-amber-500/60 font-bold uppercase tracking-wider">
                  Tip {principleIdx + 1} of {CHESS_PRINCIPLES.length}
                </span>
                <Lightbulb className="w-4 h-4 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-amber-300">{CHESS_PRINCIPLES[principleIdx].title}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed">{CHESS_PRINCIPLES[principleIdx].text}</p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setPrincipleIdx(i => i > 0 ? i - 1 : CHESS_PRINCIPLES.length - 1)}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-[10px] font-semibold flex items-center justify-center gap-1 border border-slate-700"
              >
                <ChevronLeft className="w-3 h-3" /> Previous
              </button>
              <button
                onClick={() => setPrincipleIdx(i => (i + 1) % CHESS_PRINCIPLES.length)}
                className="flex-1 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-[10px] font-semibold flex items-center justify-center gap-1 border border-emerald-500/20"
              >
                Next <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick reference */}
            <div className="space-y-1 mt-2">
              <h5 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Quick Reference</h5>
              {CHESS_PRINCIPLES.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setPrincipleIdx(i)}
                  className={`w-full text-left py-1 px-2 rounded text-[10px] transition-colors ${
                    principleIdx === i ? 'bg-amber-500/10 text-amber-400 font-semibold' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {i + 1}. {p.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
