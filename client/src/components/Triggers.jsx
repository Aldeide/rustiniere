import React, { useState, useEffect } from 'react';
import { 
  Zap, 
  Plus, 
  Trash2, 
  Edit3, 
  Power, 
  CheckCircle, 
  Clock, 
  MessageSquare, 
  ShieldAlert, 
  UserCheck, 
  Activity, 
  Terminal, 
  HelpCircle,
  Play,
  RotateCw
} from 'lucide-react';
import { api } from '../services/api';

export default function Triggers({ onSendCommand, onTriggersChange }) {
  const [triggers, setTriggers] = useState([]);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('rules'); // 'rules' | 'activity'
  const [statusMessage, setStatusMessage] = useState(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('chat_command');
  const [formPattern, setFormPattern] = useState('');
  const [formMatchType, setFormMatchType] = useState('exact');
  const [formCooldown, setFormCooldown] = useState(5);
  const [formCommand, setFormCommand] = useState('');
  const [formDescription, setFormDescription] = useState('');

  const loadData = async () => {
    try {
      const trigs = await api.getTriggers();
      setTriggers(trigs || []);
      const hist = await api.getTriggerHistory();
      setHistory(hist || []);
      onTriggersChange?.();
    } catch (e) {
      console.error('Failed to load triggers:', e);
    }
  };

  useEffect(() => {
    loadData();

    // Listen for live trigger execution events
    const handleTriggerFired = (record) => {
      setHistory(prev => [record, ...prev.slice(0, 99)]);
      setStatusMessage(`Trigger fired: ${record.triggerName}`);
      setTimeout(() => setStatusMessage(null), 4000);
    };

    api.socket.on('trigger:fired', handleTriggerFired);
    return () => {
      api.socket.off('trigger:fired', handleTriggerFired);
    };
  }, []);

  const openAddModal = () => {
    setEditingTrigger(null);
    setFormName('');
    setFormType('chat_command');
    setFormPattern('!help');
    setFormMatchType('exact');
    setFormCooldown(5);
    setFormCommand('say "[HELP] Available commands: !discord, !wipe, !rules"');
    setFormDescription('Replies to player help command in chat');
    setIsModalOpen(true);
  };

  const openEditModal = (trig) => {
    setEditingTrigger(trig);
    setFormName(trig.name);
    setFormType(trig.type);
    setFormPattern(trig.matchPattern || '');
    setFormMatchType(trig.matchType || 'exact');
    setFormCooldown(trig.cooldownSeconds || 5);
    setFormCommand(trig.actions?.[0]?.command || '');
    setFormDescription(trig.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name: formName,
      type: formType,
      matchPattern: formPattern,
      matchType: formMatchType,
      cooldownSeconds: Number(formCooldown) || 5,
      actions: [{ type: 'command', command: formCommand }],
      description: formDescription,
      enabled: editingTrigger ? editingTrigger.enabled : true
    };

    if (editingTrigger) {
      await api.updateTrigger(editingTrigger.id, payload);
    } else {
      await api.addTrigger(payload);
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this triggered command rule?')) {
      await api.deleteTrigger(id);
      loadData();
    }
  };

  const handleToggle = async (id, currentEnabled) => {
    await api.toggleTrigger(id, !currentEnabled);
    loadData();
  };

  const testTrigger = async (trig) => {
    if (trig.actions?.[0]?.command) {
      let cmd = trig.actions[0].command
        .replace(/\{player\}/g, 'AdminTest')
        .replace(/\{steamid\}/g, '76561198000000000')
        .replace(/\{message\}/g, 'Testing trigger');
      await onSendCommand(cmd);
      setStatusMessage(`Test command sent: ${cmd}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  const getTypeBadge = (type) => {
    switch (type) {
      case 'chat_command':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a2f3b] text-[#38bdf8] border border-[#234c61]">Chat Command</span>;
      case 'chat_automod':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3b1a1a] text-[#f87171] border border-[#612323]">Auto-Moderation</span>;
      case 'player_join':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#1a3b25] text-[#4ade80] border border-[#236136]">Player Join</span>;
      case 'player_leave':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#383318] text-[#facc15] border border-[#5c5324]">Player Leave</span>;
      case 'game_event':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#3b1a37] text-[#e879f9] border border-[#61235b]">Game Event</span>;
      case 'console_regex':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#271d3d] text-[#a78bfa] border border-[#432e6b]">Console Regex</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#22232c] text-[#8e909a]">Trigger</span>;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-[#1c1a24] to-[#16171d] p-5 rounded-2xl border border-[#2d2938] shadow-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] flex items-center justify-center text-white shadow-lg shadow-[#ea580c]/20">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">Triggered Commands Engine</h2>
              <span className="px-2 py-0.5 rounded bg-[#3b1f14] text-[#fb923c] text-[10px] font-extrabold uppercase border border-[#61301d]">
                Reactive Automation
              </span>
            </div>
            <p className="text-xs text-[#8e909a] mt-0.5">
              Automatically execute server commands & chat broadcasts based on player chat, joins, deaths, game events, or regex matches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Subtabs switcher */}
          <div className="flex bg-[#14151a] p-1 rounded-xl border border-[#272833]">
            <button
              onClick={() => setActiveSubTab('rules')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'rules' ? 'bg-[#cd4628] text-white' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Trigger Rules ({triggers.length})
            </button>
            <button
              onClick={() => setActiveSubTab('activity')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeSubTab === 'activity' ? 'bg-[#cd4628] text-white' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Live Activity Log ({history.length})
            </button>
          </div>

          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#cd4628] hover:bg-[#b83b1f] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#cd4628]/25 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>New Trigger</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="px-4 py-2.5 bg-[#251f15] border border-[#f59e0b]/40 rounded-xl text-xs font-semibold text-[#fde68a] flex items-center gap-2 animate-fade-in">
          <Activity className="w-4 h-4 text-[#f59e0b] animate-spin" />
          {statusMessage}
        </div>
      )}

      {/* Rules Subtab */}
      {activeSubTab === 'rules' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {triggers.length === 0 ? (
            <div className="col-span-full py-12 text-center bg-[#15161c] rounded-2xl border border-[#24252e] text-[#676a79]">
              No triggers configured. Click "New Trigger" to create your first reactive command!
            </div>
          ) : (
            triggers.map((trig) => (
              <div 
                key={trig.id} 
                className={`bg-[#15161d] rounded-2xl border p-5 flex flex-col justify-between transition-all hover:border-[#3d3f4d] shadow-lg ${
                  trig.enabled ? 'border-[#282a35]' : 'border-[#202129] opacity-60'
                }`}
              >
                <div>
                  
                  {/* Top bar with type badge and enable toggle */}
                  <div className="flex items-center justify-between mb-3">
                    {getTypeBadge(trig.type)}
                    <button
                      onClick={() => handleToggle(trig.id, trig.enabled)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        trig.enabled 
                          ? 'bg-[#183321] text-[#4ade80] border-[#255234]' 
                          : 'bg-[#25262f] text-[#71737e] border-[#31333e]'
                      }`}
                      title={trig.enabled ? 'Disable Trigger' : 'Enable Trigger'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="text-sm font-bold text-white mb-1">{trig.name}</h3>
                  <p className="text-xs text-[#71737e] mb-3 leading-relaxed">{trig.description || 'No description'}</p>

                  {/* Match Condition Box */}
                  <div className="p-2.5 rounded-xl bg-[#0f1014] border border-[#23252e] mb-3 font-mono text-xs space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#8e909a]">Match Condition:</div>
                    <div className="text-[#38bdf8] break-all">
                      {trig.type === 'chat_command' && (
                        <span>Chat {trig.matchType}: <strong className="text-white">"{trig.matchPattern}"</strong></span>
                      )}
                      {trig.type === 'chat_automod' && (
                        <span>Blocked Words: <strong className="text-[#f87171]">[{trig.matchPattern}]</strong></span>
                      )}
                      {trig.type === 'player_join' && <span>Event: On Player Connect</span>}
                      {trig.type === 'player_leave' && <span>Event: On Player Disconnect</span>}
                      {trig.type === 'game_event' && <span>Game Event: <strong className="text-white">{trig.matchPattern || 'Monument/Event'}</strong></span>}
                      {trig.type === 'console_regex' && <span>Regex: <strong className="text-[#a78bfa]">/{trig.matchPattern}/i</strong></span>}
                    </div>
                  </div>

                  {/* Executed Action Box */}
                  <div className="p-2.5 rounded-xl bg-[#0f1014] border border-[#23252e] font-mono text-xs space-y-1">
                    <div className="text-[10px] uppercase font-bold text-[#8e909a]">Executes Command:</div>
                    <div className="text-[#4ade80] break-all">
                      {trig.actions?.[0]?.command || 'None'}
                    </div>
                  </div>

                </div>

                {/* Bottom Footer Actions */}
                <div className="mt-4 pt-3 border-t border-[#23242c] flex items-center justify-between text-xs text-[#71737e]">
                  <span className="flex items-center gap-1 font-mono text-[11px]">
                    <Clock className="w-3 h-3 text-[#facc15]" /> {trig.cooldownSeconds}s cooldown
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => testTrigger(trig)}
                      title="Test Trigger Action"
                      className="p-1.5 rounded-lg bg-[#1f2129] hover:bg-[#2c2f3b] text-[#8e909a] hover:text-[#4ade80] transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEditModal(trig)}
                      title="Edit Trigger"
                      className="p-1.5 rounded-lg bg-[#1f2129] hover:bg-[#2c2f3b] text-[#8e909a] hover:text-white transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(trig.id)}
                      title="Delete Trigger"
                      className="p-1.5 rounded-lg bg-[#1f2129] hover:bg-[#3d1c1c] text-[#8e909a] hover:text-[#f87171] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

              </div>
            ))
          )}
        </div>
      )}

      {/* Activity Subtab */}
      {activeSubTab === 'activity' && (
        <div className="bg-[#15161d] rounded-2xl border border-[#24252e] overflow-hidden shadow-xl">
          <div className="p-4 bg-[#1a1b22] border-b border-[#252731] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">Trigger Execution History</h3>
            <span className="text-xs text-[#71737e] font-mono">{history.length} events logged</span>
          </div>

          <div className="divide-y divide-[#202129] max-h-[600px] overflow-y-auto">
            {history.length === 0 ? (
              <div className="py-8 text-center text-[#676a79] text-xs">
                No trigger events executed yet. Triggered events will show up in real-time.
              </div>
            ) : (
              history.map((h, i) => (
                <div key={h.id || i} className="p-4 hover:bg-[#191a21] transition-colors text-xs font-mono">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#2a1b15] text-[#fb923c] font-bold text-[10px] border border-[#4d2d1d]">
                        {h.triggerName}
                      </span>
                      <span className="text-[#8e909a]">
                        Triggered by: <strong className="text-white">{h.context?.player || 'System Event'}</strong>
                      </span>
                    </div>
                    <span className="text-[#676a79] text-[11px]">
                      {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ''}
                    </span>
                  </div>

                  {h.context?.message && (
                    <div className="text-[#38bdf8] mb-1 pl-2 border-l-2 border-[#1f4c5e]">
                      Chat Input: "{h.context.message}"
                    </div>
                  )}

                  <div className="text-[#4ade80] pl-2 border-l-2 border-[#1f4e30]">
                    Executed: {h.executedCommands?.join(' | ')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Trigger Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16171d] rounded-2xl border border-[#2a2c38] p-6 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ea580c] to-[#f97316] flex items-center justify-center text-white">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingTrigger ? 'Edit Triggered Command' : 'Create New Triggered Command'}
                </h3>
                <p className="text-xs text-[#71737e]">Configure automated event reactions</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              
              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Trigger Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. !discord Auto-Reply"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Trigger Type</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                  >
                    <option value="chat_command">Chat Command</option>
                    <option value="chat_automod">Chat Auto-Moderation</option>
                    <option value="player_join">Player Joined Server</option>
                    <option value="player_leave">Player Left Server</option>
                    <option value="game_event">Game Event (Heli / Cargo / Airdrop)</option>
                    <option value="console_regex">Raw Console Regex</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Cooldown (Seconds)</label>
                  <input
                    type="number"
                    min="0"
                    value={formCooldown}
                    onChange={(e) => setFormCooldown(e.target.value)}
                    className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                  />
                </div>
              </div>

              {formType === 'chat_command' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Match Type</label>
                    <select
                      value={formMatchType}
                      onChange={(e) => setFormMatchType(e.target.value)}
                      className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                    >
                      <option value="exact">Exact Match</option>
                      <option value="starts_with">Starts With</option>
                      <option value="contains">Contains Word</option>
                      <option value="regex">Regex Match</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Chat Trigger Pattern</label>
                    <input
                      type="text"
                      placeholder="!discord or !kit"
                      value={formPattern}
                      onChange={(e) => setFormPattern(e.target.value)}
                      className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                    />
                  </div>
                </div>
              )}

              {formType === 'chat_automod' && (
                <div>
                  <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Blocked Keywords (comma separated)</label>
                  <input
                    type="text"
                    placeholder="word1, word2, word3"
                    value={formPattern}
                    onChange={(e) => setFormPattern(e.target.value)}
                    className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                  />
                </div>
              )}

              {formType === 'game_event' && (
                <div>
                  <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Game Event Keyword</label>
                  <input
                    type="text"
                    placeholder="heli, cargo, bradley, airdrop"
                    value={formPattern}
                    onChange={(e) => setFormPattern(e.target.value)}
                    className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                  />
                </div>
              )}

              {formType === 'console_regex' && (
                <div>
                  <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Regular Expression</label>
                  <input
                    type="text"
                    placeholder="^\[Server\] (.*)$"
                    value={formPattern}
                    onChange={(e) => setFormPattern(e.target.value)}
                    className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628] font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Command to Execute</label>
                <textarea
                  rows="2"
                  required
                  placeholder='say "Welcome {player}!" or mute {steamid} 300'
                  value={formCommand}
                  onChange={(e) => setFormCommand(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs p-3 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628] font-mono"
                />
                <p className="text-[10px] text-[#71737e] mt-1 leading-relaxed">
                  Placeholders: <code className="text-[#38bdf8]">{"{player}"}</code>, <code className="text-[#38bdf8]">{"{online_players}"}</code>, <code className="text-[#38bdf8]">{"{max_players}"}</code>, <code className="text-[#38bdf8]">{"{queue}"}</code>, <code className="text-[#38bdf8]">{"{fps}"}</code>, <code className="text-[#38bdf8]">{"{steamid}"}</code>, <code className="text-[#38bdf8]">{"{message}"}</code>, <code className="text-[#38bdf8]">{"{time}"}</code>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Summary of what this trigger does"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
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
                  className="px-5 py-2 rounded-xl bg-[#cd4628] hover:bg-[#b83b1f] text-xs font-bold text-white shadow-lg transition-colors"
                >
                  {editingTrigger ? 'Save Changes' : 'Create Trigger'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
}
