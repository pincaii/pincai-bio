
const CONFIG = {
  message: "just click :)",

  discordUserId: "1347491158447620106",

  songs: [
    { name: "Stay", url: "Music/Stay.mp3" },
    { name: "Sorry", url: "Music/Sorry.mp3" },
    { name: "More Than Words", url: "Music/more than words.mp3" },
    { name: "Cupid", url: "Music/Cupid.mp3" },
    { name: "Blinding Lights", url: "Music/Blinding Lights.mp3" },
    { name: "What Do You Mean?", url: "Music/What Do You Mean.mp3" },
    { name: "April Encounter", url: "Music/AprilEncounter.mp3" },
    { name: "Landslide", url: "Music/Landslide.mp3" },
    { name: "her", url: "Music/JVKE - her.mp3" },
    { name: "Ocean eyes", url: "Music/Ocean eyes.mp3" },
    { name: "前前前世", url: "Music/前前前世.mp3" },
  ],
};


const toast = document.getElementById("toast");
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}


const audio = document.getElementById("player-audio") || (() => {
  const a = document.createElement("audio");
  a.id = "player-audio";
  a.preload = "auto";
  document.body.appendChild(a);
  return a;
})();


let autoPlayPending = false;

function tryPlay() {
  if (!audio.src) return;
  autoPlayPending = true;
  audio.play().then(() => { autoPlayPending = false; }).catch(() => {});
}

audio.addEventListener("canplay", () => {
  if (autoPlayPending && audio.paused) {
    audio.play().then(() => { autoPlayPending = false; }).catch(() => {});
  }
});

const playBtn = document.getElementById("player-btn");
const disc = document.getElementById("player-disc");
const iconPlay = document.getElementById("icon-play");
const iconPause = document.getElementById("icon-pause");
const bar = document.getElementById("player-bar");
const barFill = document.getElementById("player-bar-fill");
const barThumb = document.getElementById("player-bar-thumb");
const barRange = document.getElementById("player-bar-range");
let barDragging = false;
const nowEl = document.getElementById("player-now");
const totalEl = document.getElementById("player-total");
const titleEl = document.getElementById("player-title");
const subEl = document.getElementById("player-sub");
const tracklistEl = document.getElementById("tracklist");
const bgImg = document.querySelector(".bg-img");

let currentTrack = -1;

