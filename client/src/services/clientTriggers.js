import { storage } from './storage';

export class ClientTriggersEngine {
  constructor(appContext) {
    this.ctx = appContext; // reference to { rcon, serverInfo, players, sendCommand, emit }
    this.triggers = storage.getTriggers();
    this.executionHistory = [];
    this.cooldowns = new Map();
  }

  getTriggers() {
    this.triggers = storage.getTriggers();
    return this.triggers;
  }

  getHistory() {
    return this.executionHistory.slice(-100);
  }

  addTrigger(trigger) {
    const newTrig = {
      ...trigger,
      id: trigger.id || `trig-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      enabled: trigger.enabled !== false,
      cooldownSeconds: Number(trigger.cooldownSeconds) || 5,
      actions: trigger.actions || [],
      createdAt: new Date().toISOString()
    };
    this.triggers.push(newTrig);
    storage.saveTriggers(this.triggers);
    return newTrig;
  }

  updateTrigger(id, updates) {
    const index = this.triggers.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.triggers[index] = { ...this.triggers[index], ...updates };
    storage.saveTriggers(this.triggers);
    return this.triggers[index];
  }

  deleteTrigger(id) {
    this.triggers = this.triggers.filter(t => t.id !== id);
    storage.saveTriggers(this.triggers);
    return true;
  }

  toggleTrigger(id, enabled) {
    const trigger = this.triggers.find(t => t.id === id);
    if (trigger) {
      trigger.enabled = enabled !== undefined ? enabled : !trigger.enabled;
      storage.saveTriggers(this.triggers);
      return trigger;
    }
    return null;
  }

  // Handle incoming Chat packets
  async processChat(chatObj) {
    if (!chatObj || !chatObj.Message) return;
    const msg = (chatObj.Message || '').trim();
    const player = chatObj.Username || 'Unknown';
    const steamid = chatObj.UserId || '0';

    for (const trig of this.triggers) {
      if (!trig.enabled) continue;

      let matched = false;
      let matchVars = {};

      if (trig.type === 'chat_command') {
        const pattern = (trig.matchPattern || '').trim().toLowerCase();
        const lowerMsg = msg.toLowerCase();

        if (trig.matchType === 'exact' && lowerMsg === pattern) {
          matched = true;
        } else if (trig.matchType === 'starts_with' && lowerMsg.startsWith(pattern)) {
          matched = true;
          matchVars.args = msg.substring(pattern.length).trim();
        } else if (trig.matchType === 'contains' && lowerMsg.includes(pattern)) {
          matched = true;
        } else if (trig.matchType === 'regex') {
          try {
            const regex = new RegExp(trig.matchPattern, 'i');
            const match = regex.exec(msg);
            if (match) {
              matched = true;
              match.forEach((val, idx) => {
                matchVars[`${idx}`] = val;
              });
            }
          } catch (e) {}
        }
      } else if (trig.type === 'chat_automod') {
        const keywords = (trig.matchPattern || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
        const lowerMsg = msg.toLowerCase();
        for (const kw of keywords) {
          if (lowerMsg.includes(kw)) {
            matched = true;
            matchVars.keyword = kw;
            break;
          }
        }
      }

      if (matched) {
        await this.executeTrigger(trig, {
          player,
          steamid,
          message: msg,
          ...matchVars
        });
      }
    }
  }

  // Handle incoming Console Logs & Event stream
  async processLog(logEntry) {
    const rawMsg = logEntry.Message || '';
    if (!rawMsg) return;

    // Detect Player Join event
    if (rawMsg.toLowerCase().includes('joined [') || rawMsg.match(/(\S+)\s*\[(\d{17})\]\s*joined/i)) {
      let player = 'Player';
      let steamid = '0';
      const detailMatch = rawMsg.match(/([^\/\[\]\n\r]+)\[(\d{17})\]/);
      if (detailMatch) {
        player = detailMatch[1].trim();
        steamid = detailMatch[2].trim();
      }
      await this.fireEventType('player_join', { player, steamid, raw: rawMsg });
    }

    // Detect Player Leave
    if (rawMsg.toLowerCase().includes('disconnecting:') || rawMsg.toLowerCase().includes('left the game') || rawMsg.toLowerCase().includes('disconnected:')) {
      let player = 'Player';
      let steamid = '0';
      const detailMatch = rawMsg.match(/([^\/\[\]\n\r]+)\[(\d{17})\]/);
      if (detailMatch) {
        player = detailMatch[1].trim();
        steamid = detailMatch[2].trim();
      }
      await this.fireEventType('player_leave', { player, steamid, raw: rawMsg });
    }

    // Detect Game Events
    if (rawMsg.includes('Patrol Helicopter') || rawMsg.includes('PatrolHelicopter')) {
      await this.fireEventType('game_event', { event: 'heli', raw: rawMsg }, 'heli');
    }
    if (rawMsg.includes('CargoShip') || rawMsg.includes('Cargo Ship')) {
      await this.fireEventType('game_event', { event: 'cargo', raw: rawMsg }, 'cargo');
    }
    if (rawMsg.includes('BradleyAPC') || rawMsg.includes('Bradley APC')) {
      await this.fireEventType('game_event', { event: 'bradley', raw: rawMsg }, 'bradley');
    }
    if (rawMsg.includes('SupplyDrop') || rawMsg.includes('Airdrop')) {
      await this.fireEventType('game_event', { event: 'airdrop', raw: rawMsg }, 'airdrop');
    }

    // Custom Console Regex Triggers
    for (const trig of this.triggers) {
      if (!trig.enabled || trig.type !== 'console_regex') continue;
      try {
        const regex = new RegExp(trig.matchPattern, 'i');
        const match = regex.exec(rawMsg);
        if (match) {
          const vars = { raw: rawMsg };
          match.forEach((val, idx) => {
            vars[`${idx}`] = val;
          });
          await this.executeTrigger(trig, vars);
        }
      } catch (e) {}
    }
  }

  async fireEventType(type, context, subtype = null) {
    for (const trig of this.triggers) {
      if (!trig.enabled || trig.type !== type) continue;
      if (subtype && trig.matchPattern && !trig.matchPattern.toLowerCase().includes(subtype)) {
        continue;
      }
      await this.executeTrigger(trig, context);
    }
  }

  async executeTrigger(trigger, context = {}) {
    const now = Date.now();
    const lastFired = this.cooldowns.get(trigger.id) || 0;
    const cooldownMs = (trigger.cooldownSeconds || 0) * 1000;

    if (now - lastFired < cooldownMs) {
      return; // In cooldown
    }

    this.cooldowns.set(trigger.id, now);
    const executedCommands = [];

    for (const action of trigger.actions) {
      if (action.type === 'command' && action.command) {
        let cmd = action.command;

        // Custom context substitution
        Object.keys(context).forEach(key => {
          const placeholder = new RegExp(`\\{${key}\\}`, 'gi');
          cmd = cmd.replace(placeholder, context[key] || '');
        });

        // Telemetry & Server Values
        const info = this.ctx.serverInfo || {};
        const onlineCount = (info.Players !== undefined && info.Players !== null) 
          ? String(info.Players) 
          : String(this.ctx.players?.length || 0);
        const maxCount = String(info.MaxPlayers || 100);
        const queueCount = String(info.Queued || 0);
        const joiningCount = String(info.Joining || 0);
        const framerate = String(info.Framerate || 60);
        const serverHostname = String(info.Hostname || this.ctx.activeServer?.name || 'Rust Server');
        const entities = String(info.EntityCount || 0);
        const inGameTime = String(info.GameTime || '12:00');

        // Context placeholders
        cmd = cmd.replace(/\{player\}/gi, context.player || 'Player');
        cmd = cmd.replace(/\{steamid\}/gi, context.steamid || '0');
        cmd = cmd.replace(/\{message\}/gi, context.message || '');
        cmd = cmd.replace(/\{time\}/gi, new Date().toLocaleTimeString());

        // Population & Stats Placeholders
        cmd = cmd.replace(/\{online_players\}/gi, onlineCount);
        cmd = cmd.replace(/\{onlineplayers\}/gi, onlineCount);
        cmd = cmd.replace(/\{players\}/gi, onlineCount);
        cmd = cmd.replace(/\{pop\}/gi, onlineCount);
        cmd = cmd.replace(/\{population\}/gi, onlineCount);

        cmd = cmd.replace(/\{max_players\}/gi, maxCount);
        cmd = cmd.replace(/\{maxplayers\}/gi, maxCount);
        cmd = cmd.replace(/\{maxpop\}/gi, maxCount);

        cmd = cmd.replace(/\{queue\}/gi, queueCount);
        cmd = cmd.replace(/\{queued_players\}/gi, queueCount);
        cmd = cmd.replace(/\{queuedplayers\}/gi, queueCount);
        cmd = cmd.replace(/\{joining\}/gi, joiningCount);

        cmd = cmd.replace(/\{fps\}/gi, framerate);
        cmd = cmd.replace(/\{framerate\}/gi, framerate);

        cmd = cmd.replace(/\{hostname\}/gi, serverHostname);
        cmd = cmd.replace(/\{server_name\}/gi, serverHostname);
        cmd = cmd.replace(/\{servername\}/gi, serverHostname);

        cmd = cmd.replace(/\{entities\}/gi, entities);
        cmd = cmd.replace(/\{gametime\}/gi, inGameTime);

        try {
          await this.ctx.sendCommand(cmd);
          executedCommands.push(cmd);
        } catch (err) {
          executedCommands.push(`[ERROR] ${cmd}: ${err.message}`);
        }
      }
    }

    const record = {
      id: `fire-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      triggerId: trigger.id,
      triggerName: trigger.name,
      timestamp: new Date().toISOString(),
      context,
      executedCommands
    };

    this.executionHistory.push(record);
    if (this.executionHistory.length > 200) this.executionHistory.shift();

    if (this.ctx.emit) {
      this.ctx.emit('trigger:fired', record);
    }
  }
}
