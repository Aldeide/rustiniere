import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Trash2, 
  Download, 
  ArrowDownCircle, 
  Filter, 
  Search, 
  Terminal as TerminalIcon,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

export default function Console({ logs = [], onSendCommand, isConnected }) {
  const [inputCommand, setInputCommand] = useState('');
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [clearedBeforeTime, setClearedBeforeTime] = useState(0);
  const [copiedId, setCopiedId] = useState(null);

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

  const handleClear = () => {
    setClearedBeforeTime(Date.now());
  };

  const handleCopyLine = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportLogs = () => {
    const text = filteredLogs.map(l => `[${new Date(l.Time || Date.now()).toLocaleTimeString()}] [${l.Type || 'GENERIC'}] ${l.Message}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rustiniere-console-${Date.now()}.txt`;
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

  const visibleLogs = logs.filter(l => {
    if (clearedBeforeTime > 0) {
      const logTime = l.Time ? new Date(l.Time).getTime() : 0;
      if (logTime < clearedBeforeTime) return false;
    }
    return true;
  });

  const filteredLogs = visibleLogs.filter(log => {
    const msg = (log.Message || '').toLowerCase();
    const type = (log.Type || 'generic').toLowerCase();

    if (filterType !== 'all') {
      if (filterType === 'chat' && type !== 'chat' && !msg.startsWith('[chat]')) return false;
      if (filterType === 'warning' && type !== 'warning' && !msg.includes('warning')) return false;
      if (filterType === 'error' && type !== 'error' && !msg.includes('error')) return false;
      if (filterType === 'combat' && !msg.includes('combatlog') && !msg.includes('killed') && !msg.includes('wounded')) return false;
    }

    if (searchQuery) {
      return msg.includes(searchQuery.toLowerCase());
    }

    return true;
  });

  const formatLogContent = (msg) => {
    if (!msg) return '';
    const trimmed = msg.trim();

    // Pretty-format JSON responses if user ran serverinfo or playerlist manually
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        const parsed = JSON.parse(trimmed);
        return (
          <pre className="mt-1 p-2.5 rounded-lg bg-[#08090b] text-[#93c5fd] font-mono text-[11px] overflow-x-auto border border-[#1e2330] leading-relaxed">
            {JSON.stringify(parsed, null, 2)}
          </pre>
        );
      } catch (e) {}
    }

    return <span className="font-mono text-[12px]">{msg}</span>;
  };

  const getLogStyle = (log) => {
    const type = (log.Type || '').toLowerCase();
    const msg = (log.Message || '').toLowerCase();

    if (type === 'error' || msg.includes('error') || msg.includes('exception') || msg.includes('failed')) {
      return {
        badge: 'ERROR',
        badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30',
        textColor: 'text-red-300',
        bg: 'bg-red-950/20 border-l-2 border-red-500'
      };
    }
    if (type === 'warning' || msg.includes('warning') || msg.includes('kicked') || msg.includes('banned')) {
      return {
        badge: 'WARN',
        badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        textColor: 'text-amber-300',
        bg: 'bg-amber-950/20 border-l-2 border-amber-500'
      };
    }
    if (type === 'chat' || msg.startsWith('[chat]') || msg.includes('say "')) {
      return {
        badge: 'CHAT',
        badgeColor: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
        textColor: 'text-sky-200',
        bg: 'bg-sky-950/20 border-l-2 border-sky-500'
      };
    }
    if (msg.includes('combatlog') || msg.includes('killed') || msg.includes('wounded') || msg.includes('died')) {
      return {
        badge: 'COMBAT',
        badgeColor: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
        textColor: 'text-fuchsia-300',
        bg: 'bg-fuchsia-950/20 border-l-2 border-fuchsia-500'
      };
    }
    if (msg.includes('joined [') || msg.includes('disconnecting:') || msg.includes('left the game')) {
      return {
        badge: 'PLAYER',
        badgeColor: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        textColor: 'text-emerald-300',
        bg: 'bg-emerald-950/20 border-l-2 border-emerald-500'
      };
    }
    return {
      badge: log.Type && log.Type !== 'Generic' ? log.Type.toUpperCase() : null,
      badgeColor: 'bg-[#21232d] text-[#8e909a] border-[#2e303d]',
      textColor: 'text-[#d1d5db]',
      bg: 'hover:bg-[#15171d]'
    };
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-[#121317] rounded-2xl border border-[#23242c] overflow-hidden shadow-2xl">
      
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-4 py-3 bg-[#17181e] border-b border-[#23242c] gap-3">
        
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-[#cd4628]" />
          <span className="text-xs font-bold uppercase tracking-wider text-white">Live WebRCON Console</span>
          <span className="text-[11px] font-mono text-[#71737e] bg-[#202129] px-2 py-0.5 rounded">
            {filteredLogs.length} Lines
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          {[
            { id: 'all', label: 'All' },
            { id: 'chat', label: 'Chat' },
            { id: 'warning', label: 'Warnings' },
            { id: 'error', label: 'Errors' },
            { id: 'combat', label: 'Combat' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`text-[11px] font-bold uppercase px-2.5 py-1 rounded-md transition-colors ${
                filterType === f.id
                  ? 'bg-[#cd4628] text-white shadow'
                  : 'bg-[#202128] text-[#8e909a] hover:text-white hover:bg-[#282a33]'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#71737e]" />
            <input
              type="text"
              placeholder="Filter logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#101115] text-xs text-white pl-8 pr-3 py-1.5 rounded-lg border border-[#272832] focus:outline-none focus:border-[#cd4628] w-36 sm:w-48 font-mono"
            />
          </div>

          <button
            onClick={handleClear}
            title="Clear Console Display"
            className="p-1.5 rounded-lg bg-[#202128] border border-[#2b2d38] text-[#8e909a] hover:text-[#f87171] hover:border-[#f87171]/40 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

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
            title="Export Logs as Text File"
            className="p-1.5 rounded-lg bg-[#202128] border border-[#2b2d38] text-[#8e909a] hover:text-white transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Terminal Logs Output */}
      <div className="flex-1 overflow-y-auto p-3 font-mono text-xs space-y-1.5 bg-[#0b0c0f] select-text">
        {filteredLogs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-[#555866] space-y-2">
            <TerminalIcon className="w-8 h-8 opacity-30 text-[#8e909a]" />
            <span className="text-xs font-medium">No console logs to display. Listening for server events...</span>
          </div>
        ) : (
          filteredLogs.map((log, idx) => {
            const style = getLogStyle(log);
            const lineId = log.id || idx;
            return (
              <div 
                key={lineId} 
                className={`group px-3 py-1.5 rounded-lg transition-all flex items-start justify-between gap-3 ${style.bg}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[#525666] select-none font-mono text-[10px] tracking-tight">
                      {log.Time ? new Date(log.Time).toLocaleTimeString() : '00:00:00'}
                    </span>
                    {style.badge && (
                      <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded border tracking-wider ${style.badgeColor}`}>
                        {style.badge}
                      </span>
                    )}
                  </div>
                  <div className={`break-words leading-relaxed ${style.textColor}`}>
                    {formatLogContent(log.Message)}
                  </div>
                </div>

                <button
                  onClick={() => handleCopyLine(log.Message, lineId)}
                  title="Copy log line"
                  className="opacity-0 group-hover:opacity-100 p-1 rounded bg-[#1f2129] text-[#71737e] hover:text-white transition-opacity shrink-0 mt-0.5"
                >
                  {copiedId === lineId ? (
                    <Check className="w-3.5 h-3.5 text-[#4ade80]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            );
          })
        )}
        <div ref={consoleEndRef} />
      </div>

      {/* Quick Command Chips */}
      <div className="px-3 py-1.5 bg-[#17181e] border-t border-[#23242c] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase text-[#71737e] mr-1 flex items-center gap-1 shrink-0">
          Quick:
        </span>
        {quickCommands.map(qc => (
          <button
            key={qc.cmd}
            onClick={() => onSendCommand(qc.cmd)}
            className="text-[11px] font-mono px-2.5 py-0.5 rounded bg-[#202129] hover:bg-[#cd4628] hover:text-white text-[#9ca0b0] border border-[#282a35] transition-colors whitespace-nowrap"
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
            placeholder={isConnected ? "Type a console command (e.g. status, say hello, kick player, save)..." : "Server not connected"}
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