function formatTime(sec) {
  if (!Number.isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function renderTracklist() {
  tracklistEl.innerHTML = "";
  if (CONFIG.songs.length === 0) {
    const li = document.createElement("li");
    li.className = "track track-muted";
    li.innerHTML = `<span class="track-num">♪</span><span class="track-name">No songs yet · add them in script.js</span>`;
    tracklistEl.appendChild(li);
    return;
  }

  CONFIG.songs.forEach((song, i) => {
    const li = document.createElement("li");
    li.className = "track";
    li.innerHTML = `<span class="track-num">${i + 1}</span><span class="track-name"></span>`;
    li.querySelector(".track-name").textContent = song.name;
    li.addEventListener("click", () => selectTrack(i));
    tracklistEl.appendChild(li);
  });
}

function selectTrack(index) {
  currentTrack = index;
  const song = CONFIG.songs[index];
  audio.src = song.url;
  titleEl.textContent = song.name;
  subEl.textContent = "Playing…";
  applyBackground(song);
  loadCover(song.url);
  tryPlay();
  updateActiveTrack();
}

function syncsafe(n) {
  return ((n & 0x7f000000) >> 3) | ((n & 0x7f0000) >> 2) | ((n & 0x7f00) >> 1) | (n & 0x7f);
}

async function extractCover(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const dv = new DataView(buf);
    if (dv.getUint8(0) !== 0x49 || dv.getUint8(1) !== 0x44 || dv.getUint8(2) !== 0x33) return null;
    const ver = dv.getUint8(3);
    const tagSize = syncsafe(dv.getUint32(7));
    let offset = 10;
    if (dv.getUint8(5) & 0x40) {
      offset += ver === 3 ? dv.getUint32(10) : syncsafe(dv.getUint32(10));
    }
    const end = Math.min(10 + tagSize, buf.byteLength);
    while (offset + 10 <= end) {
      const frameId = String.fromCharCode(dv.getUint8(offset), dv.getUint8(offset + 1), dv.getUint8(offset + 2), dv.getUint8(offset + 3));
      const frameSize = ver === 3 ? dv.getUint32(offset + 4) : syncsafe(dv.getUint32(offset + 4));
      if (frameSize <= 0) break;
      if (frameId === "APIC") {
        const data = new Uint8Array(buf, offset + 10, Math.min(frameSize, buf.byteLength - offset - 10));
        const enc = data[0];
        let pos = 1;
        let mime = "";
        while (pos < data.length && data[pos] !== 0) {
          mime += String.fromCharCode(data[pos]);
          pos++;
        }
        pos++;
        pos++;
        if (enc === 1 || enc === 2) {
          while (pos + 1 < data.length && !(data[pos] === 0 && data[pos + 1] === 0)) pos += 2;
          pos += 2;
        } else {
          while (pos < data.length && data[pos] !== 0) pos++;
          pos++;
        }
        if (pos >= data.length) return null;
        const imgData = data.slice(pos);
        const blob = new Blob([imgData], { type: mime || "image/jpeg" });
        return URL.createObjectURL(blob);
      }
      offset += 10 + frameSize;
    }
    return null;
  } catch {
    return null;
  }
}

async function loadCover(url) {
  const coverUrl = await extractCover(url);
  if (coverUrl) {
    disc.style.backgroundImage = `url("${coverUrl}")`;
    disc.style.backgroundSize = "cover";
    disc.style.backgroundPosition = "center";
    disc.textContent = "";
  } else {
    disc.style.backgroundImage = "";
    disc.textContent = "♪";
  }
}

function applyBackground(song) {
  const useCustom = song && (song.name.includes("前前前世") || song.url.includes("前前前世"));
  bgImg.style.display = "";
  if (useCustom) {
    bgImg.src = "IMG/YourName.png";
    bgImg.classList.add("bg-zoom");
  } else {
    bgImg.src = "IMG/background.jpg";
    bgImg.classList.remove("bg-zoom");
  }
}

function updateActiveTrack() {
  const rows = tracklistEl.querySelectorAll(".track");
  rows.forEach((row, i) => row.classList.toggle("active", i === currentTrack));
}

playBtn.addEventListener("click", () => {
  if (CONFIG.songs.length === 0) {
    showToast("No songs yet: add them in script.js");
    return;
  }
  if (currentTrack === -1) {
    selectTrack(0);
    return;
  }
  if (audio.paused) {
    tryPlay();
  } else {
    autoPlayPending = false;
    audio.pause();
  }
});


const prevBtn = document.getElementById("player-prev");
const nextBtn = document.getElementById("player-next");
const muteBtn = document.getElementById("player-mute");
const iconVolume = document.getElementById("icon-volume");
const iconVolumeX = document.getElementById("icon-volume-x");

function skipTrack(dir) {
  if (CONFIG.songs.length === 0) {
    showToast("No songs yet: add them in script.js");
    return;
  }
  if (currentTrack === -1) {
    selectTrack(0);
    return;
  }
  selectTrack((currentTrack + dir + CONFIG.songs.length) % CONFIG.songs.length);
}

prevBtn.addEventListener("click", () => skipTrack(-1));
nextBtn.addEventListener("click", () => skipTrack(1));

muteBtn.addEventListener("click", () => {
  audio.muted = !audio.muted;
  iconVolume.style.display = audio.muted ? "none" : "block";
  iconVolumeX.style.display = audio.muted ? "block" : "none";
  muteBtn.setAttribute("aria-label", audio.muted ? "Unmute" : "Mute");
  muteBtn.title = audio.muted ? "Unmute" : "Mute";
});


const volumeBar = document.getElementById("player-volume");
const volCover = document.getElementById("player-vol-cover");
const volDot = document.getElementById("player-vol-dot");
audio.volume = 0.15;
volumeBar.value = 15;

function paintVolumeCover() {
  const v = Number(volumeBar.value) || 0;
  volCover.style.width = `${100 - v}%`;
  volDot.style.left = `${v}%`;
}

paintVolumeCover();
volumeBar.addEventListener("input", () => {
  audio.volume = volumeBar.value / 100;
  paintVolumeCover();
  if (audio.muted) {
    audio.muted = false;
    iconVolume.style.display = "block";
    iconVolumeX.style.display = "none";
    muteBtn.setAttribute("aria-label", "Mute");
    muteBtn.title = "Mute";
  }
});

audio.addEventListener("play", () => {
  iconPlay.style.display = "none";
  iconPause.style.display = "block";
  disc.classList.add("playing");
  if (currentTrack >= 0) subEl.textContent = "Playing…";
});

audio.addEventListener("pause", () => {
  iconPlay.style.display = "block";
  iconPause.style.display = "none";
  disc.classList.remove("playing");
  if (currentTrack >= 0 && audio.currentTime > 0) subEl.textContent = "Paused";
});

audio.addEventListener("timeupdate", () => {
  if (audio.duration && !barDragging) {
    const pct = (audio.currentTime / audio.duration) * 100;
    barRange.value = Math.round(pct * 10);
    barFill.style.width = `${pct}%`;
    barThumb.style.left = `${pct}%`;
    nowEl.textContent = formatTime(audio.currentTime);
  }
});

audio.addEventListener("loadedmetadata", () => {
  totalEl.textContent = formatTime(audio.duration);
});

audio.addEventListener("ended", () => {
  if (CONFIG.songs.length > 0) {
    selectTrack((currentTrack + 1) % CONFIG.songs.length);
  }
});

barRange.addEventListener("pointerdown", () => {
  barDragging = true;
});

barRange.addEventListener("pointerup", () => {
  barDragging = false;
});

barRange.addEventListener("input", () => {
  const pct = Number(barRange.value) / 10;
  barFill.style.width = `${pct}%`;
  barThumb.style.left = `${pct}%`;
  nowEl.textContent = formatTime((pct / 100) * (audio.duration || 0));
});

barRange.addEventListener("change", () => {
  barDragging = false;
  if (!audio.duration) return;
  const pct = Number(barRange.value) / 10;
  audio.currentTime = (pct / 100) * audio.duration;
});

renderTracklist();

if (CONFIG.songs.length > 0) {
  currentTrack = 0;
  audio.src = CONFIG.songs[0].url;
  titleEl.textContent = CONFIG.songs[0].name;
  updateActiveTrack();
  loadCover(CONFIG.songs[0].url);
}


const overlay = document.getElementById("entry-overlay");
const entryMessage = document.getElementById("entry-message");
entryMessage.textContent = CONFIG.message;

function enterPage() {
  overlay.classList.add("hide");
  if (CONFIG.songs.length === 0) return;
  if (currentTrack === -1) {
    selectTrack(0);
  } else if (CONFIG.songs.length > 0 && audio.paused) {
    subEl.textContent = "Playing…";
    tryPlay();
  }
}

overlay.addEventListener("click", enterPage);
overlay.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    enterPage();
  }
});


