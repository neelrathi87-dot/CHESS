import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';

export default function ChatBox({ chatHistory, onSendMessage, active }) {
  const [inputText, setInputText] = useState('');
  const chatBottomRef = useRef(null);

  useEffect(() => {
    if (chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
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
      <div className="p-4 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <h3 className="font-bold text-slate-200 uppercase tracking-wider text-sm">Room Chat</h3>
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></span>
      </div>

      {/* Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[160px] max-h-[220px] md:max-h-none">
        {chatHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-600 text-xs italic py-8">
            Send a message to start chatting!
          </div>
        ) : (
          chatHistory.map((msg, idx) => (
            <div key={idx} className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-xs font-bold text-indigo-400">{msg.sender}</span>
                <span className="text-[9px] text-slate-600">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <p className="bg-slate-900/80 text-slate-200 text-sm px-3 py-1.5 rounded-lg rounded-tl-none mt-1 border border-slate-800 max-w-[85%] self-start break-words">
                {msg.text}
              </p>
            </div>
          ))
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-950/20 flex gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
          maxLength={100}
          className="flex-1 bg-slate-900/60 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-lg transition-colors flex items-center justify-center"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
