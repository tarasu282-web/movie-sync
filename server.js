const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const os = require("os");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

// Keep track of who's in each room, and the last known playback state
// so a person who joins late (or refreshes) gets caught up.
const rooms = {}; // { roomCode: { members: Set, lastState: {time, playing} } }

io.on("connection", (socket) => {
  let currentRoom = null;
  let currentName = null;

  socket.on("join", ({ room, name }) => {
    currentRoom = room;
    currentName = name || "Someone";
    socket.join(room);

    if (!rooms[room]) {
      rooms[room] = { members: new Set(), lastState: { time: 0, playing: false } };
    }
    rooms[room].members.add(socket.id);

    // Tell the newcomer the current state so they can catch up
    socket.emit("sync-state", rooms[room].lastState);

    // Tell everyone else someone joined
    socket.to(room).emit("system-message", `${currentName} joined the room.`);
    io.to(room).emit("presence", { count: rooms[room].members.size });
  });

  const relay = (event) => (payload) => {
    if (!currentRoom) return;
    if (event === "play" || event === "pause" || event === "seek") {
      rooms[currentRoom].lastState = {
        time: payload.time,
        playing: event !== "pause",
      };
    }
    socket.to(currentRoom).emit(event, payload);
  };

  socket.on("play", relay("play"));
  socket.on("pause", relay("pause"));
  socket.on("seek", relay("seek"));
  socket.on("chat", (payload) => {
    if (!currentRoom) return;
    io.to(currentRoom).emit("chat", { name: currentName, text: payload.text });
  });

  // --- WebRTC signaling relay (video chat) ---
  // We don't process any of this, just pass it along to the other person
  // in the room so their browsers can negotiate a direct peer connection.
  socket.on("webrtc-offer", (payload) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("webrtc-offer", payload);
  });
  socket.on("webrtc-answer", (payload) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("webrtc-answer", payload);
  });
  socket.on("webrtc-ice-candidate", (payload) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("webrtc-ice-candidate", payload);
  });
  socket.on("webrtc-hangup", () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit("webrtc-hangup");
  });

  socket.on("disconnect", () => {
    if (currentRoom && rooms[currentRoom]) {
      rooms[currentRoom].members.delete(socket.id);
      socket.to(currentRoom).emit("system-message", `${currentName} left the room.`);
      io.to(currentRoom).emit("presence", { count: rooms[currentRoom].members.size });
    }
  });
});

function getLocalIP() {
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name]) {
      if (iface.family === "IPv4" && !iface.internal) {
        return iface.address;
      }
    }
  }
  return "localhost";
}

server.listen(PORT, () => {
  console.log("");
  console.log("🎬 Movie Sync server is running!");
  console.log("");
  console.log(`   On this laptop, open:   http://localhost:${PORT}`);
  console.log(`   On the same WiFi, open: http://${getLocalIP()}:${PORT}`);
  console.log("");
  console.log("   Share the second link with your girlfriend if she's on the same WiFi.");
  console.log("   If she's on a different network, see the README for tunnel options.");
  console.log("");
});
