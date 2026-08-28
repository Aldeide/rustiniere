import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Download, 
  ArrowDownCircle, 
  Filter, 
  Search, 
  Terminal as TerminalIcon,
  HelpCircle
} from 'lucide-react';

export default function Console({ logs, onSendCommand, isConnected }) {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);

  const consoleEndRef = useRef(null);

  useEffect(() => {
    if (autoScroll) {
      consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const cmd = inputCommand.trim();
    if (!cmd || isExecuting) return;

    setHistory(prev => [cmd, ...prev.filter(c => c !== cmd)].slice(0, 50));
    setHistoryIndex(-1);
    setInputCommand('');
    setIsExecuting(true);

    try {
      await onSendCommand(cmd);
    } catch (err) {
      console.error('Command execution failed:', err);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(history.length - 1, historyIndex + 1);
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const nextIdx = historyIndex - 1;
        setHistoryIndex(nextIdx);
        setInputCommand(history[nextIdx]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInputCommand('');
      }
    }
  };

  const clearLogs = () => {
    // Local clear indicator
  };

  const exportLogs = () => {
    const text = logs.map(l => `[${new Date(l.Time || Date.now()).toLocaleTimeString()}] [${l.Type || 'GENERIC'}] ${l.Message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rust-console-logs-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const quickCommands = [
    { label: 'status', cmd: 'status' },
    { label: 'serverinfo', cmd: 'serverinfo' },
    { label: 'playerlist', cmd: 'playerlist' },
    { label: 'save', cmd: 'save' },
    { label: 'bans', cmd: 'banlistex' },
    { label: 'airdrop', cmd: 'supply.call' },
    { label: 'heli', cmd: 'heli.call' },
    { label: 'day 12:00', cmd: 'env.time 12' },
    { label: 'clear weather', cmd: 'weather.clouds 0' },
    { label: 'gc.collect', cmd: 'gc.collect' }
  ];

  const filteredLogs = logs.filter(log => {
    const msg = (log.Message || '').toLowerCase();
    const type = (log.Type || 'generic').toLowerCase();

    if (filterType !== 'all') {
      if (filterType === 'chat' && type !== 'chat') return false;
      if (filterType === 'warning' && type !== 'warning') return false;
      if (filterType === 'error' && type !== 'error') return false;
      if (filterType === 'combat' && !msg.includes('combatlog') && !msg.includes('killed')) return false;
    }

    if (searchQuery) {
      return msg.includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const getLogColor = (log) => {
    const type = (log.Type || '').toLowerCase();
    const msg = (log.Message || '').toLowerCase();

    if (type === 'error' || msg.includes('error') || msg.includes('exception')) {
      return 'text-[#f87171] bg-[#2d1717]/40 border-l-2 border-[#f87171]';
    }
    if (type === 'warning' || msg.includes('warning') || msg.includes('kicked') || msg.includes('banned')) {
      return 'text-[#fbbf24] bg-[#2d2517]/40 border-l-2 border-[#fbbf24]';
    }
    if (type === 'chat' || msg.startsWith('[chat]')) {
      return 'text-[#38bdf8] bg-[#14232e]/40 border-l-2 border-[#38bdf8]';
    }
    if (msg.includes('combatlog') || msg.includes('killed')) {
      return 'text-[#e879f9] bg-[#28162e]/40 border-l-2 border-[#e879f9]';
    }
    return 'text-[#cbd0dd] hover:bg-[#181920]';
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#121317] rounded-2xl border border-[#23242c] overflow-hidden shadow-2xl">
      
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#17181e] border-b border-[#23242c] gap-3">
        
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-[#cd4628]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Live WebRCON Console</span>
          <span className="text-[11px] font-mono text-[#71737e] bg-[#202129] px-2 py-0.5 rounded">
            {logs.length} Lines
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {['all', 'chat', 'warning', 'error', 'combat'].map(f => (
            <button
              key={f}
              onClick={() => setFilterType(f)}
              className={`text-[11px] font-semibold uppercase px-2.5 py-1 rounded-md transition-colors ${
                filterType === f
                  ? 'bg-[#cd4628] text-white'
                  : 'bg-[#202128] text-[#8e909a] hover:text-white hover:bg-[#282a33]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#71737e]" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#101115] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-[#272832] focus:outline-none focus:border-[#cd4628] w-36 sm:w-48 font-mono"
            />
          </div>

          <button
            onClick={() => setAutoScroll(!autoScroll)}
            title={autoScroll ? 'Pause Auto-scroll' : 'Resume Auto-scroll'}
            className={`p-1.5 rounded-lg border transition-colors ${
              autoScroll
                ? 'bg-[#1b2f23] border-[#255038] text-[#4ade80]'
                : 'bg-[#202128] border-[#2b2d38] text-[#8e909a]'
            }`}
          >
            <ArrowDownCircle className="w-4 h-4" />
          </button>

          <button
            onClick={exportLogs}
            title="Download Logs"
            className="p-1.5 rounded-lg bg-[#202128] border border-[#2b2d38] text-[#8e909a] hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Terminal Logs Output */}
      <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-[#0e0f13] select-text">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[#555866]">
            <span>No console logs matched. Listening for server messages...</span>
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div 
              key={log.id || idx} 
              className={`px-2.5 py-1 rounded transition-colors break-all leading-relaxed ${getLogColor(log)}`}
            >
              <span className="text-[#595c6c] select-none mr-2 font-mono text-[10px]">
                {log.Time ? new Date(log.Time).toLocaleTimeString() : '00:00:00'}
              </span>
              {log.Type && log.Type !== 'Generic' && (
                <span className="text-[10px] font-bold uppercase mr-2 px-1 py-0.2 rounded bg-black/30">
                  [{log.Type}]
                </span>
              )}
              <span>{log.Message}</span>
            </div>
          ))
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Quick Command Chips */}
      <div className="px-3 py-1.5 bg-[#17181e] border-t border-[#23242c] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase text-[#71737e] mr-1 flex items-center gap-1">
          Quick:
        </span>
        {quickCommands.map(qc => (
          <button
            key={qc.cmd}
            onClick={() => onSendCommand(qc.cmd)}
            className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#202129] hover:bg-[#cd4628] hover:text-white text-[#9ca0b0] border border-[#282a35] transition-colors whitespace-nowrap"
          >
            {qc.label}
          </button>
        ))}
      </div>

      {/* Command Input Bar */}
      <form onSubmit={handleSubmit} className="p-3 bg-[#14151a] border-t border-[#23242c] flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3 top-2.5 text-[#cd4628] font-mono font-bold text-sm select-none">&gt;</span>
          <input
            type="text"
            value={inputCommand}
            onChange={(e) => setInputCommand(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!isConnected}
            placeholder={isConnected ? "Type a console command (e.g. status, playerlist, say hello)..." : "Server not connected"}
            className="w-full bg-[#0d0e12] text-white font-mono text-sm pl-8 pr-4 py-2 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628] disabled:opacity-50"
          />
        </div>
        <button
          type="submit"
          disabled={!isConnected || isExecuting || !inputCommand.trim()}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#cd4628] to-[#ea580c] hover:from-[#ba3e22] hover:to-[#d64f0b] text-white text-xs font-bold flex items-center gap-2 disabled:opacity-50 transition-all shadow-lg shadow-[#cd4628]/20"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>

    </div>
  );
}
