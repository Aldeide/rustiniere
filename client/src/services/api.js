import { BrowserWebRcon } from './webrcon';
import { ClientTriggersEngine } from './clientTriggers';
import { ClientScheduler } from './clientScheduler';
import { storage } from './storage';
import itemsData from './itemDatabase.json';

class UnifiedClientManager {
  constructor() {
    this.rcon = new BrowserWebRcon();
    this.events = new Map();
    this.activeServer = null;
    this.servers = storage.getServers();
    this.serverInfo = {
      Hostname: 'Rust Dedicated Server',
      MaxPlayers: 100,
      Players: 0,
      Queued: 0,
      Joining: 0,
      EntityCount: 0,
      GameTime: '12:00',
      Uptime: 0,
      Framerate: 60,
      Memory: '0 MB',
      SaveCreatedTime: 'N/A',
      Map: 'Procedural Map',
      WorldSize: 4000,
      Seed: 123456,
      Protocol: 2400
    };
    this.players = [];
    this.bans = [];
    this.logs = [];
    this.chats = [];
    this.mapEvents = [];
    this.fpsHistory = [];
    this.playerHistory = [];
    this.isMockServer = false;
    this.mockTimer = null;

    // Initialize triggers & scheduler with context
    this.triggers = new ClientTriggersEngine(this);
    this.scheduler = new ClientScheduler(this);

    this.initEvents();
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      this.events.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in event listener ${event}:`, e); }
      });
    }
  }

  initEvents() {
    this.rcon.on('status', (data) => {
      this.emit('server:status', data);
    });

    this.rcon.on('log', async (logEntry) => {
      this.logs.push(logEntry);
      if (this.logs.length > 500) this.logs.shift();
      this.emit('server:log', logEntry);
      await this.triggers.processLog(logEntry);
    });

    this.rcon.on('chat', async (chatEntry) => {
      this.chats.push(chatEntry);
      if (this.chats.length > 300) this.chats.shift();
      this.emit('server:chat', chatEntry);
      await this.triggers.processChat(chatEntry);
    });

    this.rcon.on('info', (info) => {
      this.serverInfo = { ...this.serverInfo, ...info };
      this.recordTelemetry(this.serverInfo.Framerate || 60, this.serverInfo.Players || 0);
      this.emit('server:info', this.serverInfo);
    });

    this.rcon.on('players', (pList) => {
      this.players = pList;
      this.emit('server:players', this.players);
    });
  }

  recordTelemetry(fps, players) {
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.fpsHistory.push({ time: timeLabel, fps: Math.round(fps) });
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();

    this.playerHistory.push({ time: timeLabel, players: players });
    if (this.playerHistory.length > 30) this.playerHistory.shift();

    this.emit('server:telemetry', {
      fpsHistory: this.fpsHistory,
      playerHistory: this.playerHistory
    });
  }

  isConnected() {
    if (this.isMockServer) return true;
    return this.rcon.connected;
  }

  // Server management
  getServers() {
    this.servers = storage.getServers();
    return this.servers;
  }

  addServer(serverData) {
    const newServer = {
      ...serverData,
      id: serverData.id || `srv-${Date.now()}`,
      port: Number(serverData.port) || 28016
    };
    this.servers.push(newServer);
    storage.saveServers(this.servers);
    return newServer;
  }

  updateServer(id, updates) {
    const idx = this.servers.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.servers[idx] = { ...this.servers[idx], ...updates };
    storage.saveServers(this.servers);
    return this.servers[idx];
  }

  deleteServer(id) {
    if (this.activeServer && this.activeServer.id === id) {
      this.disconnect();
    }
    this.servers = this.servers.filter(s => s.id !== id);
    storage.saveServers(this.servers);
  }

  async connect(serverId) {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error('Server not found');

    this.disconnect();
    this.activeServer = server;
    storage.saveActiveServerId(server.id);

    if (server.isMock) {
      this.startMockServer(server);
      return;
    }

    this.isMockServer = false;
    this.rcon.connect(server);
  }

  disconnect() {
    this.stopMockServer();
    this.rcon.disconnect();
    this.activeServer = null;
    this.isMockServer = false;
    this.emit('server:status', { server: null, state: 'disconnected', message: 'Disconnected' });
  }

  async sendCommand(command) {
    if (!this.isConnected()) {
      throw new Error('WebRCON is not connected to a server');
    }

    if (this.isMockServer) {
      return this.handleMockCommand(command);
    }

    const res = await this.rcon.sendCommand(command);
    return res.Message;
  }

  async sendChat(message) {
    return this.sendCommand(`say "${message.replace(/"/g, '\\"')}"`);
  }

  // Simulated server for testing & demonstration
  startMockServer(server) {
    this.isMockServer = true;
    this.serverInfo = {
      Hostname: 'RustAdmin Pro - 2x Vanilla [Wiped Today]',
      MaxPlayers: 150,
      Players: 18,
      Queued: 2,
      Joining: 1,
      EntityCount: 164280,
      GameTime: '14:35',
      Uptime: 28490,
      Framerate: 118,
      Memory: '4.2 GB',
      SaveCreatedTime: new Date(Date.now() - 3600000).toLocaleString(),
      Map: 'Procedural Map',
      WorldSize: 4250,
      Seed: 7891234,
      Protocol: 2410
    };

    this.players = [
      { SteamID: '76561198012345678', DisplayName: 'RustVeteran_99', Ping: 24, ConnectedDuration: 4320, Health: 100, Address: '192.168.1.101:54321', VoiPBlocked: false, Pos: { x: 120, y: 35, z: 420 } },
      { SteamID: '76561198087654321', DisplayName: 'ShadowRaider', Ping: 38, ConnectedDuration: 1820, Health: 82, Address: '82.165.20.12:49152', VoiPBlocked: false, Pos: { x: -430, y: 15, z: -180 } },
      { SteamID: '76561198099887766', DisplayName: 'NakedWithEoka', Ping: 65, ConnectedDuration: 740, Health: 45, Address: '144.76.89.4:61230', VoiPBlocked: false, Pos: { x: 580, y: 22, z: -680 } },
      { SteamID: '76561198055443322', DisplayName: 'BaseBuilderPro', Ping: 19, ConnectedDuration: 8900, Health: 100, Address: '178.62.204.8:58210', VoiPBlocked: false, Pos: { x: -140, y: 16, z: -320 } },
      { SteamID: '76561198011223344', DisplayName: 'OilRigSolo', Ping: 42, ConnectedDuration: 2100, Health: 95, Address: '213.186.33.5:51299', VoiPBlocked: false, Pos: { x: 1820, y: 10, z: 1580 } },
      { SteamID: '76561198066778899', DisplayName: 'HelicopterPilot', Ping: 31, ConnectedDuration: 5400, Health: 100, Address: '91.121.88.3:55120', VoiPBlocked: false, Pos: { x: 800, y: 60, z: 520 } }
    ];

    this.mapEvents = [
      { id: 'patrol-heli', type: 'heli', name: 'Patrol Helicopter', x: -600, z: 300, vx: 15, vz: 8 },
      { id: 'cargo-ship', type: 'cargo', name: 'Cargo Ship', x: 1950, z: -500, vx: 5, vz: 12 },
      { id: 'airdrop-1', type: 'airdrop', name: 'Supply Drop (Air)', x: 350, z: -400 }
    ];

    this.bans = [
      { SteamID: '76561198000000001', Name: 'Cheater_1337', Reason: 'Aimlock / Recoil script detected', Duration: 'Permanent', Expiry: 'Never' },
      { SteamID: '76561198000000002', Name: 'TrollPlayer', Reason: 'Toxic language in chat', Duration: '3 Days', Expiry: '2026-08-31 12:00' }
    ];

    this.emit('server:status', { server, state: 'connected', message: 'Connected to Simulated Rust Server' });
    this.emit('server:info', this.serverInfo);
    this.emit('server:players', this.players);
    this.emit('server:map_events', this.mapEvents);

    this.mockTimer = setInterval(async () => {
      if (!this.isMockServer) return;

      const baseFps = 115 + Math.floor(Math.random() * 15) - 7;
      this.serverInfo.Framerate = baseFps;
      this.serverInfo.Players = this.players.length;
      this.recordTelemetry(baseFps, this.players.length);

      // Nudge player positions
      this.players.forEach(p => {
        if (!p.Pos) p.Pos = { x: 0, y: 15, z: 0 };
        p.Pos.x += (Math.random() * 8) - 4;
        p.Pos.z += (Math.random() * 8) - 4;
        const maxBound = (this.serverInfo.WorldSize || 4000) / 2 - 100;
        p.Pos.x = Math.max(-maxBound, Math.min(maxBound, p.Pos.x));
        p.Pos.z = Math.max(-maxBound, Math.min(maxBound, p.Pos.z));
      });

      // Move map events
      this.mapEvents.forEach(evt => {
        if (evt.type === 'heli') {
          evt.x += evt.vx || 10;
          evt.z += evt.vz || 5;
          if (evt.x > 1900 || evt.x < -1900) evt.vx = -(evt.vx || 10);
          if (evt.z > 1900 || evt.z < -1900) evt.vz = -(evt.vz || 5);
        } else if (evt.type === 'cargo') {
          const angle = (Date.now() / 25000) % (2 * Math.PI);
          evt.x = Math.cos(angle) * 1900;
          evt.z = Math.sin(angle) * 1900;
        }
      });

      this.emit('server:players', this.players);
      this.emit('server:map_events', this.mapEvents);

      // Random mock chat / logs
      const dice = Math.random();
      if (dice < 0.25) {
        const mockMsgs = [
          { user: 'RustVeteran_99', id: '76561198012345678', text: 'Anyone wanna counter Cargo Ship?' },
          { user: 'NakedWithEoka', id: '76561198099887766', text: '!pop' },
          { user: 'ShadowRaider', id: '76561198087654321', text: '!wipe' },
          { user: 'BaseBuilderPro', id: '76561198055443322', text: 'Selling sulfur for HQM at outpost vending machine' },
          { user: 'HelicopterPilot', id: '76561198066778899', text: '!discord' }
        ];
        const pick = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
        const chatObj = {
          id: `chat-${Date.now()}`,
          Username: pick.user,
          UserId: pick.id,
          Message: pick.text,
          Time: Math.floor(Date.now() / 1000)
        };
        this.chats.push(chatObj);
        this.emit('server:chat', chatObj);
        await this.triggers.processChat(chatObj);
      } else if (dice < 0.4) {
        const events = [
          `[CombatLog] ShadowRaider killed NakedWithEoka using Semi-Automatic Rifle from 48.2m`,
          `Patrol Helicopter spawned at (1200, 350, -800)`,
          `Cargo Ship is approaching coastal waters`,
          `Supply Drop incoming at grid D8`,
          `[connection] Player Joined: NewSurvivor[76561198099112233]`
        ];
        const evt = events[Math.floor(Math.random() * events.length)];
        const logEntry = {
          id: `log-${Date.now()}`,
          Identifier: 0,
          Message: evt,
          Type: evt.includes('CombatLog') ? 'Warning' : 'Generic',
          Time: new Date().toISOString()
        };
        this.logs.push(logEntry);
        this.emit('server:log', logEntry);
        await this.triggers.processLog(logEntry);
      }
    }, 4000);
  }

  stopMockServer() {
    if (this.mockTimer) {
      clearInterval(this.mockTimer);
      this.mockTimer = null;
    }
  }

  handleMockCommand(cmd) {
    const raw = cmd.trim();
    const parts = raw.split(' ');
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    if (command === 'status') {
      return `hostname: ${this.serverInfo.Hostname}\nversion : 2410 secure\nmap     : ${this.serverInfo.Map} (${this.serverInfo.WorldSize}m / ${this.serverInfo.Seed})\nplayers : ${this.players.length} (${this.serverInfo.MaxPlayers} max)\nFPS: ${this.serverInfo.Framerate}`;
    }
    if (command === 'serverinfo') return JSON.stringify(this.serverInfo);
    if (command === 'playerlist') return JSON.stringify(this.players);
    if (command === 'banlistex' || command === 'bans') return JSON.stringify(this.bans);

    if (command === 'say') {
      const msg = args.join(' ').replace(/^"(.*)"$/, '$1');
      const chatObj = {
        id: `chat-${Date.now()}`,
        Username: 'SERVER',
        UserId: '0',
        Message: msg,
        Time: Math.floor(Date.now() / 1000)
      };
      this.chats.push(chatObj);
      this.emit('server:chat', chatObj);
      return `Broadcast: ${msg}`;
    }

    if (command === 'kick' || command === 'kickall') {
      const targetId = args[0];
      const reason = args.slice(1).join(' ') || 'Kicked by administrator';
      const pIdx = this.players.findIndex(p => p.SteamID === targetId || p.DisplayName.toLowerCase() === targetId?.toLowerCase());
      if (pIdx !== -1) {
        const removed = this.players.splice(pIdx, 1)[0];
        this.emit('server:players', this.players);
        return `Kicked player ${removed.DisplayName} (${reason})`;
      }
      return `Player ${targetId} kicked`;
    }

    if (command === 'ban' || command === 'banid') {
      const targetId = args[0];
      const reason = args.slice(1).join(' ') || 'Banned by admin';
      this.bans.push({
        SteamID: targetId,
        Name: 'Player_' + targetId.substr(-4),
        Reason: reason,
        Duration: 'Permanent',
        Expiry: 'Never'
      });
      return `Banned SteamID ${targetId}`;
    }

    if (command === 'unban') {
      const targetId = args[0];
      this.bans = this.bans.filter(b => b.SteamID !== targetId);
      return `Unbanned SteamID ${targetId}`;
    }

    if (command === 'mute') {
      const targetId = args[0];
      const p = this.players.find(p => p.SteamID === targetId);
      if (p) p.VoiPBlocked = true;
      return `Muted player ${targetId}`;
    }

    if (command === 'unmute') {
      const targetId = args[0];
      const p = this.players.find(p => p.SteamID === targetId);
      if (p) p.VoiPBlocked = false;
      return `Unmuted player ${targetId}`;
    }

    if (command === 'save') {
      this.serverInfo.SaveCreatedTime = new Date().toLocaleString();
      return 'Saving complete. World and player save data persisted.';
    }

    return `Command executed: ${raw} (OK)`;
  }
}

