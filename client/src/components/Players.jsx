import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  ShieldAlert, 
  UserX, 
  VolumeX, 
  Volume2, 
  MapPin, 
  Package, 
  Copy, 
  ExternalLink, 
  MoreVertical,
  Skull,
  Trash2,
  Check,
  Zap
} from 'lucide-react';

export default function Players({ players, onSendCommand, onGiveItemToPlayer }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [modalAction, setModalAction] = useState(null); // 'kick', 'ban', 'teleport', 'give'
  const [actionReason, setActionReason] = useState('');
  const [banDuration, setBanDuration] = useState('Permanent');
  const [copiedId, setCopiedId] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKick = async () => {
    if (!selectedPlayer) return;
    const reason = actionReason || 'Kicked by administrator';
    await onSendCommand(`kick ${selectedPlayer.SteamID} "${reason}"`);
    setModalAction(null);
    setActionReason('');
  };

  const handleBan = async () => {
    if (!selectedPlayer) return;
    const reason = actionReason || 'Banned by administrator';
    await onSendCommand(`ban ${selectedPlayer.SteamID} "${reason}"`);
    setModalAction(null);
    setActionReason('');
  };

  const handleMuteToggle = async (player) => {
    if (player.VoiPBlocked) {
      await onSendCommand(`unmute ${player.SteamID}`);
    } else {
      await onSendCommand(`mute ${player.SteamID}`);
    }
  };

  const handleKill = async (player) => {
    if (window.confirm(`Are you sure you want to kill ${player.DisplayName}?`)) {
      await onSendCommand(`entity.kill ${player.SteamID}`);
    }
  };

  const handleStripInventory = async (player) => {
    if (window.confirm(`Are you sure you want to strip all items from ${player.DisplayName}?`)) {
      await onSendCommand(`inventory.clear ${player.SteamID}`);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '0m';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const filteredPlayers = players.filter(p => {
    const name = (p.DisplayName || '').toLowerCase();
    const id = (p.SteamID || '').toString();
    const ip = (p.Address || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return name.includes(q) || id.includes(q) || ip.includes(q);
  });

  return (
    <div className="space-y-4">
      
      {/* Top Header & Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#15161c] p-4 rounded-2xl border border-[#24252e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#20222a] flex items-center justify-center text-[#cd4628]">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Connected Players</h2>
            <p className="text-xs text-[#71737e]">{players.length} online players currently connected</p>
          </div>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-[#71737e]" />
          <input
            type="text"
            placeholder="Search by name, SteamID, IP..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0f1013] text-xs text-white pl-9 pr-4 py-2.5 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628]"
          />
        </div>
      </div>

      {/* Players Table */}
      <div className="bg-[#15161c] rounded-2xl border border-[#24252e] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1b1c23] text-[#8e909c] uppercase font-bold text-[10px] tracking-wider border-b border-[#252731]">
              <tr>
                <th className="py-3 px-4">Player</th>
                <th className="py-3 px-4">SteamID64</th>
                <th className="py-3 px-4">Ping</th>
                <th className="py-3 px-4">Health</th>
                <th className="py-3 px-4">Session Time</th>
                <th className="py-3 px-4">IP Address</th>
                <th className="py-3 px-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202129]">
              {filteredPlayers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-8 text-center text-[#676a79]">
                    No players found
                  </td>
                </tr>
              ) : (
                filteredPlayers.map((player) => (
                  <tr key={player.SteamID} className="hover:bg-[#1a1b22] transition-colors">
                    
                    {/* Player Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#cd4628] to-[#ea580c] flex items-center justify-center text-white font-extrabold text-xs shadow">
                          {player.DisplayName ? player.DisplayName.charAt(0).toUpperCase() : 'P'}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <span>{player.DisplayName || 'Unnamed'}</span>
                            {player.VoiPBlocked && (
                              <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-[#451a1a] text-[#f87171] border border-[#6b2525]">
                                MUTED
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#6b6e7d]">Rank: Player</span>
                        </div>
                      </div>
                    </td>

                    {/* SteamID with Copy & Profile link */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 font-mono text-[#a0a4b5]">
                        <span>{player.SteamID}</span>
                        <button
                          onClick={() => copyToClipboard(player.SteamID, player.SteamID)}
                          title="Copy SteamID"
                          className="p-1 hover:text-white transition-colors"
                        >
                          {copiedId === player.SteamID ? (
                            <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 text-[#6c7081]" />
                          )}
                        </button>
                        <a
                          href={`https://steamcommunity.com/profiles/${player.SteamID}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Steam Profile"
                          className="p-1 hover:text-[#60a5fa] transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-[#6c7081]" />
                        </a>
                      </div>
                    </td>

                    {/* Ping */}
                    <td className="py-3 px-4">
                      <span className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                        (player.Ping || 0) < 50 
                          ? 'bg-[#152a1d] text-[#4ade80]' 
                          : (player.Ping || 0) < 100 
                          ? 'bg-[#2a2414] text-[#facc15]' 
                          : 'bg-[#2a1616] text-[#f87171]'
                      }`}>
                        {player.Ping || 0} ms
                      </span>
                    </td>

                    {/* Health */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{player.Health || 100}</span>
                        <div className="w-16 bg-[#20222a] h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-[#4ade80] h-full rounded-full" 
                            style={{ width: `${Math.min(100, player.Health || 100)}%` }} 
                          />
                        </div>
                      </div>
                    </td>

                    {/* Session Duration */}
                    <td className="py-3 px-4 font-mono text-[#8b8e9b]">
                      {formatDuration(player.ConnectedDuration)}
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 font-mono text-[#717482]">
                      {player.Address || 'N/A'}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        
                        {/* Mute */}
                        <button
                          onClick={() => handleMuteToggle(player)}
                          title={player.VoiPBlocked ? 'Unmute Player' : 'Mute Player'}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            player.VoiPBlocked 
                              ? 'bg-[#3b1c1c] text-[#f87171] border-[#592626]' 
                              : 'bg-[#1e2028] text-[#8e909a] hover:text-white border-[#2b2d38]'
                          }`}
                        >
                          {player.VoiPBlocked ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                        </button>

                        {/* Give Items */}
                        <button
                          onClick={() => onGiveItemToPlayer?.(player)}
                          title="Give Items to Player"
                          className="p-1.5 rounded-lg bg-[#1e2028] text-[#8e909a] hover:text-[#fb923c] border border-[#2b2d38] transition-colors"
                        >
                          <Package className="w-3.5 h-3.5" />
                        </button>

                        {/* Teleport options */}
                        <button
                          onClick={() => onSendCommand(`teleport ${player.SteamID}`)}
                          title="Teleport to Player"
                          className="p-1.5 rounded-lg bg-[#1e2028] text-[#8e909a] hover:text-[#60a5fa] border border-[#2b2d38] transition-colors"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                        </button>

                        {/* Strip Inventory */}
                        <button
                          onClick={() => handleStripInventory(player)}
                          title="Strip Inventory"
                          className="p-1.5 rounded-lg bg-[#1e2028] text-[#8e909a] hover:text-[#e879f9] border border-[#2b2d38] transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Kill Player */}
                        <button
                          onClick={() => handleKill(player)}
                          title="Kill Player"
                          className="p-1.5 rounded-lg bg-[#1e2028] text-[#8e909a] hover:text-[#f87171] border border-[#2b2d38] transition-colors"
                        >
                          <Skull className="w-3.5 h-3.5" />
                        </button>

                        {/* Kick Modal Trigger */}
                        <button
                          onClick={() => { setSelectedPlayer(player); setModalAction('kick'); }}
                          title="Kick Player"
                          className="px-2 py-1 rounded-lg bg-[#271f1a] hover:bg-[#3d2719] text-[#fb923c] border border-[#4d3222] text-[11px] font-bold transition-colors"
                        >
                          Kick
                        </button>

                        {/* Ban Modal Trigger */}
                        <button
                          onClick={() => { setSelectedPlayer(player); setModalAction('ban'); }}
                          title="Ban Player"
                          className="px-2 py-1 rounded-lg bg-[#2a1717] hover:bg-[#421d1d] text-[#f87171] border border-[#522222] text-[11px] font-bold transition-colors"
                        >
                          Ban
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog / Modal */}
      {modalAction && selectedPlayer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16171d] rounded-2xl border border-[#292b36] p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                modalAction === 'ban' ? 'bg-[#3b1a1a] text-[#f87171]' : 'bg-[#3d281a] text-[#fb923c]'
              }`}>
                {modalAction === 'ban' ? <ShieldAlert className="w-5 h-5" /> : <UserX className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {modalAction === 'ban' ? 'Ban Player' : 'Kick Player'}
                </h3>
                <p className="text-xs text-[#71737e]">
                  Target: <strong className="text-white">{selectedPlayer.DisplayName}</strong> ({selectedPlayer.SteamID})
                </p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Reason</label>
              <input
                type="text"
                placeholder={modalAction === 'ban' ? 'e.g. Hacking / Scripts / Toxic' : 'e.g. Excessive spam / Afk'}
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
              />
            </div>

            {modalAction === 'ban' && (
              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Duration</label>
                <select
                  value={banDuration}
                  onChange={(e) => setBanDuration(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                >
                  <option value="Permanent">Permanent</option>
                  <option value="1 Day">1 Day</option>
                  <option value="3 Days">3 Days</option>
                  <option value="7 Days">7 Days</option>
                  <option value="30 Days">30 Days</option>
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setModalAction(null)}
                className="px-4 py-2 rounded-xl bg-[#20222a] hover:bg-[#282a35] text-xs font-bold text-[#8e909a] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={modalAction === 'ban' ? handleBan : handleKick}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-lg transition-colors ${
                  modalAction === 'ban' 
                    ? 'bg-[#dc2626] hover:bg-[#b91c1c]' 
                    : 'bg-[#ea580c] hover:bg-[#c2410c]'
                }`}
              >
                Confirm {modalAction === 'ban' ? 'Ban' : 'Kick'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
