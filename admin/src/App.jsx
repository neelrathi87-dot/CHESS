import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, LogOut, RefreshCw, AlertTriangle, Eye, Clock, Hash } from 'lucide-react';

export default function App() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [adminKey, setAdminKey] = useState(localStorage.getItem('adminKey') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);

  const fetchStatus = async () => {
    if (!adminKey) return;
    setLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_SERVER_URL || `http://${window.location.hostname}:5000`;
      const response = await fetch(`${baseUrl}/api/admin/status`, {
        headers: {
          'x-admin-key': adminKey
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          setIsAuthorized(false);
          localStorage.removeItem('adminKey');
          throw new Error('Access Denied: Invalid Admin Password');
        }
        if (response.status === 403) {
          throw new Error('Access Denied: Your IP is not authorized to view the admin dashboard.');
        }
        throw new Error(`Server returned ${response.status}`);
      }
      
      const json = await response.json();
      setData(json);
      setError(null);
      setIsAuthorized(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!adminKey) return;
    fetchStatus();
    // Poll every 5 seconds
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, [adminKey]);

  const handleLogin = (e) => {
    e.preventDefault();
    const key = e.target.password.value;
    localStorage.setItem('adminKey', key);
    setAdminKey(key);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminKey');
    setAdminKey('');
    setIsAuthorized(false);
    setData(null);
  };

  if (!adminKey || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans">
        <div className="glass p-8 rounded-3xl max-w-sm w-full border border-teal-500/30">
          <div className="flex justify-center mb-6">
            <Shield className="w-16 h-16 text-teal-400 drop-shadow-[0_0_15px_rgba(45,212,191,0.5)]" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100 text-center mb-6">Admin Login</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input 
              name="password"
              type="password" 
              placeholder="Enter Admin Password" 
              className="px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-slate-200 outline-none focus:border-teal-500 transition-colors"
              required
            />
            <button type="submit" className="px-4 py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl shadow-lg shadow-teal-500/20 transition-all">
              Login
            </button>
          </form>
          {error && <p className="text-rose-400 text-sm text-center mt-4">{error}</p>}
        </div>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <RefreshCw className="w-12 h-12 text-teal-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-slate-200">Connecting to Server...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
        <div className="glass p-8 rounded-3xl max-w-md w-full text-center border border-rose-500/30">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-rose-400 mb-2">Connection Error</h2>
          <p className="text-slate-300 text-sm mb-6 leading-relaxed">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6 md:p-10 font-sans text-slate-200">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-teal-500/10 rounded-2xl border border-teal-500/20 shadow-[0_0_20px_rgba(45,212,191,0.15)]">
              <Shield className="w-8 h-8 text-teal-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-400 tracking-tight">
                Live Server Dashboard
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <p className="text-slate-400 text-sm font-medium">Monitoring Real-Time Connections</p>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900/80 hover:bg-slate-800 text-slate-300 rounded-xl transition-colors border border-slate-800"
          >
            <LogOut className="w-4 h-4" /> Disconnect
          </button>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass p-6 rounded-2xl border border-slate-700/50 flex items-center gap-4">
            <div className="p-4 bg-indigo-500/20 rounded-xl text-indigo-400">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Sockets</p>
              <h3 className="text-3xl font-black text-slate-100">{data.totalSockets}</h3>
              <p className="text-xs text-slate-500 mt-1">{data.uniquePlayers} Unique Devices</p>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-slate-700/50 flex items-center gap-4">
            <div className="p-4 bg-emerald-500/20 rounded-xl text-emerald-400">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Rooms</p>
              <h3 className="text-3xl font-black text-slate-100">{data.activeRooms.length}</h3>
              <p className="text-xs text-slate-500 mt-1">Ongoing matches</p>
            </div>
          </div>

          <div className="glass p-6 rounded-2xl border border-slate-700/50 flex items-center gap-4">
            <div className="p-4 bg-amber-500/20 rounded-xl text-amber-400">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Queue Size</p>
              <h3 className="text-3xl font-black text-slate-100">{data.matchQueue.length}</h3>
              <p className="text-xs text-slate-500 mt-1">Players matchmaking</p>
            </div>
          </div>
        </div>

        {/* Active Rooms Table */}
        <div className="glass rounded-3xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50 flex justify-between items-center">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Activity className="w-5 h-5 text-teal-400" /> Active Games
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse"></span>
              Live Updates
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-900/40 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Room ID</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">White Player</th>
                  <th className="px-6 py-4">Black Player</th>
                  <th className="px-6 py-4">Spectators</th>
                  <th className="px-6 py-4">Moves</th>
                  <th className="px-6 py-4 text-right">Time Limit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {data.activeRooms.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500">
                      No active games at the moment.
                    </td>
                  </tr>
                ) : (
                  data.activeRooms.map((room) => (
                    <tr key={room.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-teal-400">{room.id}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                          room.status === 'playing' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          room.status === 'waiting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                        }`}>
                          {room.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">{room.players.white}</td>
                      <td className="px-6 py-4 font-semibold text-slate-300">{room.players.black}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-slate-400">
                          <Eye className="w-3.5 h-3.5" /> {room.spectators}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-400">{room.moves}</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-400">{room.timeLimit}m</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Matchmaking Queue Table */}
        {data.matchQueue.length > 0 && (
          <div className="glass rounded-3xl border border-slate-700/50 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-700/50">
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Hash className="w-5 h-5 text-amber-400" /> Matchmaking Queue
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-900/40 text-slate-400 font-semibold text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Player Name</th>
                    <th className="px-6 py-4">Time Request</th>
                    <th className="px-6 py-4">Wait Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {data.matchQueue.map((q, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-300">{q.username}</td>
                      <td className="px-6 py-4 font-mono text-slate-400">{q.timeLimit}m</td>
                      <td className="px-6 py-4 text-slate-400">
                        {Math.floor((Date.now() - q.joinedAt) / 1000)}s
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
