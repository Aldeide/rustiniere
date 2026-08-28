import { storage } from './storage';

export class ClientScheduler {
  constructor(appContext) {
    this.ctx = appContext;
    this.tasks = storage.getTasks();
    this.timerHandles = new Map();
    this.executionHistory = [];
    this.startAllTasks();
  }

  getTasks() {
    this.tasks = storage.getTasks();
    return this.tasks;
  }

  getHistory() {
    return this.executionHistory.slice(-100);
  }

  addTask(task) {
    const newTask = {
      ...task,
      id: task.id || `sched-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      enabled: task.enabled !== false,
      intervalSeconds: Math.max(10, Number(task.intervalSeconds) || 60),
      createdAt: new Date().toISOString(),
      lastRun: null,
      nextRun: null
    };
    this.tasks.push(newTask);
    storage.saveTasks(this.tasks);
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
    storage.saveTasks(this.tasks);
    if (this.tasks[index].enabled) {
      this.startTask(this.tasks[index]);
    }
    return this.tasks[index];
  }

  deleteTask(id) {
    this.stopTask(id);
    this.tasks = this.tasks.filter(t => t.id !== id);
    storage.saveTasks(this.tasks);
    return true;
  }

  toggleTask(id, enabled) {
    const task = this.tasks.find(t => t.id === id);
    if (task) {
      task.enabled = enabled !== undefined ? enabled : !task.enabled;
      storage.saveTasks(this.tasks);
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
      if (this.ctx.isConnected()) {
        result = await this.ctx.sendCommand(task.command);
      } else {
        result = 'Skipped (Server not connected)';
        status = 'skipped';
      }
    } catch (err) {
      result = err.message;
      status = 'error';
    }

    const logEntry = {
      id: `sched-log-${Date.now()}`,
      taskId: task.id,
      taskName: task.name,
      command: task.command,
      status,
      result: typeof result === 'string' ? result : JSON.stringify(result),
      timestamp: new Date().toISOString()
    };

    this.executionHistory.push(logEntry);
    if (this.executionHistory.length > 200) this.executionHistory.shift();

    if (this.ctx.emit) {
      this.ctx.emit('scheduler:executed', logEntry);
    }
  }
}
