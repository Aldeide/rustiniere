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
  Maximize2,
  Image as ImageIcon,
  Upload,
  Settings2,
  Eye,
  EyeOff,
  Crosshair as TargetIcon
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

// Helper to safely extract coordinates from any Facepunch or Oxide player schema
export const getPlayerCoords = (player) => {
  if (!player) return null;
  const p = player.Position || player.Pos || player.position || player.pos;
  if (!p) return null;
  const x = typeof p.x === 'number' ? p.x : (typeof p.X === 'number' ? p.X : parseFloat(p.x || p.X || 0));
  const z = typeof p.z === 'number' ? p.z : (typeof p.Z === 'number' ? p.Z : parseFloat(p.z || p.Z || 0));
  const y = typeof p.y === 'number' ? p.y : (typeof p.Y === 'number' ? p.Y : parseFloat(p.y || p.Y || 0));
  if (isNaN(x) || isNaN(z)) return null;
  return { x, y, z };
};

export default function RustMap({ 
  players = [], 
  mapEvents = [], 
  serverInfo, 
  activeServer,
  onSendCommand, 
  onGiveItemToPlayer 
}) {
  const worldSize = Number(serverInfo?.WorldSize) || 4000;
  const halfSize = worldSize / 2;

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [clickedCoord, setClickedCoord] = useState(null);
  const [hoverCoord, setHoverCoord] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionStatus, setActionStatus] = useState(null);

  // Layer toggles
  const [showGrid, setShowGrid] = useState(true);
  const [showMonuments, setShowMonuments] = useState(true);
  const [showPlayerLabels, setShowPlayerLabels] = useState(true);
  const [showEvents, setShowEvents] = useState(true);
  const [showRoster, setShowRoster] = useState(true);

  // Map Image Customization
  const [isMapSettingsOpen, setIsMapSettingsOpen] = useState(false);
  const [mapImageUrl, setMapImageUrl] = useState('');
  const [imageOpacity, setImageOpacity] = useState(100);
  const [imageError, setImageError] = useState(false);

  const containerRef = useRef(null);
  const fileInputRef = useRef(null);

  // Load saved map image for this server
  useEffect(() => {
    if (activeServer) {
      const savedUrl = localStorage.getItem(`rustiniere_map_image_${activeServer.id}`) || '';
      setMapImageUrl(savedUrl);
      setImageError(false);
    }
  }, [activeServer?.id]);

  const handleSaveMapImage = (url) => {
    setMapImageUrl(url);
    setImageError(false);
    if (activeServer) {
      localStorage.setItem(`rustiniere_map_image_${activeServer.id}`, url);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          handleSaveMapImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Convert Rust in-game (x, z) to percentage (0% to 100%) on the square map
  const toMapPercent = (x, z) => {
    const px = ((x + halfSize) / worldSize) * 100;
    const py = ((-z + halfSize) / worldSize) * 100; // Invert Y because North (+Z) is at the top
    return {
      left: `${Math.max(0, Math.min(100, px))}%`,
      top: `${Math.max(0, Math.min(100, py))}%`,
      numX: px,
      numY: py
    };
  };

  // Convert Rust coordinate (X, Z) to standard alphanumeric grid (e.g. G14)
  const toGridCode = (x, z) => {
    const gridSize = 146.3; // Standard Rust grid cell size (146.3m)
    const cols = 'ABCDEFGHIJKLMNOPQRSTUVWXYZAAABACADAE';
    const colIdx = Math.max(0, Math.floor((x + halfSize) / gridSize));
    const rowIdx = Math.max(0, Math.floor((-z + halfSize) / gridSize));
    const colChar = cols[colIdx] || 'A';
    return `${colChar}${rowIdx}`;
  };

  // Mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    setZoom(prev => Math.min(4.0, Math.max(0.5, prev + delta)));
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
      const mapBox = 800 * zoom;
      const originX = rect.left + rect.width / 2 + pan.x - mapBox / 2;
      const originY = rect.top + rect.height / 2 + pan.y - mapBox / 2;

      const normX = (e.clientX - originX) / mapBox;
      const normY = (e.clientY - originY) / mapBox;

      if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
        const rustX = Math.round((normX * worldSize) - halfSize);
        const rustZ = Math.round(halfSize - (normY * worldSize));
        setHoverCoord({ x: rustX, z: rustZ, grid: toGridCode(rustX, rustZ) });
      } else {
        setHoverCoord(null);
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
      const mapBox = 800 * zoom;
      const originX = rect.left + rect.width / 2 + pan.x - mapBox / 2;
      const originY = rect.top + rect.height / 2 + pan.y - mapBox / 2;

      const normX = (e.clientX - originX) / mapBox;
      const normY = (e.clientY - originY) / mapBox;

      if (normX >= 0 && normX <= 1 && normY >= 0 && normY <= 1) {
        const rustX = Math.round((normX * worldSize) - halfSize);
        const rustZ = Math.round(halfSize - (normY * worldSize));
        setClickedCoord({
          x: rustX,
          z: rustZ,
          grid: toGridCode(rustX, rustZ)
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

  const centerOnPlayer = (player) => {
    const coords = getPlayerCoords(player);
    if (!coords) return;

    setSelectedPlayer(player);
    setClickedCoord(null);

    const normX = (coords.x + halfSize) / worldSize;
    const normY = (-coords.z + halfSize) / worldSize;

    const targetPanX = (0.5 - normX) * 800 * zoom;
    const targetPanY = (0.5 - normY) * 800 * zoom;

    setPan({ x: targetPanX, y: targetPanY });
    setZoom(1.8);
  };

  const triggerAction = async (command, label) => {
    try {
      await onSendCommand(command);
      setActionStatus(`Executed: ${label}`);
      setTimeout(() => setActionStatus(null), 3000);
    } catch (e) {
      setActionStatus(`Failed: ${e.message}`);
      setTimeout(() => setActionStatus(null), 3000);
    }
  };

  // Players matching search query
  const visiblePlayers = useMemo(() => {
    return players.filter(p => {
      const name = (p.DisplayName || '').toLowerCase();
      const steamid = (p.SteamID || '').toLowerCase();
      const query = searchQuery.toLowerCase();
      return name.includes(query) || steamid.includes(query);
    });
  }, [players, searchQuery]);

  return (
    <div className="flex h-[calc(100vh-140px)] bg-[#101115] rounded-2xl border border-[#23242c] overflow-hidden shadow-2xl relative select-none">
      
      {/* Main Map Viewport */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Top Floating Map Controls Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
          
          {/* Coordinates HUD */}
          <div className="flex items-center gap-2 pointer-events-auto bg-[#16171ee6] backdrop-blur-md px-3.5 py-2 rounded-xl border border-[#282a36] shadow-xl">
            <Compass className="w-4 h-4 text-[#cd4628]" />
            <div className="flex items-center gap-3 font-mono text-xs">
              <span className="text-[#8e909a]">
                Grid: <strong className="text-[#fb923c] font-bold text-sm">{hoverCoord?.grid || '---'}</strong>
              </span>
              <span className="text-[#595c6c]">|</span>
              <span className="text-[#8e909a]">
                X: <strong className="text-white">{hoverCoord ? hoverCoord.x : '---'}</strong> Z: <strong className="text-white">{hoverCoord ? hoverCoord.z : '---'}</strong>
              </span>
              <span className="text-[#595c6c]">|</span>
              <span className="text-[#60a5fa] text-[11px]">
                {worldSize}m Map
              </span>
            </div>
          </div>

          {/* Layer & Tool Controls */}
          <div className="flex items-center gap-1.5 pointer-events-auto bg-[#16171ee6] backdrop-blur-md p-1.5 rounded-xl border border-[#282a36] shadow-xl">
            <button
              onClick={() => setShowGrid(!showGrid)}
              title="Toggle Grid Lines"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showGrid ? 'bg-[#cd4628] text-white shadow' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Grid
            </button>

            <button
              onClick={() => setShowMonuments(!showMonuments)}
              title="Toggle Monument Markers"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showMonuments ? 'bg-[#cd4628] text-white shadow' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Monuments
            </button>

            <button
              onClick={() => setShowPlayerLabels(!showPlayerLabels)}
              title="Toggle Player Names & Health"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showPlayerLabels ? 'bg-[#cd4628] text-white shadow' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Names
            </button>

            <button
              onClick={() => setShowEvents(!showEvents)}
              title="Toggle Heli & Cargo Trackers"
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                showEvents ? 'bg-[#cd4628] text-white shadow' : 'text-[#8e909a] hover:text-white'
              }`}
            >
              Events
            </button>

            <div className="w-[1px] h-4 bg-[#2b2d38] mx-1" />

            <button
              onClick={() => setIsMapSettingsOpen(true)}
              className={`p-1.5 rounded-lg transition-colors ${
                mapImageUrl ? 'text-[#38bdf8] bg-[#1a2c3d]' : 'text-[#8e909a] hover:text-white hover:bg-[#20222a]'
              }`}
              title="Map Image Settings / Custom Map Render"
            >
              <ImageIcon className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowRoster(!showRoster)}
              className={`p-1.5 rounded-lg transition-colors ${
                showRoster ? 'text-[#4ade80] bg-[#162e22]' : 'text-[#8e909a] hover:text-white hover:bg-[#20222a]'
              }`}
              title="Toggle Player Radar Drawer"
            >
              <Users className="w-4 h-4" />
            </button>

            <div className="w-[1px] h-4 bg-[#2b2d38] mx-1" />

            <button
              onClick={() => setZoom(prev => Math.min(4.0, prev + 0.3))}
              className="p-1.5 rounded-lg text-[#8e909a] hover:text-white hover:bg-[#20222a] transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>

            <button
              onClick={() => setZoom(prev => Math.max(0.5, prev - 0.3))}
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

        {/* Action Status Notification Toast */}
        {actionStatus && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 px-4 py-2 rounded-xl bg-[#1e1b15] border border-[#d97706] text-xs font-bold text-[#fde68a] shadow-2xl animate-fade-in">
            {actionStatus}
          </div>
        )}

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
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
              width: '800px',
              height: '800px'
            }}
            className="relative select-none shadow-2xl rounded-3xl overflow-hidden border border-[#1e3448]"
          >
            
            {/* 1. Map Image or Procedural Terrain Background */}
            {mapImageUrl && !imageError ? (
              <div className="absolute inset-0 bg-[#07131e]">
                <img 
                  src={mapImageUrl} 
                  alt="Rust Map Render" 
                  onError={() => setImageError(true)}
                  style={{ opacity: imageOpacity / 100 }}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
              </div>
            ) : (
              <div className="absolute inset-0 bg-[#0c1f2e]">
                {/* Subtle Ocean Waves */}
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:24px_24px]" />

                {/* Island Landmass Contour */}
                <div 
                  className="absolute inset-[6%] rounded-[48%_52%_45%_55%/50%_45%_55%_50%] bg-[#1a3826] border-[16px] border-[#a39462]/35 shadow-inner"
                  style={{
                    background: 'radial-gradient(ellipse at 50% 30%, #475569 0%, #1e3a2b 40%, #172e22 75%, #a39462 100%)'
                  }}
                >
                  {/* Northern Snow Biome */}
                  <div className="absolute top-0 inset-x-0 h-48 rounded-t-[50%] bg-gradient-to-b from-[#e2e8f0]/40 to-transparent pointer-events-none" />

                  {/* Southern Desert Biome */}
                  <div className="absolute bottom-0 inset-x-0 h-48 rounded-b-[50%] bg-gradient-to-t from-[#ca8a04]/30 to-transparent pointer-events-none" />

                  {/* Mountain Highlights */}
                  <div className="absolute top-1/3 left-1/4 w-44 h-28 rounded-full bg-[#334155]/60 blur-md pointer-events-none" />
                  <div className="absolute top-1/2 right-1/4 w-52 h-36 rounded-full bg-[#334155]/60 blur-md pointer-events-none" />
                </div>
              </div>
            )}

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
                          <span className="text-[8px] font-mono font-bold text-[#38bdf8]/40 select-none">
                            {cellCode}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}

            {/* 3. Monuments & Landmarks */}
            {showMonuments && MONUMENTS.map(mon => {
              const pos = toMapPercent(mon.x, mon.z);
              return (
                <div
                  key={mon.id}
                  style={{ left: pos.left, top: pos.top }}
                  className="interactive-marker absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto cursor-pointer group z-10"
                >
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs shadow-lg border transition-transform group-hover:scale-125 ${
                    mon.tier === 'tier3' 
                      ? 'bg-[#cd4628]/80 border-[#ea580c]' 
                      : mon.tier === 'tier2'
                      ? 'bg-[#2563eb]/80 border-[#60a5fa]'
                      : mon.tier === 'safe'
                      ? 'bg-[#16a34a]/80 border-[#4ade80]'
                      : 'bg-[#475569]/80 border-[#94a3b8]'
                  }`}>
                    <span>{mon.icon}</span>
                  </div>
                  <span className="mt-0.5 text-[8px] font-bold px-1.5 py-0.2 rounded bg-black/80 text-white border border-[#2f313c] whitespace-nowrap opacity-75 group-hover:opacity-100 shadow transition-opacity">
                    {mon.name}
                  </span>
                </div>
              );
            })}

            {/* 4. Live Game Events (Heli / Cargo / Airdrops) */}
            {showEvents && mapEvents.map(evt => {
              const pos = toMapPercent(evt.x || 0, evt.z || 0);
              return (
                <div
                  key={evt.id}
                  style={{ left: pos.left, top: pos.top }}
                  className="interactive-marker absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center pointer-events-auto cursor-pointer group z-20 animate-bounce"
                >
                  <div className="w-8 h-8 rounded-full bg-[#e11d48] text-white flex items-center justify-center shadow-lg shadow-rose-500/40 border-2 border-white ring-4 ring-rose-500/30">
                    {evt.type === 'heli' ? '🚁' : evt.type === 'cargo' ? '🚢' : '🪂'}
                  </div>
                  <span className="mt-0.5 text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-black/90 text-white border border-rose-500 whitespace-nowrap shadow-lg">
                    {evt.name}
                  </span>
                </div>
              );
            })}

            {/* 5. Live Player Markers (Handles all position formats) */}
            {players.map(player => {
              const coords = getPlayerCoords(player);
              if (!coords) return null;

              const pos = toMapPercent(coords.x, coords.z);
              const isSelected = selectedPlayer?.SteamID === player.SteamID;
              const health = Math.round(Number(player.Health) || 100);
              const isHealthy = health > 60;
              const isWounded = health <= 20;

              return (
                <div
                  key={player.SteamID || player.DisplayName}
                  style={{ left: pos.left, top: pos.top }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPlayer(player);
                    setClickedCoord(null);
                  }}
                  className="interactive-marker absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center cursor-pointer z-30 group transition-all duration-300 pointer-events-auto"
                >
                  {/* Ping Ring Effect on Selected Player */}
                  {isSelected && (
                    <div className="absolute -inset-2 rounded-full bg-[#cd4628] opacity-50 animate-ping" />
                  )}

                  {/* Player Dot Marker */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-extrabold text-white border-2 shadow-xl transition-transform group-hover:scale-125 ${
                    isSelected 
                      ? 'bg-[#cd4628] border-white scale-125 ring-4 ring-[#cd4628]/50 shadow-[#cd4628]/50' 
                      : isWounded
                      ? 'bg-[#dc2626] border-[#fca5a5]'
                      : isHealthy 
                      ? 'bg-[#16a34a] border-[#86efac]'
                      : 'bg-[#b45309] border-[#fde047]'
                  }`}>
                    {player.DisplayName ? player.DisplayName.charAt(0).toUpperCase() : 'P'}
                  </div>

                  {/* Player Label */}
                  {showPlayerLabels && (
                    <div className="mt-1 flex flex-col items-center pointer-events-none">
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-black/90 text-white border border-[#2f313c] whitespace-nowrap shadow-lg">
                        {player.DisplayName}
                      </span>
                      <span className={`text-[8px] font-mono px-1 rounded -mt-0.5 font-bold shadow ${
                        isHealthy ? 'text-[#4ade80] bg-black/90' : isWounded ? 'text-[#f87171] bg-black/90' : 'text-[#facc15] bg-black/90'
                      }`}>
                        {health} HP
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

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={() => triggerAction(`supply.call ${clickedCoord.x} ${clickedCoord.z}`, `Airdrop at ${clickedCoord.grid}`)}
                className="px-3 py-2 rounded-xl bg-[#20222a] hover:bg-[#cd4628] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <Plane className="w-3.5 h-3.5" />
                <span>Drop Airdrop</span>
              </button>

              <button
                onClick={() => triggerAction(`heli.strafe ${clickedCoord.x} ${clickedCoord.z}`, `Patrol Heli to ${clickedCoord.grid}`)}
                className="px-3 py-2 rounded-xl bg-[#20222a] hover:bg-[#cd4628] text-white text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>🚁 Send Heli</span>
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Right-Side Live Player Radar Drawer */}
      {showRoster && (
        <div className="w-72 bg-[#14151a] border-l border-[#23242c] flex flex-col h-full z-20">
          
          {/* Header */}
          <div className="p-4 border-b border-[#23242c] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#cd4628]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Radar ({players.length})
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#4ade80] bg-[#132b1f] border border-[#1f4a33] px-2 py-0.5 rounded-full font-bold">
                ● Live
              </span>
            </div>

            {/* Search filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#71737e]" />
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#0d0e12] text-xs text-white pl-8 pr-3 py-1.5 rounded-xl border border-[#252631] focus:outline-none focus:border-[#cd4628]"
              />
            </div>
          </div>

          {/* Player List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {visiblePlayers.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#5f6273]">
                {players.length === 0 ? 'No players currently online on server.' : 'No players match your search.'}
              </div>
            ) : (
              visiblePlayers.map(p => {
                const coords = getPlayerCoords(p);
                const isSelected = selectedPlayer?.SteamID === p.SteamID;
                const gridCode = coords ? toGridCode(coords.x, coords.z) : 'N/A';
                const health = Math.round(Number(p.Health) || 100);

                return (
                  <div
                    key={p.SteamID || p.DisplayName}
                    onClick={() => centerOnPlayer(p)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between gap-2 ${
                      isSelected 
                        ? 'bg-[#2b1f1a] border-[#ea580c] shadow-lg shadow-[#cd4628]/20' 
                        : 'bg-[#181920] border-[#252631] hover:bg-[#1f2029] hover:border-[#353744]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#cd4628] to-[#ea580c] text-white flex items-center justify-center text-xs font-bold shrink-0">
                        {p.DisplayName ? p.DisplayName.charAt(0).toUpperCase() : 'P'}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">
                          {p.DisplayName}
                        </div>
                        <div className="text-[10px] text-[#71737e] flex items-center gap-2">
                          <span className="font-mono text-[#38bdf8] font-bold">{gridCode}</span>
                          <span>•</span>
                          <span className="text-[#4ade80] font-mono">{health} HP</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        centerOnPlayer(p);
                      }}
                      title="Focus on Map"
                      className="p-1 rounded bg-[#252733] hover:bg-[#cd4628] text-[#8e909a] hover:text-white transition-colors"
                    >
                      <TargetIcon className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Player Details Card */}
          {selectedPlayer && (
            <div className="p-4 border-t border-[#23242c] bg-[#16171e] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white truncate max-w-[150px]">
                  {selectedPlayer.DisplayName}
                </span>
                <span className="text-[10px] font-mono text-[#8e909a]">
                  {selectedPlayer.Ping || 0} ms
                </span>
              </div>

              {/* Moderation & Admin Actions */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => triggerAction(`teleportpos ${selectedPlayer.SteamID} 0 20 0`, `Teleport to center`)}
                  className="px-2 py-1.5 rounded-lg bg-[#20222a] hover:bg-[#cd4628] text-white text-[11px] font-bold transition-colors"
                >
                  Teleport Center
                </button>

                <button
                  onClick={() => onGiveItemToPlayer && onGiveItemToPlayer(selectedPlayer)}
                  className="px-2 py-1.5 rounded-lg bg-[#20222a] hover:bg-[#cd4628] text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <Package className="w-3 h-3" />
                  <span>Give Item</span>
                </button>

                <button
                  onClick={() => triggerAction(`kick ${selectedPlayer.SteamID} "Kicked by Admin"`, `Kick ${selectedPlayer.DisplayName}`)}
                  className="px-2 py-1.5 rounded-lg bg-[#2b1818] hover:bg-[#dc2626] text-[#f87171] hover:text-white text-[11px] font-bold transition-colors"
                >
                  Kick Player
                </button>

                <button
                  onClick={() => triggerAction(`ban ${selectedPlayer.SteamID} "Banned by Admin"`, `Ban ${selectedPlayer.DisplayName}`)}
                  className="px-2 py-1.5 rounded-lg bg-[#2b1818] hover:bg-[#dc2626] text-[#f87171] hover:text-white text-[11px] font-bold transition-colors flex items-center justify-center gap-1"
                >
                  <ShieldAlert className="w-3 h-3" />
                  <span>Ban</span>
                </button>
              </div>
            </div>
          )}

        </div>
      )}

      {/* Map Image Settings Modal */}
      {isMapSettingsOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#16171d] rounded-2xl border border-[#2a2c38] p-6 max-w-md w-full shadow-2xl space-y-4">
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#cd4628] to-[#ea580c] flex items-center justify-center text-white">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Map Image & Render</h3>
                  <p className="text-xs text-[#71737e]">Load your server's actual map terrain image</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMapSettingsOpen(false)}
                className="text-xs text-[#71737e] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              
              {/* Option A: Direct Image URL */}
              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">
                  Custom Map Image URL
                </label>
                <input
                  type="text"
                  placeholder="https://.../map.jpg or Rust-IO map URL"
                  value={mapImageUrl}
                  onChange={(e) => handleSaveMapImage(e.target.value)}
                  className="w-full bg-[#0e0f13] text-white text-xs font-mono px-3 py-2.5 rounded-xl border border-[#272935] focus:outline-none focus:border-[#cd4628]"
                />
              </div>

              {/* Option B: Local File Upload */}
              <div>
                <label className="block text-xs font-bold text-[#8e909a] uppercase mb-1">
                  Or Upload Map Image From PC
                </label>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#20222a] hover:bg-[#282a35] text-xs font-bold text-white border border-[#2b2d38] flex items-center justify-center gap-2 transition-colors"
                >
                  <Upload className="w-4 h-4 text-[#cd4628]" />
                  <span>Choose PNG / JPG File</span>
                </button>
              </div>

              {/* Option C: Rust-IO auto URL preset */}
              {activeServer && !activeServer.isMock && (
                <div className="p-3 rounded-xl bg-[#101319] border border-[#223042] space-y-2">
                  <span className="text-xs font-bold text-[#93c5fd]">Quick Server Presets:</span>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveMapImage(`http://${activeServer.ip}:${activeServer.port}/map.jpg`)}
                      className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[11px] font-mono text-white transition-colors"
                    >
                      Rust-IO (Port {activeServer.port})
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSaveMapImage(`http://${activeServer.ip}:28016/map.png`)}
                      className="px-2.5 py-1 rounded bg-[#1e293b] hover:bg-[#334155] text-[11px] font-mono text-white transition-colors"
                    >
                      WebRCON (Port 28016)
                    </button>
                  </div>
                </div>
              )}

              {/* Opacity Slider */}
              <div>
                <div className="flex items-center justify-between text-xs text-[#8e909a] mb-1">
                  <span className="font-bold uppercase">Image Opacity</span>
                  <span className="font-mono text-white font-bold">{imageOpacity}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={imageOpacity}
                  onChange={(e) => setImageOpacity(Number(e.target.value))}
                  className="w-full accent-[#cd4628] bg-[#0e0f13] rounded-lg cursor-pointer"
                />
              </div>

              {/* Reset to Procedural */}
              {mapImageUrl && (
                <button
                  type="button"
                  onClick={() => handleSaveMapImage('')}
                  className="w-full py-2 rounded-xl bg-[#2a1717] hover:bg-[#3d1e1e] text-xs font-bold text-[#f87171] transition-colors"
                >
                  Reset to Procedural Vector Map
                </button>
              )}

            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setIsMapSettingsOpen(false)}
                className="px-5 py-2 rounded-xl bg-[#cd4628] text-white text-xs font-bold hover:bg-[#ba3e22] transition-colors"
              >
                Apply & Close
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
