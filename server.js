const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

// Game state
let game = {
  players: [],
  category: "",
  normalWord: "",
  imposterIndex: -1,
  currentPlayer: 0,
  started: false,
};

const categories = {
  MA: ["Mrs Lowery", "Coach Gill", "Coach Faught", "Chef Bob", "BaseBall Boys"],
  VideoGames: ["Fortnite", "AmongUS", "TF2", "OverWatch", "Roblox"],
  Youtubers: ["Markiplier", "DanTDM", "Jacksepticeye", "PEWDIEPIE", "ssundee"],
  SMPL: ["Will", "Alex", "Luke", "Tanner", "Armaan", "Bryson","Jacob"]
};

const categoryNames = Object.keys(categories);

io.on("connection", (socket) => {
  console.log("A player connected:", socket.id);

  // Player joins
  socket.on("joinGame", (name) => {
    if (!game.started && !game.players.find(p => p.id === socket.id)) {
      game.players.push({ id: socket.id, name, role: "" });
      io.emit("playerList", game.players.map(p => p.name));
    }
  });

  // Start game
  socket.on("startGame", () => {
    if (game.players.length < 3) {
      socket.emit("message", "Need at least 3 players!");
      return;
    }
    game.started = true;

    // Pick category and word
    game.category = categoryNames[Math.floor(Math.random() * categoryNames.length)];
    const wordList = categories[game.category];
    game.normalWord = wordList[Math.floor(Math.random() * wordList.length)];

    // Pick imposter
    game.imposterIndex = Math.floor(Math.random() * game.players.length);

    // Assign roles
    game.players.forEach((p, i) => {
      p.role = (i === game.imposterIndex) ? "IMPOSTER" : game.normalWord;
    });

    // Start first player's turn
    game.currentPlayer = 0;
    io.emit("gameStarted", game.players.length);
    io.to(game.players[game.currentPlayer].id).emit("yourTurn", { category: game.category, role: game.players[game.currentPlayer].role });
  });

  // Next player's turn
  socket.on("nextPlayer", () => {
    game.currentPlayer++;
    if (game.currentPlayer >= game.players.length) {
      io.emit("gameOver", game.players[game.imposterIndex].name);
      game.started = false;
      game.players = [];
    } else {
      io.to(game.players[game.currentPlayer].id).emit("yourTurn", { category: game.category, role: game.players[game.currentPlayer].role });
    }
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected:", socket.id);
    game.players = game.players.filter(p => p.id !== socket.id);
    if (game.players.length < 3) game.started = false;
    io.emit("playerList", game.players.map(p => p.name));
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
