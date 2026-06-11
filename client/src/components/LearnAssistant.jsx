import { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import { GraduationCap, BookOpen, Lightbulb, Undo2, ChevronRight, ChevronLeft, Shield, Volume2, VolumeX } from 'lucide-react';
import { PIECE_INFO, getPositionTips, detectThreats, evaluateMove, CHESS_PRINCIPLES, analyzePieceMoves } from '../utils/learnHelper';

export default function LearnAssistant({ game, playerColor, onUndo, canUndo, moveHistory, selectedSquare }) {
  const [tab, setTab] = useState('assistant'); // 'assistant' | 'pieces' | 'principles'
  const [selectedPiece, setSelectedPiece] = useState(null);
  const [principleIdx, setPrincipleIdx] = useState(0);
  const [assistantMessages, setAssistantMessages] = useState([
    { type: 'welcome', text: '👋 Welcome to Learn Mode! I\'ll guide you through the game. Click on pieces to learn about them, and I\'ll evaluate your moves!' }
  ]);
  const messagesEndRef = useRef(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceAsked, setVoiceAsked] = useState(false);
  const prevMsgCountRef = useRef(1); // starts at 1 for the welcome message
  const voiceEnabledRef = useRef(false); // ref to avoid stale closures
  const chatContainerRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    voiceEnabledRef.current = voiceEnabled;
  }, [voiceEnabled]);

  // Preload voices (they load asynchronously on many browsers)
  useEffect(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.getVoices(); // trigger initial load
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices(); // cache voices
      };
    }
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Core speak function — uses ref, not state, to check enabled
  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    // eslint-disable-next-line no-misleading-character-class
    const cleanText = text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').trim();
    if (!cleanText) return;
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.9;
    utterance.pitch = 1;
    utterance.lang = 'en-US';
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => v.name.includes('Google') && v.lang.startsWith('en')) ||
                      voices.find(v => v.lang.startsWith('en'));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };


  // Enable voice with user interaction (required by browsers)
  const enableVoice = () => {
    voiceEnabledRef.current = true; // set ref immediately so speak() works
    setVoiceEnabled(true);
    setVoiceAsked(true);
    if (window.speechSynthesis) {
      // Unlock audio context with silent utterance, then speak welcome
      const unlock = new SpeechSynthesisUtterance('');
      unlock.onend = () => {
        speakText('Welcome to Learn Mode! I will guide you through the game. Let\'s begin!');
      };
      // Fallback if onend doesn't fire
      setTimeout(() => {
        speakText('Welcome to Learn Mode! I will guide you through the game. Let\'s begin!');
      }, 500);
      window.speechSynthesis.speak(unlock);
    }
  };

  const disableVoice = () => {
    voiceEnabledRef.current = false;
    setVoiceEnabled(false);
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // Auto-scroll assistant messages and auto-speak new ones
  useEffect(() => {
    // Only scroll the chat container itself, don't drag the whole page
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
    // Auto-speak new messages (uses ref to avoid stale closure)
    if (voiceEnabledRef.current && assistantMessages.length > prevMsgCountRef.current) {
      const newMsgs = assistantMessages.slice(prevMsgCountRef.current);
      const toSpeak = newMsgs.map(m => {
        if (m.type === 'eval') return `${m.quality}. ${m.text}`;
        return m.text;
      }).join('. ');
      speakText(toSpeak);
    }
    prevMsgCountRef.current = assistantMessages.length;
  }, [assistantMessages]);

  // Handle piece selection for coaching
  useEffect(() => {
    if (!selectedSquare || !game) return;
    
    const piece = game.get(selectedSquare);
    const myColor = playerColor === 'white' ? 'w' : 'b';
    
    // Only coach on the player's own pieces
    if (piece && piece.color === myColor) {
      try {
        const analysis = analyzePieceMoves(game, selectedSquare);
        if (analysis) {
          // Add coaching message
          setTimeout(() => {
            setAssistantMessages(prev => [...prev, {
              type: 'tip',
              text: analysis.suggestion,
              emoji: '💡'
            }]);
          }, 0);
        }
      } catch (e) {
        console.error("Coaching evaluation error:", e);
      }
    }
  }, [selectedSquare, game, playerColor]);

  // Track move count for the effect
  const moveCount = moveHistory ? moveHistory.length : 0;

  // Evaluate last move and update assistant
  useEffect(() => {
    if (!game || moveCount === 0) return;

    const myColor = playerColor === 'white' ? 'w' : 'b';
    const history = game.history({ verbose: true });
    const latestMove = history.length > 0 ? history[history.length - 1] : null;

    if (!latestMove) return;

    // Player's own move — evaluate it
    if (latestMove.color === myColor) {
      try {
        // Clone game, undo last move, evaluate, then the clone is discarded
        const cloned = new Chess();
        cloned.loadPgn(game.pgn());
        cloned.undo();
        const eval_ = evaluateMove(cloned, latestMove);

        setTimeout(() => {
          setAssistantMessages(prev => [...prev, {
            type: 'eval',
            emoji: eval_.emoji,
            quality: eval_.quality,
            color: eval_.color,
            text: eval_.message,
            move: latestMove.san
          }]);
        }, 0);
      } catch {
        // Fallback if evaluation errors
        setTimeout(() => {
          setAssistantMessages(prev => [...prev, {
            type: 'tip',
            text: `You played ${latestMove.san}. Keep developing your pieces!`
          }]);
        }, 0);
      }
    } else {
      // AI / Opponent moved — explain what happened + give tips
      const newMessages = [];

      // Explain the AI's move
      const pieceNames = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
      const pieceName = pieceNames[latestMove.piece] || latestMove.piece;
      if (latestMove.captured) {
        const capturedName = pieceNames[latestMove.captured] || latestMove.captured;
        newMessages.push({
          type: 'info',
          text: `🎓 Coach played ${latestMove.san} — captured your ${capturedName} with ${pieceName}. Be careful with unprotected pieces!`
        });
      } else {
        newMessages.push({
          type: 'info',
          text: `🎓 Coach played ${latestMove.san} (moved ${pieceName} to ${latestMove.to}). It's your turn now!`
        });
      }

      // Detect threats to player's pieces
      const threats = detectThreats(game, playerColor);
      if (threats.length > 0) {
        newMessages.push({
          type: 'threat',
          text: `⚠️ Watch out! Your ${threats.map(t => `${t.piece} on ${t.square}`).join(', ')} ${threats.length > 1 ? 'are' : 'is'} under attack!`
        });
      }

      // Position tips
      const tips = getPositionTips(game, playerColor);
      if (tips.length > 0) {
        newMessages.push({
          type: 'tip',
          text: tips[Math.floor(Math.random() * tips.length)]
        });
      }

      setTimeout(() => {
        setAssistantMessages(prev => [...prev, ...newMessages]);
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveCount]);

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
            {/* Voice Permission Banner */}
            {!voiceAsked && (
              <div className="p-3 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border-b border-violet-500/20 shrink-0">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-8 h-8 text-violet-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-200">Enable Voice Coaching?</p>
                    <p className="text-xs text-slate-400 mt-0.5">Hear your coach's instructions spoken out loud</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={enableVoice}
                    className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Yes, Enable Voice
                  </button>
                  <button
                    onClick={() => setVoiceAsked(true)}
                    className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 font-semibold text-xs border border-slate-700 transition-all"
                  >
                    No, Text Only
                  </button>
                </div>
              </div>
            )}
            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 p-2 space-y-2 overflow-y-auto min-h-0 scroll-smooth">
              {assistantMessages.map((msg, idx) => (
                <div key={idx} className={`rounded-xl p-3 text-sm leading-relaxed ${
                  msg.type === 'welcome' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' :
                  msg.type === 'eval' ? 'bg-slate-900/60 border border-slate-800' :
                  msg.type === 'threat' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' :
                  msg.type === 'info' ? 'bg-sky-500/10 border border-sky-500/20 text-sky-300' :
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

            {/* Undo + Voice Buttons */}
            <div className="p-2 border-t border-slate-800 shrink-0 flex gap-2">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                className="flex-1 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 disabled:opacity-30 disabled:hover:bg-amber-500/10 disabled:hover:text-amber-400 font-bold text-xs transition-all flex items-center justify-center gap-1.5"
              >
                <Undo2 className="w-3.5 h-3.5" /> Undo Move
              </button>
              <button
                onClick={voiceEnabled ? disableVoice : enableVoice}
                className={`px-3 py-2 rounded-lg border font-bold text-xs transition-all flex items-center justify-center gap-1 ${
                  voiceEnabled
                    ? 'bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500 hover:text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-slate-700 hover:text-slate-300'
                }`}
                title={voiceEnabled ? 'Turn off voice' : 'Turn on voice'}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {pieceTypes.map(type => {
                    const info = PIECE_INFO[type];
                    return (
                      <button
                        key={type}
                        onClick={() => setSelectedPiece(type)}
                        className="flex flex-col items-center gap-2 p-5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all active:scale-95 shadow-sm shadow-black/20"
                      >
                        <span className="text-6xl md:text-5xl select-none">{info.symbol}</span>
                        <span className="text-base md:text-sm font-bold text-slate-200">{info.name}</span>
                        <span className="text-sm md:text-xs text-slate-500">Value: {info.value}</span>
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
