import { useState } from 'react';
import { Download, X, Monitor, Smartphone, Apple, Chrome, ChevronDown } from 'lucide-react';

// Detect OS and browser
function detectPlatform() {
  const ua = navigator.userAgent;
  const platform = navigator.platform || '';

  const isIos = /iphone|ipad|ipod/i.test(ua);
  const isMac = /macintosh|mac os x/i.test(ua) && !isIos;
  const isAndroid = /android/i.test(ua);
  const isWindows = /windows/i.test(ua);
  const isLinux = /linux/i.test(ua) && !isAndroid;

  const isChrome = /chrome/i.test(ua) && !/edg|opr|brave/i.test(ua);
  const isEdge = /edg\//i.test(ua);
  const isSafari = /safari/i.test(ua) && !/chrome|crios/i.test(ua);
  const isFirefox = /firefox/i.test(ua);
  const isSamsungBrowser = /samsungbrowser/i.test(ua);

  return { isIos, isMac, isAndroid, isWindows, isLinux, isChrome, isEdge, isSafari, isFirefox, isSamsungBrowser };
}

const GUIDES = {
  windows_edge: {
    icon: '🪟',
    title: 'Install on Windows (Edge)',
    badge: 'Recommended',
    badgeColor: 'text-teal-300 bg-teal-500/10 border-teal-500/20',
    steps: [
      { icon: '1', text: 'Look for the ⊕ install icon in the address bar (right side)' },
      { icon: '2', text: 'Click it, then click Install in the popup' },
      { icon: '3', text: 'CHESS appears in Start Menu & taskbar like a real app' },
    ],
    alt: 'Or: click ··· menu → Apps → Install this site as an app',
  },
  windows_chrome: {
    icon: '🪟',
    title: 'Install on Windows (Chrome)',
    badge: null,
    steps: [
      { icon: '1', text: 'Click the ⊕ install icon in the address bar (top right)' },
      { icon: '2', text: 'Click Install in the dialog' },
      { icon: '3', text: 'CHESS opens in its own window and appears in Start Menu' },
    ],
    alt: 'Or: click ⋮ menu → Cast, save and share → Install page as app',
  },
  windows_other: {
    icon: '🪟',
    title: 'Install on Windows',
    badge: 'Use Chrome or Edge',
    badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    steps: [
      { icon: '💡', text: 'Open this site in Google Chrome or Microsoft Edge for the best install experience' },
      { icon: '⊕', text: 'Look for the install icon in the address bar, then click Install' },
    ],
    alt: null,
  },
  mac_safari: {
    icon: '🍎',
    title: 'Install on Mac (Safari)',
    badge: null,
    steps: [
      { icon: '1', text: 'Click File in the menu bar' },
      { icon: '2', text: 'Select Add to Dock...' },
      { icon: '3', text: 'Click Add — CHESS now lives in your Dock!' },
    ],
    alt: 'Or: click Share button (⬆) in Safari toolbar → Add to Dock',
  },
  mac_chrome: {
    icon: '🍎',
    title: 'Install on Mac (Chrome)',
    badge: null,
    steps: [
      { icon: '1', text: 'Click the ⊕ install icon in the address bar (top right)' },
      { icon: '2', text: 'Click Install in the popup' },
      { icon: '3', text: 'CHESS opens as a standalone app in its own window' },
    ],
    alt: 'Or: click ⋮ menu → Cast, save and share → Install page as app',
  },
  mac_other: {
    icon: '🍎',
    title: 'Install on Mac',
    badge: 'Use Safari or Chrome',
    badgeColor: 'text-amber-300 bg-amber-500/10 border-amber-500/20',
    steps: [
      { icon: '💡', text: 'Open this site in Safari for the easiest install (File → Add to Dock)' },
      { icon: '💡', text: 'Or use Chrome and look for the ⊕ install icon in the address bar' },
    ],
    alt: null,
  },
  android_chrome: {
    icon: '🤖',
    title: 'Install on Android',
    badge: 'Works great!',
    badgeColor: 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20',
    steps: [
      { icon: '1', text: 'A banner "Add CHESS to home screen" may appear automatically' },
      { icon: '2', text: 'Or: tap ⋮ menu → Add to Home screen' },
      { icon: '3', text: 'Tap Install — CHESS appears on your home screen like any app' },
    ],
    alt: 'Works on Chrome, Samsung Browser, and Edge for Android',
  },
  android_other: {
    icon: '🤖',
    title: 'Install on Android',
    badge: null,
    steps: [
      { icon: '💡', text: 'Open this site in Chrome for Android for the best install experience' },
      { icon: '1', text: 'Tap ⋮ menu → Add to Home screen → Install' },
    ],
    alt: null,
  },
  ios: {
    icon: '🍎',
    title: 'Install on iPhone / iPad',
    badge: 'Requires Safari',
    badgeColor: 'text-blue-300 bg-blue-500/10 border-blue-500/20',
    steps: [
      { icon: '⚠️', text: 'Must use Safari — Chrome on iOS does not support install' },
      { icon: '1', text: 'Tap the Share button (⬆) in the Safari toolbar' },
      { icon: '2', text: 'Scroll down and tap Add to Home Screen' },
      { icon: '3', text: 'Tap Add — CHESS is now on your home screen!' },
    ],
    alt: null,
  },
};

