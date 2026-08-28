import React, { useState, useEffect } from 'react';
import { Server, Trash2, Key, Globe, Hash } from 'lucide-react';

export default function ServerModal({ isOpen, onClose, serverToEdit, onSave, onDelete }) {
  const [name, setName] = useState('');
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(28016);
  const [password, setPassword] = useState('');
  const [isMock, setIsMock] = useState(false);
  const [autoConnect, setAutoConnect] = useState(false);

  useEffect(() => {
    if (serverToEdit) {
      setName(serverToEdit.name || '');
      setIp(serverToEdit.ip || '');
      setPort(serverToEdit.port || 28016);
      setPassword(serverToEdit.password || '');
      setIsMock(serverToEdit.isMock || false);
      setAutoConnect(serverToEdit.autoConnect || false);
    } else {
      setName('My Rust Server');
      setIp('127.0.0.1');
      setPort(28016);
      setPassword('');
      setIsMock(false);
      setAutoConnect(true);
    }
  }, [serverToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      id: serverToEdit?.id,
      name,
      ip,
      port: Number(port) || 28016,
      password,
      isMock,
      autoConnect
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#16171d] rounded-2xl border border-[#2a2c38] p-6 max-w-md w-full shadow-2xl space-y-4">
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cd4628] to-[#ea580c] flex items-center justify-center text-white">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {serverToEdit ? 'Edit Server Profile' : 'Add Rust Server'}
              </h3>
              <p className="text-xs text-[#71737e]">Configure WebRCON connection parameters</p>
            </div>
          </div>

          {serverToEdit && !serverToEdit.isMock && (
            <button
              onClick={() => {
                if (window.confirm('Delete this server profile?')) {
                  onDelete(serverToEdit.id);
                  onClose();
                }
              }}
              title="Delete Server Profile"
              className="p-2 rounded-lg bg-[#2a1717] hover:bg-[#3d1e1e] text-[#f87171] transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Server Name / Label</label>
            <input
              type="text"
              required
              placeholder="e.g. EU Main 2x Vanilla"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2.5 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1 flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#cd4628]" /> Server IP / Host
              </label>
              <input
                type="text"
                required
                placeholder="127.0.0.1 or rust.domain.com"
                value={ip}
                onChange={(e) => setIp(e.target.value)}
                className="w-full bg-[#0e0f13] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1 flex items-center gap-1">
                <Hash className="w-3 h-3 text-[#cd4628]" /> RCON Port
              </label>
              <input
                type="number"
                required
                value={port}
                onChange={(e) => setPort(e.target.value)}
                className="w-full bg-[#0e0f13] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1 flex items-center gap-1">
              <Key className="w-3 h-3 text-[#cd4628]" /> WebRCON Password
            </label>
            <input
              type="password"
              placeholder="rcon.password from server.cfg"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#0e0f13] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
            />
          </div>

          <div className="space-y-2 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoConnect}
                onChange={(e) => setAutoConnect(e.target.checked)}
                className="rounded bg-[#0e0f13] border-[#272935] text-[#cd4628] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-[#a0a4b2]">Auto-connect to this server on startup</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isMock}
                onChange={(e) => setIsMock(e.target.checked)}
                className="rounded bg-[#0e0f13] border-[#272935] text-[#cd4628] focus:ring-0 cursor-pointer"
              />
              <span className="text-xs text-[#a0a4b2]">Simulated Demo Mode (Generates live test players & chat)</span>
            </label>
          </div>

          {/* Browser Mixed-Content Notice for GitHub Pages */}
          {window.location.protocol === 'https:' && (
            <div className="p-3 rounded-xl bg-[#1e1b15] border border-[#d97706]/40 text-[11px] text-[#fde68a] space-y-1">
              <div className="font-bold flex items-center gap-1 text-[#fbbf24]">
                <span>ℹ️ HTTPS / GitHub Pages Notice:</span>
              </div>
              <p className="leading-relaxed">
                If connecting to an unencrypted <code>ws://</code> Rust server from HTTPS, allow <strong>"Insecure content"</strong> in your browser's site settings (click the icon to the left of the URL bar).
              </p>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#23252e]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#20222a] hover:bg-[#282a35] text-xs font-bold text-[#8e909a] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-[#cd4628] hover:bg-[#b83b1f] text-xs font-bold text-white shadow-lg transition-colors"
            >
              Save Server
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
