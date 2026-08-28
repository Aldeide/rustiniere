# 🦀 Rustinière - Rust Dedicated Server Administration Suite

[![Deploy to GitHub Pages](https://github.com/Aldeide/rustiniere/actions/workflows/deploy.yml/badge.svg)](https://github.com/Aldeide/rustiniere/actions/workflows/deploy.yml)

A modern, high-performance, dark-themed web administration tool for Facepunch Rust dedicated servers, inspired by RustAdmin and WebRCON.

---

## ⚡ Core Features

- **🌐 100% Serverless / Browser-Native WebRCON**: Directly connects via browser WebSocket (`ws://<ip>:<port>/<password>`) with zero backend hosting required.
- **🗺️ Interactive Live Island Map & Player Radar**:
  - Full 2D island map with biomes (Arctic snow, Temperate forests, Arid desert).
  - Alphanumeric Rust Grid (`A0` to `Z24`) with live cursor coordinate HUD.
  - Live player markers with health indicators, steam names, and click-to-teleport actions.
  - Event trackers for Patrol Helicopter and Cargo Ship.
- **⚡ Triggered Commands Engine (Reactive Automation)**:
  - **Chat Command Triggers**: Match chat triggers (`!pop`, `!discord`, `!wipe`, `!rules`, `!help`, `!kit`) with automatic chat responses.
  - **Dynamic Placeholders**: `{online_players}`, `{pop}`, `{max_players}`, `{queue}`, `{fps}`, `{hostname}`, `{player}`, `{steamid}`, `{message}`, `{time}`.
  - **Auto-Moderation**: Automatic profanity/slur filter with auto-mute, auto-kick, or warnings.
  - **Player Lifecycle Events**: Auto-greeting broadcasts on connect or leave.
  - **Monument & Event Spawns**: Automated announcements when Patrol Helicopters, Cargo Ships, Bradley APCs, or Airdrops enter the map.
- **⏱️ Automated Task Scheduler**:
  - Timed recurring server broadcasts (`say "[ANNOUNCEMENT] ..."`).
  - Periodic world save routines (`save`).
  - Customizable interval timers with instant manual trigger option (`Run Now`).
- **📊 Real-Time Server Telemetry & Dashboard**:
  - Live FPS and online player count area charts.
  - Quick power action buttons (`save`, `supply.call`, `heli.call`, `env.time 12`, `weather.clear`, `gc.collect`).
- **💻 Interactive WebRCON Console**:
  - Streaming server log with syntax color-coding and filter buttons (Chat, Warnings, Errors, Combat).
  - Autocomplete quick command chips and command history (Up/Down arrow keys).
- **👥 Player Management Roster**:
  - Player list with Steam avatars, ping, health, connected duration, and IP addresses.
  - Instant moderation actions: Kick, Ban, Mute/Unmute, Teleport, Give Item, Strip Inventory, and Kill.
- **📦 Categorized Rust Item Giver**:
  - Searchable catalog of Rust items by category (Weapons, Ammo, Resources, Medical, Attire, Construction, Traps, Vehicles).
  - One-click give to a specific player or all online players.
- **🛡️ Server Ban Manager**:
  - Inspect active bans (`banlistex`), add manual SteamID bans with custom reasons and expiration, and one-click unban.

---

## 🚀 Live Demo / GitHub Pages Deployment

The application is deployed to GitHub Pages at:
**`https://aldeide.github.io/rustiniere/`**

### Publishing via GitHub Actions
Pushing to the `main` branch of `https://github.com/Aldeide/rustiniere` will automatically build and publish the app.

---

## 🛡️ Browser Mixed Content Tip (for HTTPS)

Because GitHub Pages is served over `https://`, browsers may block unencrypted `ws://` (non-SSL) WebSockets by default:
1. Open your published site.
2. Click the **padlock / tune icon** to the left of the browser address bar.
3. Click **Site Settings**.
4. Set **Insecure content** to **Allow**.
5. Refresh the page to connect directly to any Rust server!
