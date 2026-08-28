import { v4 as uuidv4 } from 'uuid';

export class Scheduler {
  constructor(serverManager) {
    this.serverManager = serverManager;
    this.tasks = [];
    this.timerHandles = new Map();
    this.executionHistory = [];
  }

  initDefaultTasks() {
    this.tasks = [
      {
        id: 'sched-save',
        name: 'Auto-Save World',
        command: 'save',
        intervalSeconds: 600, // Every 10 minutes
        enabled: true,
        description: 'Periodically saves world data and player inventory'
      },
      {
        id: 'sched-announcement',
        name: 'Discord & Store Broadcast',
        command: 'say "[ANNOUNCEMENT] Visit our Discord at https://discord.gg/rust-server for events and giveaways!"',
        intervalSeconds: 900, // Every 15 minutes
        enabled: true,
        description: 'Sends periodic community announcements in game chat'
      },
      {
        id: 'sched-clean',
        name: 'Periodic Entity Sweep (Decay Check)',
        command: 'decay.scale 1',
        intervalSeconds: 3600, // Every 1 hour
        enabled: false,
        description: 'Maintains decay scale settings'
      }
    ];
    this.startAllTasks();
  }

  getTasks() {
    return this.tasks;
  }

  getHistory() {
    return this.executionHistory.slice(-100);
  }

  addTask(task) {
    const newTask = {
      ...task,
      id: task.id || `sched-${uuidv4().substring(0, 8)}`,
      enabled: task.enabled !== false,
      intervalSeconds: Math.max(10, Number(task.intervalSeconds) || 60),
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null
    };
    this.tasks.push(newTask);
    if (newTask.enabled) {
      this.startTask(newTask);
    }
    return newTask;
  }

  updateTask(id, updates) {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return null;
    
    this.stopTask(id);
    this.tasks[index] = { ...this.tasks[index], ...updates };
    
    if (this.tasks[index].enabled) {
      this.startTask(this.tasks[index]);
    }
    return this.tasks[index];
  }

  deleteTask(id) {
    this.stopTask(id);
    const prevLen = this.tasks.length;
    this.tasks = this.tasks.filter(t => t.id !== id);
    return this.tasks.length < prevLen;
  }

  toggleTask(id, enabled) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.enabled = enabled !== undefined ? enabled : !task.enabled;
      if (task.enabled) {
        this.startTask(task);
      } else {
        this.stopTask(id);
      }
      return task;
    }
    return null;
  }

  startAllTasks() {
    this.tasks.forEach(task => {
      if (task.enabled) {
        this.startTask(task);
      }
    });
  }

  startTask(task) {
    this.stopTask(task.id);
    const intervalMs = Math.max(10, task.intervalSeconds) * 1000;
    task.nextRun = new Date(Date.now() + intervalMs).toISOString();

    const handle = setInterval(async () => {
      await this.runTask(task);
      task.lastRun = new Date().toISOString();
      task.nextRun = new Date(Date.now() + intervalMs).toISOString();
    }, intervalMs);

    this.timerHandles.set(task.id, handle);
  }

  stopTask(id) {
    if (this.timerHandles.has(id)) {
      clearInterval(this.timerHandles.get(id));
      this.timerHandles.delete(id);
    }
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.nextRun = null;
    }
  }

  async runTask(task) {
    let result = '';
    let status = 'success';
    try {
      if (this.serverManager.isConnected()) {
        result = await this.serverManager.sendCommand(task.command);
      } else {
        result = 'Skipped (Server not connected)';
        status = 'skipped';
      }
    } catch (err) {
      result = err.message;
      status = 'error';
    }

    const logEntry = {
      id: uuidv4(),
      taskId: task.id,
      taskName: task.name,
      command: task.command,
      status,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      timestamp: new Date().toISOString()
    };

    this.executionHistory.push(logEntry);
    if (this.executionHistory.length > 200) {
      this.executionHistory.shift();
    }

    if (this.serverManager.io) {
      this.serverManager.io.emit('scheduler:executed', logEntry);
    }
  }
}
