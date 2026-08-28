import { v4 as uuidv4 } from 'uuid';

export class TriggersEngine {
  constructor(serverManager) {
    this.serverManager = serverManager;
    this.triggers = [];
    this.executionHistory = [];
    this.cooldowns = new Map(); // triggerId -> timestamp
  }

  initDefaultTriggers() {
    this.triggers = [
      {
        id: 'trig-pop',
        name: '!pop Server Population',
        enabled: true,
        type: 'chat_command',
        matchPattern: '!pop',
        matchType: 'exact',
        cooldownSeconds: 5,
        actions: [
          { type: 'command', command: 'say "[POPULATION] Currently {online_players}/{max_players} players online ({queue} in queue) | Server FPS: {fps}"' }
        ],
        description: 'Displays current online player count, max capacity, queue and server FPS when typing !pop'
      },
      {
        id: 'trig-discord',
        name: '!discord Chat Command',
        enabled: true,
        type: 'chat_command',
        matchPattern: '!discord',
        matchType: 'exact', // exact, starts_with, contains, regex
        cooldownSeconds: 5,
        actions: [
          { type: 'command', command: 'say "[DISCORD] Join our official community: https://discord.gg/rust-server"' }
        ],
        description: 'Sends Discord invite link when player types !discord in chat'
      },
      {
        id: 'trig-wipe',
        name: '!wipe Schedule Info',
        enabled: true,
        type: 'chat_command',
        matchPattern: '!wipe',
        matchType: 'exact',
        cooldownSeconds: 10,
        actions: [
          { type: 'command', command: 'say "[WIPE INFO] Map wipes every Thursday @ 18:00 UTC | Full BP wipe first Thursday of month."' }
        ],
        description: 'Displays next wipe schedule in chat'
      },
      {
        id: 'trig-rules',
        name: '!rules Server Guidelines',
        enabled: true,
        type: 'chat_command',
        matchPattern: '!rules',
        matchType: 'exact',
        cooldownSeconds: 10,
        actions: [
          { type: 'command', command: 'say "[RULES] 1. No Cheating/Scripts 2. Max team size 3 3. English in main chat. Type !discord for support."' }
        ],
        description: 'Shows server rules in chat'
      },
      {
        id: 'trig-welcome',
        name: 'Player Join Welcome Broadcast',
        enabled: true,
        type: 'player_join',
        matchPattern: '',
        matchType: 'event',
        cooldownSeconds: 1,
        actions: [
          { type: 'command', command: 'say "[SERVER] Welcome {player} to the server! Have fun."' }
        ],
        description: 'Broadcasts a welcome greeting when a player connects'
      },
      {
        id: 'trig-heli',
        name: 'Patrol Helicopter Event Alert',
        enabled: true,
        type: 'game_event',
        matchPattern: 'heli', // patrol helicopter
        matchType: 'event',
        cooldownSeconds: 60,
        actions: [
          { type: 'command', command: 'say "[EVENT] Warning: A Patrol Helicopter has entered the island airspace!"' }
        ],
        description: 'Alerts all players when Patrol Helicopter spawns'
      },
      {
        id: 'trig-cargo',
        name: 'Cargo Ship Event Alert',
        enabled: true,
        type: 'game_event',
        matchPattern: 'cargo',
        matchType: 'event',
        cooldownSeconds: 60,
        actions: [
          { type: 'command', command: 'say "[EVENT] The Cargo Ship is approaching the coast with high-tier loot!"' }
        ],
        description: 'Alerts all players when Cargo Ship approaches'
      },
      {
        id: 'trig-profanity',
        name: 'Auto-Moderation Filter',
        enabled: true,
        type: 'chat_automod',
        matchPattern: 'nigger,faggot,kys,retard',
        matchType: 'keyword_list',
        cooldownSeconds: 1,
        actions: [
          { type: 'command', command: 'mute {steamid} 600 "Toxic language/slurs are not tolerated"' },
          { type: 'command', command: 'say "[AUTOMOD] Player {player} was muted for 10 minutes for offensive language."' }
        ],
        description: 'Automatically mutes players who use severe toxic keywords in chat'
      }
    ];
  }

  getTriggers() {
    return this.triggers;
  }

  getHistory() {
    return this.executionHistory.slice(-100);
  }

  addTrigger(trigger) {
    const newTrig = {
      ...trigger,
      id: trigger.id || `trig-${uuidv4().substring(0, 8)}`,
      enabled: trigger.enabled !== false,
      cooldownSeconds: Number(trigger.cooldownSeconds) || 5,
      actions: trigger.actions || [],
      createdAt: new Date().toISOString()
    };
    this.triggers.push(newTrig);
    return newTrig;
  }

