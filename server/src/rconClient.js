import WebSocket from 'ws';
import { EventEmitter } from 'events';

export class RustRconClient extends EventEmitter {
  constructor(config) {
    super();
    this.config = config; // { ip, port, password, name, id }
    this.ws = null;
    this.connected = false;
    this.connecting = false;
    this.messageId = 1000;
    this.pendingCallbacks = new Map();
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.autoReconnect = true;
  }

  connect() {
    if (this.connecting || this.connected) return;

    this.connecting = true;
    this.emit('status', { state: 'connecting', message: 'Connecting to Rust WebRCON...' });

    const wsUrl = `ws://${this.config.ip}:${this.config.port}/${encodeURIComponent(this.config.password)}`;

    try {
      this.ws = new WebSocket(wsUrl, {
        handshakeTimeout: 8000,
        perMessageDeflate: false
      });

      this.ws.on('open', () => {
        this.connected = true;
        this.connecting = false;
        this.emit('status', { state: 'connected', message: 'Connected to Rust server' });
        this.startHeartbeat();
        // Initial fetch
        this.sendCommand('serverinfo').catch(() => {});
      });

      this.ws.on('message', (data) => {
        try {
          const str = data.toString();
          const parsed = JSON.parse(str);
          this.handleIncomingMessage(parsed);
        } catch (err) {
          // Sometimes raw text or non-json arrives
          this.emit('rawLog', {
            Message: data.toString(),
            Identifier: 0,
            Type: 'Generic',
            Time: new Date().toISOString()
          });
        }
      });

      this.ws.on('error', (err) => {
        this.emit('error', err);
      });

      this.ws.on('close', (code, reason) => {
        this.connected = false;
        this.connecting = false;
        this.stopHeartbeat();
        this.emit('status', {
          state: 'disconnected',
          message: `Disconnected (${code}: ${reason || 'Connection closed'})`
        });

        if (this.autoReconnect) {
          this.scheduleReconnect();
        }
      });
    } catch (err) {
      this.connecting = false;
      this.connected = false;
      this.emit('status', { state: 'error', message: err.message });
      if (this.autoReconnect) {
        this.scheduleReconnect();
      }
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
    this.emit('status', { state: 'disconnected', message: 'Disconnected by user' });
  }

  scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      if (!this.connected && this.autoReconnect) {
        this.connect();
      }
    }, 5000);
  }

  startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.connected) {
        this.sendCommand('serverinfo', 3000).catch(() => {});
      }
    }, 10000);
  }

  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  handleIncomingMessage(packet) {
    // packet: { Identifier, Message, Type, Stacktrace }
    const id = packet.Identifier;
    const msg = packet.Message || '';
    const type = packet.Type || 'Generic';

    const enrichedLog = {
      Identifier: id,
      Message: msg,
      Type: type,
      Stacktrace: packet.Stacktrace || '',
      Time: new Date().toISOString()
    };

    // Check if this was a response to a specific command request
    if (id && id > 0 && this.pendingCallbacks.has(id)) {
      const { resolve, timer } = this.pendingCallbacks.get(id);
      if (timer) clearTimeout(timer);
      this.pendingCallbacks.delete(id);
      resolve(enrichedLog);
    }

    // Emit event for log monitor
    this.emit('log', enrichedLog);

    // Parse specific types
    if (type === 'Chat') {
      try {
        const chatObj = JSON.parse(msg);
        this.emit('chat', chatObj);
      } catch (e) {
        this.emit('chat', {
          Message: msg,
          Username: 'Server',
          UserId: '0',
          Time: Math.floor(Date.now() / 1000)
        });
      }
    }
  }

  sendCommand(command, timeoutMs = 8000) {
    return new Promise((resolve, reject) => {
      if (!this.connected || !this.ws) {
        return reject(new Error('RCON is not connected to a server'));
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
          reject(new Error(`Command '${command}' timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pendingCallbacks.set(id, { resolve, reject, timer, command });

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
