const { app, BrowserWindow, Tray, Menu, nativeImage, ipcMain } = require("electron");
const path = require("path");
const DiscordRPC = require("discord-rpc");

const CLIENT_ID = "1255462235958939689";
const API_BASE = "https://api.lunaranime.ru";
const POLL_INTERVAL = 5_000;
const PROTOCOL = "lunaranime";

let mainWindow = null;
let tray = null;
let rpcClient = null;
let pollTimer = null;
let authToken = null;
let rpcReady = false;
let alwaysUseLunarLogo = false;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", (_e, argv) => {
    handleProtocolUrl(argv.find(a => a.startsWith(`${PROTOCOL}://`)));
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

if (process.defaultApp) {
  app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
} else {
  app.setAsDefaultProtocolClient(PROTOCOL);
}

function handleProtocolUrl(url) {
  if (!url) return;
  try {
    const parsed = new URL(url);
    const token = parsed.searchParams.get("token");
    if (token && mainWindow) {
      mainWindow.webContents.send("deep-link-token", token);
    }
  } catch {}
}

app.setLoginItemSettings({ openAtLogin: true, openAsHidden: true });

async function connectRPC() {
  if (rpcClient) {
    try { rpcClient.destroy(); } catch {}
  }
  rpcClient = new DiscordRPC.Client({ transport: "ipc" });

  rpcClient.on("ready", () => {
    rpcReady = true;
    if (mainWindow) mainWindow.webContents.send("rpc-status", true);
  });

  rpcClient.on("disconnected", () => {
    rpcReady = false;
    if (mainWindow) mainWindow.webContents.send("rpc-status", false);
    setTimeout(() => connectRPC().catch(() => {}), 30_000);
  });

  try {
    await rpcClient.login({ clientId: CLIENT_ID });
  } catch {
    rpcReady = false;
    if (mainWindow) mainWindow.webContents.send("rpc-status", false);
    setTimeout(() => connectRPC().catch(() => {}), 30_000);
  }
}

async function pollActivity() {
  if (!authToken || !rpcReady) return;

  try {
    fetch(`${API_BASE}/api/discord/heartbeat`, {
      method: "POST",
      headers: { Authorization: authToken },
    }).catch(() => {});

    const res = await fetch(`${API_BASE}/api/discord/activity`, {
      headers: { Authorization: authToken },
    });
    if (!res.ok) return;

    const { activity } = await res.json();

    if (!activity) {
      rpcClient.clearActivity().catch(() => {});
      if (mainWindow) mainWindow.webContents.send("activity", null);
      return;
    }

    const largeImage = alwaysUseLunarLogo
      ? "lunar"
      : (activity.image_url || "lunar");

    const presenceData = {
      details: activity.title,
      state: activity.detail || undefined,
      largeImageKey: largeImage,
      largeImageText: activity.title,
      smallImageKey: activityIcon(activity.activity_type),
      smallImageText: activityLabel(activity.activity_type),
      instance: false,
    };

    if (activity.url) {
      presenceData.buttons = [
        { label: "Watch on LunarAnime", url: activity.url },
      ];
    }

    rpcClient.setActivity(presenceData).catch(() => {});
    if (mainWindow) mainWindow.webContents.send("activity", activity);
  } catch {}
}

function activityIcon(type) {
  switch (type) {
    case "watching": return "watching";
    case "reading_manga": return "manga";
    case "reading_novel": return "novel";
    default: return "logo";
  }
}

function activityLabel(type) {
  switch (type) {
    case "watching": return "Watching";
    case "reading_manga": return "Reading Manga";
    case "reading_novel": return "Reading Novel";
    default: return "Browsing";
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 520,
    resizable: false,
    frame: false,
    transparent: false,
    backgroundColor: "#0a0a0f",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile("renderer.html");

  mainWindow.on("close", (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  const icon = nativeImage.createEmpty();
  tray = new Tray(icon);
  const menu = Menu.buildFromTemplate([
    { label: "Show", click: () => mainWindow && mainWindow.show() },
    { type: "separator" },
    {
      label: "Quit",
      click: () => {
        app.isQuitting = true;
        if (rpcClient) rpcClient.destroy().catch(() => {});
        app.quit();
      },
    },
  ]);
  tray.setToolTip("LunarAnime Presence");
  tray.setContextMenu(menu);
  tray.on("double-click", () => mainWindow && mainWindow.show());
}

ipcMain.handle("login", async (_event, token) => {
  try {
    const res = await fetch(`${API_BASE}/api/animes/profile`, {
      headers: { Authorization: token },
    });
    if (!res.ok) return { ok: false, error: "Invalid token" };
    const data = await res.json();
    authToken = token;

    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(pollActivity, POLL_INTERVAL);
    pollActivity();

    return { ok: true, username: data.data?.username || data.username };
  } catch {
    return { ok: false, error: "Could not reach server" };
  }
});

ipcMain.handle("logout", async () => {
  authToken = null;
  if (pollTimer) clearInterval(pollTimer);
  if (rpcClient && rpcReady) rpcClient.clearActivity().catch(() => {});
  return { ok: true };
});

ipcMain.handle("get-status", () => ({
  rpcConnected: rpcReady,
  loggedIn: !!authToken,
}));

ipcMain.handle("close-window", () => {
  if (mainWindow) mainWindow.hide();
});

ipcMain.handle("quit-app", () => {
  app.isQuitting = true;
  if (rpcClient) rpcClient.destroy().catch(() => {});
  app.quit();
});

ipcMain.handle("set-always-lunar-logo", (_event, value) => {
  alwaysUseLunarLogo = !!value;
  return { ok: true };
});

ipcMain.handle("get-always-lunar-logo", () => {
  return alwaysUseLunarLogo;
});

app.whenReady().then(async () => {
  createWindow();
  createTray();
  connectRPC().catch(() => {});

  const protocolUrl = process.argv.find(a => a.startsWith(`${PROTOCOL}://`));
  if (protocolUrl) handleProtocolUrl(protocolUrl);
});

app.on("open-url", (_e, url) => handleProtocolUrl(url));

app.on("window-all-closed", () => {});

app.on("activate", () => {
  if (mainWindow) mainWindow.show();
});
