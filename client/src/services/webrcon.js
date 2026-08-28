// Client-side Facepunch WebRCON Driver for pure browser execution
export class BrowserWebRcon {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.activeServer = null;
    this.messageId = 1000;
    this.pendingCallbacks = new Map();
    this.listeners = new Map();
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.autoReconnect = true;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(cb => {
        try { cb(data); } catch (e) { console.error(`Error in event listener for ${event}:`, e); }
      });
    }
  }

  connect(serverConfig) {
    this.disconnect();
    this.activeServer = serverConfig;
    this.autoReconnect = serverConfig.autoConnect !== false;

    if (serverConfig.isMock) {
      this.emit('status', { state: 'connected', message: 'Connected to Simulated Rust Server', server: serverConfig });
      return;
    }

    this.connecting = true;
    this.emit('status', { state: 'connecting', message: 'Connecting to WebRCON...', server: serverConfig });

    // Determine protocol: if user specified wss:// or custom port
    const proto = serverConfig.useSsl ? 'wss' : 'ws';
    const wsUrl = `${proto}://${serverConfig.ip}:${serverConfig.port}/${encodeURIComponent(serverConfig.password || '')}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        this.connected = true;
        this.connecting = false;
        this.emit('status', { state: 'connected', message: 'Connected to Rust server', server: this.activeServer });
        this.startHeartbeat();
        // Request initial server info and player list
        this.sendCommand('serverinfo').catch(() => {});
        this.sendCommand('playerlist').catch(() => {});
      };

      this.ws.onmessage = (event) => {
        try {
          const packet = JSON.parse(event.data);
          this.handlePacket(packet);
        } catch (e) {
          // Raw string message
          this.handlePacket({
            Identifier: 0,
            Message: event.data,
            Type: 'Generic',
            Stacktrace: ''
          });
        }
      };

      this.ws.onerror = (err) => {
        this.emit('error', err);
      };

      this.ws.onclose = (event) => {
        this.connected = false;
        this.connecting = false;
        this.stopHeartbeat();
        this.emit('status', { 
          state: 'disconnected', 
          message: `Disconnected (${event.code || 'Closed'})`,
          server: this.activeServer 
        });

        if (this.autoReconnect && this.activeServer && !this.activeServer.isMock) {
          this.scheduleReconnect();
        }
      };
    } catch (err) {
      this.connecting = false;
      this.connected = false;
      this.emit('status', { state: 'error', message: err.message, server: this.activeServer });
      if (this.autoReconnect) this.scheduleReconnect();
    }
  }

  disconnect() {
    this.autoReconnect = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopHeartbeat();

    if (this.ws) {
      try {
        this.ws.close();
      } catch (e) {}
      this.ws = null;
    }

    this.connected = false;
    this.connecting = false;
    this.activeServer = null;
    this.emit('status', { state: 'disconnected', message: 'Disconnected', server: null });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.connected && this.autoReconnect && this.activeServer) {
        this.connect(this.activeServer);
      }
    }, 5000);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected && this.ws) {
        this.sendInternalCommand('serverinfo', 4000).catch(() => {});
        this.sendInternalCommand('playerlist', 4000).catch(() => {});
      }
    }, 5000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  handlePacket(packet) {
    const id = packet.Identifier;
    const msg = (packet.Message || '').trim();
    const type = packet.Type || 'Generic';

    let isInternal = false;

    // Check if this fulfills a pending promise callback
    if (id && id > 0 && this.pendingCallbacks.has(id)) {
      const pending = this.pendingCallbacks.get(id);
      if (pending.timer) clearTimeout(pending.timer);
      isInternal = pending.isInternal === true;
      this.pendingCallbacks.delete(id);
      pending.resolve({
        id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        Identifier: id,
        Message: msg,
        Type: type,
        Stacktrace: packet.Stacktrace || '',
        Time: new Date().toISOString()
      });
    }

    // Try parsing serverinfo or playerlist if returned in payload
    if (msg.startsWith('{') && msg.includes('"Hostname"')) {
      try {
        const info = JSON.parse(msg);
        this.emit('info', info);
      } catch (e) {}
    } else if (msg.startsWith('[') && (msg.includes('"SteamID"') || msg === '[]')) {
      try {
        const pList = JSON.parse(msg);
        this.emit('players', pList);
      } catch (e) {}
    }

    // If this packet was from an automatic internal background heartbeat, do not pollute user console
    if (isInternal) {
      return;
    }

    const logEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      Identifier: id,
      Message: msg,
      Type: type,
      Stacktrace: packet.Stacktrace || '',
      Time: new Date().toISOString()
    };

    // Emit live console log for real server events & manual commands
    this.emit('log', logEntry);

    // If chat message
    if (type === 'Chat' || msg.startsWith('[Chat]')) {
      try {
        const chatObj = JSON.parse(msg);
        this.emit('chat', {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          Username: chatObj.Username || 'Player',
          UserId: chatObj.UserId || '0',
          Message: chatObj.Message || '',
          Time: chatObj.Time || Math.floor(Date.now() / 1000)
        });
      } catch (e) {
        this.emit('chat', {
          id: `chat-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          Username: 'Server',
          UserId: '0',
          Message: msg,
          Time: Math.floor(Date.now() / 1000)
        });
      }
    }

    // Try parsing serverinfo or playerlist if returned in payload
    if (msg.startsWith('{') && msg.includes('"Hostname"')) {
      try {
        const info = JSON.parse(msg);
        this.emit('info', info);
      } catch (e) {}
    } else if (msg.startsWith('[') && msg.includes('"SteamID"')) {
      try {
        const pList = JSON.parse(msg);
        this.emit('players', pList);
      } catch (e) {}
    }
  }

  sendInternalCommand(command, timeoutMs = 6000) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        return reject(new Error('WebRCON is not connected'));
      }

      const id = ++this.messageId;
      const payload = JSON.stringify({
        Identifier: id,
        Message: command,
        Stacktrace: ''
      });

      const timer = setTimeout(() => {
        if (this.pendingCallbacks.has(id)) {
          this.pendingCallbacks.delete(id);
          reject(new Error(`Internal command timed out: ${command}`));
        }
      }, timeoutMs);

      this.pendingCallbacks.set(id, { resolve, reject, timer, command, isInternal: true });

      try {
        this.ws.send(payload);
      } catch (err) {
        clearTimeout(timer);
        this.pendingCallbacks.delete(id);
        reject(err);
      }
    });
  }

  sendCommand(command, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        return reject(new Error('WebRCON is not connected to a server'));
      }

      const id = ++this.messageId;
      const payload = JSON.stringify({
        Identifier: id,
        Message: command,
        Stacktrace: ''
      });

      const timer = setTimeout(() => {
        if (this.pendingCallbacks.has(id)) {
          this.pendingCallbacks.delete(id);
          reject(new Error(`Command timed out: ${command}`));
        }
      }, timeoutMs);

      this.pendingCallbacks.set(id, { resolve, reject, timer, command, isInternal: false });

      try {
        this.ws.send(payload);
      } catch (err) {
        clearTimeout(timer);
        this.pendingCallbacks.delete(id);
        reject(err);
      }
    });
  }
}
