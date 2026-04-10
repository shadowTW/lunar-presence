const { contextBridge, ipcRenderer, shell } = require("electron");

contextBridge.exposeInMainWorld("api", {
  login: (token) => ipcRenderer.invoke("login", token),
  logout: () => ipcRenderer.invoke("logout"),
  getStatus: () => ipcRenderer.invoke("get-status"),
  closeWindow: () => ipcRenderer.invoke("close-window"),
  quitApp: () => ipcRenderer.invoke("quit-app"),
  openExternal: (url) => shell.openExternal(url),
  onActivity: (cb) => ipcRenderer.on("activity", (_e, data) => cb(data)),
  onRpcStatus: (cb) => ipcRenderer.on("rpc-status", (_e, connected) => cb(connected)),
  onDeepLinkToken: (cb) => ipcRenderer.on("deep-link-token", (_e, token) => cb(token)),
});
