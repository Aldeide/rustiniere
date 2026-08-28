import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { RustRconClient } from './rconClient.js';
import { TriggersEngine } from './triggersEngine.js';
import { Scheduler } from './scheduler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, 'data');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');

export class ServerManager {
  constructor() {
    this.io = null;
    this.rconClient = null;
    this.activeServer = null;
    this.servers = [];
    this.logs = [];
    this.chats = [];
    this.players = [];
    this.bans = [];
    this.serverInfo = {
      Hostname: 'Rust Server',
      MaxPlayers: 100,
      Players: 0,
      Queued: 0,
      Joining: 0,
      EntityCount: 0,
      GameTime: '12:00',
      Uptime: 0,
      Framerate: 0,
      Memory: '0 MB',
      SaveCreatedTime: 'N/A',
      Map: 'Procedural Map',
      WorldSize: 4000,
      Seed: 123456,
      Protocol: 2400
    };
    this.fpsHistory = [];
    this.playerHistory = [];
    this.pollTimer = null;
    this.mockTimer = null;
    this.isMockServer = false;

    this.triggersEngine = new TriggersEngine(this);
    this.scheduler = new Scheduler(this);

    this.ensureDataDir();
    this.loadConfig();
  }

  setSocketIO(io) {
    this.io = io;
  }