  updateTrigger(id, updates) {
    const index = this.triggers.findIndex(t => t.id === id);
    if (index === -1) return null;
    this.triggers[index] = { ...this.triggers[index], ...updates };
    return this.triggers[index];
  }

  deleteTrigger(id) {
    const prevLen = this.triggers.length;
    this.triggers = this.triggers.filter(t => t.id !== id);
    return this.triggers.length < prevLen;
  }

  toggleTrigger(id, enabled) {
    const trigger = this.triggers.find(t => t.id === id);
    if (trigger) {
      trigger.enabled = enabled !== undefined ? enabled : !trigger.enabled;
      return trigger;
    }
    return null;
  }

  // Handle incoming Chat packets
  async processChat(chatObj) {
    // chatObj: { Message, Username, UserId, Time, Channel }
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
    // Format usually: "[connection] 76561198... joined [ip:port/steamid/name]" or "username[steamid] joined"
    const joinMatch = rawMsg.match(/(?:joined\s+\[|\]\s+joined\s+\[|(\S+)\/(\d{17})\s+joined|(\S+)\s*\[(\d{17})\]\s*joined)/i);
    if (joinMatch || rawMsg.toLowerCase().includes('joined [')) {
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

    // Detect Game Events (Heli, Cargo, Bradley, Chinook, Airdrop)
    if (rawMsg.includes('Patrol Helicopter') || rawMsg.includes('PatrolHelicopter') || rawMsg.toLowerCase().includes('patrol helicopter spawned')) {
      await this.fireEventType('game_event', { event: 'heli', raw: rawMsg }, 'heli');
    }
    if (rawMsg.includes('CargoShip') || rawMsg.includes('Cargo Ship') || rawMsg.toLowerCase().includes('cargoship spawned')) {
      await this.fireEventType('game_event', { event: 'cargo', raw: rawMsg }, 'cargo');
    }
    if (rawMsg.includes('BradleyAPC') || rawMsg.includes('Bradley APC')) {
      await this.fireEventType('game_event', { event: 'bradley', raw: rawMsg }, 'bradley');
    }
    if (rawMsg.includes('CH47') || rawMsg.includes('Chinook')) {
      await this.fireEventType('game_event', { event: 'chinook', raw: rawMsg }, 'chinook');
    }
    if (rawMsg.includes('SupplyDrop') || rawMsg.includes('Airdrop') || rawMsg.includes('Cargo Plane')) {
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

        // Variable substitution
        Object.keys(context).forEach(key => {
          const placeholder = new RegExp(`\\{${key}\\}`, 'gi');
          cmd = cmd.replace(placeholder, context[key] || '');
        });

        // Fetch current live telemetry values
        const info = this.serverManager.serverInfo || {};
        const onlineCount = (info.Players !== undefined && info.Players !== null) 
          ? String(info.Players) 
          : String(this.serverManager.players?.length || 0);
        const maxCount = String(info.MaxPlayers || 100);
        const queueCount = String(info.Queued || 0);
        const joiningCount = String(info.Joining || 0);
        const framerate = String(info.Framerate || 60);
        const serverHostname = String(info.Hostname || this.serverManager.activeServer?.name || 'Rust Server');
        const entities = String(info.EntityCount || 0);
        const inGameTime = String(info.GameTime || '12:00');

        // Context placeholders (player, steamid, etc.)
        cmd = cmd.replace(/\{player\}/gi, context.player || 'Player');
        cmd = cmd.replace(/\{steamid\}/gi, context.steamid || '0');
        cmd = cmd.replace(/\{message\}/gi, context.message || '');
        cmd = cmd.replace(/\{time\}/gi, new Date().toLocaleTimeString());
        
        // Server Population & Stats Placeholders (support all common aliases)
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
          await this.serverManager.sendCommand(cmd);
          executedCommands.push(cmd);
        } catch (err) {
          executedCommands.push(`[ERROR] ${cmd}: ${err.message}`);
        }
      }
    }

    const record = {
      id: uuidv4(),
      triggerId: trigger.id,
      triggerName: trigger.name,
      timestamp: new Date().toISOString(),
      context,
      executedCommands
    };

    this.executionHistory.push(record);
    if (this.executionHistory.length > 200) {
      this.executionHistory.shift();
    }

    if (this.serverManager.io) {
      this.serverManager.io.emit('trigger:fired', record);
    }
  }
}
