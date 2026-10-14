const ChatMessage = require("../models/amasha-ChatMessage");
const { canAccessChat } = require("../services/amasha-chatAccessService");
const { verifyToken } = require("../utils/kaveesha-jwt");
const { setChatIo } = require("../controllers/amasha-chatController");

// Kept here so the REST notification path (amasha-chatController) can push
// an event into the personal room of every recipient without needing the io
// instance passed through every function call.
let chatIoRef = null;

function getIo() {
  return chatIoRef;
}

// Realtime layer for the in-app chat rooms (donation rescue chats and
// campaign chats). Joining a room repeats the same access check the REST
// routes apply, so a socket connection can never slip into a room the token
// would be refused from over HTTP.
function initChatSocket(io) {
  chatIoRef = io;
  setChatIo(io);

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || "";
      socket.user = verifyToken(token);
      next();
    } catch (error) {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Every authenticated connection automatically joins a personal room
    // (user:<id>) so new-message notifications can be pushed even when the
    // user is not currently inside a chat screen.
    socket.join(`user:${socket.user.id}`);

    socket.on("amasha:chat:join", async (payload, ack) => {
      const { contextType, contextId, peerId } = payload || {};

      const verdict = await canAccessChat({
        userId: socket.user.id,
        contextType,
        contextId,
        peerId,
      });

      if (verdict !== "ok") {
        if (typeof ack === "function") {
          ack({ success: false, message: "Access denied." });
        }
        return;
      }

      // One chat screen at a time — leaving the previous pair room avoids
      // cross-posting events between chats on the same connection.
      for (const room of socket.rooms) {
        if (room.startsWith("chat:")) socket.leave(room);
      }

      // Join the 1-on-1 pair room so only this user and peerId receive events.
      socket.join(ChatMessage.roomFor(contextType, contextId, socket.user.id, peerId));

      if (typeof ack === "function") {
        ack({ success: true });
      }
    });

    socket.on("amasha:chat:leave", () => {
      for (const room of socket.rooms) {
        if (room.startsWith("chat:")) socket.leave(room);
      }
    });
  });
}

// Push a notification event to the personal rooms of every user in `userIds`.
// Called from amasha-chatController.sendMessage() after a message is saved so
// the peer gets a realtime alert without polling.
function emitNotificationToUsers(userIds, payload) {
  if (!chatIoRef || !userIds?.length) return;
  for (const uid of userIds) {
    chatIoRef.to(`user:${uid}`).emit("amasha:notification:new", payload);
  }
}

module.exports = { initChatSocket, getIo, emitNotificationToUsers };
