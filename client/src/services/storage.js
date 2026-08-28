const STORAGE_KEYS = {
  SERVERS: 'rustadmin_servers',
  TRIGGERS: 'rustadmin_triggers',
  TASKS: 'rustadmin_tasks',
  ACTIVE_SERVER_ID: 'rustadmin_active_server_id'
};

const DEFAULT_SERVERS = [
  {
    id: 'rustiniere-prod',
    name: 'La Rustinière',
    ip: '5.39.17.5',
    port: 26999,
    password: '',
    isMock: false,
    autoConnect: true
  },
  {
    id: 'demo-server',
    name: 'Rust Demo / Simulated Island',
    ip: '127.0.0.1',
    port: 28016,
    password: 'demo_password',
    isMock: true,
    autoConnect: false
  }
];

const DEFAULT_TRIGGERS = [
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
    name: '!discord Community Link',
    enabled: true,
    type: 'chat_command',
    matchPattern: '!discord',
    matchType: 'exact',
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
      { type: 'command', command: 'say "[WIPE INFO] Map wipes every Thursday @ 18:00 UTC | Forced wipe first Thursday of month."' }
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
    name: 'Player Join Welcome Greeting',
    enabled: true,
    type: 'player_join',
    matchPattern: '',
    matchType: 'event',
    cooldownSeconds: 1,
    actions: [
      { type: 'command', command: 'say "[SERVER] Welcome {player} to the server! Have fun."' }
    ],
    description: 'Broadcasts a greeting when a player connects'
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

const DEFAULT_TASKS = [
  {
    id: 'sched-save',
    name: 'Auto-Save World',
    command: 'save',
    intervalSeconds: 600,
    enabled: true,
    description: 'Periodically saves world data and player inventory'
  },
  {
    id: 'sched-announcement',
    name: 'Discord Broadcast',
    command: 'say "[ANNOUNCEMENT] Visit our Discord at https://discord.gg/rust-server for events and giveaways!"',
    intervalSeconds: 900,
    enabled: true,
    description: 'Sends periodic community announcements in game chat'
  }
];

function syncNativeStorage(updatedData = {}) {
  if (typeof window !== 'undefined' && window.electronAPI?.saveConfig) {
    const fullConfig = {
      servers: storage.getServers(),
      triggers: storage.getTriggers(),
      tasks: storage.getTasks(),
      activeServerId: storage.getActiveServerId(),
      ...updatedData
    };
    window.electronAPI.saveConfig(fullConfig).catch(() => {});
  }
}

export const storage = {
  // Initialize from native desktop file if available
  initDesktopSync: async () => {
    if (typeof window !== 'undefined' && window.electronAPI?.getConfig) {
      try {
        const nativeCfg = await window.electronAPI.getConfig();
        if (nativeCfg) {
          if (nativeCfg.servers && Array.isArray(nativeCfg.servers)) {
            localStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(nativeCfg.servers));
          }
          if (nativeCfg.triggers && Array.isArray(nativeCfg.triggers)) {
            localStorage.setItem(STORAGE_KEYS.TRIGGERS, JSON.stringify(nativeCfg.triggers));
          }
          if (nativeCfg.tasks && Array.isArray(nativeCfg.tasks)) {
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(nativeCfg.tasks));
          }
          if (nativeCfg.activeServerId) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_SERVER_ID, nativeCfg.activeServerId);
          }
        }
      } catch (e) {
        console.error('Failed to sync native desktop storage:', e);
      }
    }
  },

  getServers: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SERVERS);
      return raw ? JSON.parse(raw) : DEFAULT_SERVERS;
    } catch (e) {
      return DEFAULT_SERVERS;
    }
  },

  saveServers: (servers) => {
    try {
      localStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
      syncNativeStorage({ servers });
    } catch (e) {}
  },

  getTriggers: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TRIGGERS);
      return raw ? JSON.parse(raw) : DEFAULT_TRIGGERS;
    } catch (e) {
      return DEFAULT_TRIGGERS;
    }
  },

  saveTriggers: (triggers) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TRIGGERS, JSON.stringify(triggers));
      syncNativeStorage({ triggers });
    } catch (e) {}
  },

  getTasks: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TASKS);
      return raw ? JSON.parse(raw) : DEFAULT_TASKS;
    } catch (e) {
      return DEFAULT_TASKS;
    }
  },

  saveTasks: (tasks) => {
    try {
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      syncNativeStorage({ tasks });
    } catch (e) {}
  },

  getActiveServerId: () => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_SERVER_ID) || 'rustiniere-prod';
  },

  saveActiveServerId: (id) => {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_SERVER_ID, id);
      syncNativeStorage({ activeServerId: id });
    } catch (e) {}
  }
};