  ensureDataDir() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        const data = JSON.parse(raw);
        this.servers = data.servers || [];
        if (data.triggers && data.triggers.length > 0) {
          this.triggersEngine.triggers = data.triggers;
        } else {
          this.triggersEngine.initDefaultTriggers();
        }
        if (data.tasks && data.tasks.length > 0) {
          this.scheduler.tasks = data.tasks;
          this.scheduler.startAllTasks();
        } else {
          this.scheduler.initDefaultTasks();
        }
      } else {
        this.initDefaultConfig();
      }
    } catch (err) {
      console.error('Failed to load config, initializing default:', err);
      this.initDefaultConfig();
    }
  }

  initDefaultConfig() {
    this.servers = [
      {
        id: 'demo-server',
        name: 'Rust Demo / Simulated Server',
        ip: '127.0.0.1',
        port: 28016,
        password: 'demo_password',
        isMock: true,
        autoConnect: true
      }
    ];
    this.triggersEngine.initDefaultTriggers();
    this.scheduler.initDefaultTasks();
    this.saveConfig();
  }

  saveConfig() {
    try {
      this.ensureDataDir();
      const payload = {
        servers: this.servers,
        triggers: this.triggersEngine.getTriggers(),
        tasks: this.scheduler.getTasks()
      };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  }

  getServers() {
    return this.servers;
  }

  addServer(server) {
    const newServer = {
      ...server,
      id: server.id || `srv-${Date.now()}`,
      port: Number(server.port) || 28016
    };
    this.servers.push(newServer);
    this.saveConfig();
    return newServer;
  }

  updateServer(id, updates) {
    const idx = this.servers.findIndex(s => s.id === id);
    if (idx === -1) return null;
    this.servers[idx] = { ...this.servers[idx], ...updates };
    this.saveConfig();
    return this.servers[idx];
  }

  deleteServer(id) {
    if (this.activeServer && this.activeServer.id === id) {
      this.disconnect();
    }
    this.servers = this.servers.filter(s => s.id !== id);
    this.saveConfig();
  }

  isConnected() {
    if (this.isMockServer) return true;
    return this.rconClient && this.rconClient.connected;
  }

  async connect(serverId) {
    const server = this.servers.find(s => s.id === serverId);
    if (!server) throw new Error('Server not found');

    this.disconnect();
    this.activeServer = server;

    if (server.isMock) {
      this.startMockServer(server);
      return;
    }

    this.isMockServer = false;
    this.rconClient = new RustRconClient(server);

    this.rconClient.on('status', (status) => {
      if (this.io) {
        this.io.emit('server:status', { server: this.activeServer, ...status });
      }
    });

    this.rconClient.on('log', async (log) => {
      this.addLog(log);
      await this.triggersEngine.processLog(log);
    });

    this.rconClient.on('chat', async (chat) => {
      this.addChat(chat);
      await this.triggersEngine.processChat(chat);
    });

    this.rconClient.connect();
    this.startPolling();
  }

  disconnect() {
    this.stopPolling();
    this.stopMockServer();

    if (this.rconClient) {
      this.rconClient.disconnect();
      this.rconClient.removeAllListeners();
      this.rconClient = null;
    }
    this.activeServer = null;
    this.isMockServer = false;

    if (this.io) {
      this.io.emit('server:status', { server: null, state: 'disconnected', message: 'Not connected' });
    }
  }

  startPolling() {
    this.stopPolling();
    this.pollTimer = setInterval(async () => {
      if (this.isConnected() && !this.isMockServer) {
        try {
          await this.fetchServerInfo();
          await this.fetchPlayers();
        } catch (e) {}
      }
    }, 5000);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  async sendCommand(cmd) {
    if (!this.isConnected()) {
      throw new Error('Server is not connected');
    }

    if (this.isMockServer) {
      return this.handleMockCommand(cmd);
    }

    const res = await this.rconClient.sendCommand(cmd);
    return res.Message;
  }

  addLog(logEntry) {
    const entry = {
      ...logEntry,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    this.logs.push(entry);
    if (this.logs.length > 500) this.logs.shift();

    if (this.io) {
      this.io.emit('server:log', entry);
    }
  }

  addChat(chatEntry) {
    const entry = {
      ...chatEntry,
      id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      Time: chatEntry.Time || Math.floor(Date.now() / 1000)
    };
    this.chats.push(entry);
    if (this.chats.length > 300) this.chats.shift();

    if (this.io) {
      this.io.emit('server:chat', entry);
    }
  }

  async fetchServerInfo() {
    try {
      const res = await this.rconClient.sendCommand('serverinfo');
      if (res && res.Message) {
        const info = JSON.parse(res.Message);
        this.serverInfo = { ...this.serverInfo, ...info };
        this.recordTelemetry(this.serverInfo.Framerate || 60, this.serverInfo.Players || 0);
        if (this.io) {
          this.io.emit('server:info', this.serverInfo);
        }
      }
    } catch (e) {}
  }

  async fetchPlayers() {
    try {
      const res = await this.rconClient.sendCommand('playerlist');
      if (res && res.Message) {
        this.players = JSON.parse(res.Message);
        if (this.io) {
          this.io.emit('server:players', this.players);
        }
      }
    } catch (e) {}
  }

  recordTelemetry(fps, players) {
    const timeLabel = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    this.fpsHistory.push({ time: timeLabel, fps: Math.round(fps) });
    if (this.fpsHistory.length > 30) this.fpsHistory.shift();

    this.playerHistory.push({ time: timeLabel, players: players });
    if (this.playerHistory.length > 30) this.playerHistory.shift();

    if (this.io) {
      this.io.emit('server:telemetry', {
        fpsHistory: this.fpsHistory,
        playerHistory: this.playerHistory
      });
    }
  }

  // Simulated / Mock Server Implementation for Demo & Testing
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

    if (this.io) {
      this.io.emit('server:status', { server, state: 'connected', message: 'Connected to Simulated Rust Server' });
      this.io.emit('server:info', this.serverInfo);
      this.io.emit('server:players', this.players);
      this.io.emit('server:map_events', this.mapEvents);
    }

    this.addLog({
      Identifier: 0,
      Message: `[Server] Loading map: Procedural Map (Size: 4250, Seed: 7891234)`,
      Type: 'Generic',
      Time: new Date().toISOString()
    });

    this.addLog({
      Identifier: 0,
      Message: `[Server] SteamServer Initialized. Server running on port 28015, WebRCON on 28016`,
      Type: 'Generic',
      Time: new Date().toISOString()
    });

    // Mock live events generator
    this.mockTimer = setInterval(async () => {
      if (!this.isMockServer) return;

      // Fluctuating FPS
      const baseFps = 115 + Math.floor(Math.random() * 15) - 7;
      this.serverInfo.Framerate = baseFps;
      this.serverInfo.Players = this.players.length;
      this.recordTelemetry(baseFps, this.players.length);

      // Simulated player roaming / movement
      this.players.forEach(p => {
        if (!p.Pos) p.Pos = { x: 0, y: 15, z: 0 };
        p.Pos.x += (Math.random() * 8) - 4;
        p.Pos.z += (Math.random() * 8) - 4;
        // Clamp inside map bounds
        const maxBound = (this.serverInfo.WorldSize || 4000) / 2 - 100;
        p.Pos.x = Math.max(-maxBound, Math.min(maxBound, p.Pos.x));
        p.Pos.z = Math.max(-maxBound, Math.min(maxBound, p.Pos.z));
      });

      // Animate Map Events
      if (this.mapEvents) {
        this.mapEvents.forEach(evt => {
          if (evt.type === 'heli') {
            evt.x += evt.vx || 10;
            evt.z += evt.vz || 5;
            if (evt.x > 1900 || evt.x < -1900) evt.vx = -(evt.vx || 10);
            if (evt.z > 1900 || evt.z < -1900) evt.vz = -(evt.vz || 5);
          } else if (evt.type === 'cargo') {
            // Circle coast
            const angle = (Date.now() / 25000) % (2 * Math.PI);
            evt.x = Math.cos(angle) * 1900;
            evt.z = Math.sin(angle) * 1900;
          }
        });
      }

      if (this.io) {
        this.io.emit('server:players', this.players);
        this.io.emit('server:map_events', this.mapEvents);
      }

      // Random mock chat or log
      const dice = Math.random();
      if (dice < 0.25) {
        const mockMsgs = [
          { user: 'RustVeteran_99', id: '76561198012345678', text: 'Anyone wanna counter Cargo Ship?' },
          { user: 'NakedWithEoka', id: '76561198099887766', text: '!discord' },
          { user: 'ShadowRaider', id: '76561198087654321', text: '!wipe' },
          { user: 'BaseBuilderPro', id: '76561198055443322', text: 'Selling sulfur for HQM at outpost vending machine' },
          { user: 'HelicopterPilot', id: '76561198066778899', text: '!rules' }
        ];
        const pick = mockMsgs[Math.floor(Math.random() * mockMsgs.length)];
        const chatObj = {
          Username: pick.user,
          UserId: pick.id,
          Message: pick.text,
          Time: Math.floor(Date.now() / 1000)
        };
        this.addChat(chatObj);
        await this.triggersEngine.processChat(chatObj);
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
          Identifier: 0,
          Message: evt,
          Type: evt.includes('CombatLog') ? 'Warning' : 'Generic',
          Time: new Date().toISOString()
        };
        this.addLog(logEntry);
        await this.triggersEngine.processLog(logEntry);
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
      return `hostname: ${this.serverInfo.Hostname}\nversion : 2410 secure (secure mode enabled, anti-cheat activated)\nmap     : ${this.serverInfo.Map} (${this.serverInfo.WorldSize}km / ${this.serverInfo.Seed})\nplayers : ${this.players.length} (${this.serverInfo.MaxPlayers} max) (${this.serverInfo.Queued} queued)\n\nFPS: ${this.serverInfo.Framerate} Entities: ${this.serverInfo.EntityCount}`;
    }

    if (command === 'serverinfo') {
      return JSON.stringify(this.serverInfo);
    }

    if (command === 'playerlist') {
      return JSON.stringify(this.players);
    }

    if (command === 'banlistex' || command === 'bans') {
      return JSON.stringify(this.bans);
    }

    if (command === 'say') {
      const msg = args.join(' ').replace(/^"(.*)"$/, '$1');
      const chatObj = {
        Username: 'SERVER',
        UserId: '0',
        Message: msg,
        Time: Math.floor(Date.now() / 1000)
      };
      this.addChat(chatObj);
      return `Server broadcast sent: ${msg}`;
    }

    if (command === 'kick' || command === 'kickall') {
      const targetId = args[0];
      const reason = args.slice(1).join(' ') || 'Kicked by administrator';
      const pIdx = this.players.findIndex(p => p.SteamID === targetId || p.DisplayName.toLowerCase() === targetId?.toLowerCase());
      if (pIdx !== -1) {
        const removed = this.players.splice(pIdx, 1)[0];
        this.addLog({
          Identifier: 0,
          Message: `[KICK] ${removed.DisplayName} (${removed.SteamID}) was kicked: ${reason}`,
          Type: 'Warning',
          Time: new Date().toISOString()
        });
        if (this.io) this.io.emit('server:players', this.players);
        return `Kicked player ${removed.DisplayName} (${reason})`;
      }
      return `Player ${targetId} kicked`;
    }

    if (command === 'ban' || command === 'banid') {
      const targetId = args[0];
      const reason = args.slice(1).join(' ') || 'Banned by administrator';
      this.bans.push({
        SteamID: targetId,
        Name: 'Player_' + targetId.substr(-4),
        Reason: reason,
        Duration: 'Permanent',
        Expiry: 'Never'
      });
      return `Banned SteamID ${targetId}: ${reason}`;
    }

    if (command === 'unban') {
      const targetId = args[0];
      this.bans = this.bans.filter(b => b.SteamID !== targetId);
      return `Unbanned SteamID ${targetId}`;
    }

    if (command === 'mute') {
      const targetId = args[0];
      const player = this.players.find(p => p.SteamID === targetId);
      if (player) player.VoiPBlocked = true;
      return `Muted player ${targetId}`;
    }

    if (command === 'unmute') {
      const targetId = args[0];
      const player = this.players.find(p => p.SteamID === targetId);
      if (player) player.VoiPBlocked = false;
      return `Unmuted player ${targetId}`;
    }

    if (command === 'inventory.give' || command === 'give' || command === 'giveid' || command === 'giveto') {
      const item = args[1] || args[0];
      const amount = args[2] || 1;
      return `Gave ${amount}x ${item} to ${args[0] || 'all players'}`;
    }

    if (command === 'teleport' || command === 'teleportpos') {
      return `Teleported successfully: ${args.join(' ')}`;
    }

    if (command === 'save') {
      this.serverInfo.SaveCreatedTime = new Date().toLocaleString();
      return 'Saving complete. World and player save data persisted.';
    }

    // Default simulated response
    return `Command executed: ${raw} (OK)`;
  }
}
