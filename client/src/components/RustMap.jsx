import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Map as MapIcon, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Search, 
  Users, 
  Plane, 
  MapPin, 
  ShieldAlert, 
  UserX, 
  VolumeX, 
  Skull, 
  Package, 
  Layers, 
  Navigation,
  Compass,
  Crosshair,
  Maximize2
} from 'lucide-react';

const MONUMENTS = [
  { id: 'launch', name: 'Launch Site', type: 'monument', tier: 'tier3', x: 120, z: 450, icon: '🚀' },
  { id: 'oil_large', name: 'Large Oil Rig', type: 'monument', tier: 'tier3', x: 1850, z: 1600, icon: '🛢️' },
  { id: 'oil_small', name: 'Small Oil Rig', type: 'monument', tier: 'tier2', x: 1600, z: -1700, icon: '🛢️' },
  { id: 'airfield', name: 'Airfield', type: 'monument', tier: 'tier2', x: -450, z: -200, icon: '✈️' },
  { id: 'dome', name: 'The Dome', type: 'monument', tier: 'tier2', x: 600, z: -700, icon: '🔮' },
  { id: 'trainyard', name: 'Train Yard', type: 'monument', tier: 'tier2', x: 350, z: -450, icon: '🚆' },
  { id: 'miltunnels', name: 'Military Tunnel', type: 'monument', tier: 'tier3', x: -900, z: 600, icon: '🚇' },
  { id: 'outpost', name: 'Outpost (Safezone)', type: 'safezone', tier: 'safe', x: -150, z: -350, icon: '🛡️' },
  { id: 'bandit', name: 'Bandit Camp (Safezone)', type: 'safezone', tier: 'safe', x: 400, z: 100, icon: '⛺' },
  { id: 'excavator', name: 'Giant Excavator', type: 'monument', tier: 'tier3', x: -650, z: -1100, icon: '⚙️' },
  { id: 'watertreat', name: 'Water Treatment', type: 'monument', tier: 'tier2', x: -300, z: 800, icon: '💧' },
  { id: 'powerplant', name: 'Power Plant', type: 'monument', tier: 'tier2', x: 750, z: 500, icon: '⚡' },
  { id: 'harbor', name: 'Harbor', type: 'monument', tier: 'tier1', x: 1300, z: -800, icon: '🚢' },
  { id: 'lighthouse', name: 'Lighthouse', type: 'monument', tier: 'tier1', x: -1600, z: 1400, icon: '🗼' },
  { id: 'satellite', name: 'Satellite Dish', type: 'monument', tier: 'tier1', x: 800, z: -1300, icon: '📡' },
  { id: 'sewer', name: 'Sewer Branch', type: 'monument', tier: 'tier1', x: -100, z: 150, icon: '🧪' }
];

