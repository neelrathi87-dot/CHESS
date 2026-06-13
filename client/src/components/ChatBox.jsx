import { useState, useEffect, useRef } from 'react';
import { Send, MessageCircle } from 'lucide-react';

export default function ChatBox({ chatHistory, onSendMessage, active, gameOver }) {
  const [inputText, setInputText] = useState('');
  const chatContainerRef = useRef(null);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !active) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  if (!active) {
    return (
      <div className="flex flex-col h-full bg-slate-900/10 rounded-xl border border-slate-900/40 items-center justify-center p-6 text-center">
        <p className="text-xs text-slate-500 italic">Chat is disabled for offline matches.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
          <MessageCircle className="w-3.5 h-3.5 text-indigo-400" /> 
          {gameOver ? 'Post-Game Chat' : 'Room Chat'}
        </h3>
        <div className="flex items-center gap-1.5">
          {gameOver && (
            <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-semibold border border-emerald-500/20">
              💡 Share tips!
            </span>
          )}
          <span className={`w-2 h-2 rounded-full ${gameOver ? 'bg-amber-500' : 'bg-emerald-500 animate-pulse'}`}></span>
        </div>
      </div>

      {/* Post-game tip prompt */}
      {gameOver && chatHistory.length === 0 && (
        <div className="px-3 py-2 bg-indigo-500/5 border-b border-indigo-500/10 shrink-0">
          <p className="text-[10px] text-indigo-400/80 text-center italic">
            Good game! Share tips, feedback, or say GG to your opponent 👋
          </p>
        </div>
      )}

      {/* Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 p-3 overflow-y-auto space-y-2 min-h-0 scroll-smooth"
      >
        {chatHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs italic py-4">
            {gameOver ? 'Say GG or share a tip!' : 'Send a message to start chatting!'}
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-[10px] font-bold text-indigo-400">{msg.sender}</span>
                <span className="text-[8px] text-slate-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="bg-slate-900/80 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg rounded-tl-none mt-0.5 border border-slate-800 max-w-[85%] self-start break-words">
                {msg.text}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-2 border-t border-slate-800 bg-slate-950/20 flex gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={gameOver ? "Share a tip or say GG..." : "Type your message..."}
          maxLength={100}
          className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
