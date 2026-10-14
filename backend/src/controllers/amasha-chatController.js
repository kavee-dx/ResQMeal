const mongoose = require("mongoose");
const ChatMessage = require("../models/amasha-ChatMessage");
const User = require("../models/dushani-User");
const NGOProfile = require("../models/dushani-NGOProfile");
const RecipientProfile = require("../models/dushani-RecipientProfile");
const { canAccessChat } = require("../services/amasha-chatAccessService");
const { getConversations } = require("../services/amasha-chatConversationService");
const { notify } = require("../services/amasha-notificationService");

// Set by amasha-chatSocket.js once Socket.IO is attached in server.js, so the
// REST send path can push the saved message into the pair room in realtime.
let chatIo = null;

function setChatIo(io) {
  chatIo = io;
}

const MAX_TEXT_LENGTH = 500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Signup names live on User.fullName; organisation names live on the role
// profiles. Resolve one display name map for every sender in a page of
// messages instead of one lookup per row.
async function resolveSenderNames(messages) {
  const users = await User.find({
    _id: { $in: messages.map((m) => m.sender) },
  })
    .select("fullName role")
    .lean();

  const names = new Map();
  const orgIds = [];
  for (const user of users) {
    if (user.fullName) names.set(String(user._id), user.fullName);
    if (user.role === "NGO") orgIds.push(user._id);
    if (!user.fullName) orgIds.push(user._id);
  }

  if (orgIds.length) {
    const [ngos, recipients] = await Promise.all([
      NGOProfile.find({ userId: { $in: orgIds } })
        .select("userId organizationName")
        .lean(),
      RecipientProfile.find({ userId: { $in: orgIds } })
        .select("userId organizationName")
        .lean(),
    ]);
    for (const profile of [...ngos, ...recipients]) {
      if (profile.organizationName) {
        names.set(String(profile.userId), profile.organizationName);
      }
    }
  }

  return names;
}

function shapeMessage(message, namesByUserId) {
  return {
    id: `${message._id}`,
    contextType: message.contextType,
    contextId: `${message.contextId}`,
    peerId: message.peerId ? `${message.peerId}` : undefined,
    text: message.text,
    createdAt: message.createdAt,
    sender: {
      id: `${message.sender}`,
      name:
        namesByUserId.get(`${message.sender}`) ||
        "A ResQMeal member",
    },
  };
}

// GET /api/chat/:contextType/:contextId/messages?peerId=<id>
// Returns messages for the 1-on-1 conversation only — messages sent by me to
// peerId, or by peerId to me. Pass ?before=<ISO> to walk further back.
async function getMessages(req, res) {
  const { contextType, contextId } = req.params;
  const peerId = req.query.peerId ? String(req.query.peerId) : null;

  if (!["donation", "campaign"].includes(contextType)) {
    return res.status(400).json({ success: false, message: "Unknown chat type." });
  }
  if (!mongoose.isValidObjectId(contextId)) {
    return res.status(404).json({ success: false, message: "Chat not found." });
  }
  if (!peerId || !mongoose.isValidObjectId(peerId)) {
    return res.status(400).json({
      success: false,
      message: "peerId query parameter is required for 1-on-1 chats.",
    });
  }

  const verdict = await canAccessChat({
    userId: req.user.id,
    contextType,
    contextId,
    peerId,
  });
  if (verdict === "missing") {
    return res.status(404).json({ success: false, message: "Chat not found." });
  }
  if (verdict !== "ok") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this chat.",
    });
  }

  let limit = parseInt(req.query.limit, 10);
  if (Number.isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  limit = Math.min(limit, MAX_LIMIT);

  const myId = req.user.id;

  // Only messages in this specific pair's conversation. The last two clauses
  // keep history written before the 1-on-1 change (no peerId on the document)
  // readable for both sides of the old shared room.
  const filter = {
    contextType,
    contextId,
    $or: [
      { sender: myId, peerId },
      { sender: peerId, peerId: myId },
      { sender: myId, peerId: null },
      { sender: peerId, peerId: null },
    ],
  };
  if (req.query.before) {
    const before = new Date(req.query.before);
    if (!Number.isNaN(before.getTime())) {
      filter.createdAt = { $lt: before };
    }
  }

  try {
    const page = await ChatMessage.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    page.reverse();

    const names = await resolveSenderNames(page);

    return res.json({
      success: true,
      messages: page.map((message) => shapeMessage(message, names)),
    });
  } catch (error) {
    console.error("getMessages failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load chat history." });
  }
}

