require("dotenv").config();

const http = require("http");
const { Server } = require("socket.io");

const connectDB = require("./config/db");
const app = require("./app");
const { initChatSocket } = require("./socket/amasha-chatSocket");

connectDB();

const PORT = process.env.PORT || 5000;

// Socket.IO rides on the same HTTP server as Express so the chat can push
// messages in realtime while REST stays the persisted history.
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

initChatSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});