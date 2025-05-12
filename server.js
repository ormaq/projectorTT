const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve static assets
app.use(express.static("public"));

app.get('/control', (req, res) => {
  res.sendFile(__dirname + '/public/control.html');
});

// ---------- Application state ----------
const state = {
  scores: [0, 0],
  serverIdx: 0,
  alignMode: false,
  showEffects: true,
  backgroundMode: "defaultBlack",
  showBorder: false,
  freeplay: false,
};

// ---------- WebSocket events ----------
io.on("connection", socket => {
  socket.emit("state", state);

  // Increment a player's score (data = 0 | 1)
  socket.on("score", idx => {
    if (idx === 0 || idx === 1) {
      state.scores[idx]++;
      broadcast();
    }
  });

  socket.on("setState", partial => {
    Object.assign(state, partial);
    broadcast();
  });

  // Reset scores
  socket.on("reset", () => {
    state.scores = [0, 0];
    broadcast();
  });
});

function broadcast() {
  io.emit("state", state);
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🏓  Table-tennis scoreboard running on http://localhost:${PORT}`);
});