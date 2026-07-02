import { X, Palette } from 'lucide-react';

const THEMES = [
  { id: 'slate', name: 'Slate (Default)', light: '#718096', dark: '#2d3748' },
  { id: 'classic', name: 'Classic Wood', light: '#f0d9b5', dark: '#b58863' },
  { id: 'emerald', name: 'Emerald Green', light: '#ecfdf5', dark: '#10b981' },
  { id: 'midnight', name: 'Midnight', light: '#475569', dark: '#0f172a' },
  { id: 'blue', name: 'Ocean Blue', light: '#eef2f7', dark: '#4b7399' }
];

export const getThemeColors = (id) => {
  return THEMES.find(t => t.id === id) || THEMES[0];
};

export default function SettingsModal({ isOpen, onClose, currentTheme, onThemeChange }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl animate-fade-in flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2 text-slate-100">
            <Palette className="w-5 h-5 text-teal-400" />
            <h2 className="text-lg font-bold">Settings</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 transition-colors bg-slate-800 p-1.5 rounded-lg hover:bg-slate-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex flex-col gap-6">
          
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">Board Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              {THEMES.map((theme) => (
                <button
                  key={theme.id}
                  onClick={() => onThemeChange(theme.id)}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    currentTheme === theme.id 
                      ? 'border-teal-500 bg-teal-500/10 shadow-[0_0_15px_rgba(45,212,191,0.2)]' 
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  {/* Theme Preview Mini-Board */}
                  <div className="w-8 h-8 rounded grid grid-cols-2 grid-rows-2 shrink-0 border border-slate-600 overflow-hidden">
                    <div style={{ backgroundColor: theme.light }} />
                    <div style={{ backgroundColor: theme.dark }} />
                    <div style={{ backgroundColor: theme.dark }} />
                    <div style={{ backgroundColor: theme.light }} />
                  </div>
                  <span className={`text-xs font-semibold text-left leading-tight ${currentTheme === theme.id ? 'text-teal-300' : 'text-slate-300'}`}>
                    {theme.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
