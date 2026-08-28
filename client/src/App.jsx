import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import RustMap from './components/RustMap';
import Console from './components/Console';
import Players from './components/Players';
import Chat from './components/Chat';
import Triggers from './components/Triggers';
import Scheduler from './components/Scheduler';
import ItemGiver from './components/ItemGiver';
import Bans from './components/Bans';
import ServerModal from './components/ServerModal';
import { api } from './services/api';
import { storage } from './services/storage';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [servers, setServers] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [status, setStatus] = useState({ state: 'disconnected', message: 'Not connected' });
  const [serverInfo, setServerInfo] = useState(null);
  const [players, setPlayers] = useState([]);
  const [mapEvents, setMapEvents] = useState([]);
  const [bans, setBans] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chats, setChats] = useState([]);
  const [telemetry, setTelemetry] = useState({ fpsHistory: [], playerHistory: [] });
  
  // Modals & triggers count
  const [isServerModalOpen, setIsServerModalOpen] = useState(false);
  const [serverToEdit, setServerToEdit] = useState(null);
  const [itemGiverPreselectedPlayer, setItemGiverPreselectedPlayer] = useState(null);
  const [triggersCount, setTriggersCount] = useState(7);
  const [scheduledCount, setScheduledCount] = useState(2);

  const refreshCounts = async () => {
    try {
      const trigs = await api.getTriggers();
      if (trigs) setTriggersCount(trigs.filter(t => t.enabled).length);
      const tasks = await api.getTasks();
      if (tasks) setScheduledCount(tasks.filter(t => t.enabled).length);
    } catch (e) {}
  };

  const loadInitialData = async () => {
    try {
      await storage.initDesktopSync();

      const serverList = await api.getServers();
      setServers(serverList || []);

      const statusRes = await api.getStatus();
      if (statusRes) {
        setActiveServer(statusRes.activeServer);
        setStatus({
          state: statusRes.connected ? 'connected' : 'disconnected',
          message: statusRes.connected ? 'Connected' : 'Disconnected'
        });
        if (statusRes.serverInfo) setServerInfo(statusRes.serverInfo);
        if (statusRes.players) setPlayers(statusRes.players);
        if (statusRes.bans) setBans(statusRes.bans);
        setTelemetry({
          fpsHistory: statusRes.fpsHistory || [],
          playerHistory: statusRes.playerHistory || []
        });
      }

      await refreshCounts();
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  };

  useEffect(() => {
    refreshCounts();
  }, [activeTab]);

  useEffect(() => {
    loadInitialData();

    // Socket.IO event bindings
    const handleStatus = (data) => {
      setStatus({ state: data.state, message: data.message });
      if (data.server) setActiveServer(data.server);
    };

    const handleInfo = (info) => setServerInfo(info);
    const handlePlayers = (pList) => setPlayers(pList);
    const handleMapEvents = (evts) => setMapEvents(evts);
    const handleLogsBatch = (batch) => setLogs(batch);
    const handleChatsBatch = (batch) => setChats(batch);

    const handleLog = (logEntry) => {
      setLogs(prev => [...prev.slice(-400), logEntry]);
    };

    const handleChat = (chatEntry) => {
      setChats(prev => [...prev.slice(-200), chatEntry]);
    };

    const handleTelemetry = (tel) => setTelemetry(tel);

    api.socket.on('server:status', handleStatus);
    api.socket.on('server:info', handleInfo);
    api.socket.on('server:players', handlePlayers);
    api.socket.on('server:map_events', handleMapEvents);
    api.socket.on('server:logs_batch', handleLogsBatch);
    api.socket.on('server:chats_batch', handleChatsBatch);
    api.socket.on('server:log', handleLog);
    api.socket.on('server:chat', handleChat);
    api.socket.on('server:telemetry', handleTelemetry);

    return () => {
      api.socket.off('server:status', handleStatus);
      api.socket.off('server:info', handleInfo);
      api.socket.off('server:players', handlePlayers);
      api.socket.off('server:map_events', handleMapEvents);
      api.socket.off('server:logs_batch', handleLogsBatch);
      api.socket.off('server:chats_batch', handleChatsBatch);
      api.socket.off('server:log', handleLog);
      api.socket.off('server:chat', handleChat);
      api.socket.off('server:telemetry', handleTelemetry);
    };
  }, []);

  const handleSelectServer = async (serverId) => {
    try {
      setStatus({ state: 'connecting', message: 'Connecting...' });
      await api.connectServer(serverId);
      loadInitialData();
    } catch (err) {
      console.error('Failed to switch server:', err);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.disconnectServer();
      setActiveServer(null);
      setStatus({ state: 'disconnected', message: 'Disconnected' });
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const handleSaveServer = async (serverData) => {
    if (serverData.id) {
      await api.updateServer(serverData.id, serverData);
    } else {
      const created = await api.addServer(serverData);
      if (serverData.autoConnect) {
        await api.connectServer(created.id);
      }
    }
    loadInitialData();
  };

  const handleDeleteServer = async (id) => {
    await api.deleteServer(id);
    loadInitialData();
  };

  const handleSendCommand = async (cmd) => {
    const res = await api.sendCommand(cmd);
    if (!res.success) {
      throw new Error(res.error || 'Command execution failed');
    }
    return res.result;
  };

  const handleSendChat = async (msg) => {
    const res = await api.sendChat(msg);
    if (!res.success) {
      throw new Error(res.error || 'Chat broadcast failed');
    }
    return res.result;
  };

  const handleGiveItemToPlayer = (player) => {
    setItemGiverPreselectedPlayer(player);
    setActiveTab('items');
  };

  return (
    <div className="min-h-screen bg-[#0d0e12] flex flex-col font-['Plus_Jakarta_Sans',sans-serif]">
      
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        servers={servers}
        activeServer={activeServer}
        status={status}
        serverInfo={serverInfo}
        onOpenServerModal={(srv) => {
          setServerToEdit(srv);
          setIsServerModalOpen(true);
        }}
        onSelectServer={handleSelectServer}
        onDisconnect={handleDisconnect}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 lg:p-6">
        {activeTab === 'dashboard' && (
          <Dashboard
            serverInfo={serverInfo}
            telemetry={telemetry}
            onSendCommand={handleSendCommand}
            activeServer={activeServer}
            triggersCount={triggersCount}
            scheduledCount={scheduledCount}
          />
        )}

        {activeTab === 'map' && (
          <RustMap
            players={players}
            mapEvents={mapEvents}
            serverInfo={serverInfo}
            onSendCommand={handleSendCommand}
            onGiveItemToPlayer={handleGiveItemToPlayer}
          />
        )}

        {activeTab === 'console' && (
          <Console
            logs={logs}
            onSendCommand={handleSendCommand}
            isConnected={status.state === 'connected'}
          />
        )}

        {activeTab === 'players' && (
          <Players
            players={players}
            onSendCommand={handleSendCommand}
            onGiveItemToPlayer={handleGiveItemToPlayer}
          />
        )}

        {activeTab === 'chat' && (
          <Chat
            chats={chats}
            onSendChat={handleSendChat}
            onSendCommand={handleSendCommand}
            isConnected={status.state === 'connected'}
          />
        )}

        {activeTab === 'triggers' && (
          <Triggers
            onSendCommand={handleSendCommand}
            onTriggersChange={refreshCounts}
          />
        )}

        {activeTab === 'scheduler' && (
          <Scheduler
            onSendCommand={handleSendCommand}
            onTasksChange={refreshCounts}
          />
        )}

        {activeTab === 'items' && (
          <ItemGiver
            players={players}
            preselectedPlayer={itemGiverPreselectedPlayer}
            onSendCommand={handleSendCommand}
          />
        )}

        {activeTab === 'bans' && (
          <Bans
            bans={bans}
            onSendCommand={handleSendCommand}
          />
        )}
      </main>

      {/* Server Profile Modal */}
      <ServerModal
        isOpen={isServerModalOpen}
        onClose={() => setIsServerModalOpen(false)}
        serverToEdit={serverToEdit}
        onSave={handleSaveServer}
        onDelete={handleDeleteServer}
      />

    </div>
  );
}
