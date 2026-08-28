import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Plus, 
  Trash2, 
  UserCheck, 
  Copy, 
  Check, 
  ExternalLink,
  Clock
} from 'lucide-react';

export default function Bans({ bans, onSendCommand }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [steamId, setSteamId] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');
  const [duration, setDuration] = useState('Permanent');
  const [copiedId, setCopiedId] = useState(null);

  const copySteamId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleAddBan = async (e) => {
    e.preventDefault();
    const cleanId = steamId.trim();
    if (!cleanId) return;

    await onSendCommand(`banid ${cleanId} "${name || 'Unknown'}" "${reason || 'Banned by administrator'}"`);
    setIsModalOpen(false);
    setSteamId('');
    setName('');
    setReason('');
  };

  const handleUnban = async (id) => {
    if (window.confirm(`Are you sure you want to unban SteamID: ${id}?`)) {
      await onSendCommand(`unban ${id}`);
    }
  };

  const filteredBans = bans.filter(b => {
    const id = (b.SteamID || '').toString();
    const n = (b.Name || '').toLowerCase();
    const r = (b.Reason || '').toLowerCase();
    const q = searchQuery.toLowerCase();
    return id.includes(q) || n.includes(q) || r.includes(q);
  });

  return (
    <div className="space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#15161c] p-4 rounded-2xl border border-[#24252e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2a1717] flex items-center justify-center text-[#f87171]">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Server Ban List</h2>
            <p className="text-xs text-[#71737e]">{bans.length} banned accounts on record</p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-3 text-[#71737e]" />
            <input
              type="text"
              placeholder="Search bans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0f1013] text-xs text-white pl-9 pr-4 py-2.5 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628]"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#dc2626] hover:bg-[#b91c1c] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#dc2626]/20 transition-all whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>Add Ban</span>
          </button>
        </div>
      </div>

      {/* Bans Table */}
      <div className="bg-[#15161c] rounded-2xl border border-[#24252e] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#1b1c23] text-[#8e909c] uppercase font-bold text-[10px] tracking-wider border-b border-[#252731]">
              <tr>
                <th className="py-3 px-4">Player / SteamID</th>
                <th className="py-3 px-4">Reason</th>
                <th className="py-3 px-4">Duration / Expiry</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202129]">
              {filteredBans.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-[#676a79]">
                    No bans found.
                  </td>
                </tr>
              ) : (
                filteredBans.map((ban, idx) => (
                  <tr key={ban.SteamID || idx} className="hover:bg-[#1a1b22] transition-colors">
                    
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-bold text-white flex items-center gap-1.5">
                          <span>{ban.Name || 'Unknown Player'}</span>
                        </div>
                        <div className="flex items-center gap-1 font-mono text-[11px] text-[#8e909a] mt-0.5">
                          <span>{ban.SteamID}</span>
                          <button
                            onClick={() => copySteamId(ban.SteamID)}
                            title="Copy SteamID"
                            className="p-0.5 hover:text-white"
                          >
                            {copiedId === ban.SteamID ? (
                              <Check className="w-3 h-3 text-[#4ade80]" />
                            ) : (
                              <Copy className="w-3 h-3 text-[#676a79]" />
                            )}
                          </button>
                          <a
                            href={`https://steamcommunity.com/profiles/${ban.SteamID}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-0.5 hover:text-[#60a5fa]"
                          >
                            <ExternalLink className="w-3 h-3 text-[#676a79]" />
                          </a>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#d1d4de] font-mono">
                      {ban.Reason || 'No reason provided'}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-xs text-[#f87171] font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{ban.Duration || 'Permanent'}</span>
                        {ban.Expiry && ban.Expiry !== 'Never' && (
                          <span className="text-[11px] text-[#8e909a] font-normal">({ban.Expiry})</span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleUnban(ban.SteamID)}
                        className="px-3 py-1.5 rounded-lg bg-[#1a2b20] hover:bg-[#234530] text-[#4ade80] border border-[#275937] text-xs font-bold transition-colors inline-flex items-center gap-1"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Unban</span>
                      </button>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Ban Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16171d] rounded-2xl border border-[#2a2c38] p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#3b1717] text-[#f87171] flex items-center justify-center">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Ban Rule</h3>
                <p className="text-xs text-[#71737e]">Ban player from server by SteamID64</p>
              </div>
            </div>

            <form onSubmit={handleAddBan} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">SteamID64</label>
                <input
                  type="text"
                  required
                  placeholder="76561198000000000"
                  value={steamId}
                  onChange={(e) => setSteamId(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs font-mono px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Player Name (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. KnownAlias"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hacking / Scripts / Toxic behavior"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252e]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#20222a] hover:bg-[#282a35] text-xs font-bold text-[#8e909a] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#dc2626] hover:bg-[#b91c1c] text-xs font-bold text-white shadow-lg transition-colors"
                >
                  Apply Ban
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