const clientManager = new UnifiedClientManager();

// Export unified API object matching previous REST/Socket surface
export const api = {
  socket: clientManager, // EventEmitter proxy
  on: (ev, cb) => clientManager.on(ev, cb),
  off: (ev, cb) => clientManager.off(ev, cb),
  emit: (ev, data) => clientManager.emit(ev, data),

  // Servers
  getServers: async () => clientManager.getServers(),
  addServer: async (data) => clientManager.addServer(data),
  updateServer: async (id, data) => clientManager.updateServer(id, data),
  deleteServer: async (id) => clientManager.deleteServer(id),
  connectServer: async (id) => clientManager.connect(id),
  disconnectServer: async () => clientManager.disconnect(),

  // Status & Telemetry
  getStatus: async () => ({
    connected: clientManager.isConnected(),
    activeServer: clientManager.activeServer,
    serverInfo: clientManager.serverInfo,
    players: clientManager.players,
    bans: clientManager.bans,
    mapEvents: clientManager.mapEvents,
    fpsHistory: clientManager.fpsHistory,
    playerHistory: clientManager.playerHistory
  }),

  // Commands & Chat
  sendCommand: async (command) => {
    try {
      const result = await clientManager.sendCommand(command);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },
  sendChat: async (message) => {
    try {
      const result = await clientManager.sendChat(message);
      return { success: true, result };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Items
  getItems: async () => itemsData,

  // Triggers
  getTriggers: async () => clientManager.triggers.getTriggers(),
  addTrigger: async (data) => clientManager.triggers.addTrigger(data),
  updateTrigger: async (id, data) => clientManager.triggers.updateTrigger(id, data),
  deleteTrigger: async (id) => clientManager.triggers.deleteTrigger(id),
  toggleTrigger: async (id, enabled) => clientManager.triggers.toggleTrigger(id, enabled),
  getTriggerHistory: async () => clientManager.triggers.getHistory(),

  // Scheduler
  getTasks: async () => clientManager.scheduler.getTasks(),
  addTask: async (data) => clientManager.scheduler.addTask(data),
  updateTask: async (id, data) => clientManager.scheduler.updateTask(id, data),
  deleteTask: async (id) => clientManager.scheduler.deleteTask(id),
  toggleTask: async (id, enabled) => clientManager.scheduler.toggleTask(id, enabled),
  runTask: async (id) => {
    const task = clientManager.scheduler.getTasks().find(t => t.id === id);
    if (task) await clientManager.scheduler.runTask(task);
    return { success: true };
  },
  getSchedulerHistory: async () => clientManager.scheduler.getHistory()
};
