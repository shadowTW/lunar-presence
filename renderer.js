const $ = (id) => document.getElementById(id);

const rpcDot = $("rpc-dot");
const rpcLabel = $("rpc-label");
const viewLogin = $("view-login");
const viewMain = $("view-main");
const tokenInput = $("token-input");
const btnLogin = $("btn-login");
const loginError = $("login-error");
const displayUsername = $("display-username");
const activityContainer = $("activity-container");
const noActivity = $("no-activity");
const activityImg = $("activity-img");
const activityType = $("activity-type");
const activityTitle = $("activity-title");
const activityDetail = $("activity-detail");
const btnLogout = $("btn-logout");
const lunarLogoToggle = $("lunar-logo-toggle");

const TYPE_LABELS = {
  watching: "Watching",
  reading_manga: "Reading Manga",
  reading_novel: "Reading Novel",
  browsing: "Browsing",
};

async function doLogin(token) {
  btnLogin.disabled = true;
  loginError.style.display = "none";
  const result = await window.api.login(token);
  if (result.ok) {
    displayUsername.textContent = result.username || "Logged In";
    viewLogin.style.display = "none";
    viewMain.style.display = "flex";
    try { localStorage.setItem("lunar_token", token); } catch {}
  } else {
    loginError.textContent = result.error || "Login failed";
    loginError.style.display = "block";
  }
  btnLogin.disabled = false;
  return result.ok;
}

window.api.onRpcStatus((connected) => {
  rpcDot.classList.toggle("connected", connected);
  rpcLabel.textContent = connected ? "Connected to Discord" : "Disconnected from Discord";
});

window.api.getStatus().then(({ rpcConnected }) => {
  rpcDot.classList.toggle("connected", rpcConnected);
  rpcLabel.textContent = rpcConnected ? "Connected to Discord" : "Connecting to Discord…";
});

window.api.onActivity((activity) => {
  if (!activity) {
    activityContainer.style.display = "none";
    noActivity.style.display = "block";
    return;
  }
  activityContainer.style.display = "flex";
  noActivity.style.display = "none";
  activityType.textContent = TYPE_LABELS[activity.activity_type] || "Browsing";
  activityTitle.textContent = activity.title;
  activityDetail.textContent = activity.detail || "";
  if (activity.image_url) {
    activityImg.src = activity.image_url;
    activityImg.style.display = "block";
  } else {
    activityImg.style.display = "none";
  }
});

window.api.onDeepLinkToken(async (token) => {
  if (token) await doLogin(token);
});

btnLogin.addEventListener("click", () => {
  const token = tokenInput.value.trim();
  if (token) doLogin(token);
});

tokenInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") btnLogin.click();
});

btnLogout.addEventListener("click", async () => {
  await window.api.logout();
  try { localStorage.removeItem("lunar_token"); } catch {}
  viewMain.style.display = "none";
  viewLogin.style.display = "flex";
  tokenInput.value = "";
  activityContainer.style.display = "none";
  noActivity.style.display = "block";
});

$("btn-minimize").addEventListener("click", () => window.api.closeWindow());
$("btn-quit").addEventListener("click", () => window.api.quitApp());

lunarLogoToggle.addEventListener("change", async () => {
  const value = lunarLogoToggle.checked;
  await window.api.setAlwaysLunarLogo(value);
  try { localStorage.setItem("lunar_always_logo", value ? "1" : "0"); } catch {}
});

$("btn-get-token").addEventListener("click", () => window.api.openExternal("https://lunaranime.ru/presence-link"));
$("github-link").addEventListener("click", (e) => {
  e.preventDefault();
  window.api.openExternal("https://github.com/shadowTW/lunar-presence");
});

(async () => {
  try {
    const savedLogo = localStorage.getItem("lunar_always_logo");
    if (savedLogo === "1") {
      lunarLogoToggle.checked = true;
      await window.api.setAlwaysLunarLogo(true);
    }

    const saved = localStorage.getItem("lunar_token");
    if (saved) await doLogin(saved);
  } catch {}
})();
