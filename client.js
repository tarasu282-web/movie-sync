const socket = io();

const setupScreen = document.getElementById("setup-screen");
const watchScreen = document.getElementById("watch-screen");
const roomInput = document.getElementById("room-input");
const nameInput = document.getElementById("name-input");
const joinBtn = document.getElementById("join-btn");
const roomLabel = document.getElementById("room-label");
const presenceLabel = document.getElementById("presence-label");
const fileInput = document.getElementById("file-input");
const video = document.getElementById("video");
const resyncBtn = document.getElementById("resync-btn");
const chatLog = document.getElementById("chat-log");
const chatInput = document.getElementById("chat-input");
const chatSend = document.getElementById("chat-send");

let room = null;
let myName = null;

// Prevents our own programmatic play/pause/seek (triggered by an incoming
// sync event) from being re-broadcast back to the server as if we did it.
let suppressEmit = false;

joinBtn.addEventListener("click", () => {
  const r = roomInput.value.trim();
  const n = nameInput.value.trim();
  if (!r) return alert("Enter a room code");
  room = r;
  myName = n || "Someone";

  socket.emit("join", { room, name: myName });
  roomLabel.textContent = room;
  setupScreen.classList.add("hidden");
  watchScreen.classList.remove("hidden");
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  video.src = url;
  logSystem(`Loaded local file: ${file.name}. Make sure your partner loads the same movie.`);
});

// --- Outgoing events (only fire when the change was a real user action) ---
video.addEventListener("play", () => {
  if (suppressEmit) return;
  socket.emit("play", { time: video.currentTime });
});

video.addEventListener("pause", () => {
  if (suppressEmit) return;
  socket.emit("pause", { time: video.currentTime });
});

let seekDebounce = null;
video.addEventListener("seeked", () => {
  if (suppressEmit) return;
  clearTimeout(seekDebounce);
  seekDebounce = setTimeout(() => {
    socket.emit("seek", { time: video.currentTime });
  }, 150);
});

resyncBtn.addEventListener("click", () => {
  socket.emit(video.paused ? "pause" : "play", { time: video.currentTime });
  logSystem("Forced a sync using your current playback position.");
});

// --- Incoming events ---
function applyRemote(fn) {
  suppressEmit = true;
  Promise.resolve(fn()).finally(() => {
    setTimeout(() => (suppressEmit = false), 200);
  });
}

socket.on("play", ({ time }) => {
  applyRemote(() => {
    if (Math.abs(video.currentTime - time) > 0.75) video.currentTime = time;
    return video.play();
  });
});

socket.on("pause", ({ time }) => {
  applyRemote(() => {
    video.currentTime = time;
    video.pause();
  });
});

socket.on("seek", ({ time }) => {
  applyRemote(() => {
    video.currentTime = time;
  });
});

socket.on("sync-state", ({ time, playing }) => {
  if (!video.src) return; // nothing loaded yet
  applyRemote(() => {
    video.currentTime = time;
    if (playing) return video.play();
    video.pause();
  });
});

socket.on("presence", ({ count }) => {
  presenceLabel.textContent = `${count} online`;
});

socket.on("system-message", (msg) => logSystem(msg));

// --- Chat ---
function logSystem(text) {
  const el = document.createElement("div");
  el.className = "sys-msg";
  el.textContent = text;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function sendChat() {
  const text = chatInput.value.trim();
  if (!text) return;
  socket.emit("chat", { text });
  chatInput.value = "";
}

chatSend.addEventListener("click", sendChat);
chatInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendChat();
});

socket.on("chat", ({ name, text }) => {
  const el = document.createElement("div");
  el.innerHTML = `<span class="chat-name">${escapeHtml(name)}:</span> ${escapeHtml(text)}`;
  chatLog.appendChild(el);
  chatLog.scrollTop = chatLog.scrollHeight;
});

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}