const DISCORD = {
  userId: CONFIG.discordUserId,
  profileUrl: `https://discord.com/users/${CONFIG.discordUserId}`,
  apiUrl: `https://api.lanyard.rest/v1/users/${CONFIG.discordUserId}`,
  pollMs: 30000,
};

const dcAvatar = document.getElementById("dc-avatar");
const dcDot = document.getElementById("dc-dot");
const dcName = document.getElementById("dc-name");
const dcActivity = document.getElementById("dc-activity");
const dcActivityRow = document.getElementById("dc-activity-row");
const dcActivityIcon = document.getElementById("dc-activity-icon");
const dcAdd = document.getElementById("dc-add");
const dcDivider = document.getElementById("dc-divider");
const dcDetail = document.getElementById("dc-detail");
const dcAppIcon = document.getElementById("dc-app-icon");
const dcAppName = document.getElementById("dc-app-name");
const dcAppLine1 = document.getElementById("dc-app-line-1");
const dcAppLine2 = document.getElementById("dc-app-line-2");
const dcAppElapsed = document.getElementById("dc-app-elapsed");

dcAppIcon.removeAttribute("src");
dcAppIcon.style.display = "none";

const DC_STATUS = {
  online: { color: "#23a55a", label: "Online" },
  idle: { color: "#f0b232", label: "Idle" },
  dnd: { color: "#f23f43", label: "Do Not Disturb" },
  offline: { color: "#80848e", label: "Offline" },
};

