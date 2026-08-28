import React, { useState } from 'react';
import { 
  Users, 
  Cpu, 
  Boxes, 
  Clock, 
  MapPin, 
  Save, 
  Plane, 
  Sun, 
  CloudSun, 
  RotateCcw, 
  Zap, 
  ShieldAlert, 
  HardDrive,
  CheckCircle,
  Play
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Dashboard({ 
  serverInfo, 
  telemetry, 
  onSendCommand, 
  activeServer, 
  triggersCount, 
  scheduledCount 
}) {
  const [actionFeedback, setActionFeedback] = useState(null);

  const triggerQuickAction = async (cmd, label) => {
    setActionFeedback(`Executing '${label}'...`);
    try {
      const res = await onSendCommand(cmd);
      setActionFeedback(`Success: ${label}`);
      setTimeout(() => setActionFeedback(null), 3000);
    } catch (e) {
      setActionFeedback(`Error: ${e.message}`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const fpsData = telemetry?.fpsHistory?.length > 0 
    ? telemetry.fpsHistory 
    : [{ time: 'Now', fps: serverInfo?.Framerate || 60 }];

  const playerData = telemetry?.playerHistory?.length > 0 
    ? telemetry.playerHistory 
    : [{ time: 'Now', players: serverInfo?.Players || 0 }];

  const formatUptime = (sec) => {
    if (!sec) return '0h 0m';
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner / Server Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-[#1b1d24] to-[#16171c] p-5 rounded-2xl border border-[#272932] shadow-xl gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#cd4628] uppercase tracking-wider">
            <span>Rust Dedicated Server</span>
            <span>•</span>
            <span className="text-[#8e909a]">{serverInfo?.Map || 'Procedural'} ({serverInfo?.WorldSize}m / Seed {serverInfo?.Seed})</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-1">
            {serverInfo?.Hostname || activeServer?.name || 'Rust Server'}
          </h1>
          <p className="text-xs text-[#71737e] mt-1 font-mono">
            IP: {activeServer?.ip}:{activeServer?.port} | Protocol: {serverInfo?.Protocol || 2400} | Save: {serverInfo?.SaveCreatedTime || 'Recent'}
          </p>
        </div>

        {/* Status Indicator / Toast */}
        {actionFeedback && (
          <div className="px-4 py-2 bg-[#221c16] border border-[#ea580c]/50 rounded-xl text-xs font-semibold text-[#fdba74] flex items-center gap-2 animate-fade-in">
            <CheckCircle className="w-4 h-4 text-[#fb923c]" />
            {actionFeedback}
          </div>
        )}
      </div>

      {/* 4 Metric Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Players Card */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg relative overflow-hidden group hover:border-[#353742] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8b8e9b] uppercase tracking-wider">Online Players</span>
            <div className="w-9 h-9 rounded-xl bg-[#20222a] flex items-center justify-center text-[#cd4628] group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{serverInfo?.Players || 0}</span>
            <span className="text-xs text-[#71737e] font-mono">/ {serverInfo?.MaxPlayers || 100}</span>
          </div>
          <div className="mt-3 w-full bg-[#20222a] h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-gradient-to-r from-[#cd4628] to-[#f97316] h-full rounded-full transition-all duration-500" 
              style={{ width: `${Math.min(100, ((serverInfo?.Players || 0) / (serverInfo?.MaxPlayers || 100)) * 100)}%` }}
            />
          </div>
        </div>

        {/* Server FPS Card */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg relative overflow-hidden group hover:border-[#353742] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8b8e9b] uppercase tracking-wider">Server Framerate</span>
            <div className="w-9 h-9 rounded-xl bg-[#20222a] flex items-center justify-center text-[#4ade80] group-hover:scale-110 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">{serverInfo?.Framerate || 60}</span>
            <span className="text-xs text-[#4ade80] font-semibold">FPS</span>
          </div>
          <p className="mt-2 text-xs text-[#71737e]">
            {(serverInfo?.Framerate || 60) > 60 ? 'Optimal Performance' : 'Moderate Load'}
          </p>
        </div>

        {/* Entities Card */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg relative overflow-hidden group hover:border-[#353742] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8b8e9b] uppercase tracking-wider">World Entities</span>
            <div className="w-9 h-9 rounded-xl bg-[#20222a] flex items-center justify-center text-[#60a5fa] group-hover:scale-110 transition-transform">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono">
              {(serverInfo?.EntityCount || 0).toLocaleString()}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#71737e]">
            Memory: {serverInfo?.Memory || '3.8 GB'}
          </p>
        </div>

        {/* Uptime & Game Time */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg relative overflow-hidden group hover:border-[#353742] transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[#8b8e9b] uppercase tracking-wider">Server Uptime</span>
            <div className="w-9 h-9 rounded-xl bg-[#20222a] flex items-center justify-center text-[#facc15] group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-white font-mono">
              {formatUptime(serverInfo?.Uptime)}
            </span>
          </div>
          <p className="mt-2 text-xs text-[#71737e]">
            In-game Time: <span className="text-white font-mono">{serverInfo?.GameTime || '12:00'}</span>
          </p>
        </div>

      </div>

      {/* Telemetry Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* FPS Chart */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Live Server FPS History</h3>
              <p className="text-xs text-[#71737e]">Real-time tickrate & performance</p>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-[#1a2e22] text-[#4ade80] rounded border border-[#245237]">
              {serverInfo?.Framerate || 60} FPS
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={fpsData}>
                <defs>
                  <linearGradient id="fpsColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ade80" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#4ade80" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#4b4e5c" tick={{ fontSize: 10 }} />
                <YAxis stroke="#4b4e5c" domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#181920', borderColor: '#2f313d', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Area type="monotone" dataKey="fps" stroke="#4ade80" strokeWidth={2} fillOpacity={1} fill="url(#fpsColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Player Count Chart */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white">Live Online Players History</h3>
              <p className="text-xs text-[#71737e]">Concurrent active players</p>
            </div>
            <span className="text-xs font-mono px-2 py-1 bg-[#2e1d1a] text-[#fb923c] rounded border border-[#522920]">
              {serverInfo?.Players || 0} Players
            </span>
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={playerData}>
                <defs>
                  <linearGradient id="playerColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#cd4628" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#cd4628" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#4b4e5c" tick={{ fontSize: 10 }} />
                <YAxis stroke="#4b4e5c" domain={[0, 'auto']} tick={{ fontSize: 10 }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#181920', borderColor: '#2f313d', borderRadius: '8px', color: '#fff', fontSize: '12px' }} 
                />
                <Area type="monotone" dataKey="players" stroke="#cd4628" strokeWidth={2} fillOpacity={1} fill="url(#playerColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Quick Power Actions & Automation Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg">
          <h3 className="text-sm font-bold text-white mb-1">Quick Admin Actions</h3>
          <p className="text-xs text-[#71737e] mb-4">One-click server commands and utilities</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            <button 
              onClick={() => triggerQuickAction('save', 'Save World')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <Save className="w-5 h-5 text-[#4ade80] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Save World</span>
              <span className="text-[10px] text-[#71737e]">save</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('supply.call', 'Call Airdrop')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <Plane className="w-5 h-5 text-[#60a5fa] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Call Airdrop</span>
              <span className="text-[10px] text-[#71737e]">supply.call</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('env.time 12', 'Set Noon (12:00)')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <Sun className="w-5 h-5 text-[#facc15] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Set Daytime</span>
              <span className="text-[10px] text-[#71737e]">env.time 12</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('weather.clouds 0; weather.rain 0; weather.fog 0', 'Clear Weather')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <CloudSun className="w-5 h-5 text-[#38bdf8] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Clear Weather</span>
              <span className="text-[10px] text-[#71737e]">weather.clear</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('heli.call', 'Spawn Patrol Heli')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <Plane className="w-5 h-5 text-[#f87171] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Call Heli</span>
              <span className="text-[10px] text-[#71737e]">heli.call</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('cargoship.call', 'Spawn Cargo Ship')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <MapPin className="w-5 h-5 text-[#a78bfa] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Call Cargo</span>
              <span className="text-[10px] text-[#71737e]">cargoship.call</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('gc.collect', 'Garbage Clean (GC)')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <RotateCcw className="w-5 h-5 text-[#e879f9] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">GC Collect</span>
              <span className="text-[10px] text-[#71737e]">gc.collect</span>
            </button>

            <button 
              onClick={() => triggerQuickAction('say "[ANNOUNCEMENT] Server restart in 15 minutes! Please find a safe place."', 'Restart Warning')}
              className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1d1f27] hover:bg-[#282a35] border border-[#2a2c36] text-white hover:border-[#cd4628] transition-all group"
            >
              <ShieldAlert className="w-5 h-5 text-[#fb923c] mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-xs font-bold">Restart Warn</span>
              <span className="text-[10px] text-[#71737e]">say restart</span>
            </button>
          </div>
        </div>

        {/* Automation Status Card */}
        <div className="bg-[#16171d] p-5 rounded-2xl border border-[#25262f] shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white mb-1">Automation Overview</h3>
            <p className="text-xs text-[#71737e] mb-4">Background triggers & scheduler</p>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1d1f27] border border-[#282a35]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#2e1d17] text-[#fb923c] flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Triggered Commands</h4>
                    <p className="text-[11px] text-[#71737e]">Auto-responders & Automod</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#fb923c] font-mono px-2 py-1 rounded bg-[#2b1f1a]">
                  {triggersCount || 7} Active
                </span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-[#1d1f27] border border-[#282a35]">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1a2736] text-[#60a5fa] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Scheduled Tasks</h4>
                    <p className="text-[11px] text-[#71737e]">Timed broadcasts & auto-save</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-[#60a5fa] font-mono px-2 py-1 rounded bg-[#1a2435]">
                  {scheduledCount || 2} Active
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#252630] text-[11px] text-[#8e909a] flex items-center justify-between">
            <span>Engine status: <strong className="text-[#4ade80]">Running</strong></span>
            <span className="font-mono">WebRCON 2.0</span>
          </div>
        </div>

      </div>

    </div>
  );
}
