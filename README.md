# 🦀 Rustinière - Standalone Desktop Administration Suite for Rust

A modern, high-performance standalone Windows desktop software for Facepunch Rust dedicated server administrators, inspired by RustAdmin.

---

## ⚡ Key Desktop Highlights

- **🖥️ Standalone Windows Desktop Software (`.exe`)**: Launches natively with zero external dependencies, no browser tabs, and no terminal windows.
- **🛡️ Direct Native WebRCON**: Connects straight from your PC to any Rust server port (`ws://<ip>:<port>/<password>`) with zero mixed-content or SSL restrictions.
- **💾 Permanent Physical File Persistence (`rustiniere_config.json`)**: All server profiles, triggers, and scheduled tasks are permanently saved in a physical JSON file on your machine.
- **🗺️ Interactive 2D Live Island Map & Player Radar**:
  - Live coordinates HUD with standard Rust Alphanumeric Grid (`A0` to `Z24`).
  - Real-time player markers with HP, Steam avatars, and click-to-teleport actions.
  - Custom Map Image loader (supports direct URLs, Rust-IO auto-presets, and custom PNG/JPG map file uploads from your PC).
  - Event radar tracking Patrol Helicopters, Cargo Ships, and Supply Drops.
- **⚡ Reactive Triggered Commands Engine**:
  - Auto-responders for in-game chat (`!pop`, `!discord`, `!wipe`, `!rules`, `!help`).
  - Dynamic live variable substitution (`{online_players}`, `{max_players}`, `{queue}`, `{fps}`, `{hostname}`, `{player}`, `{steamid}`).
  - Automated toxic language filter with auto-mute or kick actions.
  - Player join/leave greeting broadcasts and monument spawn announcements.
- **⏱️ Automated Task Scheduler**:
  - Background timers for periodic world saves (`save`) and scheduled community announcements.
- **💻 Clean & Readable WebRCON Console**:
  - Background telemetry queries are filtered so your log stays clean.
  - Pretty-printed JSON formatting for `serverinfo`, `playerlist`, and `status`.
  - Color-coded badges for `[CHAT]`, `[PLAYER]`, `[COMBAT]`, `[WARN]`, and `[ERROR]`.
  - One-click copy, search filter, and log download (`.txt`).
- **👥 Player & Ban Management**:
  - Real-time roster with health, ping, and connected duration.
  - One-click Moderation (Kick, Ban, Mute/Unmute, Teleport, Give Item, Strip Inventory, Kill).
- **📦 Rust Item Giver Database**:
  - Categorized item spawner (Weapons, Ammunition, Resources, Medical, Attire, Construction, Traps, Vehicles).

---

## 🚀 Quick Launch

### 1. Instant Desktop Launch
Double-click:
📁 **`start.bat`**

### 2. Package Standalone `.exe`
```bash
npm run dist
```
Generates a portable executable in `dist-desktop/Rustiniere 1.0.0.exe`.