const HYPESQUAD = {
  1: { name: "HypeSquad Bravery", color: "#9c84ef" },
  2: { name: "HypeSquad Brilliance", color: "#f47b67" },
  4: { name: "HypeSquad Balance", color: "#45ddc0" },
};

const HYPESQUAD_PATH =
  "m5.01502 4h13.97008c.1187 0 .215.09992.215.22305v9.97865c0 .0697-.0312.1343-.0837.1767l-6.985 5.5752c-.0389.0313-.0847.0464-.1314.0464-.0466 0-.0924-.0151-.1313-.0464l-6.985-5.5752c-.05252-.0424-.08365-.107-.08365-.1767v-9.97865c0-.12313.0963-.22305.21497-.22305zm7.82148 7.0972 4.1275-2.71296c.1039-.06863.2299.04542.1725.15644l-1.7114 3.36192c-.0403.0807.0182.1756.1079.1756h1.0246c.118 0 .1664.1504.0706.219l-4.6267 3.3175c-.0414.0303-.0978.0303-.1402 0l-4.6267-3.3175c-.0948-.0686-.04639-.219.07059-.219h1.02356c.09076 0 .14925-.0949.10791-.1756l-1.71132-3.36293c-.05648-.11001.06958-.22305.17345-.15543l4.12851 2.71296c.0716.0474.1291.112.1674.1887l.6293 1.2636c.0444.0888.1714.0888.2158 0l.6293-1.2636c.0383-.0767.0958-.1423.1674-.1887z";

let dcActivityStart = null;

function setDcStatus(status) {
  const s = DC_STATUS[status] || DC_STATUS.offline;
  dcDot.style.background = s.color;
  dcDot.title = s.label;
}

function avatarUrl(user) {
  if (!user || !user.id) return "";
  if (user.avatar) {
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
  }
  const idx = Number(user.discriminator || 0) % 5;
  return `https://cdn.discordapp.com/embed/avatars/${idx}.png`;
}

function activityVerb(type) {
  const verbs = {
    0: "Playing",
    1: "Streaming",
    2: "Listening to",
    3: "Watching",
    5: "Competing in",
  };
  return verbs[type] || "Playing";
}

function mainActivity(activities) {
  if (!Array.isArray(activities)) return null;
  return (
    activities.find((a) => a && a.type !== 4 && a.type !== 2 && a.name) ||
    activities.find((a) => a && a.type === 2 && a.name) ||
    null
  );
}

function customStatus(activities) {
  if (!Array.isArray(activities)) return null;
  const cs = activities.find((a) => a && a.type === 4);
  if (!cs) return null;
  return {
    emojiId: cs.emoji && cs.emoji.id ? cs.emoji.id : "",
    emojiName: cs.emoji && cs.emoji.name ? cs.emoji.name : "",
    text: (cs.state || "").trim(),
  };
}

