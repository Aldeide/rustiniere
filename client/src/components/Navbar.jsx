import React from 'react';
import { 
  Activity, 
  Terminal, 
  Users, 
  MessageSquare, 
  Zap, 
  Clock, 
  Package, 
  ShieldAlert, 
  Server, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Power,
  Map as MapIcon
} from 'lucide-react';

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  servers, 
  activeServer, 
  status, 
  serverInfo, 
  onOpenServerModal, 
  onSelectServer,
  onDisconnect 
}) {
  const isConnected = status.state === 'connected';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'map', label: 'Live Map', icon: MapIcon, highlight: true },
    { id: 'console', label: 'Console', icon: Terminal },
    { id: 'players', label: 'Players', icon: Users, badge: serverInfo?.Players || 0 },
    { id: 'chat', label: 'Live Chat', icon: MessageSquare },
    { id: 'triggers', label: 'Triggers', icon: Zap },
    { id: 'scheduler', label: 'Scheduler', icon: Clock },
    { id: 'items', label: 'Give Items', icon: Package },
    { id: 'bans', label: 'Ban List', icon: ShieldAlert }
  ];

  return (
    <header className="bg-[#141519] border-b border-[#25262c] sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#cd4628] to-[#992e16] flex items-center justify-center shadow-lg shadow-[#cd4628]/25 border border-[#ea580c]/30">
              <span className="font-extrabold text-white text-lg tracking-wider">R</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-white tracking-wide">RUSTI<span className="text-[#cd4628]">NIÈRE</span></span>
                <span className="text-[10px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded bg-[#23242a] text-[#fb923c] border border-[#ea580c]/30">
                  WebRCON
                </span>
              </div>
              <p className="text-[11px] text-[#71737e] -mt-0.5">Rust Server Administration Suite</p>
            </div>
          </div>

          {/* Server Selector & Connection Status */}
          <div className="flex items-center gap-3">
            <div className="relative flex items-center bg-[#1a1c22] rounded-lg border border-[#2b2d35] p-1">
              <Server className="w-4 h-4 text-[#8b8e9b] ml-2" />
              <select 
                value={activeServer?.id || ''} 
                onChange={(e) => onSelectServer(e.target.value)}
                className="bg-transparent text-sm text-white font-medium px-2 py-1 focus:outline-none cursor-pointer pr-6"
              >
                {servers.map(s => (
                  <option key={s.id} value={s.id} className="bg-[#1a1c22] text-white">
                    {s.name} {s.isMock ? '(Simulated Demo)' : `(${s.ip}:${s.port})`}
                  </option>
                ))}
              </select>
              <button 
                onClick={() => onOpenServerModal(null)}
                title="Add New Server"
                className="p-1.5 rounded-md hover:bg-[#282a33] text-[#a0a3af] hover:text-white transition-colors ml-1"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Live Status Pill */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold ${
              isConnected 
                ? 'bg-[#12281d] border-[#1f4a33] text-[#4ade80]' 
                : status.state === 'connecting'
                ? 'bg-[#2a2414] border-[#4d3d1a] text-[#facc15]'
                : 'bg-[#291616] border-[#4d2222] text-[#f87171]'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-[#4ade80] animate-pulse glow-green' : status.state === 'connecting' ? 'bg-[#facc15] animate-ping' : 'bg-[#f87171]'
              }`} />
              <span className="capitalize">{status.state}</span>
              {isConnected && serverInfo?.Framerate ? (
                <span className="text-[11px] text-[#93c5fd] font-mono border-l border-[#244535] pl-2">
                  {serverInfo.Framerate} FPS
                </span>
              ) : null}
            </div>

            {isConnected ? (
              <button
                onClick={onDisconnect}
                title="Disconnect from server"
                className="p-2 rounded-lg bg-[#202229] hover:bg-[#2c1d1d] hover:text-[#f87171] text-[#8e909a] transition-colors border border-[#2b2d35]"
              >
                <Power className="w-4 h-4" />
              </button>
            ) : null}
          </div>

        </div>

        {/* Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto no-scrollbar pt-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-[#cd4628] text-white bg-[#1a1b20]/60'
                    : 'border-transparent text-[#8b8e9b] hover:text-[#d1d4de] hover:border-[#373943]'
                } ${item.highlight && !isActive ? 'text-[#fb923c]' : ''}`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#cd4628]' : item.highlight ? 'text-[#fb923c]' : 'text-[#71737e]'}`} />
                <span>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 rounded-full text-[11px] font-bold bg-[#cd4628] text-white">
                    {item.badge}
                  </span>
                )}
                {item.highlight && (
                  <span className="px-1.5 py-0.2 text-[9px] font-extrabold uppercase rounded bg-[#ea580c]/20 text-[#fb923c] border border-[#ea580c]/30">
                    New
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </header>
  );
}
