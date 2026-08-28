import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  Play, 
  Power, 
  CheckCircle, 
  Activity, 
  AlertCircle 
} from 'lucide-react';
import { api } from '../services/api';

export default function Scheduler({ onSendCommand, onTasksChange }) {
  const [tasks, setTasks] = useState([]);
  const [history, setHistory] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusMessage, setStatusMessage] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [intervalMinutes, setIntervalMinutes] = useState(15);
  const [description, setDescription] = useState('');

  const loadData = async () => {
    try {
      const taskList = await api.getTasks();
      setTasks(taskList || []);
      const hist = await api.getSchedulerHistory();
      setHistory(hist || []);
      onTasksChange?.();
    } catch (e) {
      console.error('Failed to load scheduler tasks:', e);
    }
  };

  useEffect(() => {
    loadData();

    const handleExecuted = (logEntry) => {
      setHistory(prev => [logEntry, ...prev.slice(0, 99)]);
      setStatusMessage(`Scheduled task executed: ${logEntry.taskName}`);
      setTimeout(() => setStatusMessage(null), 3000);
      loadData();
    };

    api.socket.on('scheduler:executed', handleExecuted);
    return () => {
      api.socket.off('scheduler:executed', handleExecuted);
    };
  }, []);

  const openAddModal = () => {
    setEditingTask(null);
    setName('');
    setCommand('say "[ANNOUNCEMENT] Server restart daily at 06:00 UTC."');
    setIntervalMinutes(30);
    setDescription('');
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setName(task.name);
    setCommand(task.command);
    setIntervalMinutes(Math.round((task.intervalSeconds || 60) / 60));
    setDescription(task.description || '');
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
      name,
      command,
      intervalSeconds: Math.max(10, Number(intervalMinutes) * 60),
      description,
      enabled: editingTask ? editingTask.enabled : true
    };

    if (editingTask) {
      await api.updateTask(editingTask.id, payload);
    } else {
      await api.addTask(payload);
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this scheduled task?')) {
      await api.deleteTask(id);
      loadData();
    }
  };

  const handleToggle = async (id, currentEnabled) => {
    await api.toggleTask(id, !currentEnabled);
    loadData();
  };

  const handleRunNow = async (id) => {
    await api.runTask(id);
    setStatusMessage('Task executed now');
    setTimeout(() => setStatusMessage(null), 3000);
    loadData();
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between bg-gradient-to-r from-[#181d26] to-[#14161c] p-5 rounded-2xl border border-[#262c38] shadow-xl gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#38bdf8] flex items-center justify-center text-white shadow-lg shadow-[#38bdf8]/20">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-extrabold text-white">Automated Task Scheduler</h2>
              <span className="px-2 py-0.5 rounded bg-[#16273b] text-[#60a5fa] text-[10px] font-extrabold uppercase border border-[#23456b]">
                Timed Automation
              </span>
            </div>
            <p className="text-xs text-[#8e909a] mt-0.5">
              Execute recurring console commands, periodic world saves, or timed broadcast announcements on a set timer.
            </p>
          </div>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#2563eb]/25 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Scheduled Task</span>
        </button>
      </div>

      {statusMessage && (
        <div className="px-4 py-2.5 bg-[#17253b] border border-[#3b82f6]/40 rounded-xl text-xs font-semibold text-[#93c5fd] flex items-center gap-2 animate-fade-in">
          <Activity className="w-4 h-4 text-[#38bdf8] animate-spin" />
          {statusMessage}
        </div>
      )}

      {/* Task Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tasks.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-[#15161c] rounded-2xl border border-[#24252e] text-[#676a79]">
            No scheduled tasks configured. Click "New Scheduled Task" to set up timed commands.
          </div>
        ) : (
          tasks.map((task) => (
            <div 
              key={task.id} 
              className={`bg-[#15161d] rounded-2xl border p-5 flex flex-col justify-between transition-all hover:border-[#3d3f4d] shadow-lg ${
                task.enabled ? 'border-[#282a35]' : 'border-[#202129] opacity-60'
              }`}
            >
              <div>
                
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                  <span className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold bg-[#162738] text-[#60a5fa] border border-[#214366] flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Every {Math.round(task.intervalSeconds / 60)} min
                  </span>
                  <button
                    onClick={() => handleToggle(task.id, task.enabled)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      task.enabled 
                        ? 'bg-[#183321] text-[#4ade80] border-[#255234]' 
                        : 'bg-[#25262f] text-[#71737e] border-[#31333e]'
                    }`}
                    title={task.enabled ? 'Disable Task' : 'Enable Task'}
                  >
                    <Power className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{task.name}</h3>
                <p className="text-xs text-[#71737e] mb-3 leading-relaxed">{task.description || 'Periodic command'}</p>

                {/* Command */}
                <div className="p-3 rounded-xl bg-[#0e0f13] border border-[#23252e] font-mono text-xs text-[#4ade80] break-all mb-3">
                  <div className="text-[10px] uppercase font-bold text-[#8e909a] mb-1">Command:</div>
                  {task.command}
                </div>

                {/* Next / Last Run stats */}
                <div className="text-[11px] text-[#71737e] space-y-1 font-mono">
                  <div>Last Run: <span className="text-[#a0a4b2]">{task.lastRun ? new Date(task.lastRun).toLocaleTimeString() : 'Never'}</span></div>
                  <div>Next Run: <span className="text-[#38bdf8]">{task.nextRun ? new Date(task.nextRun).toLocaleTimeString() : 'Paused'}</span></div>
                </div>

              </div>

              {/* Actions */}
              <div className="mt-4 pt-3 border-t border-[#23242c] flex items-center justify-end gap-1.5">
                <button
                  onClick={() => handleRunNow(task.id)}
                  title="Run Now"
                  className="px-2.5 py-1.5 rounded-lg bg-[#1a2d42] hover:bg-[#234366] text-[#60a5fa] text-[11px] font-bold flex items-center gap-1 transition-colors"
                >
                  <Play className="w-3 h-3" /> Run Now
                </button>
                <button
                  onClick={() => openEditModal(task)}
                  title="Edit Task"
                  className="p-1.5 rounded-lg bg-[#1f2129] hover:bg-[#2c2f3b] text-[#8e909a] hover:text-white transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(task.id)}
                  title="Delete Task"
                  className="p-1.5 rounded-lg bg-[#1f2129] hover:bg-[#3d1c1c] text-[#8e909a] hover:text-[#f87171] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>
          ))
        )}
      </div>

      {/* Task Execution Log Feed */}
      <div className="bg-[#15161d] rounded-2xl border border-[#24252e] overflow-hidden shadow-xl">
        <div className="p-4 bg-[#1a1b22] border-b border-[#252731] flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white">Recent Task Execution Log</h3>
          <span className="text-xs text-[#71737e] font-mono">{history.length} records</span>
        </div>

        <div className="divide-y divide-[#202129] max-h-60 overflow-y-auto">
          {history.length === 0 ? (
            <div className="py-6 text-center text-[#676a79] text-xs">
              No executions logged yet.
            </div>
          ) : (
            history.map((h, i) => (
              <div key={h.id || i} className="p-3 hover:bg-[#191a21] transition-colors text-xs font-mono flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#38bdf8] font-bold">{h.taskName}</span>
                  <span className="text-[#71737e]">{h.command}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    h.status === 'success' ? 'bg-[#152a1d] text-[#4ade80]' : 'bg-[#2a2414] text-[#facc15]'
                  }`}>
                    {h.status}
                  </span>
                  <span className="text-[#5b5e6e] text-[11px]">
                    {h.timestamp ? new Date(h.timestamp).toLocaleTimeString() : ''}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16171d] rounded-2xl border border-[#2a2c38] p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2563eb] to-[#38bdf8] flex items-center justify-center text-white">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  {editingTask ? 'Edit Scheduled Task' : 'New Scheduled Task'}
                </h3>
                <p className="text-xs text-[#71737e]">Configure recurring command automation</p>
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Task Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Discord Link Broadcast"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Interval (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  required
                  value={intervalMinutes}
                  onChange={(e) => setIntervalMinutes(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#2563eb]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Console Command</label>
                <textarea
                  rows="3"
                  required
                  placeholder='say "Join our Discord: discord.gg/rust" or save'
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs p-3 rounded-xl border border-[#272935] focus:outline-none focus:border-[#2563eb] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">Description (Optional)</label>
                <input
                  type="text"
                  placeholder="Brief description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs px-3 py-2 rounded-xl border border-[#272935] focus:outline-none focus:border-[#2563eb]"
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
                  className="px-5 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-xs font-bold text-white shadow-lg transition-colors"
                >
                  {editingTask ? 'Save Changes' : 'Create Task'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
