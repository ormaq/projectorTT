const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve static assets
app.use(express.static("public"));

// Add this route to serve control.html
app.get('/control', (req, res) => {
  res.sendFile(__dirname + '/public/control.html');
});

// ---------- Application state ----------
const state = {
  scores: [0, 0],      // [player1, player2]
  serverIdx: 0,        // 0 | 1 – who is serving
  alignMode: false,    // draw 9×5 calibration box
  showEffects: true    // enable random animations
};

// ---------- WebSocket events ----------
io.on("connection", socket => {
  // send current state to newly‑connected client
  socket.emit("state", state);

  // Increment a player's score (data = 0 | 1)
  socket.on("score", idx => {
    if (idx === 0 || idx === 1) {
      state.scores[idx]++;
      broadcast();
    }
  });

  // Overwrite part of the state (e.g. from settings panel)
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
  console.log(`🏓  Table‑tennis scoreboard running on http://localhost:${PORT}`);
});