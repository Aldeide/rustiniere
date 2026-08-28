import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Megaphone, 
  VolumeX, 
  UserX, 
  Copy, 
  Check, 
  Filter 
} from 'lucide-react';

export default function Chat({ chats, onSendChat, onSendCommand, isConnected }) {
  const [inputMessage, setInputMessage] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [filterMode, setFilterMode] = useState('all');
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chats]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const msg = inputMessage.trim();
    if (!msg) return;

    setInputMessage('');
    await onSendChat(msg);
  };

  const copySteamId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMute = async (steamId) => {
    await onSendCommand(`mute ${steamId}`);
  };

  const handleKick = async (steamId) => {
    await onSendCommand(`kick ${steamId} "Chat violation"`);
  };

  const quickBroadcasts = [
    "Welcome to the server! Be respectful and follow rules.",
    "Join our Discord for announcements and support: discord.gg/rust",
    "Server wipes every Thursday at 18:00 UTC.",
    "Reminder: Max team size is 3. Teaming will result in a ban."
  ];

  const filteredChats = chats.filter(c => {
    const isServer = c.Username === 'SERVER' || c.UserId === '0';
    if (filterMode === 'server') return isServer;
    if (filterMode === 'players') return !isServer;
    return true;
  });

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#121317] rounded-2xl border border-[#23242c] overflow-hidden shadow-2xl">
      
      {/* Top Header */}
      <div className="flex items-center justify-between px-5 py-3.5 bg-[#17181e] border-b border-[#23242c]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#20222a] flex items-center justify-center text-[#cd4628]">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">Live In-Game Chat Feed</h2>
            <p className="text-[11px] text-[#71737e]">Real-time chat monitor & global broadcast</p>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setFilterMode('all')}
            className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
              filterMode === 'all' ? 'bg-[#cd4628] text-white' : 'bg-[#202129] text-[#8e909a] hover:text-white'
            }`}
          >
            All Chat
          </button>
          <button
            onClick={() => setFilterMode('players')}
            className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
              filterMode === 'players' ? 'bg-[#cd4628] text-white' : 'bg-[#202129] text-[#8e909a] hover:text-white'
            }`}
          >
            Players Only
          </button>
          <button
            onClick={() => setFilterMode('server')}
            className={`text-[11px] font-bold px-3 py-1 rounded-lg transition-colors ${
              filterMode === 'server' ? 'bg-[#cd4628] text-white' : 'bg-[#202129] text-[#8e909a] hover:text-white'
            }`}
          >
            Server Broadcasts
          </button>
        </div>
      </div>

      {/* Chat Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#0d0e12]">
        {filteredChats.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#555866] text-xs">
            <span>No chat messages recorded yet.</span>
          </div>
        ) : (
          filteredChats.map((chat, idx) => {
            const isServer = chat.Username === 'SERVER' || chat.UserId === '0';
            return (
              <div 
                key={chat.id || idx}
                className={`p-3 rounded-xl transition-colors border group ${
                  isServer 
                    ? 'bg-[#251717]/60 border-[#4a2222] text-[#fca5a5]' 
                    : 'bg-[#16171d] border-[#22242d] hover:border-[#32343f] text-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {/* User Avatar */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-extrabold shadow ${
                      isServer ? 'bg-[#cd4628] text-white' : 'bg-[#2a2c36] text-[#60a5fa]'
                    }`}>
                      {isServer ? 'S' : (chat.Username ? chat.Username.charAt(0).toUpperCase() : 'P')}
                    </div>

                    {/* Username */}
                    <span className={`text-xs font-bold ${isServer ? 'text-[#f87171] uppercase tracking-wider' : 'text-white'}`}>
                      {chat.Username || 'Unknown'}
                    </span>

                    {/* Timestamp */}
                    <span className="text-[10px] text-[#6b6e7d] font-mono">
                      {chat.Time ? new Date(chat.Time * 1000).toLocaleTimeString() : ''}
                    </span>
                  </div>

                  {/* Actions for players */}
                  {!isServer && chat.UserId && chat.UserId !== '0' && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => copySteamId(chat.UserId)}
                        title="Copy SteamID"
                        className="p-1 rounded bg-[#20222a] hover:bg-[#2c2f3a] text-[#8e909a] hover:text-white text-[10px]"
                      >
                        {copiedId === chat.UserId ? <Check className="w-3 h-3 text-[#4ade80]" /> : <Copy className="w-3 h-3" />}
                      </button>
                      <button
                        onClick={() => handleMute(chat.UserId)}
                        title="Mute Player"
                        className="p-1 rounded bg-[#20222a] hover:bg-[#3d1e1e] text-[#8e909a] hover:text-[#f87171] text-[10px]"
                      >
                        <VolumeX className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleKick(chat.UserId)}
                        title="Kick Player"
                        className="p-1 rounded bg-[#20222a] hover:bg-[#3d2719] text-[#8e909a] hover:text-[#fb923c] text-[10px]"
                      >
                        <UserX className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <p className="text-xs leading-relaxed ml-8 break-words text-[#d8dbe4]">
                  {chat.Message}
                </p>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Announcement Presets */}
      <div className="px-4 py-2 bg-[#17181e] border-t border-[#23242c] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase text-[#71737e] flex items-center gap-1 whitespace-nowrap">
          <Megaphone className="w-3 h-3 text-[#cd4628]" /> Broadcast:
        </span>
        {quickBroadcasts.map((b, i) => (
          <button
            key={i}
            onClick={() => onSendChat(b)}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-[#202129] hover:bg-[#cd4628] hover:text-white text-[#9ca0b0] border border-[#292b36] transition-colors whitespace-nowrap truncate max-w-xs"
          >
            {b}
          </button>
        ))}
      </div>

      {/* Broadcast Message Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#14151a] border-t border-[#23242c] flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={!isConnected}
            placeholder={isConnected ? "Broadcast server announcement in chat..." : "Server not connected"}
            className="w-full bg-[#0d0e12] text-white text-xs px-4 py-2.5 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628] disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!isConnected || !inputMessage.trim()}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#cd4628] to-[#ea580c] hover:from-[#ba3e22] hover:to-[#d64f0b] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-[#cd4628]/20"
        >
          <Megaphone className="w-4 h-4" />
          <span>Broadcast</span>
        </button>
      </form>

    </div>
  );
}