function getGuideKey({ isIos, isMac, isAndroid, isWindows, isChrome, isEdge, isSafari }) {
  if (isIos) return 'ios';
  if (isAndroid) return isChrome || isSamsungBrowser ? 'android_chrome' : 'android_other';
  if (isMac) {
    if (isSafari) return 'mac_safari';
    if (isChrome) return 'mac_chrome';
    return 'mac_other';
  }
  if (isWindows) {
    if (isEdge) return 'windows_edge';
    if (isChrome) return 'windows_chrome';
    return 'windows_other';
  }
  return 'windows_chrome'; // fallback
}

export default function InstallGuide({ installPrompt, onInstallApp, isAppInstalled }) {
  const [open, setOpen] = useState(false);
  const platform = detectPlatform();
  const guideKey = getGuideKey(platform);
  const guide = GUIDES[guideKey];

  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && window.navigator.standalone);

  if (isStandalone) return null;

  return (
    <div className="w-72 md:w-80 relative">
      {/* ── If native install prompt available, show install button + toggle ── */}
      {installPrompt && !isAppInstalled ? (
        <div className="space-y-2">
          <button
            onClick={onInstallApp}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl bg-gradient-to-r from-teal-600/20 to-emerald-600/20 border border-teal-500/30 hover:border-teal-400/60 text-teal-300 hover:text-white font-semibold text-sm transition-all group shadow-md"
          >
            <Download className="w-4 h-4 group-hover:animate-bounce" />
            Install App — Play Anytime, No Browser Needed
          </button>
          <button
            onClick={() => setOpen((v) => !v)}
            className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-600 hover:text-slate-400 transition-colors py-0.5"
          >
            How to install manually
            <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        </div>
      ) : isAppInstalled ? (
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
          ✓ App installed — open from your home screen anytime!
        </div>
      ) : (
        /* No native prompt — show toggle button to reveal manual instructions */
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-teal-500/30 text-slate-500 hover:text-teal-300 text-xs font-semibold transition-all"
        >
          <Download className="w-3.5 h-3.5" />
          Install as App {guide.icon}
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      )}

      {/* ── Expandable step-by-step guide ── */}
      {open && (
        <div className="mt-2 rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden animate-fade-in">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-base">{guide.icon}</span>
              <span className="text-xs font-bold text-slate-200">{guide.title}</span>
              {guide.badge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${guide.badgeColor}`}>
                  {guide.badge}
                </span>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-600 hover:text-slate-300 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="p-4 space-y-2.5">
            {guide.steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {step.icon}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{step.text}</p>
              </div>
            ))}

            {guide.alt && (
              <p className="text-[10px] text-slate-600 italic pt-1 border-t border-slate-800/80">
                {guide.alt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