function activityIconUrl(act) {
  if (!act || !act.assets || !act.assets.large_image) return "";
  const img = act.assets.large_image;
  if (act.name === "Spotify" && img.startsWith("spotify:")) {
    return `https://i.scdn.co/image/${img.replace("spotify:", "")}`;
  }
  if (/^https?:\/\//i.test(img)) {
    return img;
  }
  if (img.startsWith("mp:external/")) {
    try {
      const decoded = decodeURIComponent(img.replace(/^mp:external\//, ""));
      if (/^https?:\/\//i.test(decoded)) return decoded;
    } catch {}
    return "";
  }
  if (act.application_id) {
    return `https://cdn.discordapp.com/app-assets/${act.application_id}/${img}.png`;
  }
  return "";
}

function showActivityIcon(url) {
  if (!url) {
    dcActivityIcon.removeAttribute("src");
    dcActivityRow.classList.remove("has-icon");
    return;
  }
  dcActivityRow.classList.add("has-icon");
  dcActivityIcon.onerror = () => {
    dcActivityIcon.removeAttribute("src");
    dcActivityRow.classList.remove("has-icon");
  };
  dcActivityIcon.src = url;
}

function formatElapsed(startMs) {
  if (!startMs) return "";
  const total = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)} elapsed` : `${pad(m)}:${pad(s)} elapsed`;
}

function updateDcElapsed() {
  if (dcActivityStart && !dcDetail.hidden) {
    dcAppElapsed.textContent = formatElapsed(dcActivityStart);
  }
}

function renderDcActivity(activity) {
  dcDetail.hidden = false;
  const iconUrl = activityIconUrl(activity);
  if (iconUrl) {
    dcAppIcon.src = iconUrl;
    dcAppIcon.style.display = "";
  } else {
    dcAppIcon.removeAttribute("src");
    dcAppIcon.style.display = "none";
  }
  dcAppName.textContent = activity.name || "Activity";

  if (activity.name === "Spotify") {
    dcAppLine1.textContent = activity.details || "Song";
    dcAppLine2.textContent = activity.state || "Artist";
    dcAppLine2.style.display = "";
  } else {
    dcAppLine1.textContent = activity.details || "";
    dcAppLine2.textContent = activity.state || "";
    dcAppLine1.style.display = activity.details ? "" : "none";
    dcAppLine2.style.display = activity.state ? "" : "none";
  }

  dcActivityStart =
    activity.timestamps && activity.timestamps.start ? activity.timestamps.start : null;
  updateDcElapsed();
  if (!dcActivityStart) {
    dcAppElapsed.style.display = "none";
  } else {
    dcAppElapsed.style.display = "";
  }
}

function renderDiscord(data) {
  const user = data.discord_user || {};
  setDcStatus(data.discord_status || "offline");

  dcAvatar.src = avatarUrl(user);
  dcName.textContent = user.username ? `@${user.username}` : "Discord";

  const flags = user.public_flags || 0;
  let hs = null;
  for (const flag of Object.keys(HYPESQUAD)) {
    if (flags & Number(flag)) {
      hs = HYPESQUAD[flag];
      break;
    }
  }
  const nameRow = dcName.parentElement;
  const oldHs = nameRow.querySelector(".dc-hs");
  if (oldHs) oldHs.remove();
  if (hs) {
    const span = document.createElement("span");
    span.className = "dc-hs";
    span.title = hs.name;
    span.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path clip-rule="evenodd" d="${HYPESQUAD_PATH}" fill="${hs.color}" fill-rule="evenodd"></path></svg>`;
    nameRow.appendChild(span);
  }

  const act = mainActivity(data.activities);
  const custom = customStatus(data.activities);
  if (act) {
    dcDivider.style.display = "";
    dcActivity.textContent = `${activityVerb(act.type)} ${act.name}`;
    showActivityIcon(activityIconUrl(act));
    renderDcActivity(act);
  } else if (custom) {
    dcDivider.style.display = "none";
    dcActivity.textContent = "";
    dcActivityIcon.removeAttribute("src");
    dcActivityRow.classList.remove("has-icon");
    if (custom.emojiId) {
      const img = document.createElement("img");
      img.className = "dc-emoji";
      img.src = `https://cdn.discordapp.com/emojis/${custom.emojiId}.png`;
      img.alt = "";
      dcActivity.appendChild(img);
    } else if (custom.emojiName) {
      const span = document.createElement("span");
      span.className = "dc-emoji-text";
      span.textContent = custom.emojiName;
      dcActivity.appendChild(span);
    }
    if (custom.text) {
      dcActivity.appendChild(document.createTextNode(" " + custom.text));
    }
    dcDetail.hidden = true;
    dcActivityStart = null;
    dcAppIcon.removeAttribute("src");
    dcAppIcon.style.display = "none";
  } else {
    dcDivider.style.display = "none";
    dcActivity.textContent = data.discord_status === "offline" ? "Offline" : "Currently doing nothing";
    dcActivityIcon.removeAttribute("src");
    dcActivityRow.classList.remove("has-icon");
    dcDetail.hidden = true;
    dcActivityStart = null;
    dcAppIcon.removeAttribute("src");
    dcAppIcon.style.display = "none";
  }
}