// POST /api/chat/:contextType/:contextId/messages
// Body must include peerId (the other person in this 1-on-1 chat).
// Saves the message, pushes it into the pair room via Socket.IO, and sends a
// notification record + realtime event to that peer only.
async function sendMessage(req, res) {
  const { contextType, contextId } = req.params;
  const text = `${req.body?.text ?? ""}`.trim();
  const peerId = req.body?.peerId ? String(req.body.peerId) : null;

  if (!["donation", "campaign"].includes(contextType)) {
    return res.status(400).json({ success: false, message: "Unknown chat type." });
  }
  if (!mongoose.isValidObjectId(contextId)) {
    return res.status(404).json({ success: false, message: "Chat not found." });
  }
  if (!peerId || !mongoose.isValidObjectId(peerId)) {
    return res.status(400).json({
      success: false,
      message: "peerId is required — each chat is 1-on-1.",
    });
  }
  if (!text) {
    return res
      .status(400)
      .json({ success: false, message: "Message cannot be empty." });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({
      success: false,
      message: `Messages are limited to ${MAX_TEXT_LENGTH} characters.`,
    });
  }

  const verdict = await canAccessChat({
    userId: req.user.id,
    contextType,
    contextId,
    peerId,
  });
  if (verdict === "missing") {
    return res.status(404).json({ success: false, message: "Chat not found." });
  }
  if (verdict !== "ok") {
    return res.status(403).json({
      success: false,
      message: "You do not have access to this chat.",
    });
  }

  try {
    const saved = await ChatMessage.create({
      contextType,
      contextId,
      sender: req.user.id,
      peerId,
      text,
    });

    const lean = saved.toObject();
    const names = await resolveSenderNames([lean]);
    const shaped = shapeMessage(lean, names);

    // Push into the specific 1-on-1 pair room, and ALSO into the peer's
    // personal room. The pair room is lost whenever a client socket
    // reconnects (the screen only joins it once on mount), while user:<id>
    // is re-joined server-side on every connection — so the personal-room
    // copy keeps live updates working across reconnects. ChatScreen filters
    // by thread and dedupes by id, so a peer in both rooms sees it once.
    if (chatIo) {
      const room = ChatMessage.roomFor(contextType, contextId, req.user.id, peerId);
      chatIo.to(room).emit("amasha:chat:message", shaped);
      chatIo.to(`user:${peerId}`).emit("amasha:chat:message", shaped);
    }

    // Notify only the peer (the only other person in this conversation).
    // Done fire-and-forget so the HTTP response is not delayed.
    notify("CHAT_NEW_MESSAGE", [peerId], {
      contextType,
      contextId,
      // The sender is the peer from the recipient's perspective — stored so
      // tapping the persisted notification can open the exact 1-on-1 thread.
      senderId: String(req.user.id),
      senderName: shaped.sender.name,
      text: shaped.text.slice(0, 100),
      title: contextType === "campaign" ? shaped.text.slice(0, 50) : undefined,
    })
      .then(() => {
        if (chatIo) {
          const payload = {
            type: "CHAT_NEW_MESSAGE",
            contextType,
            contextId,
            peerId: req.user.id, // the sender is the peer from recipient's perspective
            title: contextType === "campaign"
              ? "New campaign message"
              : "New rescue chat message",
            body: `${shaped.sender.name}: ${shaped.text.slice(0, 80)}`,
            createdAt: shaped.createdAt,
          };
          chatIo.to(`user:${peerId}`).emit("amasha:notification:new", payload);
        }
      })
      .catch((err) => console.error("chat notify failed:", err));

    return res.status(201).json({ success: true, message: shaped });
  } catch (error) {
    console.error("sendMessage failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not send the message." });
  }
}

// GET /api/chat/conversations
// Returns all 1-on-1 conversations this user has had, across donation and
// campaign contexts, sorted by most-recent message first.
async function listConversations(req, res) {
  try {
    const conversations = await getConversations(req.user.id);
    return res.json({ success: true, conversations });
  } catch (error) {
    console.error("listConversations failed:", error);
    return res
      .status(500)
      .json({ success: false, message: "Could not load your chats." });
  }
}

module.exports = { getMessages, sendMessage, listConversations, setChatIo };
