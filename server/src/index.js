import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServerManager } from './serverManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const serverManager = new ServerManager();
serverManager.setSocketIO(io);

// Load item catalog
const itemsPath = path.join(__dirname, 'itemDatabase.json');
let itemCatalog = [];
try {
  itemCatalog = JSON.parse(fs.readFileSync(itemsPath, 'utf-8'));
} catch (e) {
  console.error('Error reading itemDatabase.json:', e);
}

// REST Routes

// Server profiles
app.get('/api/servers', (req, res) => {
  res.json(serverManager.getServers());
});

app.post('/api/servers', (req, res) => {
  const created = serverManager.addServer(req.body);
  res.status(201).json(created);
});

app.put('/api/servers/:id', (req, res) => {
  const updated = serverManager.updateServer(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Server profile not found' });
  res.json(updated);
});

app.delete('/api/servers/:id', (req, res) => {
  serverManager.deleteServer(req.params.id);
  res.json({ success: true });
});

app.post('/api/servers/:id/connect', async (req, res) => {
  try {
    await serverManager.connect(req.params.id);
    res.json({ success: true, server: serverManager.activeServer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/servers/disconnect', (req, res) => {
  serverManager.disconnect();
  res.json({ success: true });
});

app.get('/api/status', (req, res) => {
  res.json({
    connected: serverManager.isConnected(),
    activeServer: serverManager.activeServer,
    serverInfo: serverManager.serverInfo,
    players: serverManager.players,
    bans: serverManager.bans,
    fpsHistory: serverManager.fpsHistory,
    playerHistory: serverManager.playerHistory
  });
});

app.post('/api/rcon/command', async (req, res) => {
  const { command } = req.body;
  if (!command) return res.status(400).json({ error: 'Command is required' });

  try {
    const result = await serverManager.sendCommand(command);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items', (req, res) => {
  res.json(itemCatalog);
});

// Triggered Commands
app.get('/api/triggers', (req, res) => {
  res.json(serverManager.triggersEngine.getTriggers());
});

app.post('/api/triggers', (req, res) => {
  const created = serverManager.triggersEngine.addTrigger(req.body);
  serverManager.saveConfig();
  res.status(201).json(created);
});

app.put('/api/triggers/:id', (req, res) => {
  const updated = serverManager.triggersEngine.updateTrigger(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Trigger not found' });
  serverManager.saveConfig();
  res.json(updated);
});

app.delete('/api/triggers/:id', (req, res) => {
  const deleted = serverManager.triggersEngine.deleteTrigger(req.params.id);
  serverManager.saveConfig();
  res.json({ success: deleted });
});

app.post('/api/triggers/:id/toggle', (req, res) => {
  const trig = serverManager.triggersEngine.toggleTrigger(req.params.id, req.body.enabled);
  if (!trig) return res.status(404).json({ error: 'Trigger not found' });
  serverManager.saveConfig();
  res.json(trig);
});

app.get('/api/triggers/history', (req, res) => {
  res.json(serverManager.triggersEngine.getHistory());
});

// Scheduler Tasks
app.get('/api/scheduler/tasks', (req, res) => {
  res.json(serverManager.scheduler.getTasks());
});

app.post('/api/scheduler/tasks', (req, res) => {
  const created = serverManager.scheduler.addTask(req.body);
  serverManager.saveConfig();
  res.status(201).json(created);
});

app.put('/api/scheduler/tasks/:id', (req, res) => {
  const updated = serverManager.scheduler.updateTask(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Task not found' });
  serverManager.saveConfig();
  res.json(updated);
});

app.delete('/api/scheduler/tasks/:id', (req, res) => {
  const deleted = serverManager.scheduler.deleteTask(req.params.id);
  serverManager.saveConfig();
  res.json({ success: deleted });
});

app.post('/api/scheduler/tasks/:id/toggle', (req, res) => {
  const task = serverManager.scheduler.toggleTask(req.params.id, req.body.enabled);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  serverManager.saveConfig();
  res.json(task);
});

app.post('/api/scheduler/tasks/:id/run', async (req, res) => {
  const task = serverManager.scheduler.getTasks().find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  await serverManager.scheduler.runTask(task);
  res.json({ success: true, message: `Task '${task.name}' triggered` });
});

app.get('/api/scheduler/history', (req, res) => {
  res.json(serverManager.scheduler.getHistory());
});

// Socket.IO realtime connection
io.on('connection', (socket) => {
  // Send current snapshot
  socket.emit('server:status', {
    server: serverManager.activeServer,
    state: serverManager.isConnected() ? 'connected' : 'disconnected',
    message: serverManager.isConnected() ? 'Connected' : 'Not connected'
  });

  socket.emit('server:info', serverManager.serverInfo);
  socket.emit('server:players', serverManager.players);
  socket.emit('server:logs_batch', serverManager.logs);
  socket.emit('server:chats_batch', serverManager.chats);
  socket.emit('server:telemetry', {
    fpsHistory: serverManager.fpsHistory,
    playerHistory: serverManager.playerHistory
  });

  socket.on('command:send', async (cmd, callback) => {
    try {
      const res = await serverManager.sendCommand(cmd);
      if (typeof callback === 'function') callback({ success: true, result: res });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });

  socket.on('chat:send', async (msg, callback) => {
    try {
      const res = await serverManager.sendCommand(`say "${msg.replace(/"/g, '\\"')}"`);
      if (typeof callback === 'function') callback({ success: true, result: res });
    } catch (err) {
      if (typeof callback === 'function') callback({ success: false, error: err.message });
    }
  });
});

// Auto-connect to demo or default auto-connect server on boot
setTimeout(() => {
  const autoServer = serverManager.servers.find(s => s.autoConnect) || serverManager.servers[0];
  if (autoServer) {
    serverManager.connect(autoServer.id).catch(() => {});
  }
}, 1000);

server.listen(PORT, () => {
  console.log(`[RustAdmin Web] Backend Server running on http://localhost:${PORT}`);
});