function renderDiscordOffline() {
  setDcStatus("offline");
  dcAvatar.src = "https://cdn.discordapp.com/embed/avatars/0.png";
  dcName.textContent = "Discord";
  dcActivity.textContent = "Not connected to Lanyard · join the server to show status";
  dcActivityIcon.removeAttribute("src");
  dcActivityRow.classList.remove("has-icon");
  dcDivider.style.display = "none";
  dcDetail.hidden = true;
  dcActivityStart = null;
  dcAppIcon.removeAttribute("src");
  dcAppIcon.style.display = "none";
  const nameRow = dcName.parentElement;
  const oldHs = nameRow.querySelector(".dc-hs");
  if (oldHs) oldHs.remove();
}

async function pollDiscord() {
  try {
    const res = await fetch(DISCORD.apiUrl, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    if (json.success && json.data) {
      renderDiscord(json.data);
    } else {
      throw new Error("Lanyard 返回了空数据");
    }
  } catch (err) {
    renderDiscordOffline();
  }
}

dcAdd.href = DISCORD.profileUrl;
pollDiscord();
setInterval(pollDiscord, DISCORD.pollMs);
setInterval(updateDcElapsed, 1000);

/* ---------- QQ 弹窗 ---------- */
const qqSocial = document.querySelector(".c-qq");
const qqModal = document.getElementById("qq-modal");
const qqBackdrop = document.getElementById("qq-modal-backdrop");
const qqCopy = document.getElementById("qq-modal-copy");
const qqCancel = document.getElementById("qq-modal-cancel");

qqSocial.addEventListener("click", () => {
  qqModal.hidden = false;
});

qqCancel.addEventListener("click", () => {
  qqModal.hidden = true;
});

qqBackdrop.addEventListener("click", () => {
  qqModal.hidden = true;
});

qqCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText("3452666353");
    showToast("QQ 号已复制");
  } catch {
    const ta = document.createElement("textarea");
    ta.value = "3452666353";
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand("copy");
      showToast("QQ 号已复制");
    } catch {
      showToast("复制失败，请手动记录: 3452666353");
    }
    ta.remove();
  }
  qqModal.hidden = true;
});


const PAGE_TITLE = "品才 · Homepage ";
let titlePos = 0;
setInterval(() => {
  document.title = (PAGE_TITLE + PAGE_TITLE).slice(titlePos, titlePos + PAGE_TITLE.length);
  titlePos = (titlePos + 1) % PAGE_TITLE.length;
}, 500);


/* ---------- Visitors ---------- */
const VISIT_API = "https://abacus.jasoncameron.dev";
const VISIT_NAMESPACE = "pincaii-bio";
const VISIT_KEY = "visits";
const VISIT_SEEN = "pincai-bio:counted";
const VISIT_CACHE = "pincai-bio:last-count";

const visitsEl = document.getElementById("site-visits");

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function showVisits(value) {
  if (visitsEl && Number.isFinite(value)) visitsEl.textContent = value.toLocaleString("en-US");
}

async function readVisits(url) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data.value === "number" ? data.value : null;
  } catch {
    return null;
  }
}

async function initVisits() {
  const cached = Number(readStore(VISIT_CACHE));
  if (cached > 0) showVisits(cached);

  const counted = readStore(VISIT_SEEN) === "1";
  let value = counted ? await readVisits(`${VISIT_API}/get/${VISIT_NAMESPACE}/${VISIT_KEY}`) : null;
  if (value === null) value = await readVisits(`${VISIT_API}/hit/${VISIT_NAMESPACE}/${VISIT_KEY}`);

  if (value !== null) {
    showVisits(value);
    writeStore(VISIT_CACHE, String(value));
    writeStore(VISIT_SEEN, "1");
  }
}

initVisits();
