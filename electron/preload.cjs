const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  notify: (data) => ipcRenderer.invoke('app:notify', data),
  minimize: () => ipcRenderer.invoke('app:minimize'),
  maximize: () => ipcRenderer.invoke('app:maximize'),
  close: () => ipcRenderer.invoke('app:close'),
  getConfig: () => ipcRenderer.invoke('storage:get-all'),
  saveConfig: (config) => ipcRenderer.invoke('storage:save-all', config),
  isDesktop: true
});