export default function RustMap({ 
  players = [], 
  mapEvents = [], 
  serverInfo, 
  onSendCommand, 
  onGiveItemToPlayer 
}) {
  const worldSize = serverInfo?.WorldSize || 4000;
  const halfSize = worldSize / 2;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [clickedCoord, setClickedCoord] = useState(null);
  const [hoverCoord, setHoverCoord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Layer toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showMonuments, setShowMonuments] = useState(true);
  const [showPlayerLabels, setShowPlayerLabels] = useState(true);
  const [showEvents, setShowEvents] = useState(true);

  const containerRef = useRef(null);

  // Convert Rust in-game (x, z) to percentage (0% to 100%) on the square map
  // Rust coordinates: X is -halfSize to +halfSize (West to East), Z is -halfSize to +halfSize (South to North)
  const toMapPercent = (x, z) => {
    const px = ((x + halfSize) / worldSize) * 100;
    const py = ((-z + halfSize) / worldSize) * 100; // Flip Y because map top is North (+Z)
    return {
      left: `${Math.max(0, Math.min(100, px))}%`,
      top: `${Math.max(0, Math.min(100, py))}%`
    };
  };

  // Convert Rust coordinate (X, Z) to standard alphanumeric grid (e.g. G14)
  const toGridCode = (x, z) => {
    const gridSize = 146.3; // Standard Rust grid cell size
    const cols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZAAABACADAE';
    const colIdx = Math.floor((x + halfSize) / gridSize);
    const rowIdx = Math.floor((-z + halfSize) / gridSize);
    const colChar = cols[colIdx] || 'A';
    return `${colChar}${rowIdx}`;
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom(prev => Math.min(3.5, Math.max(0.6, prev + delta)));
  };

  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left click
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - pan.y) / zoom;
      const size = rect.width;

      const normX = clickX / size;
      const normY = clickY / size;

      if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
        const rustX = Math.round((normX * worldSize) - halfSize);
        const rustZ = Math.round(halfSize - (normY * worldSize));
        setHoverCoord({ x: rustX, z: rustZ, grid: toGridCode(rustX, rustZ) });
      }
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMapClick = (e) => {
    if (e.target.closest('.interactive-marker') || e.target.closest('.interactive-popup')) {
      return;
    }

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = (e.clientX - rect.left - pan.x) / zoom;
      const clickY = (e.clientY - rect.top - pan.y) / zoom;
      const size = rect.width;

      const normX = clickX / size;
      const normY = clickY / size;

      if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
        const rustX = Math.round((normX * worldSize) - halfSize);
        const rustZ = Math.round(halfSize - (normY * worldSize));
        setClickedCoord({
          x: rustX,
          z: rustZ,
          grid: toGridCode(rustX, rustZ),
          screenX: e.clientX - rect.left,
          screenY: e.clientY - rect.top
        });
        setSelectedPlayer(null);
      }
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setSelectedPlayer(null);
    setClickedCoord(null);
  };

  const focusPlayer = (player) => {
    if (!player || !player.Pos) return;
    setSelectedPlayer(player);
    setClickedCoord(null);
    setZoom(2.2);
    // Center pan on player
    const pos = toMapPercent(player.Pos.x, player.Pos.z);
    const px = (parseFloat(pos.left) / 100) * 800;
    const py = (parseFloat(pos.top) / 100) * 800;
    setPan({
      x: 400 - px * 2.2,
      y: 400 - py * 2.2
    });
  };

  const teleportAdminToCoord = async (x, z) => {
    await onSendCommand(`teleportpos ${x} 20 ${z}`);
    setClickedCoord(null);
  };

  const spawnAirdropAtCoord = async (x, z) => {
    await onSendCommand(`supply.drop ${x} ${z}`);
    setClickedCoord(null);
  };

  const filteredPlayers = players.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return p.DisplayName?.toLowerCase().includes(q) || p.SteamID?.includes(q);
  });

  return (
    <div className="flex flex-col lg:flex-row gap-5 h-[calc(100vh-140px)] select-none">
      
      {/* Left Column: Interactive Map Canvas */}
      <div className="flex-1 bg-[#0b0c10] rounded-2xl border border-[#23242c] overflow-hidden shadow-2xl relative flex flex-col">
        
        {/* Top Floating Map Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between pointer-events-none gap-2">
          
          {/* Coordinates HUD */}
          <div className="pointer-events-auto flex items-center gap-2 bg-[#14161de6] backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#272935] shadow-lg text-xs font-mono">
            <Compass className="w-4 h-4 text-[#cd4628]" />
            <div>
              <span className="text-[#8e909a]">Cursor: </span>
              {hoverCoord ? (
                <strong className="text-white">
                  Grid <span className="text-[#fb923c]">{hoverCoord.grid}</span> (X: {hoverCoord.x}, Z: {hoverCoord.z})
                </strong>
              ) : (
                <span className="text-[#5e616f]">Hover map</span>
              )}
            </div>
          </div>

          {/* Quick Layer Toggles & Zoom Controls */}
          <div className="pointer-events-auto flex items-center gap-1.5 bg-[#14161de6] backdrop-blur-md p-1 rounded-xl border border-[#272935] shadow-lg">
            
            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Grid Lines"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showGrid ? 'bg-[#cd4628] text-white' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Grid
            </button>

            <button
              onClick={() => setShowMonuments(!showMonuments)}
              title="Toggle Monuments"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showMonuments ? 'bg-[#cd4628] text-white' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Monuments
            </button>

            <button
              onClick={() => setShowPlayerLabels(!showPlayerLabels)}
              title="Toggle Player Names"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showPlayerLabels ? 'bg-[#cd4628] text-white' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Names
            </button>

            <button
              onClick={() => setShowEvents(!showEvents)}
              title="Toggle Heli & Cargo Trackers"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showEvents ? 'bg-[#cd4628] text-white' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Events
            </button>

            <div className="w-[1px] h-4 bg-[#2b2d38] mx-1" />

            <button
              onClick={() => setZoom(prev => Math.min(3.5, prev + 0.3))}
              className="p-1.5 rounded-lg text-[#8e909a] hover:text-white hover:bg-[#20222a] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setZoom(prev => Math.max(0.6, prev - 0.3))}
              className="p-1.5 rounded-lg text-[#8e909a] hover:text-white hover:bg-[#20222a] transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>

            <button
              onClick={resetView}
              className="p-1.5 rounded-lg text-[#8e909a] hover:text-white hover:bg-[#20222a] transition-colors"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Map Viewport Area */}
        <div 
          ref={containerRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onClick={handleMapClick}
          className="flex-1 w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden flex items-center justify-center bg-[#07131e]"
        >
          {/* Transform Container */}
          <div 
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'center center',
              transition: isDragging ? 'none' : 'transform 0.15s ease-out',
              width: '800px',
              height: '800px'
            }}
            className="relative select-none shadow-2xl rounded-3xl overflow-hidden border border-[#1e3448]"
          >
            
            {/* 1. Procedural Rust Island Background */}
            <div className="absolute inset-0 bg-[#0c1f2e]">
              {/* Subtle Ocean Waves */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

              {/* Island Landmass Contour */}
              <div 
                className="absolute inset-[8%] rounded-[48%_52%_45%_55%/50%_45%_55%_50%] bg-[#1a3826] border-[16px] border-[#a39462]/35 shadow-inner"
                style={{
                  background: 'radial-gradient(ellipse at 50% 30%, #475569 0%, #1e3a2b 40%, #172e22 75%, #a39462 100%)'
                }}
              >
                {/* Northern Snow Biome */}
                <div className="absolute top-0 inset-x-0 h-44 rounded-t-[50%] bg-gradient-to-b from-[#e2e8f0]/40 to-transparent pointer-events-none" />

                {/* Southern Desert Biome */}
                <div className="absolute bottom-0 inset-x-0 h-44 rounded-b-[50%] bg-gradient-to-t from-[#ca8a04]/25 to-transparent pointer-events-none" />

                {/* Mountain Ridge Highlights */}
                <div className="absolute top-1/3 left-1/4 w-40 h-24 rounded-full bg-[#334155]/60 blur-md pointer-events-none" />
                <div className="absolute top-1/2 right-1/4 w-48 h-32 rounded-full bg-[#334155]/60 blur-md pointer-events-none" />
              </div>
            </div>

            {/* 2. Standard Rust Alphanumeric Grid Lines */}
            {showGrid && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-16 grid-rows-16">
                {Array.from({ length: 16 }).map((_, r) => (
                  <div key={r} className="flex h-[50px] border-b border-[#38bdf8]/15">
                    {Array.from({ length: 16 }).map((_, c) => {
                      const cols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                      const cellCode = `${cols[c]}${r}`;
                      return (
                        <div 
                          key={c} 
                          className="w-[50px] border-r border-[#38bdf8]/15 p-1 flex items-start justify-start"
                        >
                          <span className="text-[7px] font-mono text-[#38bdf8]/35 font-bold">
                            {cellCode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* 3. Major Rust Monuments */}
            {showMonuments && MONUMENTS.map(m => {
              const pos = toMapPercent(m.x, m.z);
              return (
                <div
                  key={m.id}
                  style={{ left: pos.left, top: pos.top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-10"
                >
                  <div className="w-6 h-6 rounded-full bg-[#181a22]/90 border border-[#f59e0b]/60 flex items-center justify-center text-xs shadow-md">
                    <span>{m.icon}</span>
                  </div>
                  <span className="mt-0.5 text-[8px] font-extrabold uppercase px-1 py-0.2 rounded bg-black/75 text-[#fcd34d] border border-black whitespace-nowrap shadow">
                    {m.name}
                  </span>
                </div>
              );
            })}

            {/* 4. Active World Events (Patrol Heli & Cargo Ship) */}
            {showEvents && mapEvents.map(evt => {
              const pos = toMapPercent(evt.x, evt.z);
              return (
                <div
                  key={evt.id}
                  style={{ left: pos.left, top: pos.top }}
                  className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-none z-15 transition-all duration-1000"
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-xl animate-pulse ${
                    evt.type === 'heli' ? 'bg-[#7f1d1d] text-[#f87171] border-2 border-[#ef4444]' : 'bg-[#1e3a5f] text-[#60a5fa] border-2 border-[#3b82f6]'
                  }`}>
                    {evt.type === 'heli' ? '🚁' : '🚢'}
                  </div>
                  <span className="mt-0.5 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/80 text-white border border-black whitespace-nowrap">
                    {evt.name}
                  </span>
                </div>
              );
            })}

            {/* 5. Live Player Markers */}
            {players.map(player => {
              if (!player.Pos) return null;
              const pos = toMapPercent(player.Pos.x, player.Pos.z);
              const isSelected = selectedPlayer?.SteamID === player.SteamID;
              const isHealthy = (player.Health || 100) > 60;
              const isWounded = (player.Health || 100) <= 20;

              return (
                <div
                  key={player.SteamID}
                  style={{ left: pos.left, top: pos.top }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayer(player);
                    setClickedCoord(null);
                  }}
                  className="interactive-marker absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer z-20 group transition-all duration-300"
                >
                  {/* Ping Ring Effect */}
                  <div className="absolute -inset-1 rounded-full bg-[#cd4628] opacity-40 animate-ping" />

                  {/* Player Dot Marker */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white border-2 shadow-lg transition-transform group-hover:scale-125 ${
                    isSelected 
                      ? 'bg-[#cd4628] border-white scale-125 ring-4 ring-[#cd4628]/40' 
                      : isWounded
                      ? 'bg-[#dc2626] border-[#fca5a5]'
                      : isHealthy 
                      ? 'bg-[#15803d] border-[#86efac]'
                      : 'bg-[#b45309] border-[#fde047]'
                  }`}>
                    {player.DisplayName ? player.DisplayName.charAt(0).toUpperCase() : 'P'}
                  </div>

                  {/* Player Label */}
                  {showPlayerLabels && (
                    <div className="mt-1 flex flex-col items-center">
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-black/85 text-white border border-[#2f313c] whitespace-nowrap shadow">
                        {player.DisplayName}
                      </span>
                      <span className="text-[7px] font-mono text-[#4ade80] bg-black/85 px-1 rounded -mt-0.5">
                        {player.Health || 100} HP
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </div>

        {/* Click-on-Map Popover / Action Menu */}
        {clickedCoord && (
          <div className="interactive-popup absolute bottom-4 left-4 z-30 bg-[#16171ee6] backdrop-blur-md p-4 rounded-2xl border border-[#2e303d] shadow-2xl max-w-sm space-y-3 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#cd4628]" />
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Map Coordinates</h4>
              </div>
              <button
                onClick={() => setClickedCoord(null)}
                className="text-xs text-[#71737e] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-[#0e0f13] border border-[#252631] font-mono text-xs text-[#d1d4de] space-y-1">
              <div>Rust Grid: <strong className="text-[#fb923c] font-bold">{clickedCoord.grid}</strong></div>
              <div>Position: <span className="text-[#38bdf8]">X: {clickedCoord.x}, Z: {clickedCoord.z}</span></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => teleportAdminToCoord(clickedCoord.x, clickedCoord.z)}
                className="px-3 py-2 rounded-xl bg-[#cd4628] hover:bg-[#ba3b1f] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Crosshair className="w-3.5 h-3.5" />
                <span>Teleport Here</span>
              </button>

              <button
                onClick={() => spawnAirdropAtCoord(clickedCoord.x, clickedCoord.z)}
                className="px-3 py-2 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Drop Airdrop</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Right Column: Player Roster & Selected Player Actions */}
      <div className="w-full lg:w-80 flex flex-col gap-4">
        
        {/* Search Roster */}
        <div className="bg-[#15161c] p-4 rounded-2xl border border-[#24252e] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white uppercase tracking-wider">
              <Users className="w-4 h-4 text-[#cd4628]" />
              <span>Players on Map ({players.length})</span>
            </div>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#71737e]" />
            <input
              type="text"
              placeholder="Search & locate player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0e0f13] text-xs text-white pl-8 pr-3 py-2 rounded-xl border border-[#282a35] focus:outline-none focus:border-[#cd4628]"
            />
          </div>
        </div>

        {/* Player Selection Card / Quick Moderation */}
        {selectedPlayer ? (
          <div className="bg-[#15161c] p-5 rounded-2xl border border-[#cd4628]/60 shadow-xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#cd4628] flex items-center justify-center text-white font-extrabold text-sm shadow">
                  {selectedPlayer.DisplayName?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{selectedPlayer.DisplayName}</h3>
                  <p className="text-[10px] text-[#71737e] font-mono">{selectedPlayer.SteamID}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-xs text-[#71737e] hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Position Details */}
            {selectedPlayer.Pos && (
              <div className="p-3 rounded-xl bg-[#0e0f13] border border-[#252631] font-mono text-xs space-y-1">
                <div className="flex items-center justify-between text-[#8e909a]">
                  <span>Grid Square:</span>
                  <strong className="text-[#fb923c]">{toGridCode(selectedPlayer.Pos.x, selectedPlayer.Pos.z)}</strong>
                </div>
                <div className="flex items-center justify-between text-[#8e909a]">
                  <span>In-Game XYZ:</span>
                  <span className="text-[#38bdf8]">
                    {Math.round(selectedPlayer.Pos.x)}, {Math.round(selectedPlayer.Pos.y)}, {Math.round(selectedPlayer.Pos.z)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#8e909a]">
                  <span>Health:</span>
                  <span className="text-[#4ade80] font-bold">{selectedPlayer.Health || 100} HP</span>
                </div>
              </div>
            )}

            {/* Quick Moderation Actions */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onSendCommand(`teleport ${selectedPlayer.SteamID}`)}
                  className="px-3 py-2 rounded-xl bg-[#1f212a] hover:bg-[#282a35] text-xs font-bold text-white border border-[#2e303d] transition-colors flex items-center justify-center gap-1.5"
                >
                  <Navigation className="w-3.5 h-3.5 text-[#60a5fa]" />
                  <span>Teleport To</span>
                </button>

                <button
                  onClick={() => onSendCommand(`teleport ${selectedPlayer.SteamID} @me`)}
                  className="px-3 py-2 rounded-xl bg-[#1f212a] hover:bg-[#282a35] text-xs font-bold text-white border border-[#2e303d] transition-colors flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-[#fb923c]" />
                  <span>Bring Player</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => onGiveItemToPlayer?.(selectedPlayer)}
                  className="p-2 rounded-xl bg-[#1f212a] hover:bg-[#282a35] text-xs font-bold text-[#fb923c] border border-[#2e303d] transition-colors flex items-center justify-center"
                  title="Give Item"
                >
                  <Package className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onSendCommand(`mute ${selectedPlayer.SteamID}`)}
                  className="p-2 rounded-xl bg-[#1f212a] hover:bg-[#282a35] text-xs font-bold text-[#facc15] border border-[#2e303d] transition-colors flex items-center justify-center"
                  title="Mute Player"
                >
                  <VolumeX className="w-4 h-4" />
                </button>

                <button
                  onClick={() => onSendCommand(`entity.kill ${selectedPlayer.SteamID}`)}
                  className="p-2 rounded-xl bg-[#1f212a] hover:bg-[#3d1a1a] text-xs font-bold text-[#f87171] border border-[#2e303d] transition-colors flex items-center justify-center"
                  title="Kill Player"
                >
                  <Skull className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => onSendCommand(`kick ${selectedPlayer.SteamID} "Kicked by admin"`)}
                  className="px-3 py-2 rounded-xl bg-[#2a1a14] hover:bg-[#3d2417] text-[#fb923c] border border-[#4d2f1d] text-xs font-bold transition-colors"
                >
                  Kick
                </button>
                <button
                  onClick={() => onSendCommand(`ban ${selectedPlayer.SteamID} "Banned by admin"`)}
                  className="px-3 py-2 rounded-xl bg-[#2d1414] hover:bg-[#421a1a] text-[#f87171] border border-[#521d1d] text-xs font-bold transition-colors"
                >
                  Ban
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="bg-[#15161c] p-4 rounded-2xl border border-[#24252e] text-center text-xs text-[#71737e] py-6">
            Click on any player marker on the map to view coordinates & quick actions.
          </div>
        )}

        {/* Scrollable Player List */}
        <div className="flex-1 bg-[#15161c] rounded-2xl border border-[#24252e] p-3 overflow-y-auto space-y-1.5 max-h-[350px]">
          {filteredPlayers.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#676a79]">
              No players found
            </div>
          ) : (
            filteredPlayers.map(player => (
              <button
                key={player.SteamID}
                onClick={() => focusPlayer(player)}
                className={`w-full p-2.5 rounded-xl text-left transition-colors flex items-center justify-between group ${
                  selectedPlayer?.SteamID === player.SteamID
                    ? 'bg-[#291b17] border border-[#cd4628]'
                    : 'bg-[#191b22] hover:bg-[#20222a] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-full bg-[#2a2c36] flex items-center justify-center text-[10px] font-bold text-white">
                    {player.DisplayName?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white group-hover:text-[#fdba74] transition-colors">
                      {player.DisplayName}
                    </h4>
                    <span className="text-[10px] text-[#71737e] font-mono">
                      {player.Pos ? toGridCode(player.Pos.x, player.Pos.z) : 'Grid ?'}
                    </span>
                  </div>
                </div>

                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#13271b] text-[#4ade80]">
                  {player.Health || 100} HP
                </span>
              </button>
            ))
          )}
        </div>

      </div>

    </div>
  );
}
